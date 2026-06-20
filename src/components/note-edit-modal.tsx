import { useEffect, useState } from 'react';
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

import { MC, MF, MR, MS } from '@/constants/money-theme';
import { type Note, type NoteTag } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export type NoteModalMode =
  | { type: 'edit'; note: Note }
  | { type: 'add' }
  | null;

const ALL_TAGS: NoteTag[] = ['owed_to_me', 'i_owe', 'to_claim', 'reminder', 'general'];

export const TAG_COLORS: Record<NoteTag, { bg: string; text: string; border: string }> = {
  owed_to_me: { bg: MC.emerald + '1A', text: MC.emeraldDark, border: MC.emerald + '50' },
  i_owe:      { bg: MC.clay    + '1A', text: MC.clay,        border: MC.clay    + '50' },
  to_claim:   { bg: MC.gold    + '1A', text: '#8A6D1E',      border: MC.gold    + '50' },
  reminder:   { bg: MC.indigo  + '1A', text: MC.indigo,      border: MC.indigo  + '50' },
  general:    { bg: MC.muted   + '15', text: MC.muted,       border: MC.line          },
};

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

  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [tag, setTag] = useState<NoteTag | null>(null);

  useEffect(() => {
    if (!mode) return;
    if (mode.type === 'edit') {
      setText(mode.note.text);
      setAmount(mode.note.amount != null ? String(mode.note.amount) : '');
      setTag(mode.note.tag);
    } else {
      setText('');
      setAmount('');
      setTag(null);
    }
  }, [mode]);

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
              placeholderTextColor={MC.muted}
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
              placeholderTextColor={MC.muted}
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
                      { borderColor: active ? c.border : MC.line },
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

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: MC.bg,
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
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MS.sm,
    marginBottom: MS.lg,
  },
  tagBtn: {
    paddingHorizontal: MS.md,
    paddingVertical: MS.sm,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: MC.card,
  },
  tagBtnText: {
    fontSize: 12,
    fontFamily: MF.medium,
    color: MC.muted,
  },

  actions: {
    flexDirection: 'row',
    gap: MS.sm,
    marginBottom: MS.sm,
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
