import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IncomeEditModal, type IncomeModalMode } from '@/components/income-edit-modal';
import { LanguagePicker } from '@/components/language-picker';
import { NotesScreen } from '@/components/notes-screen';
import { MC, MF, MR, MS, fmt } from '@/constants/money-theme';
import { useT } from '@/i18n';
import type { Language } from '@/i18n';
import { useAppData } from '@/store/AppDataProvider';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data, resetData, setLanguage } = useAppData();
  const t = useT();
  const [modalMode, setModalMode] = useState<IncomeModalMode>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const handleReset = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('profile.resetTitle')}?\n\n${t('profile.resetMsg')}`)) {
        resetData();
      }
      return;
    }
    Alert.alert(
      t('profile.resetTitle'),
      t('profile.resetMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.resetConfirm'), style: 'destructive', onPress: resetData },
      ],
    );
  };

  const initials = data.name.slice(0, 2).toUpperCase();

  const STATS = [
    { label: t('profile.totalIncome'), value: fmt(data.income), color: MC.emerald },
    { label: t('profile.totalExpenses'), value: fmt(data.expense), color: MC.clay },
    { label: t('profile.netSavings'), value: fmt(data.net), color: MC.emeraldDark },
    { label: t('profile.savingsRate'), value: `${data.savingsRate}%`, color: MC.gold },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={[MC.emerald, MC.emeraldDark]}
            style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.nameSub}>{t('profile.snapshot', { month: data.month })}</Text>
        </View>

        {/* Month stats */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Income streams */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{t('profile.incomeStreams')}</Text>
            <Pressable style={styles.addBtn} onPress={() => setModalMode({ type: 'add' })}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
          {data.incomes.map((inc, i) => (
            <Pressable
              key={inc.id}
              style={({ pressed }) => [
                styles.incRow,
                i < data.incomes.length - 1 && styles.incRowBorder,
                pressed && styles.incRowPressed,
              ]}
              onPress={() => setModalMode({ type: 'edit', income: inc })}>
              <View style={styles.incLeft}>
                <Text style={styles.incLabel}>{inc.label}</Text>
                <View style={[styles.incBadge, { backgroundColor: inc.type === 'salary' ? MC.emerald + '20' : MC.gold + '20' }]}>
                  <Text style={[styles.incBadgeText, { color: inc.type === 'salary' ? MC.emeraldDark : '#8A6D1E' }]}>
                    {inc.type === 'salary' ? t('common.salary') : t('common.side')}
                  </Text>
                </View>
              </View>
              <Text style={styles.incAmt}>{fmt(inc.amount)}</Text>
              <Text style={styles.incEditArrow}>›</Text>
            </Pressable>
          ))}
        </View>

        {/* Independence goal */}
        <View style={[styles.card, styles.indepCard]}>
          <Text style={styles.indepBadge}>{t('profile.independenceGoal')}</Text>
          <Text style={styles.indepHeadline}>
            {t('profile.independenceHeadline', { pct: data.sideShare })}
          </Text>
          <View style={styles.meterBg}>
            <View style={[styles.meterFill, { width: `${data.sideShare}%` }]} />
          </View>
          <Text style={styles.indepNote}>
            {data.sideShare < 30
              ? t('profile.independenceLow', { gap: 30 - data.sideShare })
              : t('profile.independenceHigh')}
          </Text>
        </View>

        {/* Notes row */}
        <Pressable style={styles.langRow} onPress={() => setNotesOpen(true)}>
          <Text style={styles.langLabel}>{t('notes.notesRow')}</Text>
          <View style={styles.langRight}>
            <Text style={styles.langValue}>{(data.notes ?? []).length}</Text>
            <Text style={styles.langArrow}>›</Text>
          </View>
        </Pressable>

        {/* Language row */}
        <Pressable style={styles.langRow} onPress={() => setLangPickerOpen(true)}>
          <Text style={styles.langLabel}>{t('profile.language')}</Text>
          <View style={styles.langRight}>
            <Text style={styles.langValue}>
              {(data as any).language === 'ms' ? 'Bahasa Malaysia' : (data as any).language === 'zh' ? '中文' : 'English'}
            </Text>
            <Text style={styles.langArrow}>›</Text>
          </View>
        </Pressable>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>{t('profile.appName')}</Text>
          <Text style={styles.appInfoSub}>{t('profile.appSub')}</Text>
          <Text style={styles.appInfoNote}>{t('profile.appNote')}</Text>
          <Pressable style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetTxt}>{t('profile.reset')}</Text>
          </Pressable>
        </View>

        {langPickerOpen && (
          <LanguagePicker
            modal
            onSelect={(lang: Language) => setLanguage(lang)}
            onClose={() => setLangPickerOpen(false)}
          />
        )}

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <IncomeEditModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
      />
      <NotesScreen visible={notesOpen} onClose={() => setNotesOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MC.bg },
  scroll: { flex: 1 },
  content: { padding: MS.lg, gap: MS.md },

  avatarSection: { alignItems: 'center', paddingVertical: MS.xl, gap: MS.sm },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MC.emerald,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: { fontSize: 28, fontFamily: MF.bold, color: '#fff' },
  name: { fontSize: 24, fontFamily: MF.bold, color: MC.ink },
  nameSub: { fontSize: 13, fontFamily: MF.regular, color: MC.muted },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MS.sm },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.lg,
    padding: MS.md,
    gap: 3,
  },
  statLabel: { fontSize: 11, fontFamily: MF.medium, color: MC.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 20, fontFamily: MF.bold },

  card: {
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.xl,
    padding: MS.lg,
    gap: MS.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MS.sm,
  },
  cardTitle: { fontSize: 15, fontFamily: MF.bold, color: MC.ink },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MC.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MC.emerald,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  addBtnText: { fontSize: 20, color: '#fff', lineHeight: 24, fontFamily: MF.regular },

  incRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MS.sm },
  incRowBorder: { borderBottomWidth: 1, borderBottomColor: MC.line },
  incRowPressed: { opacity: 0.6 },
  incEditArrow: { fontSize: 18, color: MC.muted, marginLeft: MS.sm },
  incLeft: { flexDirection: 'row', alignItems: 'center', gap: MS.sm, flex: 1 },
  incLabel: { fontSize: 14, fontFamily: MF.medium, color: MC.ink, flex: 1 },
  incBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  incBadgeText: { fontSize: 10, fontFamily: MF.bold },
  incAmt: { fontSize: 14, fontFamily: MF.bold, color: MC.ink },

  indepCard: { backgroundColor: MC.goldLight, borderColor: MC.goldBorder, gap: MS.md },
  indepBadge: {
    fontSize: 10,
    fontFamily: MF.bold,
    color: '#8A6D1E',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  indepHeadline: { fontSize: 18, fontFamily: MF.bold, color: MC.ink, lineHeight: 26 },
  indepNum: { color: MC.gold },
  meterBg: { height: 10, backgroundColor: '#EFE6CE', borderRadius: 6, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: MC.gold, borderRadius: 6 },
  indepNote: { fontSize: 12.5, fontFamily: MF.regular, color: '#6B5A23', lineHeight: 18 },

  appInfo: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: MS.lg,
  },
  appInfoTitle: { fontSize: 13, fontFamily: MF.bold, color: MC.ink, opacity: 0.6 },
  appInfoSub: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, opacity: 0.6 },
  appInfoNote: { fontSize: 11, fontFamily: MF.regular, color: MC.muted, opacity: 0.6 },
  resetBtn: {
    marginTop: MS.md,
    paddingVertical: MS.sm,
    paddingHorizontal: MS.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MC.clay,
  },
  resetTxt: { fontSize: 12, fontFamily: MF.semiBold, color: MC.clay },

  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: MC.card,
    borderWidth: 1,
    borderColor: MC.line,
    borderRadius: MR.lg,
    paddingHorizontal: MS.lg,
    paddingVertical: MS.md,
  },
  langLabel: { fontSize: 15, fontFamily: MF.semiBold, color: MC.ink },
  langRight: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
  langValue: { fontSize: 13, fontFamily: MF.regular, color: MC.muted },
  langArrow: { fontSize: 18, color: MC.muted },
});
