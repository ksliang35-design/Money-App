import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AVATAR_COLOUR_MAP,
  AVATAR_EMOJI_LIST,
  DEFAULT_AVATAR,
  type AvatarColour,
  type AvatarConfig,
  type AvatarEmoji,
} from '@/constants/avatar';
import { MC, MF, MR, MS } from '@/constants/money-theme';
import { useT } from '@/i18n';
import { AvatarDisplay } from './avatar-display';

interface Props {
  visible: boolean;
  current: AvatarConfig | null;
  initials: string;
  onChange: (config: AvatarConfig) => void;
  onClose: () => void;
}

export function AvatarPicker({ visible, current, initials, onChange, onClose }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const cfg = current ?? DEFAULT_AVATAR;

  const setColour = (colour: AvatarColour) => onChange({ ...cfg, colour });
  const pickInitials = () => onChange({ ...cfg, type: 'initials' });
  const pickEmoji = (emoji: AvatarEmoji) => onChange({ ...cfg, type: 'emoji', emoji });

  const COLOURS = Object.keys(AVATAR_COLOUR_MAP) as AvatarColour[];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="pageSheet">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + MS.xl }]}>

          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('profile.avatarTitle')}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeTxt}>✕</Text>
            </Pressable>
          </View>

          {/* ── Background colour ── */}
          <Text style={styles.sectionLabel}>{t('profile.avatarColour')}</Text>
          <View style={styles.colourRow}>
            {COLOURS.map((key) => {
              const { bg, bgDark } = AVATAR_COLOUR_MAP[key];
              const active = cfg.colour === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setColour(key)}
                  style={({ pressed }) => [styles.swatchWrap, pressed && { opacity: 0.75 }]}>
                  <LinearGradient
                    colors={[bg, bgDark]}
                    style={[styles.swatch, active && styles.swatchActive]}>
                    {active && <Text style={styles.swatchCheck}>✓</Text>}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          {/* ── Initials option ── */}
          <Text style={styles.sectionLabel}>{t('profile.avatarInitials')}</Text>
          <Pressable
            onPress={pickInitials}
            style={({ pressed }) => [
              styles.initialsRow,
              cfg.type === 'initials' && styles.initialsRowActive,
              pressed && { opacity: 0.7 },
            ]}>
            <AvatarDisplay config={{ type: 'initials', colour: cfg.colour }} initials={initials} size={48} />
            <Text style={styles.initialsLabel}>{initials}</Text>
            {cfg.type === 'initials' && <Text style={styles.rowCheck}>✓</Text>}
          </Pressable>

          {/* ── Finance mascots ── */}
          <Text style={styles.sectionLabel}>{t('profile.avatarMascots')}</Text>
          <View style={styles.emojiGrid}>
            {AVATAR_EMOJI_LIST.map((emoji) => {
              const active = cfg.type === 'emoji' && cfg.emoji === emoji;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => pickEmoji(emoji)}
                  style={({ pressed }) => [
                    styles.emojiCell,
                    active && styles.emojiCellActive,
                    pressed && { opacity: 0.7 },
                  ]}>
                  <AvatarDisplay
                    config={{ type: 'emoji', colour: cfg.colour, emoji }}
                    initials={initials}
                    size={56}
                  />
                  {active && (
                    <View style={styles.emojiCheckBadge}>
                      <Text style={styles.emojiCheckTxt}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: MC.card,
    borderTopLeftRadius: MR.xxl,
    borderTopRightRadius: MR.xxl,
    paddingHorizontal: MS.lg,
    paddingTop: MS.sm,
    gap: MS.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: MC.line,
    alignSelf: 'center',
    marginBottom: MS.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontFamily: MF.bold, color: MC.ink },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MC.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: 14, color: MC.muted, fontFamily: MF.medium },

  sectionLabel: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: MC.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Colour swatches
  colourRow: { flexDirection: 'row', gap: MS.md },
  swatchWrap: { alignItems: 'center', justifyContent: 'center' },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  swatchCheck: { fontSize: 16, color: '#fff', fontFamily: MF.bold },

  // Initials row
  initialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MS.md,
    backgroundColor: MC.bg,
    borderWidth: 1.5,
    borderColor: MC.line,
    borderRadius: MR.xl,
    paddingHorizontal: MS.lg,
    paddingVertical: MS.sm,
  },
  initialsRowActive: { borderColor: MC.emerald, backgroundColor: MC.emerald + '0D' },
  initialsLabel: { flex: 1, fontSize: 15, fontFamily: MF.semiBold, color: MC.ink },
  rowCheck: { fontSize: 16, color: MC.emerald, fontFamily: MF.bold },

  // Emoji grid — 3 columns
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MS.sm,
  },
  emojiCell: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MR.xl,
    borderWidth: 1.5,
    borderColor: MC.line,
    backgroundColor: MC.bg,
  },
  emojiCellActive: { borderColor: MC.emerald, backgroundColor: MC.emerald + '0D' },
  emojiCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: MC.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCheckTxt: { fontSize: 10, color: '#fff', fontFamily: MF.bold },
});
