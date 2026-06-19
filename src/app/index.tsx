import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoneyAIOverlay } from '@/components/money-ai-overlay';
import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { useAppData } from '@/store/AppDataProvider';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [aiOpen, setAiOpen] = useState(false);
  const { data } = useAppData();

  const maxHistNet = Math.max(...data.history.map((h) => h.net), 1);
  const sideShare = data.sideShare;
  const C = 2 * Math.PI * 46;
  const segments = [
    { label: 'Salary', val: data.salary, color: MC.emerald },
    { label: 'Side income', val: data.side, color: MC.gold },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good morning, {data.name} 👋</Text>
            <Text style={styles.month}>{data.month}</Text>
          </View>
          <Pressable style={styles.horseBadge} onPress={() => setAiOpen(true)}>
            <Text style={styles.horseGlyph}>♞</Text>
          </Pressable>
        </View>

        {/* Hero card */}
        <LinearGradient
          colors={[MC.emerald, MC.emeraldDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>Left over this month</Text>
          <Text style={styles.heroBig}>{fmt(data.net)}</Text>
          <View style={styles.heroLine} />
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroKey}>Money in</Text>
              <Text style={styles.heroVal}>{fmt(data.income)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>Money out</Text>
              <Text style={styles.heroVal}>{fmt(data.expense)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>Saved</Text>
              <Text style={styles.heroVal}>{data.savingsRate}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick stats */}
        <View style={styles.grid2}>
          <View style={styles.statCard}>
            <Text style={styles.statKey}>Side income</Text>
            <Text style={[styles.statVal, { color: MC.gold }]}>{fmt(data.side)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statKey}>On credit card</Text>
            <Text style={[styles.statVal, { color: MC.clay }]}>{fmt(data.byMethod.card)}</Text>
          </View>
        </View>

        {/* Income split */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Income split</Text>
          <View style={styles.donutWrap}>
            <DonutChart segments={segments} total={data.income} C={C} centerLabel={`${sideShare}%`} centerSub="side" />
            <View style={styles.legend}>
              {segments.map((s) => (
                <View key={s.label} style={styles.legRow}>
                  <View style={[styles.legDot, { backgroundColor: s.color }]} />
                  <Text style={styles.legLabel}>{s.label}</Text>
                  <Text style={styles.legAmt}>{fmt(s.val)}</Text>
                </View>
              ))}
              <View style={[styles.indepBox]}>
                <Text style={styles.indepTitle}>Independence meter</Text>
                <View style={styles.meterBg}>
                  <View style={[styles.meterFill, { width: `${Math.min(100, sideShare)}%`, backgroundColor: MC.gold }]} />
                </View>
                <Text style={styles.indepNote}>
                  {sideShare}% from side streams.{' '}
                  {sideShare < 30 ? 'Grow toward 30% for a real cushion.' : 'Strong side income pillar!'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Savings history */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Savings history</Text>
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
          <Text style={styles.barHint}>Current month highlighted in gold</Text>
        </View>

        {/* AI nudge */}
        <Pressable style={styles.aiNudge} onPress={() => setAiOpen(true)}>
          <Text style={styles.aiNudgeHorse}>♞</Text>
          <View style={styles.aiNudgeText}>
            <Text style={styles.aiNudgeTitle}>Talk to Money AI</Text>
            <Text style={styles.aiNudgeSub}>Ask about your spending, goals, or savings</Text>
          </View>
          <Text style={styles.aiNudgeArrow}>›</Text>
        </Pressable>

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <MoneyAIOverlay visible={aiOpen} onClose={() => setAiOpen(false)} />
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
  const r = 46;
  const size = 112;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={styles.donutContainer}>
      {/* SVG-like using Views – we'll use a simple approach with borders */}
      <View style={styles.donutOuter}>
        <View style={styles.donutInner}>
          <Text style={styles.donutCenterLabel}>{centerLabel}</Text>
          <Text style={styles.donutCenterSub}>{centerSub}</Text>
        </View>
        {/* Percentage arcs as colored borders overlay - simplified representation */}
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MS.sm,
  },
  greeting: { fontSize: 20, fontFamily: MF.bold, color: MC.ink },
  month: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, marginTop: 2 },

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

  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
  },
  cardTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink, marginBottom: MS.md },

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

  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 100 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barFill: { width: '80%', borderRadius: 6, minHeight: 6 },
  barLabel: { fontSize: 10, fontFamily: MF.medium, color: MC.muted },
  barHint: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, marginTop: MS.sm },

  aiNudge: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.md,
  },
  aiNudgeHorse: { fontSize: 28, color: MC.clay },
  aiNudgeText: { flex: 1 },
  aiNudgeTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink },
  aiNudgeSub: { fontSize: 12, fontFamily: MF.regular, color: MC.muted, marginTop: 2 },
  aiNudgeArrow: { fontSize: 22, color: MC.muted },
});
