import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalEditModal, type GoalModalMode } from '@/components/goal-edit-modal';
import { HoldingEditModal, type HoldingModalMode } from '@/components/holding-edit-modal';
import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { type AssetType, type Goal, type Holding } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

// Colors assigned to each asset type — chosen to harmonise with the existing palette
const ASSET_COLORS: Record<AssetType, string> = {
  Stocks: MC.emerald,
  ETF: MC.indigo,
  Crypto: MC.clay,
  Gold: MC.gold,
  Cash: '#6B7B73',  // MC.muted
  Other: '#A0B4A8',
};

// ─── Holding card ────────────────────────────────────────────────────────────

function HoldingCard({ holding, onPress }: { holding: Holding; onPress: () => void }) {
  const t = useT();
  const typeColor = ASSET_COLORS[holding.assetType];

  const hasCostBasis = holding.units != null && holding.buyPrice != null;
  const cost = hasCostBasis ? holding.units! * holding.buyPrice! : null;
  const gainLoss = cost !== null ? holding.currentValue - cost : null;
  const gainPct = cost !== null && cost > 0 ? (gainLoss! / cost) * 100 : null;
  const isGain = gainLoss !== null && gainLoss >= 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.holdingCard, pressed && styles.holdingCardPressed]}
      onPress={onPress}>
      <View style={styles.holdingTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.holdingMeta}>
            <View style={[styles.typeChip, { backgroundColor: typeColor + '1A' }]}>
              <Text style={[styles.typeChipText, { color: typeColor }]}>
                {t(`portfolio.type${holding.assetType}`)}
              </Text>
            </View>
            {holding.units != null && (
              <Text style={styles.holdingUnits}>
                {holding.units} {t('portfolio.units')}
              </Text>
            )}
          </View>
          <Text style={styles.holdingName}>{holding.name}</Text>
        </View>
        <View style={styles.holdingRight}>
          <Text style={styles.holdingValue}>{fmt(holding.currentValue)}</Text>
          {gainLoss !== null && gainPct !== null && (
            <Text style={[styles.gainLine, { color: isGain ? MC.emerald : MC.clay }]}>
              {isGain ? '+' : ''}{fmt(gainLoss)}
              {'  '}
              ({isGain ? '+' : ''}{gainPct.toFixed(1)}%)
            </Text>
          )}
        </View>
      </View>
      {cost !== null && (
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>{t('portfolio.costBasis')}</Text>
          <Text style={styles.costAmt}>{fmt(cost)}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Goal card (unchanged) ────────────────────────────────────────────────────

function GoalCard({ goal, monthlyNet, onPress }: { goal: Goal; monthlyNet: number; onPress: () => void }) {
  const t = useT();
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  const monthsLeft = monthlyNet > 0 && remaining > 0
    ? Math.ceil(remaining / (monthlyNet * 0.25))
    : null;

  const fillColor = pct >= 75 ? MC.emerald : pct >= 40 ? MC.gold : MC.clay;

  return (
    <Pressable
      style={({ pressed }) => [styles.goalCard, pressed && styles.goalCardPressed]}
      onPress={onPress}>
      <View style={styles.goalHeader}>
        <Text style={styles.goalIcon}>{goal.icon}</Text>
        <View style={styles.goalInfo}>
          <Text style={styles.goalLabel}>{goal.label}</Text>
          <Text style={styles.goalSub}>
            {fmt(goal.saved)} / {fmt(goal.target)}
          </Text>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: fillColor + '18' }]}>
          <Text style={[styles.pctText, { color: fillColor }]}>{Math.round(pct)}%</Text>
        </View>
      </View>

      <View style={styles.meterBg}>
        <LinearGradient
          colors={pct >= 75 ? [MC.emerald, '#15A371'] : pct >= 40 ? [MC.gold, '#E0B44A'] : [MC.clay, '#CE6B55']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.meterFill, { width: `${pct}%` }]}
        />
      </View>

      <View style={styles.goalFooter}>
        <Text style={styles.goalRemain}>{t('invest.toGo', { amt: fmt(remaining) })}</Text>
        {monthsLeft !== null && (
          <Text style={styles.goalTime}>{t('invest.moAtPct', { n: monthsLeft })}</Text>
        )}
      </View>
    </Pressable>
  );
}

// ─── Allocation donut (View-based, same technique as home screen) ─────────────

function AllocationDonut({
  segments,
  total,
  centerLabel,
  centerSub,
}: {
  segments: { label: string; val: number; color: string }[];
  total: number;
  centerLabel: string;
  centerSub: string;
}) {
  const sorted = [...segments].filter((s) => s.val > 0).sort((a, b) => b.val - a.val);
  const dominant = sorted[0];
  let acc = 0;

  return (
    <View style={styles.donutWrap}>
      <View style={styles.donutContainer}>
        <View style={[styles.donutOuter, { borderColor: dominant?.color ?? MC.emerald }]}>
          <View style={styles.donutInner}>
            <Text style={styles.donutCenterLabel}>{centerLabel}</Text>
            <Text style={styles.donutCenterSub}>{centerSub}</Text>
          </View>
          {sorted.slice(1).map((s) => {
            const frac = total > 0 ? s.val / total : 0;
            const rotation = acc * 360;
            acc += frac;
            return (
              <View
                key={s.label}
                style={[
                  styles.donutSegment,
                  {
                    borderColor: s.color,
                    transform: [{ rotate: `${rotation}deg` }],
                    borderWidth: 10,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        {sorted.map((s) => {
          const pct = total > 0 ? Math.round((s.val / total) * 100) : 0;
          return (
            <View key={s.label} style={styles.legRow}>
              <View style={[styles.legDot, { backgroundColor: s.color }]} />
              <Text style={styles.legLabel}>{s.label}</Text>
              <Text style={styles.legPct}>{pct}%</Text>
              <Text style={styles.legAmt}>{fmt(s.val)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function InvestScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useAppData();
  const t = useT();
  const [goalMode, setGoalMode] = useState<GoalModalMode>(null);
  const [holdingMode, setHoldingMode] = useState<HoldingModalMode>(null);

  const holdings = data.holdings ?? [];
  const portfolioValue = data.portfolioValue ?? 0;

  // Build allocation segments by asset type
  const allocationMap: Partial<Record<AssetType, number>> = {};
  for (const h of holdings) {
    allocationMap[h.assetType] = (allocationMap[h.assetType] ?? 0) + h.currentValue;
  }
  const allocationSegments = (Object.entries(allocationMap) as [AssetType, number][]).map(
    ([type, val]) => ({
      label: t(`portfolio.type${type}`),
      val,
      color: ASSET_COLORS[type],
    })
  );

  // Dominant type label for donut center
  const dominantPct =
    portfolioValue > 0 && allocationSegments.length > 0
      ? Math.round((Math.max(...allocationSegments.map((s) => s.val)) / portfolioValue) * 100)
      : 0;

  const MONTHLY_SURPLUS = data.net;
  const totalSaved = data.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = data.goals.reduce((s, g) => s + g.target, 0);
  const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.screenTitle}>{t('invest.title')}</Text>
        <Text style={styles.screenSub}>{t('invest.sub')}</Text>

        {/* ── PORTFOLIO SECTION ── */}

        {/* Portfolio hero */}
        <LinearGradient
          colors={[MC.emerald, MC.emeraldDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>{t('portfolio.heroLabel')}</Text>
          <Text style={styles.heroBig}>{fmt(portfolioValue)}</Text>
          <View style={styles.heroLine} />
          <Text style={styles.heroSub}>
            {t('portfolio.holdingsCount', { n: holdings.length })}
          </Text>
        </LinearGradient>

        {/* Holdings list */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('portfolio.holdings')}</Text>
          <Pressable style={styles.addBtn} onPress={() => setHoldingMode({ type: 'add' })}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        {holdings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('portfolio.noHoldings')}</Text>
          </View>
        ) : (
          holdings.map((h) => (
            <HoldingCard
              key={h.id}
              holding={h}
              onPress={() => setHoldingMode({ type: 'edit', holding: h })}
            />
          ))
        )}

        {/* Asset allocation donut */}
        {holdings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('portfolio.allocationTitle')}</Text>
            <AllocationDonut
              segments={allocationSegments}
              total={portfolioValue}
              centerLabel={`${dominantPct}%`}
              centerSub={allocationSegments.sort((a, b) => b.val - a.val)[0]?.label ?? ''}
            />
          </View>
        )}

        {/* Tracking disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{t('portfolio.trackingOnly')}</Text>
        </View>

        {/* ── SAVINGS GOALS SECTION ── */}

        {/* Goals overview hero */}
        <LinearGradient
          colors={[MC.indigo, '#4848C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>{t('invest.heroLabel')}</Text>
          <Text style={styles.heroBig}>{fmt(totalSaved)}</Text>
          <View style={styles.heroLine} />
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroKey}>{t('invest.target')}</Text>
              <Text style={styles.heroVal}>{fmt(totalTarget)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>{t('invest.remaining')}</Text>
              <Text style={styles.heroVal}>{fmt(totalTarget - totalSaved)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>{t('invest.overall')}</Text>
              <Text style={styles.heroVal}>{overallPct}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Monthly surplus card */}
        <View style={styles.surplusCard}>
          <View style={styles.surplusLeft}>
            <Text style={styles.surplusLabel}>{t('invest.surplusLabel')}</Text>
            <Text style={styles.surplusAmt}>{fmt(MONTHLY_SURPLUS)}</Text>
          </View>
          <View style={styles.surplusTip}>
            <Text style={styles.surplusTipText}>{t('invest.surplusTip', { amt: fmt(MONTHLY_SURPLUS * 0.25) })}</Text>
          </View>
        </View>

        {/* Goals */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('invest.savingsGoals')}</Text>
          <Pressable style={styles.addBtn} onPress={() => setGoalMode({ type: 'add' })}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
        {data.goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            monthlyNet={MONTHLY_SURPLUS}
            onPress={() => setGoalMode({ type: 'edit', goal: g })}
          />
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{t('invest.disclaimer')}</Text>
        </View>

        {/* Side hustle calculator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('invest.sideImpact')}</Text>
          <Text style={styles.calcSub}>
            {t('invest.sideImpactBody', { side: fmt(data.side), pct: data.sideShare })}
          </Text>
          <View style={styles.calcRows}>
            <View style={styles.calcRow}>
              <Text style={styles.calcRowLabel}>{t('invest.ifDoubles')}</Text>
              <Text style={[styles.calcRowVal, { color: MC.emerald }]}>
                {t('invest.extraPerMo', { amt: fmt(data.side * 2) })}
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcRowLabel}>{t('invest.emergencyFund')}</Text>
              <Text style={[styles.calcRowVal, { color: MC.gold }]}>
                {t('invest.months', { n: Math.ceil((12000 - 3000) / (data.net * 0.25)) })}
              </Text>
            </View>
            <View style={[styles.calcRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.calcRowLabel}>{t('invest.businessCapital')}</Text>
              <Text style={[styles.calcRowVal, { color: MC.indigo }]}>
                {t('invest.months', { n: Math.ceil((5000 - 600) / (data.net * 0.15)) })}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <GoalEditModal mode={goalMode} onClose={() => setGoalMode(null)} />
      <HoldingEditModal mode={holdingMode} onClose={() => setHoldingMode(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MC.bg },
  scroll: { flex: 1 },
  content: { padding: MS.lg, gap: MS.md },

  screenTitle: { fontSize: 26, fontFamily: MF.bold, color: MC.ink },
  screenSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, marginTop: -MS.sm },

  // Hero card (shared by portfolio + goals)
  hero: {
    borderRadius: MR.xxl,
    padding: MS.xl,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: MF.semiBold,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroBig: { fontSize: 40, fontFamily: MF.bold, color: '#fff', lineHeight: 48, marginTop: 6 },
  heroLine: { height: 3, width: 48, backgroundColor: MC.gold, borderRadius: 2, marginVertical: 12 },
  heroSub: { fontSize: 13, fontFamily: MF.medium, color: 'rgba(255,255,255,0.8)' },
  heroRow: { flexDirection: 'row', gap: MS.xl },
  heroKey: { fontSize: 10, fontFamily: MF.medium, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroVal: { fontSize: 15, fontFamily: MF.bold, color: '#fff', marginTop: 3 },

  // Section headers
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 14, fontFamily: MF.bold, color: MC.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MC.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MC.emerald,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: { fontSize: 20, color: '#fff', lineHeight: 24, fontFamily: MF.regular },

  // Holding card
  holdingCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.sm,
  },
  holdingCardPressed: { opacity: 0.7 },
  holdingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: MS.md },
  holdingMeta: { flexDirection: 'row', alignItems: 'center', gap: MS.sm, marginBottom: 4 },
  typeChip: {
    paddingHorizontal: MS.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  typeChipText: { fontSize: 11, fontFamily: MF.semiBold, letterSpacing: 0.3 },
  holdingUnits: { fontSize: 11, fontFamily: MF.regular, color: MC.muted },
  holdingName: { fontSize: 16, fontFamily: MF.bold, color: MC.ink },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 17, fontFamily: MF.bold, color: MC.ink },
  gainLine: { fontSize: 12, fontFamily: MF.semiBold, marginTop: 3 },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: MS.sm,
    borderTopWidth: 1,
    borderTopColor: MC.line,
  },
  costLabel: { fontSize: 12, fontFamily: MF.regular, color: MC.muted },
  costAmt: { fontSize: 12, fontFamily: MF.medium, color: MC.muted },

  // Empty state
  emptyCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.xl,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, fontFamily: MF.regular, color: MC.muted },

  // Allocation donut (same technique as home screen)
  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.md,
  },
  cardTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink },

  donutWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: MS.lg },
  donutContainer: { width: 100, height: 100 },
  donutOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  donutInner: { alignItems: 'center' },
  donutCenterLabel: { fontSize: 14, fontFamily: MF.bold, color: MC.ink },
  donutCenterSub: { fontSize: 9, fontFamily: MF.medium, color: MC.muted, textAlign: 'center' },
  donutSegment: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  legend: { flex: 1, gap: MS.sm, justifyContent: 'center' },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
  legDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  legLabel: { flex: 1, fontSize: 12, fontFamily: MF.regular, color: MC.ink },
  legPct: { fontSize: 12, fontFamily: MF.bold, color: MC.muted, width: 36, textAlign: 'right' },
  legAmt: { fontSize: 12, fontFamily: MF.bold, color: MC.ink, width: 72, textAlign: 'right' },

  // Surplus card
  surplusCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.sm,
  },
  surplusLeft: { gap: 2 },
  surplusLabel: { fontSize: 12, fontFamily: MF.medium, color: MC.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  surplusAmt: { fontSize: 28, fontFamily: MF.bold, color: MC.ink },
  surplusTip: {
    backgroundColor: MC.goldLight,
    borderWidth: 1,
    borderColor: MC.goldBorder,
    borderRadius: MR.sm,
    paddingHorizontal: MS.md,
    paddingVertical: MS.xs,
  },
  surplusTipText: { fontSize: 12, fontFamily: MF.medium, color: '#8A6D1E' },

  // Goal card
  goalCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.md,
  },
  goalCardPressed: { opacity: 0.7 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: MS.md },
  goalIcon: { fontSize: 28 },
  goalInfo: { flex: 1 },
  goalLabel: { fontSize: 16, fontFamily: MF.bold, color: MC.ink },
  goalSub: { fontSize: 12, fontFamily: MF.regular, color: MC.muted, marginTop: 2 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pctText: { fontSize: 14, fontFamily: MF.bold },

  meterBg: { height: 12, backgroundColor: '#EFEFEF', borderRadius: 7, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 7 },

  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalRemain: { fontSize: 12.5, fontFamily: MF.medium, color: MC.muted },
  goalTime: { fontSize: 12, fontFamily: MF.regular, color: MC.muted },

  // Disclaimer
  disclaimer: {
    backgroundColor: '#F4F7F5',
    borderRadius: MR.lg,
    padding: MS.md,
  },
  disclaimerText: { fontSize: 11.5, fontFamily: MF.regular, color: MC.muted, lineHeight: 17 },

  // Side hustle calc
  calcSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, lineHeight: 20 },
  calcRows: {
    backgroundColor: '#F4F7F5',
    borderRadius: MR.md,
    paddingHorizontal: MS.md,
    paddingVertical: MS.sm,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: MS.sm,
    borderBottomWidth: 1,
    borderBottomColor: MC.line,
  },
  calcRowLabel: { fontSize: 13, fontFamily: MF.regular, color: MC.muted },
  calcRowVal: { fontSize: 14, fontFamily: MF.bold },
});
