import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { CATEGORY_STYLE, type ExpenseCategory } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data } = useAppData();
  const t = useT();

  const catLabels: Record<ExpenseCategory, string> = {
    food:          t('expenses.categoryFood'),
    transport:     t('expenses.categoryTransport'),
    shopping:      t('expenses.categoryShopping'),
    bills:         t('expenses.categoryBills'),
    entertainment: t('expenses.categoryEntertainment'),
    health:        t('expenses.categoryHealth'),
    education:     t('expenses.categoryEducation'),
    other:         t('expenses.categoryOther'),
  };

  const methodMeta: Record<string, { icon: string; color: string; label: string }> = {
    card:    { icon: '💳', color: MC.clay,    label: t('expenses.methodCard')    },
    ewallet: { icon: '📱', color: MC.indigo,  label: t('expenses.methodEwallet') },
    cash:    { icon: '💵', color: MC.emerald, label: t('expenses.methodCash')    },
    bank:    { icon: '🏦', color: MC.gold,    label: t('expenses.methodBank')    },
  };

  const ALL_CATS: ExpenseCategory[] = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
  const catRows = ALL_CATS
    .map((cat) => ({ cat, amt: data.byCategory[cat] ?? 0 }))
    .filter((r) => r.amt > 0)
    .sort((a, b) => b.amt - a.amt);
  const maxCat = Math.max(...catRows.map((r) => r.amt), 1);
  const totalCat = catRows.reduce((s, r) => s + r.amt, 0);

  const methodRows = (['card', 'ewallet', 'cash', 'bank'] as const)
    .map((m) => ({ method: m, amt: data.byMethod[m] }))
    .filter((r) => r.amt > 0)
    .sort((a, b) => b.amt - a.amt);
  const maxMethod = Math.max(...methodRows.map((r) => r.amt), 1);

  const maxHistNet = Math.max(...data.history.map((h) => Math.max(h.net, 0)), 1);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('reports.title')}</Text>
          <Text style={styles.subtitle}>{t('reports.sub', { month: data.month })}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* Income vs Expense */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('reports.incomeExpense')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: MC.emerald }]}>{t('reports.income')}</Text>
              <Text style={[styles.summaryAmt, { color: MC.emerald }]}>{fmt(data.income)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: MC.clay }]}>{t('reports.expense')}</Text>
              <Text style={[styles.summaryAmt, { color: MC.clay }]}>{fmt(data.expense)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: data.net >= 0 ? MC.gold : MC.clay }]}>
                {t('reports.net')}
              </Text>
              <Text style={[styles.summaryAmt, { color: data.net >= 0 ? MC.gold : MC.clay }]}>
                {fmt(Math.abs(data.net))}
              </Text>
            </View>
          </View>
          <View style={styles.meterBg}>
            <View style={[styles.meterFill, { width: `${Math.min(100, Math.max(0, data.savingsRate))}%` }]} />
          </View>
          <Text style={styles.meterLabel}>{data.savingsRate}% {t('dashboard.saved')}</Text>
        </View>

        {/* Spending by category */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('reports.byCategory')}</Text>
          {catRows.length === 0 ? (
            <Text style={styles.empty}>{t('reports.noSpend')}</Text>
          ) : (
            catRows.map(({ cat, amt }) => {
              const s = CATEGORY_STYLE[cat];
              const pct = totalCat > 0 ? Math.round((amt / totalCat) * 100) : 0;
              return (
                <View key={cat} style={styles.barRow}>
                  <View style={[styles.catIcon, { backgroundColor: s.bg }]}>
                    <Text style={styles.catIconText}>{s.icon}</Text>
                  </View>
                  <View style={styles.barBody}>
                    <View style={styles.barTop}>
                      <Text style={styles.barRowLabel}>{catLabels[cat]}</Text>
                      <Text style={styles.barRowAmt}>{fmt(amt)}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(4, (amt / maxCat) * 100)}%`, backgroundColor: s.fg }]} />
                    </View>
                    <Text style={styles.barPct}>{t('reports.ofTotal', { pct })}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Spending by payment method */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('reports.byMethod')}</Text>
          {methodRows.length === 0 ? (
            <Text style={styles.empty}>{t('reports.noSpend')}</Text>
          ) : (
            methodRows.map(({ method, amt }) => {
              const meta = methodMeta[method];
              const pct = data.expense > 0 ? Math.round((amt / data.expense) * 100) : 0;
              return (
                <View key={method} style={styles.barRow}>
                  <View style={[styles.catIcon, { backgroundColor: meta.color + '22' }]}>
                    <Text style={styles.catIconText}>{meta.icon}</Text>
                  </View>
                  <View style={styles.barBody}>
                    <View style={styles.barTop}>
                      <Text style={styles.barRowLabel}>{meta.label}</Text>
                      <Text style={styles.barRowAmt}>{fmt(amt)}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(4, (amt / maxMethod) * 100)}%`, backgroundColor: meta.color }]} />
                    </View>
                    <Text style={styles.barPct}>{t('reports.ofTotal', { pct })}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Savings trend */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('reports.savingsTrend')}</Text>
          <View style={styles.trendBars}>
            {data.history.map((h, i) => {
              const isCurrent = i === data.history.length - 1;
              const net = Math.max(0, h.net);
              const barH = Math.max(6, (net / maxHistNet) * 80);
              const amtLabel = net >= 1000 ? `RM${Math.round(net / 1000)}k` : net > 0 ? `RM${Math.round(net)}` : '–';
              return (
                <View key={h.month} style={styles.trendCol}>
                  <Text style={[styles.trendAmt, isCurrent && { color: MC.gold }]}>
                    {amtLabel}
                  </Text>
                  <View style={[styles.trendFill, { height: barH, backgroundColor: isCurrent ? MC.gold : MC.emerald }]} />
                  <Text style={styles.trendLabel}>{h.month}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.trendHint}>{t('reports.trendHint')}</Text>
        </View>

        <View style={{ height: MS.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MC.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MS.lg,
    paddingBottom: MS.md,
    backgroundColor: MC.bg,
    gap: MS.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 22, color: MC.ink, lineHeight: 26 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontFamily: MF.bold, color: MC.ink },
  subtitle: { fontSize: 12, fontFamily: MF.regular, color: MC.muted, marginTop: 2 },

  scroll: { flex: 1 },
  content: { padding: MS.lg, gap: MS.md },

  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
  },
  cardTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink, marginBottom: MS.md },

  // Income vs Expense summary
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: MS.md },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontFamily: MF.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmt: { fontSize: 15, fontFamily: MF.bold, marginTop: 4 },
  summaryDivider: { width: 1, height: 44, backgroundColor: MC.line, marginTop: 4 },

  meterBg: { height: 7, backgroundColor: MC.line, borderRadius: 4, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 4, backgroundColor: MC.gold },
  meterLabel: { fontSize: 11, fontFamily: MF.medium, color: MC.muted, marginTop: MS.xs, textAlign: 'right' },

  // Horizontal bar rows (category + method)
  barRow: { flexDirection: 'row', alignItems: 'center', gap: MS.md, marginBottom: MS.md },
  catIcon: { width: 36, height: 36, borderRadius: MR.md, alignItems: 'center', justifyContent: 'center' },
  catIconText: { fontSize: 18 },
  barBody: { flex: 1 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  barRowLabel: { fontSize: 13, fontFamily: MF.medium, color: MC.ink },
  barRowAmt: { fontSize: 13, fontFamily: MF.bold, color: MC.ink },
  barTrack: { height: 8, backgroundColor: MC.line, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barPct: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, marginTop: 3 },

  empty: { fontSize: 13, fontFamily: MF.regular, color: MC.muted, textAlign: 'center', paddingVertical: MS.md },

  // Savings trend vertical bars
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 108 },
  trendCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  trendAmt: { fontSize: 9, fontFamily: MF.medium, color: MC.muted },
  trendFill: { width: '80%', borderRadius: 5 },
  trendLabel: { fontSize: 10, fontFamily: MF.medium, color: MC.muted },
  trendHint: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, marginTop: MS.sm },
});
