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
import { type Goal } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export type GoalModalMode =
  | { type: 'edit'; goal: Goal }
  | { type: 'add' }
  | null;

const ICON_OPTIONS = ['🛡️', '🚀', '✈️', '🏠', '🎓', '💍', '🚗', '💻', '🌍', '💰', '🎯', '🏋️'];

interface Props {
  mode: GoalModalMode;
  onClose: () => void;
}

export function GoalEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addGoal, updateGoal, deleteGoal } = useAppData();
  const t = useT();

  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [icon, setIcon] = useState('🎯');

  useEffect(() => {
    if (!mode) return;
    if (mode.type === 'edit') {
      setLabel(mode.goal.label);
      setTarget(String(mode.goal.target));
      setSaved(String(mode.goal.saved));
      setIcon(mode.goal.icon);
    } else {
      setLabel('');
      setTarget('');
      setSaved('0');
      setIcon('🎯');
    }
  }, [mode]);

  const parsedTarget = parseFloat(target);
  const parsedSaved  = parseFloat(saved);
  const isValid =
    label.trim().length > 0 &&
    !isNaN(parsedTarget) && parsedTarget > 0 &&
    !isNaN(parsedSaved) && parsedSaved >= 0;

  const handleSave = () => {
    if (!isValid) return;
    const payload = { label: label.trim(), target: parsedTarget, saved: parsedSaved, icon };
    if (mode?.type === 'edit') {
      updateGoal(mode.goal.id, payload);
    } else if (mode?.type === 'add') {
      addGoal(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (mode?.type !== 'edit') return;
    deleteGoal(mode.goal.id);
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
            <Text style={styles.title}>{isEdit ? t('goalModal.editTitle') : t('goalModal.addTitle')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>{t('goalModal.name')}</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder={t('goalModal.placeholder')}
              placeholderTextColor={MC.muted}
              returnKeyType="next"
              autoFocus
            />

            <Text style={styles.fieldLabel}>{t('goalModal.target')}</Text>
            <TextInput
              style={styles.input}
              value={target}
              onChangeText={setTarget}
              placeholder="0"
              placeholderTextColor={MC.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>{t('goalModal.saved')}</Text>
            <TextInput
              style={styles.input}
              value={saved}
              onChangeText={setSaved}
              placeholder="0"
              placeholderTextColor={MC.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <Text style={styles.fieldLabel}>{t('goalModal.icon')}</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((em) => (
                <Pressable
                  key={em}
                  style={[styles.iconBtn, icon === em && styles.iconBtnActive]}
                  onPress={() => setIcon(em)}>
                  <Text style={styles.iconGlyph}>{em}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actions}>
              {isEdit && (
                <Pressable style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteTxt}>{t('goalModal.delete')}</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.saveBtn, !isValid && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!isValid}>
                <Text style={styles.saveTxt}>{isEdit ? t('goalModal.save') : t('goalModal.add')}</Text>
              </Pressable>
            </View>
          </ScrollView>
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
    maxHeight: '85%',
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

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MS.sm,
    marginBottom: MS.lg,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: MR.md,
    borderWidth: 1.5,
    borderColor: MC.line,
    backgroundColor: MC.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: MC.emerald,
    backgroundColor: MC.emerald + '18',
  },
  iconGlyph: { fontSize: 22 },

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
