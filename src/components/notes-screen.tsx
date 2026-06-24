import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoteEditModal, makeTagColors, type NoteModalMode } from '@/components/note-edit-modal';
import { MF, MR, MS, fmt } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { type Note, type NoteTag } from '@/constants/mock-data';
import { useT } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function SummaryStrip({ notes }: { notes: Note[] }) {
  const t = useT();
  const C = useTheme();
  const TAG_COLORS = useMemo(() => makeTagColors(C), [C]);

  const sum = (tag: NoteTag) =>
    notes
      .filter((n) => n.tag === tag && n.amount != null)
      .reduce((s, n) => s + (n.amount ?? 0), 0);

  const owedToMe = sum('owed_to_me');
  const iOwe     = sum('i_owe');
  const toClaim  = sum('to_claim');

  if (owedToMe === 0 && iOwe === 0 && toClaim === 0) return null;

  const items = [
    { label: t('notes.owedToMe'), amount: owedToMe, ...TAG_COLORS.owed_to_me },
    { label: t('notes.iOwe'),     amount: iOwe,     ...TAG_COLORS.i_owe      },
    { label: t('notes.toClaim'),  amount: toClaim,  ...TAG_COLORS.to_claim   },
  ].filter((x) => x.amount > 0);

  return (
    <View style={ss.strip}>
      {items.map((item, i) => (
        <View key={i} style={[ss.pill, { backgroundColor: item.bg, borderColor: item.border }]}>
          <Text style={[ss.pillLabel, { color: item.text }]}>{item.label}</Text>
          <Text style={[ss.pillAmt, { color: item.text }]}>{fmt(item.amount)}</Text>
        </View>
      ))}
    </View>
  );
}

const ss = StyleSheet.create({
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: MS.sm, marginBottom: MS.md },
  pill: { borderRadius: MR.lg, borderWidth: 1, paddingHorizontal: MS.md, paddingVertical: MS.sm, gap: 2 },
  pillLabel: { fontSize: 10, fontFamily: MF.semiBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  pillAmt: { fontSize: 15, fontFamily: MF.bold },
});

// ─── Note card ────────────────────────────────────────────────────────────────

function NoteCard({ note, onPress }: { note: Note; onPress: () => void }) {
  const t = useT();
  const C = useTheme();
  const nc = useMemo(() => makeNoteCardStyles(C), [C]);
  const TAG_COLORS = useMemo(() => makeTagColors(C), [C]);

  const tagLabel: Record<NoteTag, string> = {
    owed_to_me: t('notes.tagOwedToMe'),
    i_owe:      t('notes.tagIOwe'),
    to_claim:   t('notes.tagToClaim'),
    reminder:   t('notes.tagReminder'),
    general:    t('notes.tagGeneral'),
  };

  return (
    <Pressable
      style={({ pressed }) => [nc.card, pressed && nc.cardPressed]}
      onPress={onPress}>
      <View style={nc.top}>
        <View style={nc.topLeft}>
          {note.tag && (
            <View style={[nc.chip, { backgroundColor: TAG_COLORS[note.tag].bg, borderColor: TAG_COLORS[note.tag].border }]}>
              <Text style={[nc.chipText, { color: TAG_COLORS[note.tag].text }]}>
                {tagLabel[note.tag]}
              </Text>
            </View>
          )}
        </View>
        <Text style={nc.date}>{fmtDate(note.createdAt)}</Text>
      </View>
      <Text style={nc.text}>{note.text}</Text>
      {note.amount != null && (
        <View style={nc.amtRow}>
          <Text style={nc.amt}>{fmt(note.amount)}</Text>
        </View>
      )}
    </Pressable>
  );
}

function makeNoteCardStyles(C: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.lg,
      gap: MS.sm,
    },
    cardPressed: { opacity: 0.7 },
    top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: MS.sm },
    topLeft: { flexDirection: 'row', flex: 1 },
    chip: { paddingHorizontal: MS.sm, paddingVertical: 3, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
    chipText: { fontSize: 10, fontFamily: MF.semiBold, letterSpacing: 0.3 },
    date: { fontSize: 11, fontFamily: MF.regular, color: C.muted, flexShrink: 0 },
    text: { fontSize: 14, fontFamily: MF.medium, color: C.ink, lineHeight: 21 },
    amtRow: { alignItems: 'flex-end' },
    amt: { fontSize: 16, fontFamily: MF.bold, color: C.ink },
  });
}

// ─── Full-screen notes screen ─────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function NotesScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { data } = useAppData();
  const t = useT();
  const C = useTheme();
  const rootStyles = useMemo(() => makeRootStyles(C), [C]);
  const [editMode, setEditMode] = useState<NoteModalMode>(null);

  const notes: Note[] = data.notes ?? [];
  const sorted = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={[rootStyles.screen, { backgroundColor: C.bg }]}>
        {/* Header */}
        <View style={[rootStyles.header, { paddingTop: insets.top + MS.md }]}>
          <View>
            <Text style={rootStyles.title}>{t('notes.title')}</Text>
            <Text style={rootStyles.sub}>{t('notes.sub')}</Text>
          </View>
          <Pressable onPress={onClose} style={rootStyles.closeBtn} hitSlop={12}>
            <Text style={rootStyles.closeGlyph}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          style={rootStyles.scroll}
          contentContainerStyle={rootStyles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <SummaryStrip notes={notes} />

          <Pressable
            style={rootStyles.addBtn}
            onPress={() => setEditMode({ type: 'add' })}>
            <Text style={rootStyles.addBtnText}>{t('notes.addNote')}</Text>
          </Pressable>

          {sorted.length === 0 ? (
            <View style={rootStyles.emptyCard}>
              <Text style={rootStyles.emptyText}>{t('notes.noNotes')}</Text>
            </View>
          ) : (
            sorted.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                onPress={() => setEditMode({ type: 'edit', note: n })}
              />
            ))
          )}

          <View style={{ height: insets.bottom + MS.xxl }} />
        </ScrollView>
      </View>

      <NoteEditModal mode={editMode} onClose={() => setEditMode(null)} />
    </Modal>
  );
}

function makeRootStyles(C: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: MS.lg,
      paddingBottom: MS.md,
      borderBottomWidth: 1,
      borderBottomColor: C.line,
      backgroundColor: C.bg,
    },
    title: { fontSize: 22, fontFamily: MF.bold, color: C.ink },
    sub: { fontSize: 12, fontFamily: MF.regular, color: C.muted, marginTop: 2 },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    closeGlyph: { fontSize: 13, color: C.muted, fontFamily: MF.medium },
    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },
    addBtn: {
      backgroundColor: C.emerald,
      borderRadius: MR.lg,
      paddingVertical: 13,
      alignItems: 'center',
      shadowColor: C.emerald,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.28,
      shadowRadius: 6,
      elevation: 4,
    },
    addBtnText: { fontSize: 14, fontFamily: MF.bold, color: '#fff' },
    emptyCard: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.xl,
      padding: MS.xl,
      alignItems: 'center',
    },
    emptyText: { fontSize: 13, fontFamily: MF.regular, color: C.muted, textAlign: 'center', lineHeight: 20 },
  });
}
