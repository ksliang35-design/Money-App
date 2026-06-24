import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MF, MR, MS } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Language } from '@/i18n';

const OPTIONS: { lang: Language; native: string; english: string }[] = [
  { lang: 'en', native: 'English', english: 'English' },
  { lang: 'ms', native: 'Bahasa Malaysia', english: 'Malay' },
  { lang: 'zh', native: '中文（简体）', english: 'Chinese (Simplified)' },
];

interface Props {
  /** When true, renders inside a slide-up Modal (profile settings mode). */
  modal?: boolean;
  onSelect: (lang: Language) => void;
  onClose?: () => void;
}

export function LanguagePicker({ modal, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const content = (
    <View style={[styles.root, { paddingTop: insets.top + MS.xxl, paddingBottom: insets.bottom + MS.xxl }]}>
      {modal && onClose && (
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
      )}

      <Text style={styles.horse}>♞</Text>
      <Text style={styles.appName}>Money App</Text>
      <Text style={styles.subtitle}>
        Choose language · Pilih bahasa · 选择语言
      </Text>

      <View style={styles.list}>
        {OPTIONS.map((o) => (
          <Pressable
            key={o.lang}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            onPress={() => {
              onSelect(o.lang);
              onClose?.();
            }}>
            <View style={styles.optionLeft}>
              <Text style={styles.optionNative}>{o.native}</Text>
              <Text style={styles.optionEnglish}>{o.english}</Text>
            </View>
            <Text style={styles.optionArrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (modal) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
        {content}
      </Modal>
    );
  }

  return content;
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: C.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: MS.xxl,
      gap: MS.sm,
    },
    closeBtn: {
      position: 'absolute',
      top: MS.xxl,
      right: MS.lg,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeGlyph: { fontSize: 14, color: C.muted, fontFamily: MF.medium },
    horse: { fontSize: 48, color: C.emerald, marginBottom: MS.sm },
    appName: { fontSize: 28, fontFamily: MF.bold, color: C.ink },
    subtitle: {
      fontSize: 12,
      fontFamily: MF.regular,
      color: C.muted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: MS.xl,
    },
    list: { width: '100%', gap: MS.sm },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderWidth: 1.5,
      borderColor: C.line,
      borderRadius: MR.xl,
      paddingHorizontal: MS.lg,
      paddingVertical: MS.lg,
    },
    optionPressed: { opacity: 0.6 },
    optionLeft: { flex: 1, gap: 3 },
    optionNative: { fontSize: 17, fontFamily: MF.bold, color: C.ink },
    optionEnglish: { fontSize: 12, fontFamily: MF.regular, color: C.muted },
    optionArrow: { fontSize: 22, color: C.emerald, fontFamily: MF.bold },
  });
}
