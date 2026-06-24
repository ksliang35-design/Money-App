import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalEditModal, type GoalModalMode } from '@/components/goal-edit-modal';
import { HoldingEditModal, type HoldingModalMode } from '@/components/holding-edit-modal';
import { MF, MR, MS, fmt } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { type AssetType, type Goal, type Holding, type HoldingCurrency, type FxRates } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { convertCcy, fmtCcy } from '@/lib/fx';
import { fetchFxRates, fetchCryptoPrices } from '@/lib/live-prices';
import { useAppData } from '@/store/AppDataProvider';

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-MY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function assetColors(C: AppTheme): Record<AssetType, string> {
  return {
    Stocks: C.emerald,
    ETF:    C.indigo,
    Crypto: C.clay,
    Gold:   C.gold,
    Cash:   C.muted,
    Other:  C.muted,
  };
}

const CURRENCIES: HoldingCurrency[] = ['RM', 'USD', 'HKD'];

// ─── Currency settings card ───────────────────────────────────────────────────

function FxSettingsCard({
  displayCurrency,
  fxRates,
  onCurrencyChange,
  onRatesChange,
  onUpdate,
  fetching,
  lastUpdated,
  fetchError,
}: {
  displayCurrency: HoldingCurrency;
  fxRates: FxRates;
  onCurrencyChange: (ccy: HoldingCurrency) => void;
  onRatesChange: (rates: FxRates) => void;
  onUpdate: () => void;
  fetching: boolean;
  lastUpdated: number | null;
  fetchError: string | null;
}) {
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeFxStyles(C), [C]);
  const [usdStr, setUsdStr] = useState(String(fxRates.USD));
  const [hkdStr, setHkdStr] = useState(String(fxRates.HKD));

  const commitRates = () => {
    const USD = parseFloat(usdStr);
    const HKD = parseFloat(hkdStr);
    if (!isNaN(USD) && USD > 0 && !isNaN(HKD) && HKD > 0) {
      onRatesChange({ USD, HKD });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('portfolio.fxTitle')}</Text>
        <Pressable
          style={[styles.updateBtn, fetching && styles.updateBtnDisabled]}
          onPress={onUpdate}
          disabled={fetching}>
          {fetching ? (
            <ActivityIndicator size="small" color={C.emerald} style={styles.spinner} />
          ) : (
            <Text style={styles.updateBtnText}>{t('portfolio.updatePrices')}</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.label}>{t('portfolio.displayCcy')}</Text>
      <View style={styles.ccyRow}>
        {CURRENCIES.map((ccy) => (
          <Pressable
            key={ccy}
            style={[styles.ccyBtn, displayCurrency === ccy && styles.ccyBtnActive]}
            onPress={() => onCurrencyChange(ccy)}>
            <Text style={[styles.ccyBtnText, displayCurrency === ccy && styles.ccyBtnTextActive]}>
              {ccy}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>{t('portfolio.rateUSD')}</Text>
        <TextInput
          style={styles.rateInput}
          value={usdStr}
          onChangeText={setUsdStr}
          onBlur={commitRates}
          onSubmitEditing={commitRates}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={styles.rateSuffix}>{t('portfolio.rateSuffix')}</Text>
      </View>

      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>{t('portfolio.rateHKD')}</Text>
        <TextInput
          style={styles.rateInput}
          value={hkdStr}
          onChangeText={setHkdStr}
          onBlur={commitRates}
          onSubmitEditing={commitRates}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={styles.rateSuffix}>{t('portfolio.rateSuffix')}</Text>
      </View>

      {fetchError ? (
        <Text style={styles.errorText}>{fetchError}</Text>
      ) : lastUpdated != null ? (
        <Text style={styles.lastUpdatedText}>
          {t('portfolio.lastUpdated', { time: fmtTime(lastUpdated) })}
        </Text>
      ) : (
        <Text style={styles.hint}>{t('portfolio.fxHint')}</Text>
      )}
    </View>
  );
}

function makeFxStyles(C: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
      gap: MS.sm,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontSize: 14, fontFamily: MF.bold, color: C.ink },
    updateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: MS.md,
      paddingVertical: 5,
      borderRadius: MR.md,
      borderWidth: 1,
      borderColor: C.emerald + '60',
      backgroundColor: C.emerald + '12',
      minWidth: 36,
      justifyContent: 'center',
    },
    updateBtnDisabled: { opacity: 0.5 },
    updateBtnText: { fontSize: 12, fontFamily: MF.semiBold, color: C.emerald },
    spinner: { width: 14, height: 14 },
    label: { fontSize: 11, fontFamily: MF.semiBold, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    ccyRow: { flexDirection: 'row', gap: MS.sm },
    ccyBtn: {
      paddingHorizontal: MS.lg,
      paddingVertical: MS.sm,
      borderRadius: MR.lg,
      borderWidth: 1.5,
      borderColor: C.line,
      backgroundColor: C.card,
    },
    ccyBtnActive: { borderColor: C.emerald, backgroundColor: C.emerald + '18' },
    ccyBtnText: { fontSize: 13, fontFamily: MF.semiBold, color: C.muted },
    ccyBtnTextActive: { color: C.emerald },
    rateRow: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
    rateLabel: { fontSize: 13, fontFamily: MF.medium, color: C.ink, width: 72 },
    rateInput: {
      flex: 1,
      backgroundColor: C.bg,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.md,
      paddingHorizontal: MS.md,
      paddingVertical: MS.sm,
      fontSize: 14,
      fontFamily: MF.medium,
      color: C.ink,
      textAlign: 'right',
    },
    rateSuffix: { fontSize: 13, fontFamily: MF.medium, color: C.muted, width: 30 },
    hint: { fontSize: 11, fontFamily: MF.regular, color: C.muted },
    lastUpdatedText: { fontSize: 11, fontFamily: MF.medium, color: C.emerald },
    errorText: { fontSize: 11, fontFamily: MF.medium, color: C.clay },
  });
}

// ─── Holding card ────────────────────────────────────────────────────────────

function HoldingCard({
  holding,
  displayCurrency,
  fxRates,
  onPress,
}: {
  holding: Holding;
  displayCurrency: HoldingCurrency;
  fxRates: FxRates;
  onPress: () => void;
}) {
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const ASSET_COLORS = useMemo(() => assetColors(C), [C]);
  const typeColor = ASSET_COLORS[holding.assetType];
  const holdingCcy = holding.currency ?? 'RM';

  const hasCostBasis = holding.units != null && holding.buyPrice != null;
  const cost = hasCostBasis ? holding.units! * holding.buyPrice! : null;
  const gainLoss = cost !== null ? holding.currentValue - cost : null;
  const gainPct = cost !== null && cost > 0 ? (gainLoss! / cost) * 100 : null;
  const isGain = gainLoss !== null && gainLoss >= 0;

  const showConverted = holdingCcy !== displayCurrency;
  const convertedValue = showConverted
    ? convertCcy(holding.currentValue, holdingCcy, displayCurrency, fxRates)
    : null;

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
          <Text style={styles.holdingValue}>{fmtCcy(holding.currentValue, holdingCcy)}</Text>
          {gainLoss !== null && gainPct !== null && (
            <Text style={[styles.gainLine, { color: isGain ? C.emerald : C.clay }]}>
              {isGain ? '+' : ''}{fmtCcy(gainLoss, holdingCcy)}
              {'  '}
              ({isGain ? '+' : ''}{gainPct.toFixed(1)}%)
            </Text>
          )}
        </View>
      </View>

      {cost !== null && (
        <View style={styles.costRow}>
          <Text style={styles.costLabel}>{t('portfolio.costBasis')}</Text>
          <Text style={styles.costAmt}>{fmtCcy(cost, holdingCcy)}</Text>
        </View>
      )}

      {convertedValue !== null && (
        <View style={styles.convertedRow}>
          <Text style={styles.convertedText}>
            {t('portfolio.convertedAs', { amt: fmtCcy(convertedValue, displayCurrency) })}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Goal card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, monthlyNet, onPress }: { goal: Goal; monthlyNet: number; onPress: () => void }) {
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const pct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  const monthsLeft = monthlyNet > 0 && remaining > 0
    ? Math.ceil(remaining / (monthlyNet * 0.25))
    : null;

  const fillColor = pct >= 75 ? C.emerald : pct >= 40 ? C.gold : C.clay;
  const gradColors: [string, string] = pct >= 75
    ? [C.emerald, C.emeraldDark]
    : pct >= 40
    ? [C.gold, C.gold + 'CC']
    : [C.clay, C.clay + 'CC'];

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
          colors={gradColors}
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

// ─── Allocation donut ─────────────────────────────────────────────────────────

function AllocationDonut({
  segments,
  total,
  centerLabel,
  centerSub,
  displayCurrency,
}: {
  segments: { label: string; val: number; color: string }[];
  total: number;
  centerLabel: string;
  centerSub: string;
  displayCurrency: HoldingCurrency;
}) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const sorted = [...segments].filter((s) => s.val > 0).sort((a, b) => b.val - a.val);
  const dominant = sorted[0];
  const fracs = sorted.map((s) => (total > 0 ? s.val / total : 0));
  const rotations = fracs.map((_, i) => fracs.slice(0, i).reduce((sum, f) => sum + f, 0));

  return (
    <View style={styles.donutWrap}>
      <View style={styles.donutContainer}>
        <View style={[styles.donutOuter, { borderColor: dominant?.color ?? C.emerald }]}>
          <View style={styles.donutInner}>
            <Text style={styles.donutCenterLabel}>{centerLabel}</Text>
            <Text style={styles.donutCenterSub}>{centerSub}</Text>
          </View>
          {sorted.slice(1).map((s, idx) => {
            const i = idx + 1;
            const rotation = rotations[i] * 360;
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
              <Text style={styles.legAmt}>{fmtCcy(s.val, displayCurrency)}</Text>
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
  const { data, loaded, setDisplayCurrency, setFxRates, setPricesUpdatedAt, updateHolding } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const ASSET_COLORS = useMemo(() => assetColors(C), [C]);

  const [goalMode, setGoalMode] = useState<GoalModalMode>(null);
  const [holdingMode, setHoldingMode] = useState<HoldingModalMode>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const autoFetchedRef = useRef(false);

  const holdings = data.holdings ?? [];
  const displayCcy = data.displayCurrency ?? 'RM';
  const fxRates = data.fxRates;

  const triggerFetch = async () => {
    if (fetching) return;
    setFetching(true);
    setFetchError(null);
    try {
      const rates = await fetchFxRates();
      setFxRates(rates);
      try {
        const updates = await fetchCryptoPrices(holdings, rates);
        for (const { holdingId, newValue } of updates) {
          updateHolding(holdingId, { currentValue: newValue });
        }
      } catch {
        // Crypto fetch is best-effort; FX rates still committed above
      }
      setPricesUpdatedAt(Date.now());
    } catch {
      setFetchError(t('portfolio.updateError'));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loaded || autoFetchedRef.current) return;
    autoFetchedRef.current = true;
    if (Date.now() - (data.pricesUpdatedAt ?? 0) > 10 * 60 * 1000) {
      setTimeout(triggerFetch, 0); // defer to keep effect body free of synchronous setState
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const allocationMap: Partial<Record<AssetType, number>> = {};
  for (const h of holdings) {
    const val = convertCcy(h.currentValue, h.currency ?? 'RM', displayCcy, fxRates);
    allocationMap[h.assetType] = (allocationMap[h.assetType] ?? 0) + val;
  }
  const allocationSegments = (Object.entries(allocationMap) as [AssetType, number][]).map(
    ([type, val]) => ({
      label: t(`portfolio.type${type}`),
      val,
      color: ASSET_COLORS[type],
    })
  );

  const portfolioValueDisplay = data.portfolioValueDisplay ?? 0;

  const dominantPct =
    portfolioValueDisplay > 0 && allocationSegments.length > 0
      ? Math.round((Math.max(...allocationSegments.map((s) => s.val)) / portfolioValueDisplay) * 100)
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

        <Text style={styles.screenTitle}>{t('invest.title')}</Text>
        <Text style={styles.screenSub}>{t('invest.sub')}</Text>

        <FxSettingsCard
          key={`${fxRates.USD}_${fxRates.HKD}`}
          displayCurrency={displayCcy}
          fxRates={fxRates}
          onCurrencyChange={setDisplayCurrency}
          onRatesChange={setFxRates}
          onUpdate={triggerFetch}
          fetching={fetching}
          lastUpdated={data.pricesUpdatedAt}
          fetchError={fetchError}
        />

        <LinearGradient
          colors={[C.emerald, C.emeraldDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>{t('portfolio.heroLabel')}</Text>
          <Text style={styles.heroBig}>{fmtCcy(portfolioValueDisplay, displayCcy)}</Text>
          <View style={styles.heroLine} />
          <Text style={styles.heroSub}>
            {t('portfolio.holdingsCount', { n: holdings.length })}
          </Text>
        </LinearGradient>

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
              displayCurrency={displayCcy}
              fxRates={fxRates}
              onPress={() => setHoldingMode({ type: 'edit', holding: h })}
            />
          ))
        )}

        {holdings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('portfolio.allocationTitle')}</Text>
            <AllocationDonut
              segments={allocationSegments}
              total={portfolioValueDisplay}
              centerLabel={`${dominantPct}%`}
              centerSub={allocationSegments.sort((a, b) => b.val - a.val)[0]?.label ?? ''}
              displayCurrency={displayCcy}
            />
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{t('portfolio.trackingOnly')}</Text>
        </View>

        <LinearGradient
          colors={[C.indigo, C.indigo + 'CC']}
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

        <View style={styles.surplusCard}>
          <View style={styles.surplusLeft}>
            <Text style={styles.surplusLabel}>{t('invest.surplusLabel')}</Text>
            <Text style={styles.surplusAmt}>{fmt(MONTHLY_SURPLUS)}</Text>
          </View>
          <View style={styles.surplusTip}>
            <Text style={styles.surplusTipText}>{t('invest.surplusTip', { amt: fmt(MONTHLY_SURPLUS * 0.25) })}</Text>
          </View>
        </View>

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

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{t('invest.disclaimer')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('invest.sideImpact')}</Text>
          <Text style={styles.calcSub}>
            {t('invest.sideImpactBody', { side: fmt(data.side), pct: data.sideShare })}
          </Text>
          <View style={styles.calcRows}>
            <View style={styles.calcRow}>
              <Text style={styles.calcRowLabel}>{t('invest.ifDoubles')}</Text>
              <Text style={[styles.calcRowVal, { color: C.emerald }]}>
                {t('invest.extraPerMo', { amt: fmt(data.side * 2) })}
              </Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcRowLabel}>{t('invest.emergencyFund')}</Text>
              <Text style={[styles.calcRowVal, { color: C.gold }]}>
                {t('invest.months', { n: Math.ceil((12000 - 3000) / (data.net * 0.25)) })}
              </Text>
            </View>
            <View style={[styles.calcRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.calcRowLabel}>{t('invest.businessCapital')}</Text>
              <Text style={[styles.calcRowVal, { color: C.indigo }]}>
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

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },

    screenTitle: { fontSize: 26, fontFamily: MF.bold, color: C.ink },
    screenSub: { fontSize: 13, fontFamily: MF.regular, color: C.muted, marginTop: -MS.sm },

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
    heroLine: { height: 3, width: 48, backgroundColor: C.gold, borderRadius: 2, marginVertical: 12 },
    heroSub: { fontSize: 13, fontFamily: MF.medium, color: 'rgba(255,255,255,0.8)' },
    heroRow: { flexDirection: 'row', gap: MS.xl },
    heroKey: { fontSize: 10, fontFamily: MF.medium, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroVal: { fontSize: 15, fontFamily: MF.bold, color: '#fff', marginTop: 3 },

    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { fontSize: 14, fontFamily: MF.bold, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
    addBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.emerald,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.emerald,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    addBtnText: { fontSize: 20, color: '#fff', lineHeight: 24, fontFamily: MF.regular },

    holdingCard: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
      gap: MS.sm,
    },
    holdingCardPressed: { opacity: 0.7 },
    holdingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: MS.md },
    holdingMeta: { flexDirection: 'row', alignItems: 'center', gap: MS.sm, marginBottom: 4 },
    typeChip: { paddingHorizontal: MS.sm, paddingVertical: 3, borderRadius: 999 },
    typeChipText: { fontSize: 11, fontFamily: MF.semiBold, letterSpacing: 0.3 },
    holdingUnits: { fontSize: 11, fontFamily: MF.regular, color: C.muted },
    holdingName: { fontSize: 16, fontFamily: MF.bold, color: C.ink },
    holdingRight: { alignItems: 'flex-end' },
    holdingValue: { fontSize: 17, fontFamily: MF.bold, color: C.ink },
    gainLine: { fontSize: 12, fontFamily: MF.semiBold, marginTop: 3 },
    costRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: MS.sm,
      borderTopWidth: 1,
      borderTopColor: C.line,
    },
    costLabel: { fontSize: 12, fontFamily: MF.regular, color: C.muted },
    costAmt: { fontSize: 12, fontFamily: MF.medium, color: C.muted },
    convertedRow: { alignItems: 'flex-end', paddingTop: MS.xs },
    convertedText: { fontSize: 12, fontFamily: MF.medium, color: C.muted },

    emptyCard: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.xl,
      alignItems: 'center',
    },
    emptyText: { fontSize: 13, fontFamily: MF.regular, color: C.muted },

    card: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
      gap: MS.md,
    },
    cardTitle: { fontSize: 15, fontFamily: MF.bold, color: C.ink },

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
    donutCenterLabel: { fontSize: 14, fontFamily: MF.bold, color: C.ink },
    donutCenterSub: { fontSize: 9, fontFamily: MF.medium, color: C.muted, textAlign: 'center' },
    donutSegment: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
    },
    legend: { flex: 1, gap: MS.sm, justifyContent: 'center' },
    legRow: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
    legDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
    legLabel: { flex: 1, fontSize: 12, fontFamily: MF.regular, color: C.ink },
    legPct: { fontSize: 12, fontFamily: MF.bold, color: C.muted, width: 36, textAlign: 'right' },
    legAmt: { fontSize: 12, fontFamily: MF.bold, color: C.ink, width: 80, textAlign: 'right' },

    surplusCard: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
      gap: MS.sm,
    },
    surplusLeft: { gap: 2 },
    surplusLabel: { fontSize: 12, fontFamily: MF.medium, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
    surplusAmt: { fontSize: 28, fontFamily: MF.bold, color: C.ink },
    surplusTip: {
      backgroundColor: C.goldLight,
      borderWidth: 1,
      borderColor: C.goldBorder,
      borderRadius: MR.sm,
      paddingHorizontal: MS.md,
      paddingVertical: MS.xs,
    },
    surplusTipText: { fontSize: 12, fontFamily: MF.medium, color: C.goldText },

    goalCard: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
      gap: MS.md,
    },
    goalCardPressed: { opacity: 0.7 },
    goalHeader: { flexDirection: 'row', alignItems: 'center', gap: MS.md },
    goalIcon: { fontSize: 28 },
    goalInfo: { flex: 1 },
    goalLabel: { fontSize: 16, fontFamily: MF.bold, color: C.ink },
    goalSub: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 2 },
    pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    pctText: { fontSize: 14, fontFamily: MF.bold },

    meterBg: { height: 12, backgroundColor: C.line, borderRadius: 7, overflow: 'hidden' },
    meterFill: { height: '100%', borderRadius: 7 },

    goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalRemain: { fontSize: 12.5, fontFamily: MF.medium, color: C.muted },
    goalTime: { fontSize: 12, fontFamily: MF.regular, color: C.muted },

    disclaimer: { backgroundColor: C.cardAlt, borderRadius: MR.lg, padding: MS.md },
    disclaimerText: { fontSize: 11.5, fontFamily: MF.regular, color: C.muted, lineHeight: 17 },

    calcSub: { fontSize: 13, fontFamily: MF.regular, color: C.muted, lineHeight: 20 },
    calcRows: { backgroundColor: C.cardAlt, borderRadius: MR.md, paddingHorizontal: MS.md, paddingVertical: MS.sm },
    calcRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: MS.sm,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
    },
    calcRowLabel: { fontSize: 13, fontFamily: MF.regular, color: C.muted },
    calcRowVal: { fontSize: 14, fontFamily: MF.bold },
  });
}
