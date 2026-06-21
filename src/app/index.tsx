import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarDisplay } from '@/components/avatar-display';
import { LanguagePicker } from '@/components/language-picker';
import { MoneyAIOverlay } from '@/components/money-ai-overlay';
import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { useT, type Language } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [aiOpen, setAiOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { data, setLanguage } = useAppData();
  const t = useT();

  const maxHistNet = Math.max(...data.history.map((h) => h.net), 1);
  const sideShare = data.sideShare;
  const C = 2 * Math.PI * 46;
  const segments = [
    { label: t('dashboard.salaryLabel'), val: data.salary, color: MC.emerald },
    { label: t('dashboard.sideLabel'), val: data.side, color: MC.gold },
  ];

  const initials = data.name.slice(0, 2).toUpperCase();
  const portfolioVal = data.portfolioValue ?? 0;

  // Gain/loss: only compare holdings where both units and buy price are known
  const holdings = data.holdings ?? [];
  const trackedHoldings = holdings.filter(h => h.units != null && h.buyPrice != null);
  const totalCost = trackedHoldings.reduce((s, h) => s + h.units! * h.buyPrice!, 0);
  const totalTrackedValue = trackedHoldings.reduce((s, h) => s + h.currentValue, 0);
  const gainLossPct =
    totalCost > 0 ? ((totalTrackedValue - totalCost) / totalCost) * 100 : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {/* Profile icon — top-left, navigates to Profile screen */}
            <Link href="/profile" asChild>
              <Pressable hitSlop={8}>
                <AvatarDisplay config={data.avatar} initials={initials} size={40} />
              </Pressable>
            </Link>
            <View>
              <Text style={styles.greeting}>{t('dashboard.greeting', { name: data.name })}</Text>
              <Text style={styles.month}>{data.month}</Text>
            </View>
          </View>
          <View style={styles.headerBtns}>
            <Pressable style={styles.langBadge} onPress={() => setLangOpen(true)}>
              <Text style={styles.langGlyph}>🌐</Text>
            </Pressable>
            <Pressable style={styles.horseBadge} onPress={() => setAiOpen(true)}>
              <Text style={styles.horseGlyph}>♞</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero card */}
        <LinearGradient
          colors={[MC.emerald, MC.emeraldDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>{t('dashboard.heroLabel')}</Text>
          <Text style={styles.heroBig}>{fmt(data.net)}</Text>
          <View style={styles.heroLine} />
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroKey}>{t('dashboard.moneyIn')}</Text>
              <Text style={styles.heroVal}>{fmt(data.income)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>{t('dashboard.moneyOut')}</Text>
              <Text style={styles.heroVal}>{fmt(data.expense)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>{t('dashboard.saved')}</Text>
              <Text style={styles.heroVal}>{data.savingsRate}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick stats */}
        <View style={styles.grid2}>
          <View style={styles.statCard}>
            <Text style={styles.statKey}>{t('dashboard.sideIncome')}</Text>
            <Text style={[styles.statVal, { color: MC.gold }]}>{fmt(data.side)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statKey}>{t('dashboard.onCard')}</Text>
            <Text style={[styles.statVal, { color: MC.clay }]}>{fmt(data.byMethod.card)}</Text>
          </View>
        </View>

        {/* Income split */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dashboard.incomeSplit')}</Text>
          <View style={styles.donutWrap}>
            <DonutChart segments={segments} total={data.income} C={C} centerLabel={`${sideShare}%`} centerSub={t('dashboard.sideSub')} />
            <View style={styles.legend}>
              {segments.map((s) => (
                <View key={s.label} style={styles.legRow}>
                  <View style={[styles.legDot, { backgroundColor: s.color }]} />
                  <Text style={styles.legLabel}>{s.label}</Text>
                  <Text style={styles.legAmt}>{fmt(s.val)}</Text>
                </View>
              ))}
              <View style={[styles.indepBox]}>
                <Text style={styles.indepTitle}>{t('dashboard.indepMeter')}</Text>
                <View style={styles.meterBg}>
                  <View style={[styles.meterFill, { width: `${Math.min(100, sideShare)}%`, backgroundColor: MC.gold }]} />
                </View>
                <Text style={styles.indepNote}>
                  {sideShare < 30
                    ? t('dashboard.indepLow', { pct: sideShare })
                    : t('dashboard.indepHigh')}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Savings history */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dashboard.savingsHistory')}</Text>
          <View style={styles.bars}>
            {data.history.map((h, i) => {
              const isCurrent = i === data.history.length - 1;
              const barH = Math.max(6, (h.net / maxHistNet) * 84);
              return (
                <View key={h.month} style={styles.barCol}>
                  <View
                    style={[
                      styles.barFill,
                      { height: barH, backgroundColor: isCurrent ? MC.gold : MC.emerald },
                    ]}
                  />
                  <Text style={styles.barLabel}>{h.month}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.barHint}>{t('dashboard.historyHint')}</Text>
        </View>

        {/* ── Hub cards: Investments + Budget Coach ── */}
        <Text style={styles.sectionLabel}>{t('dashboard.quickAccess')}</Text>

        <Link href="/invest" asChild>
          <Pressable style={({ pressed }) => [styles.hubCard, pressed && styles.hubCardPressed]}>
            <Text style={styles.hubIcon}>📈</Text>
            <View style={styles.hubBody}>
              <Text style={styles.hubTitle}>{t('dashboard.investTitle')}</Text>
              <View style={styles.hubValRow}>
                <Text style={styles.hubSub}>
                  {t('dashboard.investPreview', { val: fmt(portfolioVal) })}
                </Text>
                {gainLossPct != null && (
                  <Text style={[styles.hubBadge, { color: gainLossPct >= 0 ? MC.emerald : MC.clay }]}>
                    {gainLossPct >= 0 ? '↑' : '↓'} {Math.abs(gainLossPct).toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.hubArrow}>›</Text>
          </Pressable>
        </Link>

        <Link href="/coach" asChild>
          <Pressable style={({ pressed }) => [styles.hubCard, pressed && styles.hubCardPressed]}>
            <Text style={styles.hubIcon}>🧭</Text>
            <View style={styles.hubBody}>
              <Text style={styles.hubTitle}>{t('dashboard.coachTitle')}</Text>
              {data.coachPlan ? (
                <>
                  <Text style={styles.hubModel}>{data.coachPlan.model}</Text>
                  <Text style={styles.hubTip} numberOfLines={1}>{data.coachPlan.nextAction}</Text>
                </>
              ) : (
                <Text style={styles.hubSub}>{t('dashboard.coachSub')}</Text>
              )}
            </View>
            <Text style={styles.hubArrow}>›</Text>
          </Pressable>
        </Link>

        <Link href="/reports" asChild>
          <Pressable style={({ pressed }) => [styles.hubCard, pressed && styles.hubCardPressed]}>
            <Text style={styles.hubIcon}>📊</Text>
            <View style={styles.hubBody}>
              <Text style={styles.hubTitle}>{t('reports.title')}</Text>
              <Text style={styles.hubSub}>{t('reports.hubSub')}</Text>
            </View>
            <Text style={styles.hubArrow}>›</Text>
          </Pressable>
        </Link>

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <MoneyAIOverlay visible={aiOpen} onClose={() => setAiOpen(false)} />
      {langOpen && (
        <LanguagePicker
          onSelect={(l) => { setLanguage(l); setLangOpen(false); }}
          onClose={() => setLangOpen(false)}
        />
      )}
    </View>
  );
}

function DonutChart({
  segments,
  total,
  C,
  centerLabel,
  centerSub,
}: {
  segments: { val: number; color: string }[];
  total: number;
  C: number;
  centerLabel: string;
  centerSub: string;
}) {
  let acc = 0;

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutOuter}>
        <View style={styles.donutInner}>
          <Text style={styles.donutCenterLabel}>{centerLabel}</Text>
          <Text style={styles.donutCenterSub}>{centerSub}</Text>
        </View>
        {segments.map((s, i) => {
          const frac = total > 0 ? s.val / total : 0;
          acc += frac;
          return (
            <View
              key={i}
              style={[
                styles.donutSegment,
                {
                  borderColor: s.color,
                  opacity: frac > 0 ? 1 : 0,
                  transform: [{ rotate: `${(acc - frac) * 360}deg` }],
                  borderWidth: 10,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MC.bg },
  scroll: { flex: 1 },
  content: { padding: MS.lg, gap: MS.md },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MS.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.md,
    flex: 1,
  },
  greeting: { fontSize: 17, fontFamily: MF.bold, color: MC.ink },
  month: { fontSize: 12, fontFamily: MF.regular, color: MC.muted, marginTop: 1 },

  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.sm,
  },
  langBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langGlyph: { fontSize: 20 },
  horseBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MC.clay,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MC.clay,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  horseGlyph: { fontSize: 22, color: '#fff' },

  // Hero
  hero: {
    borderRadius: MR.xxl,
    padding: MS.xl,
    shadowColor: MC.emerald,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  heroLabel: {
    fontSize: 11,
    fontFamily: MF.semiBold,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroBig: {
    fontSize: 42,
    fontFamily: MF.bold,
    color: '#fff',
    lineHeight: 50,
    marginTop: 6,
  },
  heroLine: {
    height: 3,
    width: 48,
    backgroundColor: MC.gold,
    borderRadius: 2,
    marginVertical: 12,
  },
  heroRow: { flexDirection: 'row', gap: MS.xl },
  heroKey: {
    fontSize: 10,
    fontFamily: MF.medium,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroVal: {
    fontSize: 15,
    fontFamily: MF.bold,
    color: '#fff',
    marginTop: 3,
  },

  // Quick stats grid
  grid2: { flexDirection: 'row', gap: MS.sm },
  statCard: {
    flex: 1,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.lg,
    padding: MS.md,
  },
  statKey: { fontSize: 11, fontFamily: MF.medium, color: MC.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statVal: { fontSize: 22, fontFamily: MF.bold, marginTop: 4 },

  // Card base
  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
  },
  cardTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink, marginBottom: MS.md },

  // Donut
  donutWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: MS.lg },
  donutContainer: { width: 100, height: 100 },
  donutOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 16,
    borderColor: MC.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  donutInner: { alignItems: 'center' },
  donutCenterLabel: { fontSize: 14, fontFamily: MF.bold, color: MC.ink },
  donutCenterSub: { fontSize: 9, fontFamily: MF.medium, color: MC.muted },
  donutSegment: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },

  // Legend
  legend: { flex: 1, gap: MS.sm },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
  legDot: { width: 10, height: 10, borderRadius: 3 },
  legLabel: { flex: 1, fontSize: 13, fontFamily: MF.regular, color: MC.ink },
  legAmt: { fontSize: 13, fontFamily: MF.bold, color: MC.ink },

  indepBox: {
    backgroundColor: MC.goldLight,
    borderWidth: 1,
    borderColor: MC.goldBorder,
    borderRadius: MR.md,
    padding: MS.sm,
    marginTop: MS.sm,
  },
  indepTitle: { fontSize: 10, fontFamily: MF.bold, color: '#8A6D1E', textTransform: 'uppercase', letterSpacing: 0.5 },
  meterBg: { height: 7, backgroundColor: '#EFE6CE', borderRadius: 4, marginVertical: 6, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 4 },
  indepNote: { fontSize: 11, fontFamily: MF.regular, color: '#6B5A23', lineHeight: 16 },

  // History bars
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barFill: { width: '80%', borderRadius: 6, minHeight: 6 },
  barLabel: { fontSize: 10, fontFamily: MF.medium, color: MC.muted },
  barHint: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, marginTop: MS.sm },

  // Hub section
  sectionLabel: {
    fontSize: 11,
    fontFamily: MF.bold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: MS.xs,
  },
  hubCard: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.md,
  },
  hubCardPressed: { opacity: 0.7 },
  hubIcon: { fontSize: 28 },
  hubBody: { flex: 1 },
  hubTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink },
  hubSub: { fontSize: 12, fontFamily: MF.regular, color: MC.muted, marginTop: 2 },
  hubValRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  hubBadge: { fontSize: 11, fontFamily: MF.semiBold },
  hubModel: { fontSize: 13, fontFamily: MF.semiBold, color: MC.indigo, marginTop: 2 },
  hubTip: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, marginTop: 1 },
  hubArrow: { fontSize: 22, color: MC.muted },
});
