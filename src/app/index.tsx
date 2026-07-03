import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarDisplay } from '@/components/avatar-display';
import { MoneyAIOverlay } from '@/components/money-ai-overlay';
import { Card } from '@/components/ui/Card';
import { HeroCard } from '@/components/ui/HeroCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatPill } from '@/components/ui/StatPill';
import { MF, MS, fmt } from '@/constants/money-theme';
import { shadow } from '@/constants/shadow';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [aiOpen, setAiOpen] = useState(false);
  const { data } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const maxHistNet = Math.max(...data.history.map((h) => h.net), 1);

  const incomeSplit = [
    { label: t('dashboard.salaryLabel'), val: data.salary, color: C.emerald },
    { label: t('dashboard.sideLabel'),   val: data.side,   color: C.gold   },
  ];

  const initials = data.name.slice(0, 2).toUpperCase();
  const portfolioVal = data.portfolioValue ?? 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
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
          <Pressable style={styles.horseBadge} onPress={() => setAiOpen(true)}>
            <Text style={styles.horseGlyph}>♞</Text>
          </Pressable>
        </View>

        {/* Hero */}
        <HeroCard
          gradient={[C.emerald, C.emeraldDark]}
          shadowColor={C.emerald}
          label={t('dashboard.heroLabel')}
          amount={fmt(data.net)}>
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
        </HeroCard>

        {/* Stats pills */}
        <View style={styles.statsRow}>
          <StatPill value={fmt(data.side)} label={t('dashboard.sideIncome')} valueColor={C.gold} />
          <StatPill value={fmt(data.byMethod.card)} label={t('dashboard.onCard')} valueColor={C.clay} />
          <StatPill value={fmt(portfolioVal)} label="Portfolio" />
        </View>

        {/* Income split — horizontal bars */}
        <Card gap={MS.md}>
          <Text style={styles.cardTitle}>{t('dashboard.incomeSplit')}</Text>
          {incomeSplit.map((s) => {
            const pct = data.income > 0 ? Math.round((s.val / data.income) * 100) : 0;
            return (
              <View key={s.label} style={styles.splitRow}>
                <View style={[styles.splitDot, { backgroundColor: s.color }]} />
                <View style={styles.splitBody}>
                  <View style={styles.splitTop}>
                    <Text style={styles.splitLabel}>{s.label}</Text>
                    <Text style={styles.splitAmt}>{fmt(s.val)}</Text>
                  </View>
                  <ProgressBar value={Math.max(4, pct)} color={s.color} />
                  <Text style={styles.splitPct}>{pct}% of income</Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* Savings history */}
        <Card gap={MS.md}>
          <Text style={styles.cardTitle}>{t('dashboard.savingsHistory')}</Text>
          <View style={styles.bars}>
            {data.history.map((h, i) => {
              const isCurrent = i === data.history.length - 1;
              const barH = Math.max(6, (h.net / maxHistNet) * 84);
              return (
                <View key={h.month} style={styles.barCol}>
                  <View style={[styles.histBar, { height: barH, backgroundColor: isCurrent ? C.gold : C.emerald }]} />
                  <Text style={styles.barLabel}>{h.month}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.barHint}>{t('dashboard.historyHint')}</Text>
        </Card>

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <MoneyAIOverlay visible={aiOpen} onClose={() => setAiOpen(false)} />
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },

    // ── Header ──
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: MS.sm },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: MS.md, flex: 1 },
    greeting: { fontSize: 17, fontFamily: MF.bold, color: C.ink },
    month: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 1 },
    horseBadge: {
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: C.clay, alignItems: 'center', justifyContent: 'center',
      ...shadow(C.clay, 0, 4, 8, 0.4), elevation: 6,
    },
    horseGlyph: { fontSize: 22, color: '#fff' },

    // ── Hero sub-row (rendered inside HeroCard) ──
    heroLine: { height: 3, width: 48, backgroundColor: C.gold, borderRadius: 2, marginVertical: 12 },
    heroRow: { flexDirection: 'row', gap: MS.xl },
    heroKey: { fontSize: 10, fontFamily: MF.medium, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroVal: { fontSize: 15, fontFamily: MF.bold, color: '#fff', marginTop: 3 },

    // ── Stats row ──
    statsRow: { flexDirection: 'row', gap: MS.sm },

    // ── Card title ──
    cardTitle: { fontSize: 15, fontFamily: MF.bold, color: C.ink },

    // ── Income split bars ──
    splitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: MS.sm },
    splitDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0, marginTop: 4 },
    splitBody: { flex: 1, gap: 3 },
    splitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    splitLabel: { fontSize: 13, fontFamily: MF.medium, color: C.ink },
    splitAmt: { fontSize: 13, fontFamily: MF.bold, color: C.ink },
    splitPct: { fontSize: 11, fontFamily: MF.regular, color: C.muted, marginTop: 3 },

    // ── Savings history ──
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    histBar: { width: '80%', borderRadius: 6, minHeight: 6 },
    barLabel: { fontSize: 10, fontFamily: MF.medium, color: C.muted },
    barHint: { fontSize: 11, fontFamily: MF.regular, color: C.muted },
  });
}
