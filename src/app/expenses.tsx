import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpenseEditModal, type ExpenseModalMode } from '@/components/expense-edit-modal';
import { MF, MR, MS, fmt } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { type Expense, type ExpenseCategory, CATEGORY_STYLE } from '@/constants/mock-data';
import { parseExpense, type ParsedExpense } from '@/lib/quickadd';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

type Method = 'all' | 'card' | 'ewallet' | 'cash' | 'bank';
type ExpenseMethod = 'card' | 'ewallet' | 'cash' | 'bank';

const ALL_CATEGORIES: ExpenseCategory[] = [
  'food', 'transport', 'shopping', 'bills',
  'entertainment', 'health', 'education', 'other',
];

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Method>('all');
  const [modalMode, setModalMode] = useState<ExpenseModalMode>(null);
  const { data, addExpense } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const qa = useMemo(() => makeQaStyles(C), [C]);

  const METHODS: Record<string, { label: string; icon: string; color: string }> = {
    card: { label: t('expenses.methodCard'), icon: '💳', color: C.clay },
    ewallet: { label: t('expenses.methodEwallet'), icon: '📱', color: C.indigo },
    cash: { label: t('expenses.methodCash'), icon: '💵', color: C.emerald },
    bank: { label: t('expenses.methodBank'), icon: '🏦', color: C.gold },
  };

  const FILTER_OPTIONS: { key: Method; label: string }[] = [
    { key: 'all', label: t('expenses.filterAll') },
    { key: 'card', label: t('expenses.filterCard') },
    { key: 'ewallet', label: t('expenses.filterEwallet') },
    { key: 'cash', label: t('expenses.filterCash') },
    { key: 'bank', label: t('expenses.filterBank') },
  ];

  const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    food:          t('expenses.categoryFood'),
    transport:     t('expenses.categoryTransport'),
    shopping:      t('expenses.categoryShopping'),
    bills:         t('expenses.categoryBills'),
    entertainment: t('expenses.categoryEntertainment'),
    health:        t('expenses.categoryHealth'),
    education:     t('expenses.categoryEducation'),
    other:         t('expenses.categoryOther'),
  };

  const activeCats = ALL_CATEGORIES
    .map((c) => ({ cat: c, amt: data.byCategory[c] }))
    .filter((x) => x.amt > 0)
    .sort((a, b) => b.amt - a.amt);

  const [quickOpen, setQuickOpen] = useState(false);
  const [qaText, setQaText] = useState('');
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<ParsedExpense | null>(null);
  const [qaMethod, setQaMethod] = useState<ExpenseMethod>('card');
  const [qaError, setQaError] = useState<string | null>(null);

  const shown: Expense[] =
    filter === 'all'
      ? data.expenses
      : data.expenses.filter((e) => e.method === filter);

  function handleQuickClose() {
    setQuickOpen(false);
    setQaText('');
    setQaLoading(false);
    setQaResult(null);
    setQaError(null);
  }

  async function handleParse() {
    if (!qaText.trim() || qaLoading) return;
    setQaLoading(true);
    setQaResult(null);
    setQaError(null);
    try {
      const result = await parseExpense(qaText.trim());
      setQaResult(result);
      if (result.isExpense && result.method) {
        setQaMethod(result.method as ExpenseMethod);
      }
    } catch (e: any) {
      setQaError(e?.message ?? 'Parse failed');
    } finally {
      setQaLoading(false);
    }
  }

  function handleQuickConfirm() {
    if (!qaResult?.isExpense) return;
    addExpense({ label: qaResult.label, amount: qaResult.amount, method: qaMethod, category: qaResult.category });
    handleQuickClose();
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>{t('expenses.title')}</Text>
            <Text style={styles.screenSub}>{data.month}</Text>
          </View>
          <View style={styles.headerBtns}>
            <Pressable
              style={styles.quickAddBtn}
              onPress={() => setQuickOpen(true)}>
              <Text style={styles.quickAddBtnText}>{t('expenses.quickAdd')}</Text>
            </Pressable>
            <Pressable
              style={styles.addBtn}
              onPress={() => setModalMode({ type: 'add' })}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Overall summary */}
        <View style={styles.summaryBanner}>
          <Text style={styles.summaryLabel}>{t('expenses.summaryLabel')}</Text>
          <Text style={styles.summaryAmt}>{fmt(data.expense)}</Text>
        </View>

        {/* By method grid */}
        <View style={styles.methGrid}>
          {Object.entries(METHODS).map(([key, m]) => {
            const active = filter === key;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter((f) => (f === key ? 'all' : key as Method))}
                style={({ pressed }) => [
                  styles.methCard,
                  active
                    ? { borderColor: m.color + '66', borderLeftColor: m.color, backgroundColor: m.color + '12' }
                    : { borderLeftColor: m.color },
                  pressed && styles.methCardPressed,
                ]}>
                <Text style={styles.methLabel}>{m.icon} {m.label}</Text>
                <Text style={[styles.methAmt, active && { color: m.color }]}>
                  {fmt(data.byMethod[key as keyof typeof data.byMethod])}
                </Text>
                {active && <Text style={[styles.methActiveHint, { color: m.color }]}>✓ filtering</Text>}
              </Pressable>
            );
          })}
        </View>

        {/* Category breakdown */}
        {activeCats.length > 0 && (
          <View>
            <Text style={styles.sectionLabel}>{t('expenses.categoryBreakdown')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}>
              {activeCats.map(({ cat, amt }) => {
                const s = CATEGORY_STYLE[cat];
                return (
                  <View key={cat} style={[styles.catCard, { borderLeftColor: s.fg }]}>
                    <Text style={styles.catCardIcon}>{s.icon}</Text>
                    <Text style={styles.catCardName}>{CATEGORY_LABELS[cat]}</Text>
                    <Text style={[styles.catCardAmt, { color: s.fg }]}>{fmt(amt)}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

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
            {filter === 'all'
              ? t('expenses.allExpenses')
              : t('expenses.methodExpenses', { method: METHODS[filter]?.label ?? '' })}
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
                <View style={[styles.expBar, { backgroundColor: m?.color ?? C.muted }]} />
                <Text style={styles.expIcon}>{m?.icon ?? '•'}</Text>
                <View style={styles.expMid}>
                  <Text style={styles.expLabel}>{e.label}</Text>
                  {(() => {
                    const cat = e.category ?? 'other';
                    const s = CATEGORY_STYLE[cat];
                    return (
                      <View style={[styles.expCatTag, { backgroundColor: s.bg }]}>
                        <Text style={[styles.expCatText, { color: s.fg }]}>
                          {s.icon} {CATEGORY_LABELS[cat]}
                        </Text>
                      </View>
                    );
                  })()}
                  <View style={styles.expMeterBg}>
                    <View style={[styles.expMeterFill, { width: `${pct}%`, backgroundColor: m?.color ?? C.muted }]} />
                  </View>
                </View>
                <Text style={styles.expAmt}>{fmt(e.amount)}</Text>
                <Text style={styles.expEditArrow}>›</Text>
              </Pressable>
            );
          })}
          {shown.length === 0 && (
            <Text style={styles.emptyText}>{t('expenses.empty')}</Text>
          )}
        </View>

        {/* Total row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            {filter === 'all'
              ? t('expenses.totalAll')
              : t('expenses.totalMethod', { method: METHODS[filter]?.label ?? '' })}
          </Text>
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

      {/* Quick Add Modal */}
      <Modal
        visible={quickOpen}
        transparent
        animationType="slide"
        onRequestClose={handleQuickClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={qa.overlay}>
          <Pressable style={qa.backdrop} onPress={handleQuickClose} />
          <View style={[qa.sheet, { paddingBottom: insets.bottom + MS.lg }]}>
            <View style={qa.handle} />

            <View style={qa.header}>
              <View>
                <Text style={qa.title}>{t('expenses.qaTitle')}</Text>
                <Text style={qa.subtitle}>{t('expenses.qaSubtitle')}</Text>
              </View>
              <Pressable onPress={handleQuickClose} style={qa.closeBtn} hitSlop={12}>
                <Text style={qa.closeGlyph}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={qa.input}
              value={qaText}
              onChangeText={(t) => { setQaText(t); setQaResult(null); setQaError(null); }}
              placeholder={t('expenses.qaPlaceholder')}
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={3}
              autoFocus
              editable={!qaLoading}
            />

            <Pressable
              style={[qa.parseBtn, (!qaText.trim() || qaLoading) && qa.parseBtnDisabled]}
              onPress={handleParse}
              disabled={!qaText.trim() || qaLoading}>
              {qaLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={qa.parseBtnText}>{t('expenses.qaParse')}</Text>
              )}
            </Pressable>

            {qaError === 'NO_API_KEY' && (
              <View style={qa.infoCard}>
                <Text style={qa.infoIcon}>🔑</Text>
                <Text style={qa.infoText}>{t('expenses.qaNoKey')}</Text>
              </View>
            )}

            {qaError && qaError !== 'NO_API_KEY' && (
              <View style={qa.infoCard}>
                <Text style={qa.infoIcon}>⚠️</Text>
                <Text style={qa.infoText}>{qaError.slice(0, 120)}</Text>
              </View>
            )}

            {qaResult && !qaResult.isExpense && (
              <View style={qa.infoCard}>
                <Text style={qa.infoIcon}>🚫</Text>
                <Text style={qa.infoText}>{t('expenses.qaNotExpense')}</Text>
              </View>
            )}

            {qaResult?.isExpense && (
              <View style={qa.confirmCard}>
                <View style={qa.confirmRow}>
                  <View style={qa.confirmLeft}>
                    <Text style={qa.confirmLabel}>{qaResult.label}</Text>
                    <Text style={qa.confirmCategory}>{qaResult.category}</Text>
                  </View>
                  <Text style={qa.confirmAmount}>{fmt(qaResult.amount)}</Text>
                </View>

                <Text style={qa.methodLabel}>{t('expenses.qaPaymentMethod')}</Text>
                <View style={qa.methodRow}>
                  {(['card', 'ewallet', 'cash', 'bank'] as ExpenseMethod[]).map((key) => {
                    const m = METHODS[key];
                    const active = qaMethod === key;
                    return (
                      <Pressable
                        key={key}
                        style={[
                          qa.methodBtn,
                          active && { backgroundColor: m.color + '22', borderColor: m.color },
                        ]}
                        onPress={() => setQaMethod(key)}>
                        <Text style={qa.methodIcon}>{m.icon}</Text>
                        <Text style={[qa.methodBtnLabel, active && { color: m.color, fontFamily: MF.bold }]}>
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable style={qa.confirmBtn} onPress={handleQuickConfirm}>
                  <Text style={qa.confirmBtnText}>{t('expenses.qaAddBtn')}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },

    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    screenTitle: { fontSize: 26, fontFamily: MF.bold, color: C.ink },
    screenSub: { fontSize: 13, fontFamily: MF.regular, color: C.muted, marginTop: 2 },
    headerBtns: { flexDirection: 'row', gap: MS.sm, alignItems: 'center' },
    quickAddBtn: {
      paddingHorizontal: MS.md,
      paddingVertical: MS.sm,
      borderRadius: 999,
      backgroundColor: C.card,
      borderWidth: 1.5,
      borderColor: C.emerald,
    },
    quickAddBtnText: { fontSize: 12, fontFamily: MF.semiBold, color: C.emeraldDark },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.emerald,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.emerald,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 5,
    },
    addBtnText: { fontSize: 24, color: '#fff', lineHeight: 28, fontFamily: MF.regular },

    summaryBanner: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      paddingHorizontal: MS.lg,
      paddingVertical: MS.md,
    },
    summaryLabel: {
      fontSize: 11,
      fontFamily: MF.semiBold,
      color: C.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    summaryAmt: {
      fontSize: 34,
      fontFamily: MF.bold,
      color: C.ink,
      lineHeight: 40,
    },

    methGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MS.sm },
    methCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderLeftWidth: 4,
      borderRadius: MR.md,
      padding: MS.md,
      gap: 3,
    },
    methCardPressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
    methLabel: { fontSize: 11, fontFamily: MF.medium, color: C.muted },
    methAmt: { fontSize: 16, fontFamily: MF.bold, color: C.ink },
    methActiveHint: { fontSize: 9.5, fontFamily: MF.semiBold, marginTop: 1 },

    filterScroll: { flexShrink: 0 },
    filterContent: { gap: MS.sm, paddingVertical: 2 },
    chip: {
      paddingHorizontal: MS.md,
      paddingVertical: MS.sm,
      borderRadius: 999,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
    },
    chipActive: { backgroundColor: C.emerald, borderColor: C.emerald },
    chipText: { fontSize: 12.5, fontFamily: MF.semiBold, color: C.ink },
    chipTextActive: { color: '#fff' },

    card: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
    },
    cardTitle: { fontSize: 15, fontFamily: MF.bold, color: C.ink, marginBottom: MS.md },

    expRow: { flexDirection: 'row', alignItems: 'center', gap: MS.sm, paddingVertical: MS.sm },
    expRowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
    expRowPressed: { opacity: 0.6 },
    expEditArrow: { fontSize: 18, color: C.muted, marginLeft: 2 },
    expBar: { width: 4, alignSelf: 'stretch', borderRadius: 3 },
    expIcon: { fontSize: 16, width: 24, textAlign: 'center' },
    expMid: { flex: 1 },
    expLabel: { fontSize: 14, fontFamily: MF.medium, color: C.ink },
    expMeterBg: { height: 3, backgroundColor: C.line, borderRadius: 2, marginTop: 4, overflow: 'hidden' },
    expMeterFill: { height: '100%', borderRadius: 2 },
    expAmt: { fontSize: 14, fontFamily: MF.bold, color: C.ink },

    emptyText: { fontSize: 13, fontFamily: MF.regular, color: C.muted, textAlign: 'center', paddingVertical: MS.lg },

    expCatTag: {
      alignSelf: 'flex-start',
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
      marginTop: 2,
      marginBottom: 3,
    },
    expCatText: { fontSize: 9.5, fontFamily: MF.medium },

    sectionLabel: {
      fontSize: 11,
      fontFamily: MF.semiBold,
      color: C.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: MS.sm,
    },
    catScroll: { gap: MS.sm, paddingBottom: 2 },
    catCard: {
      width: 108,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderLeftWidth: 3,
      borderRadius: MR.md,
      padding: MS.md,
      gap: 2,
    },
    catCardIcon: { fontSize: 18 },
    catCardName: { fontSize: 10, fontFamily: MF.medium, color: C.muted },
    catCardAmt: { fontSize: 15, fontFamily: MF.bold },

    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.lg,
      padding: MS.lg,
    },
    totalLabel: { fontSize: 14, fontFamily: MF.medium, color: C.muted },
    totalAmt: { fontSize: 20, fontFamily: MF.bold, color: C.ink },
  });
}

function makeQaStyles(C: AppTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.backdrop },
    sheet: {
      backgroundColor: C.bg,
      borderTopLeftRadius: MR.xxl,
      borderTopRightRadius: MR.xxl,
      paddingHorizontal: MS.lg,
      paddingTop: MS.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 12,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.line,
      alignSelf: 'center',
      marginBottom: MS.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: MS.lg,
    },
    title: { fontSize: 18, fontFamily: MF.bold, color: C.ink },
    subtitle: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 2 },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeGlyph: { fontSize: 13, color: C.muted, fontFamily: MF.medium },
    input: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.lg,
      paddingHorizontal: MS.md,
      paddingVertical: MS.md,
      fontSize: 14,
      fontFamily: MF.regular,
      color: C.ink,
      minHeight: 72,
      textAlignVertical: 'top',
      marginBottom: MS.md,
    },
    parseBtn: {
      paddingVertical: 13,
      borderRadius: MR.lg,
      backgroundColor: C.emerald,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: MS.md,
    },
    parseBtnDisabled: { opacity: 0.4 },
    parseBtnText: { fontSize: 14, fontFamily: MF.bold, color: '#fff' },
    infoCard: {
      flexDirection: 'row',
      gap: MS.sm,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.lg,
      padding: MS.md,
      marginBottom: MS.md,
      alignItems: 'flex-start',
    },
    infoIcon: { fontSize: 18 },
    infoText: { flex: 1, fontSize: 13, fontFamily: MF.regular, color: C.muted, lineHeight: 19 },
    confirmCard: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
      gap: MS.md,
      marginBottom: MS.sm,
    },
    confirmRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    confirmLeft: { flex: 1, marginRight: MS.md },
    confirmLabel: { fontSize: 16, fontFamily: MF.bold, color: C.ink },
    confirmCategory: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 2 },
    confirmAmount: { fontSize: 22, fontFamily: MF.bold, color: C.emeraldDark },
    methodLabel: {
      fontSize: 11,
      fontFamily: MF.semiBold,
      color: C.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    methodRow: { flexDirection: 'row', gap: MS.sm },
    methodBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: MS.sm,
      borderRadius: MR.md,
      borderWidth: 1.5,
      borderColor: C.line,
      backgroundColor: C.bg,
      gap: 3,
    },
    methodIcon: { fontSize: 16 },
    methodBtnLabel: { fontSize: 9, fontFamily: MF.medium, color: C.muted },
    confirmBtn: {
      paddingVertical: 13,
      borderRadius: MR.lg,
      backgroundColor: C.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmBtnText: { fontSize: 14, fontFamily: MF.bold, color: '#fff' },
  });
}
