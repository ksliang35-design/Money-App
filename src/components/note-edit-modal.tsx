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
import { type Note, type NoteTag } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export type NoteModalMode =
  | { type: 'edit'; note: Note }
  | { type: 'add' }
  | null;

const ALL_TAGS: NoteTag[] = ['owed_to_me', 'i_owe', 'to_claim', 'reminder', 'general'];

export function makeTagColors(C: AppTheme) {
  return {
    owed_to_me: { bg: C.emerald + '1A', text: C.emeraldDark, border: C.emerald + '50' },
    i_owe:      { bg: C.clay    + '1A', text: C.clay,        border: C.clay    + '50' },
    to_claim:   { bg: C.gold    + '1A', text: C.goldText,    border: C.gold    + '50' },
    reminder:   { bg: C.indigo  + '1A', text: C.indigo,      border: C.indigo  + '50' },
    general:    { bg: C.muted   + '15', text: C.muted,       border: C.line          },
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  mode: NoteModalMode;
  onClose: () => void;
}

export function NoteEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addNote, updateNote, deleteNote } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const TAG_COLORS = useMemo(() => makeTagColors(C), [C]);

  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [tag, setTag] = useState<NoteTag | null>(null);
  const [initMode, setInitMode] = useState<typeof mode>(null);
  if (mode !== initMode) {
    setInitMode(mode);
    if (mode?.type === 'edit') {
      setText(mode.note.text);
      setAmount(mode.note.amount != null ? String(mode.note.amount) : '');
      setTag(mode.note.tag);
    } else if (mode?.type === 'add') {
      setText('');
      setAmount('');
      setTag(null);
    }
  }

  const parsedAmount = amount.trim() ? parseFloat(amount) : null;
  const amountValid = parsedAmount === null || (!isNaN(parsedAmount) && parsedAmount >= 0);
  const isValid = text.trim().length > 0 && amountValid;

  const handleSave = () => {
    if (!isValid) return;
    const payload: Omit<Note, 'id'> = {
      text: text.trim(),
      createdAt: mode?.type === 'edit' ? mode.note.createdAt : today(),
      amount: parsedAmount,
      tag,
    };
    if (mode?.type === 'edit') {
      updateNote(mode.note.id, payload);
    } else {
      addNote(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (mode?.type !== 'edit') return;
    deleteNote(mode.note.id);
    onClose();
  };

  const isEdit = mode?.type === 'edit';

  const tagLabel = (key: NoteTag) => {
    const map: Record<NoteTag, string> = {
      owed_to_me: t('notes.tagOwedToMe'),
      i_owe:      t('notes.tagIOwe'),
      to_claim:   t('notes.tagToClaim'),
      reminder:   t('notes.tagReminder'),
      general:    t('notes.tagGeneral'),
    };
    return map[key];
  };

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
            <Text style={styles.title}>{isEdit ? t('noteModal.editTitle') : t('noteModal.addTitle')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t('noteModal.text')}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={text}
              onChangeText={setText}
              placeholder={t('noteModal.placeholder')}
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={3}
              autoFocus
              returnKeyType="default"
            />

            <Text style={styles.fieldLabel}>{t('noteModal.amount')}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>{t('noteModal.tag')}</Text>
            <View style={styles.tagGrid}>
              {ALL_TAGS.map((key) => {
                const active = tag === key;
                const c = TAG_COLORS[key];
                return (
                  <Pressable
                    key={key}
                    style={[
                      styles.tagBtn,
                      { borderColor: active ? c.border : C.line },
                      active && { backgroundColor: c.bg },
                    ]}
                    onPress={() => setTag(active ? null : key)}>
                    <Text style={[styles.tagBtnText, active && { color: c.text, fontFamily: MF.semiBold }]}>
                      {tagLabel(key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.actions}>
              {isEdit && (
                <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteTxt}>{t('noteModal.delete')}</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!isValid}>
                <Text style={styles.saveTxt}>{isEdit ? t('noteModal.save') : t('noteModal.add')}</Text>
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
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: C.backdrop },
    sheet: {
      backgroundColor: C.bg,
      borderTopLeftRadius: MR.xxl,
      borderTopRightRadius: MR.xxl,
      paddingHorizontal: MS.lg,
      paddingTop: MS.md,
      maxHeight: '88%',
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
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: MS.lg,
    },
    title: { fontSize: 18, fontFamily: MF.bold, color: C.ink },
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

    fieldLabel: {
      fontSize: 11,
      fontFamily: MF.semiBold,
      color: C.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: MS.xs,
    },
    input: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.lg,
      paddingHorizontal: MS.md,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: MF.medium,
      color: C.ink,
      marginBottom: MS.md,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },

    tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MS.sm, marginBottom: MS.lg },
    tagBtn: {
      paddingHorizontal: MS.md,
      paddingVertical: MS.sm,
      borderRadius: 999,
      borderWidth: 1.5,
      backgroundColor: C.card,
    },
    tagBtnText: { fontSize: 12, fontFamily: MF.medium, color: C.muted },

    actions: { flexDirection: 'row', gap: MS.sm, marginBottom: MS.sm },
    deleteBtn: {
      paddingVertical: 14,
      paddingHorizontal: MS.lg,
      borderRadius: MR.lg,
      borderWidth: 1.5,
      borderColor: C.clay,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteTxt: { fontSize: 14, fontFamily: MF.semiBold, color: C.clay },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: MR.lg,
      backgroundColor: C.emerald,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveTxt: { fontSize: 14, fontFamily: MF.bold, color: '#fff' },
  });
}
