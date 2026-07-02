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
import { shadow } from '@/constants/shadow';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/i18n';
import { useAppData, type Bill } from '@/store/AppDataProvider';

export type BillModalMode =
  | { type: 'edit'; bill: Bill }
  | { type: 'add' }
  | null;

interface Props {
  mode: BillModalMode;
  onClose: () => void;
}

type BillType = 'bill' | 'payday';
type BillReminder = 'none' | 'daily' | 'weekly';

export function BillEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addBill, updateBill, deleteBill } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [category, setCategory] = useState('');
  const [billType, setBillType] = useState<BillType>('bill');
  const [reminder, setReminder] = useState<BillReminder>('none');
  const [notes, setNotes] = useState('');
  const [initMode, setInitMode] = useState<typeof mode>(null);

  if (mode !== initMode) {
    setInitMode(mode);
    if (mode?.type === 'edit') {
      setName(mode.bill.name);
      setAmount(String(mode.bill.amount));
      setDueDay(String(mode.bill.dueDay));
      setCategory(mode.bill.category ?? '');
      setBillType(mode.bill.type);
      setReminder(mode.bill.reminder ?? 'none');
      setNotes(mode.bill.notes ?? '');
    } else if (mode?.type === 'add') {
      setName('');
      setAmount('');
      setDueDay('');
      setCategory('');
      setBillType('bill');
      setReminder('none');
      setNotes('');
    }
  }

  const parsedAmount = parseFloat(amount);
  const parsedDay = parseInt(dueDay, 10);
  const isValid =
    name.trim().length > 0 &&
    !isNaN(parsedAmount) && parsedAmount > 0 &&
    !isNaN(parsedDay) && parsedDay >= 1 && parsedDay <= 31;

  const handleSave = () => {
    if (!isValid) return;
    const payload = {
      name: name.trim(),
      amount: parsedAmount,
      dueDay: parsedDay,
      category: category.trim(),
      type: billType,
      reminder: reminder !== 'none' ? reminder : undefined,
      notes: notes.trim() || undefined,
    };
    if (mode?.type === 'edit') {
      updateBill(mode.bill.id, payload);
    } else {
      addBill(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (mode?.type !== 'edit') return;
    deleteBill(mode.bill.id);
    onClose();
  };

  const isEdit = mode?.type === 'edit';

  const TYPE_OPTIONS: { value: BillType; label: string; color: string }[] = [
    { value: 'bill',   label: t('billModal.typeBill'),   color: C.clay    },
    { value: 'payday', label: t('billModal.typePayday'), color: C.emerald },
  ];

  const REMINDER_OPTIONS: { value: BillReminder; label: string }[] = [
    { value: 'none',   label: t('billModal.reminderNone')   },
    { value: 'daily',  label: t('billModal.reminderDaily')  },
    { value: 'weekly', label: t('billModal.reminderWeekly') },
  ];

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
            <Text style={styles.title}>{isEdit ? t('billModal.editTitle') : t('billModal.addTitle')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t('billModal.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('billModal.placeholder')}
              placeholderTextColor={C.muted}
              autoFocus
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>{t('billModal.amount')}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>{t('billModal.dueDay')}</Text>
            <TextInput
              style={styles.input}
              value={dueDay}
              onChangeText={setDueDay}
              placeholder="1–31"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>{t('billModal.type')}</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = billType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.typeBtn,
                      active && { backgroundColor: opt.color + '22', borderColor: opt.color },
                    ]}
                    onPress={() => setBillType(opt.value)}>
                    <Text style={[styles.typeBtnText, active && { color: opt.color, fontFamily: MF.bold }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>{t('billModal.category')}</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Utilities"
              placeholderTextColor={C.muted}
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>{t('billModal.reminder')}</Text>
            <View style={styles.typeRow}>
              {REMINDER_OPTIONS.map((opt) => {
                const active = reminder === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.typeBtn,
                      active && { backgroundColor: C.indigo + '22', borderColor: C.indigo },
                    ]}
                    onPress={() => setReminder(opt.value)}>
                    <Text style={[styles.typeBtnText, active && { color: C.indigo, fontFamily: MF.bold }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>{t('billModal.notes')}</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('billModal.notesPlaceholder')}
              placeholderTextColor={C.muted}
              multiline
              returnKeyType="done"
            />

            <View style={styles.actions}>
              {isEdit && (
                <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteTxt}>{t('billModal.delete')}</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!isValid}>
                <Text style={styles.saveTxt}>{isEdit ? t('billModal.save') : t('billModal.add')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
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
    sheet: {
      backgroundColor: C.bg,
      borderTopLeftRadius: MR.xxl,
      borderTopRightRadius: MR.xxl,
      paddingHorizontal: MS.lg,
      paddingTop: MS.md,
      maxHeight: '90%',
      ...shadow('#000', 0, -4, 16, 0.12),
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
    notesInput: { minHeight: 72, textAlignVertical: 'top' },
    typeRow: { flexDirection: 'row', gap: MS.sm, marginBottom: MS.md },
    typeBtn: {
      flex: 1, alignItems: 'center', paddingVertical: 12,
      borderRadius: MR.md, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card,
    },
    typeBtnText: { fontSize: 13, fontFamily: MF.medium, color: C.muted },
    actions: { flexDirection: 'row', gap: MS.sm, marginTop: MS.sm, marginBottom: MS.md },
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
