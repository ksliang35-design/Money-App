import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoalEditModal, type GoalModalMode } from '@/components/goal-edit-modal';
import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { type Goal } from '@/constants/mock-data';
import { useAppData } from '@/store/AppDataProvider';

function GoalCard({ goal, monthlyNet, onPress }: { goal: Goal; monthlyNet: number; onPress: () => void }) {
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
            {fmt(goal.saved)} of {fmt(goal.target)}
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
        <Text style={styles.goalRemain}>{fmt(remaining)} to go</Text>
        {monthsLeft !== null && (
          <Text style={styles.goalTime}>~{monthsLeft} mo at 25% of surplus</Text>
        )}
      </View>
    </Pressable>
  );
}

export default function InvestScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useAppData();
  const [modalMode, setModalMode] = useState<GoalModalMode>(null);

  const MONTHLY_SURPLUS = data.net;
  const totalSaved = data.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = data.goals.reduce((s, g) => s + g.target, 0);
  const overallPct = Math.round((totalSaved / totalTarget) * 100);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.screenTitle}>Invest & Goals</Text>
        <Text style={styles.screenSub}>Track your savings targets</Text>

        {/* Overview hero */}
        <LinearGradient
          colors={[MC.indigo, '#4848C0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>Total saved across goals</Text>
          <Text style={styles.heroBig}>{fmt(totalSaved)}</Text>
          <View style={styles.heroLine} />
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroKey}>Target</Text>
              <Text style={styles.heroVal}>{fmt(totalTarget)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>Remaining</Text>
              <Text style={styles.heroVal}>{fmt(totalTarget - totalSaved)}</Text>
            </View>
            <View>
              <Text style={styles.heroKey}>Overall</Text>
              <Text style={styles.heroVal}>{overallPct}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Monthly surplus card */}
        <View style={styles.surplusCard}>
          <View style={styles.surplusLeft}>
            <Text style={styles.surplusLabel}>Monthly surplus available</Text>
            <Text style={styles.surplusAmt}>{fmt(MONTHLY_SURPLUS)}</Text>
          </View>
          <View style={styles.surplusTip}>
            <Text style={styles.surplusTipText}>Allocate 25% → {fmt(MONTHLY_SURPLUS * 0.25)}/mo per goal</Text>
          </View>
        </View>

        {/* Goals */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Your savings goals</Text>
          <Pressable style={styles.addBtn} onPress={() => setModalMode({ type: 'add' })}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>
        {data.goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            monthlyNet={MONTHLY_SURPLUS}
            onPress={() => setModalMode({ type: 'edit', goal: g })}
          />
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ♞ These are savings goals, not investment advice. Consult a licensed financial advisor before any investment decision.
          </Text>
        </View>

        {/* Side hustle calculator */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Side hustle impact</Text>
          <Text style={styles.calcSub}>
            Your side income ({fmt(data.side)}/mo) contributes{' '}
            <Text style={styles.calcHighlight}>{data.sideShare}%</Text> of total income.
          </Text>
          <View style={styles.calcRows}>
            <View style={styles.calcRow}>
              <Text style={styles.calcRowLabel}>If side income doubles</Text>
              <Text style={[styles.calcRowVal, { color: MC.emerald }]}>{fmt(data.side * 2)}/mo extra</Text>
            </View>
            <View style={styles.calcRow}>
              <Text style={styles.calcRowLabel}>Emergency fund in</Text>
              <Text style={[styles.calcRowVal, { color: MC.gold }]}>
                {Math.ceil((12000 - 3000) / (data.net * 0.25))} months
              </Text>
            </View>
            <View style={[styles.calcRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.calcRowLabel}>Business capital in</Text>
              <Text style={[styles.calcRowVal, { color: MC.indigo }]}>
                {Math.ceil((5000 - 600) / (data.net * 0.15))} months
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <GoalEditModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MC.bg },
  scroll: { flex: 1 },
  content: { padding: MS.lg, gap: MS.md },

  screenTitle: { fontSize: 26, fontFamily: MF.bold, color: MC.ink },
  screenSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, marginTop: -MS.sm },

  hero: {
    borderRadius: MR.xxl,
    padding: MS.xl,
    shadowColor: MC.indigo,
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
  heroRow: { flexDirection: 'row', gap: MS.xl },
  heroKey: { fontSize: 10, fontFamily: MF.medium, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroVal: { fontSize: 15, fontFamily: MF.bold, color: '#fff', marginTop: 3 },

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

  disclaimer: {
    backgroundColor: '#F4F7F5',
    borderRadius: MR.lg,
    padding: MS.md,
  },
  disclaimerText: { fontSize: 11.5, fontFamily: MF.regular, color: MC.muted, lineHeight: 17 },

  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.md,
  },
  cardTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink },
  calcSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, lineHeight: 20 },
  calcHighlight: { fontFamily: MF.bold, color: MC.emeraldDark },
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
