import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MC, MF, MR, MS } from '@/constants/money-theme';
import { type Expense } from '@/constants/mock-data';
import { useAppData } from '@/store/AppDataProvider';

type Method = 'card' | 'ewallet' | 'cash' | 'bank';

export type ExpenseModalMode =
  | { type: 'edit'; expense: Expense }
  | { type: 'add' }
  | null;

const METHOD_META: Record<Method, { label: string; icon: string; color: string }> = {
  card:    { label: 'Card',     icon: '💳', color: MC.clay    },
  ewallet: { label: 'E-wallet', icon: '📱', color: MC.indigo  },
  cash:    { label: 'Cash',     icon: '💵', color: MC.emerald },
  bank:    { label: 'Bank',     icon: '🏦', color: MC.gold    },
};

interface Props {
  mode: ExpenseModalMode;
  onClose: () => void;
}

export function ExpenseEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addExpense, updateExpense, deleteExpense } = useAppData();

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Method>('card');

  useEffect(() => {
    if (!mode) return;
    if (mode.type === 'edit') {
      setLabel(mode.expense.label);
      setAmount(String(mode.expense.amount));
      setMethod(mode.expense.method as Method);
    } else {
      setLabel('');
      setAmount('');
      setMethod('card');
    }
  }, [mode]);

  const parsed = parseFloat(amount);
  const isValid = label.trim().length > 0 && !isNaN(parsed) && parsed > 0;

  const handleSave = () => {
    if (!isValid) return;
    if (mode?.type === 'edit') {
      updateExpense(mode.expense.id, { label: label.trim(), amount: parsed, method });
    } else if (mode?.type === 'add') {
      addExpense({ label: label.trim(), amount: parsed, method });
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
        <View style={[styles.sheet, { paddingBottom: insets.bottom + MS.lg }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{isEdit ? 'Edit expense' : 'Add expense'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Groceries"
            placeholderTextColor={MC.muted}
            returnKeyType="next"
            autoFocus
          />

          <Text style={styles.fieldLabel}>Amount (RM)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={MC.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Text style={styles.fieldLabel}>Payment method</Text>
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

          <View style={styles.actions}>
            {isEdit && (
              <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteTxt}>Delete</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!isValid}>
              <Text style={styles.saveTxt}>{isEdit ? 'Save changes' : 'Add expense'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: MC.bg,
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
    backgroundColor: MC.line,
    alignSelf: 'center',
    marginBottom: MS.md,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MS.lg,
  },
  title: { fontSize: 18, fontFamily: MF.bold, color: MC.ink },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontSize: 13, color: MC.muted, fontFamily: MF.medium },

  fieldLabel: {
    fontSize: 11,
    fontFamily: MF.semiBold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: MS.xs,
  },
  input: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.lg,
    paddingHorizontal: MS.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: MF.medium,
    color: MC.ink,
    marginBottom: MS.md,
  },

  methodRow: {
    flexDirection: 'row',
    gap: MS.sm,
    marginBottom: MS.lg,
  },
  methodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: MS.sm,
    borderRadius: MR.md,
    borderWidth: 1.5,
    borderColor: MC.line,
    backgroundColor: MC.card,
    gap: 3,
  },
  methodIcon: { fontSize: 18 },
  methodLabel: { fontSize: 10, fontFamily: MF.medium, color: MC.muted },

  actions: {
    flexDirection: 'row',
    gap: MS.sm,
  },
  deleteBtn: {
    paddingVertical: 14,
    paddingHorizontal: MS.lg,
    borderRadius: MR.lg,
    borderWidth: 1.5,
    borderColor: MC.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTxt: { fontSize: 14, fontFamily: MF.semiBold, color: MC.clay },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: MR.lg,
    backgroundColor: MC.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveTxt: { fontSize: 14, fontFamily: MF.bold, color: '#fff' },
});
