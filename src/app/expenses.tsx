import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpenseEditModal, type ExpenseModalMode } from '@/components/expense-edit-modal';
import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { type Expense } from '@/constants/mock-data';
import { useAppData } from '@/store/AppDataProvider';

type Method = 'all' | 'card' | 'ewallet' | 'cash' | 'bank';

const METHODS: Record<string, { label: string; icon: string; color: string }> = {
  card: { label: 'Credit Card', icon: '💳', color: MC.clay },
  ewallet: { label: 'E-wallet', icon: '📱', color: MC.indigo },
  cash: { label: 'Cash', icon: '💵', color: MC.emerald },
  bank: { label: 'Bank/Debit', icon: '🏦', color: MC.gold },
};

const FILTER_OPTIONS: { key: Method; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'card', label: '💳 Card' },
  { key: 'ewallet', label: '📱 E-wallet' },
  { key: 'cash', label: '💵 Cash' },
  { key: 'bank', label: '🏦 Bank' },
];

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Method>('all');
  const [modalMode, setModalMode] = useState<ExpenseModalMode>(null);
  const { data } = useAppData();

  const shown: Expense[] =
    filter === 'all'
      ? data.expenses
      : data.expenses.filter((e) => e.method === filter);

  const cardTotal = data.byMethod.card;
  const cardPct = Math.round((cardTotal / data.expense) * 100);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Expenses</Text>
            <Text style={styles.screenSub}>{data.month} · {fmt(data.expense)} total</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => setModalMode({ type: 'add' })}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        {/* Card spotlight */}
        <LinearGradient
          colors={[MC.clay, '#9A3F2B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardSpot}>
          <Text style={styles.spotTop}>💳 On credit card</Text>
          <Text style={styles.spotAmt}>{fmt(cardTotal)}</Text>
          <Text style={styles.spotSub}>{cardPct}% of spending · this is what you'll owe</Text>
        </LinearGradient>

        {/* By method grid */}
        <View style={styles.methGrid}>
          {Object.entries(METHODS).map(([key, m]) => (
            <View key={key} style={[styles.methCard, { borderLeftColor: m.color }]}>
              <Text style={styles.methLabel}>{m.icon} {m.label}</Text>
              <Text style={styles.methAmt}>{fmt(data.byMethod[key as keyof typeof data.byMethod])}</Text>
            </View>
          ))}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {FILTER_OPTIONS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}>
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Expense list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {filter === 'all' ? 'All expenses' : `${METHODS[filter]?.label ?? ''} expenses`}
          </Text>
          {shown.map((e, i) => {
            const m = METHODS[e.method];
            const pct = data.expense > 0 ? (e.amount / data.expense) * 100 : 0;
            return (
              <Pressable
                key={e.id}
                style={({ pressed }) => [
                  styles.expRow,
                  i < shown.length - 1 && styles.expRowBorder,
                  pressed && styles.expRowPressed,
                ]}
                onPress={() => setModalMode({ type: 'edit', expense: e })}>
                <View style={[styles.expBar, { backgroundColor: m?.color ?? MC.muted }]} />
                <Text style={styles.expIcon}>{m?.icon ?? '•'}</Text>
                <View style={styles.expMid}>
                  <Text style={styles.expLabel}>{e.label}</Text>
                  <View style={styles.expMeterBg}>
                    <View style={[styles.expMeterFill, { width: `${pct}%`, backgroundColor: m?.color ?? MC.muted }]} />
                  </View>
                </View>
                <Text style={styles.expAmt}>{fmt(e.amount)}</Text>
                <Text style={styles.expEditArrow}>›</Text>
              </Pressable>
            );
          })}
          {shown.length === 0 && (
            <Text style={styles.emptyText}>No expenses in this category.</Text>
          )}
        </View>

        {/* Total row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total {filter === 'all' ? 'expenses' : METHODS[filter]?.label}</Text>
          <Text style={styles.totalAmt}>
            {fmt(shown.reduce((s, e) => s + e.amount, 0))}
          </Text>
        </View>

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <ExpenseEditModal
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: { fontSize: 26, fontFamily: MF.bold, color: MC.ink },
  screenSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MC.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MC.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  addBtnText: { fontSize: 24, color: '#fff', lineHeight: 28, fontFamily: MF.regular },

  cardSpot: {
    borderRadius: MR.xxl,
    padding: MS.xl,
    gap: MS.sm,
    shadowColor: MC.clay,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  spotTop: { fontSize: 12, fontFamily: MF.semiBold, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: 0.6 },
  spotAmt: { fontSize: 38, fontFamily: MF.bold, color: '#fff', lineHeight: 46 },
  spotSub: { fontSize: 12, fontFamily: MF.regular, color: 'rgba(255,255,255,0.85)' },

  methGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MS.sm },
  methCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderLeftWidth: 4,
    borderRadius: MR.md,
    padding: MS.md,
    gap: 3,
  },
  methLabel: { fontSize: 11, fontFamily: MF.medium, color: MC.muted },
  methAmt: { fontSize: 16, fontFamily: MF.bold, color: MC.ink },

  filterScroll: { flexShrink: 0 },
  filterContent: { gap: MS.sm, paddingVertical: 2 },
  chip: {
    paddingHorizontal: MS.md,
    paddingVertical: MS.sm,
    borderRadius: 999,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
  },
  chipActive: { backgroundColor: MC.emerald, borderColor: MC.emerald },
  chipText: { fontSize: 12.5, fontFamily: MF.semiBold, color: MC.ink },
  chipTextActive: { color: '#fff' },

  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
  },
  cardTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink, marginBottom: MS.md },

  expRow: { flexDirection: 'row', alignItems: 'center', gap: MS.sm, paddingVertical: MS.sm },
  expRowBorder: { borderBottomWidth: 1, borderBottomColor: MC.line },
  expRowPressed: { opacity: 0.6 },
  expEditArrow: { fontSize: 18, color: MC.muted, marginLeft: 2 },
  expBar: { width: 4, alignSelf: 'stretch', borderRadius: 3 },
  expIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  expMid: { flex: 1 },
  expLabel: { fontSize: 14, fontFamily: MF.medium, color: MC.ink },
  expMeterBg: { height: 3, backgroundColor: MC.line, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  expMeterFill: { height: '100%', borderRadius: 2 },
  expAmt: { fontSize: 14, fontFamily: MF.bold, color: MC.ink },

  emptyText: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, textAlign: 'center', paddingVertical: MS.lg },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.lg,
    padding: MS.lg,
  },
  totalLabel: { fontSize: 14, fontFamily: MF.medium, color: MC.muted },
  totalAmt: { fontSize: 20, fontFamily: MF.bold, color: MC.ink },
});
