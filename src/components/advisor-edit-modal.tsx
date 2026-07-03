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
import { useAppData } from '@/store/AppDataProvider';
import { type Advisor } from '@/lib/advisors';

export type AdvisorModalMode = { type: 'add' } | { type: 'edit'; advisor: Advisor } | null;

interface Props {
  mode: AdvisorModalMode;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🎓', '👩‍🎓', '🧑‍🎓', '💼', '🏦'];

export function AdvisorEditModal({ mode, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const _data = useAppData(); void _data;
  const addAdvisor = (_a: Omit<Advisor, 'id'>) => {};
  const updateAdvisor = (_id: string, _u: Partial<Omit<Advisor, 'id'>>) => {};
  const deleteAdvisor = (_id: string) => {};
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('👨‍💼');
  const [initMode, setInitMode] = useState<AdvisorModalMode>(null);

  if (mode !== initMode) {
    setInitMode(mode);
    if (mode?.type === 'edit') {
      setName(mode.advisor.name);
      setTitle(mode.advisor.title);
      setSpecialty(mode.advisor.specialty);
      setPhone(mode.advisor.phone ?? '');
      setWhatsapp(mode.advisor.whatsapp ?? '');
      setEmail(mode.advisor.email ?? '');
      setBio(mode.advisor.bio ?? '');
      setAvatar(mode.advisor.avatar);
    } else if (mode?.type === 'add') {
      setName(''); setTitle(''); setSpecialty('');
      setPhone(''); setWhatsapp(''); setEmail(''); setBio('');
      setAvatar('👨‍💼');
    }
  }

  const isValid = name.trim().length > 0 && title.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    const payload = {
      name: name.trim(), title: title.trim(), specialty: specialty.trim(),
      avatar, phone: phone.trim() || undefined, whatsapp: whatsapp.trim() || undefined,
      email: email.trim() || undefined, bio: bio.trim() || undefined,
    };
    if (mode?.type === 'edit') updateAdvisor(mode.advisor.id, payload);
    else addAdvisor(payload);
    onClose();
  };

  const handleDelete = () => {
    if (mode?.type !== 'edit') return;
    deleteAdvisor(mode.advisor.id);
    onClose();
  };

  return (
    <Modal visible={!!mode} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.bg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top + MS.lg }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.modalTitle}>
              {mode?.type === 'edit' ? t('advisor.editTitle') : t('advisor.addTitle')}
            </Text>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}>
              <Text style={styles.closeTxt}>✕</Text>
            </Pressable>
          </View>

          {/* Avatar picker */}
          <Text style={styles.label}>{t('advisor.fieldAvatar')}</Text>
          <View style={styles.avatarRow}>
            {AVATAR_OPTIONS.map((em) => (
              <Pressable
                key={em}
                onPress={() => setAvatar(em)}
                style={[styles.avatarOpt, avatar === em && styles.avatarOptActive]}>
                <Text style={styles.avatarEmoji}>{em}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t('advisor.fieldName')} *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ahmad Razif"
            placeholderTextColor={C.muted}
          />

          <Text style={styles.label}>{t('advisor.fieldTitle')} *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Certified Financial Planner (CFP)"
            placeholderTextColor={C.muted}
          />

          <Text style={styles.label}>{t('advisor.fieldSpecialty')}</Text>
          <TextInput
            style={styles.input}
            value={specialty}
            onChangeText={setSpecialty}
            placeholder="e.g. Retirement · Investments · Takaful"
            placeholderTextColor={C.muted}
          />

          <Text style={styles.label}>{t('advisor.fieldWhatsApp')}</Text>
          <TextInput
            style={styles.input}
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="+60123456789"
            placeholderTextColor={C.muted}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>{t('advisor.fieldPhone')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+60123456789"
            placeholderTextColor={C.muted}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>{t('advisor.fieldEmail')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="advisor@example.com"
            placeholderTextColor={C.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>{t('advisor.fieldBio')}</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Brief description of experience and specialties…"
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={3}
          />

          <Pressable
            style={({ pressed }) => [styles.saveBtn, !isValid && styles.saveBtnDisabled, pressed && { opacity: 0.8 }]}
            onPress={handleSave}
            disabled={!isValid}>
            <Text style={styles.saveTxt}>{t('common.save')}</Text>
          </Pressable>

          {mode?.type === 'edit' && (
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
              onPress={handleDelete}>
              <Text style={styles.deleteTxt}>{t('advisor.deleteBtn')}</Text>
            </Pressable>
          )}

          <View style={{ height: insets.bottom + MS.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    container: { paddingHorizontal: MS.lg, gap: MS.xs },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: MS.md },
    modalTitle: { fontSize: 20, fontFamily: MF.bold, color: C.ink },
    closeBtn: { padding: MS.sm },
    closeTxt: { fontSize: 18, color: C.muted },

    label: { fontSize: 12, fontFamily: MF.semiBold, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: MS.sm },
    input: {
      borderWidth: 1.5, borderColor: C.line, borderRadius: MR.lg,
      paddingHorizontal: MS.md, paddingVertical: MS.sm + 2,
      fontSize: 15, fontFamily: MF.regular, color: C.ink,
      backgroundColor: C.card, marginTop: 4,
    },
    bioInput: { height: 80, textAlignVertical: 'top', paddingTop: MS.sm },

    avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: MS.sm, marginTop: 4 },
    avatarOpt: {
      width: 44, height: 44, borderRadius: 22,
      borderWidth: 2, borderColor: C.line, backgroundColor: C.card,
      alignItems: 'center', justifyContent: 'center',
    },
    avatarOptActive: { borderColor: C.indigo, backgroundColor: C.indigo + '18' },
    avatarEmoji: { fontSize: 22 },

    saveBtn: {
      marginTop: MS.lg, backgroundColor: C.indigo, borderRadius: MR.xl,
      paddingVertical: MS.md, alignItems: 'center',
      ...shadow,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveTxt: { fontSize: 15, fontFamily: MF.bold, color: '#fff' },

    deleteBtn: { marginTop: MS.sm, alignItems: 'center', paddingVertical: MS.md },
    deleteTxt: { fontSize: 14, fontFamily: MF.medium, color: C.clay },
  });
}
