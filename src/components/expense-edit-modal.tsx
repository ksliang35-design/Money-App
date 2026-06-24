import { useMemo, useState } from 'react';
import {
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

import { MF, MR, MS } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { type Expense, type ExpenseCategory, CATEGORY_STYLE } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

type Method = 'card' | 'ewallet' | 'cash' | 'bank';

export type ExpenseModalMode =
  | { type: 'edit'; expense: Expense }
  | { type: 'add' }
  | null;

const ALL_CATEGORIES: ExpenseCategory[] = [
  'food', 'transport', 'shopping', 'bills',
  'entertainment', 'health', 'education', 'other',
];

interface Props {
  mode: ExpenseModalMode;
  onClose: () => void;
}

export function ExpenseEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addExpense, updateExpense, deleteExpense } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const METHOD_META: Record<Method, { label: string; icon: string; color: string }> = {
    card:    { label: t('expenseModal.methodCard'),    icon: '💳', color: C.clay    },
    ewallet: { label: t('expenseModal.methodEwallet'), icon: '📱', color: C.indigo  },
    cash:    { label: t('expenseModal.methodCash'),    icon: '💵', color: C.emerald },
    bank:    { label: t('expenseModal.methodBank'),    icon: '🏦', color: C.gold    },
  };

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

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Method>('card');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [initMode, setInitMode] = useState<typeof mode>(null);
  if (mode !== initMode) {
    setInitMode(mode);
    if (mode?.type === 'edit') {
      setLabel(mode.expense.label);
      setAmount(String(mode.expense.amount));
      setMethod(mode.expense.method as Method);
      setCategory(mode.expense.category ?? 'other');
    } else if (mode?.type === 'add') {
      setLabel('');
      setAmount('');
      setMethod('card');
      setCategory('other');
    }
  }

  const parsed = parseFloat(amount);
  const isValid = label.trim().length > 0 && !isNaN(parsed) && parsed > 0;

  const handleSave = () => {
    if (!isValid) return;
    if (mode?.type === 'edit') {
      updateExpense(mode.expense.id, { label: label.trim(), amount: parsed, method, category });
    } else if (mode?.type === 'add') {
      addExpense({ label: label.trim(), amount: parsed, method, category });
    }
    onClose();
  };

  const handleDelete = () => {
    if (mode?.type !== 'edit') return;
    deleteExpense(mode.expense.id);
    onClose();
  };

  const isEdit = mode?.type === 'edit';

  return (
    <Modal
      visible={!!mode}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + MS.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? t('expenseModal.editTitle') : t('expenseModal.addTitle')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>{t('expenseModal.description')}</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder={t('expenseModal.placeholder')}
            placeholderTextColor={C.muted}
            returnKeyType="next"
            autoFocus
          />

          <Text style={styles.fieldLabel}>{t('expenseModal.amount')}</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Text style={styles.fieldLabel}>{t('expenseModal.method')}</Text>
          <View style={styles.methodRow}>
            {(Object.entries(METHOD_META) as [Method, (typeof METHOD_META)[Method]][]).map(
              ([key, m]) => {
                const active = method === key;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.methodBtn,
                      active && { backgroundColor: m.color + '22', borderColor: m.color },
                    ]}
                    onPress={() => setMethod(key)}>
                    <Text style={styles.methodIcon}>{m.icon}</Text>
                    <Text
                      style={[
                        styles.methodLabel,
                        active && { color: m.color, fontFamily: MF.bold },
                      ]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>

          <Text style={styles.fieldLabel}>{t('expenseModal.category')}</Text>
          <View style={styles.catRow}>
            {ALL_CATEGORIES.slice(0, 4).map((key) => {
              const s = CATEGORY_STYLE[key];
              const active = category === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.catBtn, active && { backgroundColor: s.bg, borderColor: s.fg }]}
                  onPress={() => setCategory(key)}>
                  <Text style={styles.catIcon}>{s.icon}</Text>
                  <Text
                    style={[styles.catLabel, active && { color: s.fg, fontFamily: MF.bold }]}
                    numberOfLines={1}>
                    {CATEGORY_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.catRow, { marginBottom: MS.lg }]}>
            {ALL_CATEGORIES.slice(4, 8).map((key) => {
              const s = CATEGORY_STYLE[key];
              const active = category === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.catBtn, active && { backgroundColor: s.bg, borderColor: s.fg }]}
                  onPress={() => setCategory(key)}>
                  <Text style={styles.catIcon}>{s.icon}</Text>
                  <Text
                    style={[styles.catLabel, active && { color: s.fg, fontFamily: MF.bold }]}
                    numberOfLines={1}>
                    {CATEGORY_LABELS[key]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            {isEdit && (
              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteTxt}>{t('common.delete')}</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!isValid}>
              <Text style={styles.saveTxt}>{isEdit ? t('expenseModal.save') : t('expenseModal.add')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: C.backdrop,
    },
    sheetScroll: { maxHeight: '90%' },
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
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: C.line, alignSelf: 'center', marginBottom: MS.md,
    },
    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: MS.lg,
    },
    title: { fontSize: 18, fontFamily: MF.bold, color: C.ink },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      alignItems: 'center', justifyContent: 'center',
    },
    closeGlyph: { fontSize: 13, color: C.muted, fontFamily: MF.medium },
    fieldLabel: {
      fontSize: 11, fontFamily: MF.semiBold, color: C.muted,
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: MS.xs,
    },
    input: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: MR.lg, paddingHorizontal: MS.md, paddingVertical: 12,
      fontSize: 16, fontFamily: MF.medium, color: C.ink, marginBottom: MS.md,
    },
    methodRow: { flexDirection: 'row', gap: MS.sm, marginBottom: MS.lg },
    methodBtn: {
      flex: 1, alignItems: 'center', paddingVertical: MS.sm,
      borderRadius: MR.md, borderWidth: 1.5, borderColor: C.line,
      backgroundColor: C.card, gap: 3,
    },
    methodIcon: { fontSize: 18 },
    methodLabel: { fontSize: 10, fontFamily: MF.medium, color: C.muted },
    catRow: { flexDirection: 'row', gap: MS.sm, marginBottom: MS.sm },
    catBtn: {
      flex: 1, alignItems: 'center', paddingVertical: MS.sm,
      borderRadius: MR.md, borderWidth: 1.5, borderColor: C.line,
      backgroundColor: C.card, gap: 2,
    },
    catIcon: { fontSize: 16 },
    catLabel: { fontSize: 8.5, fontFamily: MF.medium, color: C.muted, textAlign: 'center' },
    actions: { flexDirection: 'row', gap: MS.sm },
    deleteBtn: {
      paddingVertical: 14, paddingHorizontal: MS.lg, borderRadius: MR.lg,
      borderWidth: 1.5, borderColor: C.clay, alignItems: 'center', justifyContent: 'center',
    },
    deleteTxt: { fontSize: 14, fontFamily: MF.semiBold, color: C.clay },
    saveBtn: {
      flex: 1, paddingVertical: 14, borderRadius: MR.lg,
      backgroundColor: C.emerald, alignItems: 'center', justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveTxt: { fontSize: 14, fontFamily: MF.bold, color: '#fff' },
  });
}
