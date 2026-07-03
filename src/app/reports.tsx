import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { MF, MR, MS, fmt } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { CATEGORY_STYLE, type ExpenseCategory } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData, type MonthlyRecord } from '@/store/AppDataProvider';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, archiveCurrentMonth } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

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
    card:    { icon: '💳', color: C.clay,    label: t('expenses.methodCard')    },
    ewallet: { icon: '📱', color: C.indigo,  label: t('expenses.methodEwallet') },
    cash:    { icon: '💵', color: C.emerald, label: t('expenses.methodCash')    },
    bank:    { icon: '🏦', color: C.gold,    label: t('expenses.methodBank')    },
  };

  const catRows = data.byCategoryArray;
  const maxCat = Math.max(...catRows.map((r) => r.amt), 1);
  const totalCat = catRows.reduce((s, r) => s + r.amt, 0);

  const methodRows = (['card', 'ewallet', 'cash', 'bank'] as const)
    .map((m) => ({ method: m, amt: data.byMethod[m] }))
    .filter((r) => r.amt > 0)
    .sort((a, b) => b.amt - a.amt);
  const maxMethod = Math.max(...methodRows.map((r) => r.amt), 1);

  const maxHistNet = Math.max(...data.history.map((h) => Math.max(h.net, 0)), 1);

  const sortedRecords = useMemo(() =>
    [...(data.monthlyRecords ?? [])].sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    [data.monthlyRecords],
  );
  const activeRecord: MonthlyRecord | undefined = selectedMonthKey
    ? (sortedRecords.find((r) => r.monthKey === selectedMonthKey) ?? sortedRecords[0])
    : sortedRecords[0];

  const handleSaveMonth = () => {
    archiveCurrentMonth();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const activeRecordCats = activeRecord
    ? Object.entries(activeRecord.byCategory)
        .filter(([, v]) => (v ?? 0) > 0)
        .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0)) as [string, number][]
    : [];

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
        <Card>
          <Text style={styles.cardTitle}>{t('reports.incomeExpense')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: C.emerald }]}>{t('reports.income')}</Text>
              <Text style={[styles.summaryAmt, { color: C.emerald }]}>{fmt(data.income)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: C.clay }]}>{t('reports.expense')}</Text>
              <Text style={[styles.summaryAmt, { color: C.clay }]}>{fmt(data.expense)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={[styles.summaryLabel, { color: data.net >= 0 ? C.gold : C.clay }]}>
                {t('reports.net')}
              </Text>
              <Text style={[styles.summaryAmt, { color: data.net >= 0 ? C.gold : C.clay }]}>
                {fmt(Math.abs(data.net))}
              </Text>
            </View>
          </View>
          <View style={styles.meterBg}>
            <View style={[styles.meterFill, { width: `${Math.min(100, Math.max(0, data.savingsRate))}%` }]} />
          </View>
          <Text style={styles.meterLabel}>{data.savingsRate}% {t('dashboard.saved')}</Text>
        </Card>

        {/* Spending by category */}
        <Card>
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
                    <ProgressBar value={Math.max(4, (amt / maxCat) * 100)} color={s.fg} />
                    <Text style={styles.barPct}>{t('reports.ofTotal', { pct })}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Spending by payment method */}
        <Card>
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
                    <ProgressBar value={Math.max(4, (amt / maxMethod) * 100)} color={meta.color} />
                    <Text style={styles.barPct}>{t('reports.ofTotal', { pct })}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Savings trend */}
        <Card>
          <Text style={styles.cardTitle}>{t('reports.savingsTrend')}</Text>
          <View style={styles.trendBars}>
            {data.history.map((h, i) => {
              const isCurrent = i === data.history.length - 1;
              const net = Math.max(0, h.net);
              const barH = Math.max(6, (net / maxHistNet) * 80);
              const amtLabel = net > 0 ? fmt(net) : '–';
              return (
                <View key={h.month} style={styles.trendCol}>
                  <Text style={[styles.trendAmt, isCurrent && { color: C.gold }]}>
                    {amtLabel}
                  </Text>
                  <View style={[styles.trendFill, { height: barH, backgroundColor: isCurrent ? C.gold : C.emerald }]} />
                  <Text style={styles.trendLabel}>{h.month}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.trendHint}>{t('reports.trendHint')}</Text>
        </Card>

        {/* Monthly Records */}
        <Card>
          <View style={styles.monthlyHeader}>
            <Text style={styles.cardTitle}>{t('reports.monthlyRecords')}</Text>
            <Pressable
              style={({ pressed }) => [styles.saveMonthBtn, pressed && { opacity: 0.7 }]}
              onPress={handleSaveMonth}>
              <Text style={styles.saveMonthTxt}>
                {savedFlash ? t('reports.monthSaved') : t('reports.saveMonth')}
              </Text>
            </Pressable>
          </View>

          {sortedRecords.length === 0 ? (
            <Text style={styles.empty}>{t('reports.noRecords')}</Text>
          ) : (
            <>
              {/* Month pill selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.monthScroll}
                contentContainerStyle={styles.monthPills}>
                {sortedRecords.map((r) => {
                  const active = (selectedMonthKey ?? sortedRecords[0]?.monthKey) === r.monthKey;
                  return (
                    <Pressable
                      key={r.monthKey}
                      style={[styles.monthPill, active && { backgroundColor: C.emerald + '22', borderColor: C.emerald }]}
                      onPress={() => setSelectedMonthKey(r.monthKey)}>
                      <Text style={[styles.monthPillTxt, active && { color: C.emerald, fontFamily: MF.bold }]}>
                        {r.month}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Selected month summary */}
              {activeRecord && (
                <>
                  <View style={styles.mthSummaryRow}>
                    <View style={styles.mthSummaryCol}>
                      <Text style={[styles.mthSummaryLabel, { color: C.emerald }]}>{t('reports.income')}</Text>
                      <Text style={[styles.mthSummaryAmt, { color: C.emerald }]}>{fmt(activeRecord.income)}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.mthSummaryCol}>
                      <Text style={[styles.mthSummaryLabel, { color: C.clay }]}>{t('reports.expense')}</Text>
                      <Text style={[styles.mthSummaryAmt, { color: C.clay }]}>{fmt(activeRecord.expense)}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.mthSummaryCol}>
                      <Text style={[styles.mthSummaryLabel, { color: activeRecord.net >= 0 ? C.gold : C.clay }]}>
                        {t('reports.net')}
                      </Text>
                      <Text style={[styles.mthSummaryAmt, { color: activeRecord.net >= 0 ? C.gold : C.clay }]}>
                        {fmt(Math.abs(activeRecord.net))}
                      </Text>
                    </View>
                  </View>

                  {/* Category breakdown */}
                  <SectionLabel text={t('reports.byCategory')} style={styles.mthCatHeader} />
                  {activeRecordCats.length === 0 ? (
                    <Text style={styles.empty}>{t('reports.noSpend')}</Text>
                  ) : (
                    activeRecordCats.map(([cat, amt]) => {
                      const s = CATEGORY_STYLE[cat as keyof typeof CATEGORY_STYLE] ?? CATEGORY_STYLE.other;
                      const pct = activeRecord.expense > 0 ? Math.round((amt / activeRecord.expense) * 100) : 0;
                      const maxAmt = activeRecordCats[0]?.[1] ?? 1;
                      return (
                        <View key={cat} style={styles.barRow}>
                          <View style={[styles.catIcon, { backgroundColor: s.bg }]}>
                            <Text style={styles.catIconText}>{s.icon}</Text>
                          </View>
                          <View style={styles.barBody}>
                            <View style={styles.barTop}>
                              <Text style={styles.barRowLabel}>{catLabels[cat as keyof typeof catLabels] ?? cat}</Text>
                              <Text style={styles.barRowAmt}>{fmt(amt)}</Text>
                            </View>
                            <ProgressBar value={Math.max(4, (amt / maxAmt) * 100)} color={s.fg} />
                            <Text style={styles.barPct}>{t('reports.ofTotal', { pct })}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </Card>

        <View style={{ height: MS.xxl }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: MS.lg,
      paddingBottom: MS.md,
      backgroundColor: C.bg,
      gap: MS.md,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backArrow: { fontSize: 22, color: C.ink, lineHeight: 26 },
    headerText: { flex: 1 },
    title: { fontSize: 20, fontFamily: MF.bold, color: C.ink },
    subtitle: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 2 },

    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },

    cardTitle: { fontSize: 15, fontFamily: MF.bold, color: C.ink, marginBottom: MS.md },

    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: MS.md },
    summaryCol: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 10, fontFamily: MF.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryAmt: { fontSize: 15, fontFamily: MF.bold, marginTop: 4 },
    summaryDivider: { width: 1, height: 44, backgroundColor: C.line, marginTop: 4 },

    meterBg: { height: 7, backgroundColor: C.line, borderRadius: 4, overflow: 'hidden' },
    meterFill: { height: '100%', borderRadius: 4, backgroundColor: C.gold },
    meterLabel: { fontSize: 11, fontFamily: MF.medium, color: C.muted, marginTop: MS.xs, textAlign: 'right' },

    barRow: { flexDirection: 'row', alignItems: 'center', gap: MS.md, marginBottom: MS.md },
    catIcon: { width: 36, height: 36, borderRadius: MR.md, alignItems: 'center', justifyContent: 'center' },
    catIconText: { fontSize: 18 },
    barBody: { flex: 1 },
    barTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    barRowLabel: { fontSize: 13, fontFamily: MF.medium, color: C.ink },
    barRowAmt: { fontSize: 13, fontFamily: MF.bold, color: C.ink },
    barPct: { fontSize: 11, fontFamily: MF.regular, color: C.muted, marginTop: 3 },

    empty: { fontSize: 13, fontFamily: MF.regular, color: C.muted, textAlign: 'center', paddingVertical: MS.md },

    trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 108 },
    trendCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
    trendAmt: { fontSize: 9, fontFamily: MF.medium, color: C.muted },
    trendFill: { width: '80%', borderRadius: 5 },
    trendLabel: { fontSize: 10, fontFamily: MF.medium, color: C.muted },
    trendHint: { fontSize: 11, fontFamily: MF.regular, color: C.muted, marginTop: MS.sm },

    monthlyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: MS.md },
    saveMonthBtn: {
      paddingHorizontal: MS.md, paddingVertical: 7,
      borderRadius: MR.md, backgroundColor: C.emerald + '22',
      borderWidth: 1, borderColor: C.emerald,
    },
    saveMonthTxt: { fontSize: 11, fontFamily: MF.bold, color: C.emerald },

    monthScroll: { marginBottom: MS.md },
    monthPills: { gap: MS.sm, paddingBottom: 2 },
    monthPill: {
      paddingHorizontal: MS.md, paddingVertical: 7,
      borderRadius: MR.md, borderWidth: 1, borderColor: C.line,
      backgroundColor: C.card,
    },
    monthPillTxt: { fontSize: 12, fontFamily: MF.medium, color: C.muted },

    mthSummaryRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: MS.md },
    mthSummaryCol: { flex: 1, alignItems: 'center' },
    mthSummaryLabel: { fontSize: 10, fontFamily: MF.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
    mthSummaryAmt: { fontSize: 14, fontFamily: MF.bold, marginTop: 4 },

    mthCatHeader: { marginBottom: MS.md },
  });
}
