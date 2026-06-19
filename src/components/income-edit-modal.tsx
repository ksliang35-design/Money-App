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
import { type Income } from '@/constants/mock-data';
import { useAppData } from '@/store/AppDataProvider';

type IncomeType = 'salary' | 'side';

export type IncomeModalMode =
  | { type: 'edit'; income: Income }
  | { type: 'add' }
  | null;

const TYPE_META: Record<IncomeType, { label: string; color: string; textColor: string }> = {
  salary: { label: 'Salary',     color: MC.emerald,   textColor: MC.emeraldDark },
  side:   { label: 'Side hustle', color: MC.gold,     textColor: '#8A6D1E'      },
};

interface Props {
  mode: IncomeModalMode;
  onClose: () => void;
}

export function IncomeEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addIncome, updateIncome, deleteIncome } = useAppData();

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [incomeType, setIncomeType] = useState<IncomeType>('side');

  useEffect(() => {
    if (!mode) return;
    if (mode.type === 'edit') {
      setLabel(mode.income.label);
      setAmount(String(mode.income.amount));
      setIncomeType(mode.income.type as IncomeType);
    } else {
      setLabel('');
      setAmount('');
      setIncomeType('side');
    }
  }, [mode]);

  const parsed = parseFloat(amount);
  const isValid = label.trim().length > 0 && !isNaN(parsed) && parsed > 0;

  const handleSave = () => {
    if (!isValid) return;
    if (mode?.type === 'edit') {
      updateIncome(mode.income.id, { label: label.trim(), amount: parsed, type: incomeType });
    } else if (mode?.type === 'add') {
      addIncome({ label: label.trim(), amount: parsed, type: incomeType });
    }
    onClose();
  };

  const handleDelete = () => {
    if (mode?.type !== 'edit') return;
    deleteIncome(mode.income.id);
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
            <Text style={styles.title}>{isEdit ? 'Edit income' : 'Add income'}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Source</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. Freelance"
            placeholderTextColor={MC.muted}
            returnKeyType="next"
            autoFocus
          />

          <Text style={styles.fieldLabel}>Amount per month (RM)</Text>
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

          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            {(Object.entries(TYPE_META) as [IncomeType, (typeof TYPE_META)[IncomeType]][]).map(
              ([key, m]) => {
                const active = incomeType === key;
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.typeBtn,
                      active && { backgroundColor: m.color + '22', borderColor: m.color },
                    ]}
                    onPress={() => setIncomeType(key)}>
                    <Text
                      style={[
                        styles.typeBtnText,
                        active && { color: m.textColor, fontFamily: MF.bold },
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
              <Text style={styles.saveTxt}>{isEdit ? 'Save changes' : 'Add income'}</Text>
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

  typeRow: {
    flexDirection: 'row',
    gap: MS.sm,
    marginBottom: MS.lg,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: MR.md,
    borderWidth: 1.5,
    borderColor: MC.line,
    backgroundColor: MC.card,
  },
  typeBtnText: { fontSize: 13, fontFamily: MF.medium, color: MC.muted },

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
