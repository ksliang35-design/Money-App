import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { AvatarDisplay } from '@/components/avatar-display';
import { AvatarPicker } from '@/components/avatar-picker';
import { IncomeEditModal, type IncomeModalMode } from '@/components/income-edit-modal';
import { LanguagePicker } from '@/components/language-picker';
import { NotesScreen } from '@/components/notes-screen';
import { MF, MR, MS, fmt } from '@/constants/money-theme';
import { type AppTheme, type ThemeMode } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/i18n';
import type { Language } from '@/i18n';
import { exportJSON, pickJSONFile } from '@/lib/backup';
import { useAppData } from '@/store/AppDataProvider';

const LAST_EXPORT_KEY = 'money-hub-last-export';

function isValidBackup(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const b = obj as Record<string, unknown>;
  return Array.isArray(b.incomes) && Array.isArray(b.expenses) && Array.isArray(b.goals);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data, importData, resetData, setLanguage, setAvatar, setName, setThemeMode } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [modalMode, setModalMode] = useState<IncomeModalMode>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(data.name);

  useEffect(() => {
    AsyncStorage.getItem(LAST_EXPORT_KEY).then((v) => setLastExportAt(v));
  }, []);

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') { window.alert(`${title}\n\n${msg}`); return; }
    Alert.alert(title, msg);
  };

  const handleExport = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const payload = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        name: data.name,
        month: data.month,
        incomes: data.incomes,
        expenses: data.expenses,
        goals: data.goals,
        holdings: data.holdings ?? [],
        notes: data.notes ?? [],
        history: data.history,
        coachProfile: data.coachProfile,
        coachPlan: data.coachPlan,
        language: data.language,
        avatar: data.avatar,
      }, null, 2);
      await exportJSON(payload, 'money-hub-backup.json');
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_EXPORT_KEY, now);
      setLastExportAt(now);
    } catch (e: any) {
      if (e?.message !== 'CANCELLED') showAlert('Export', t('backup.exportError'));
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImport = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const text = await pickJSONFile();
      if (!text) return;

      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch {
        showAlert('Import', t('backup.importError'));
        return;
      }
      if (!isValidBackup(parsed)) {
        showAlert('Import', t('backup.importError'));
        return;
      }

      const doImport = () => {
        importData(parsed as Parameters<typeof importData>[0]);
        showAlert('Import', t('backup.importSuccess'));
      };

      if (Platform.OS === 'web') {
        if (window.confirm(`${t('backup.confirmImportTitle')}\n\n${t('backup.confirmImportMsg')}`)) doImport();
        return;
      }
      Alert.alert(
        t('backup.confirmImportTitle'),
        t('backup.confirmImportMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('backup.confirmImportOk'), style: 'destructive', onPress: doImport },
        ],
      );
    } catch {
      showAlert('Import', t('backup.importError'));
    } finally {
      setBackupBusy(false);
    }
  };

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
  const currentTheme = data.themeMode ?? 'system';

  const STATS = [
    { label: t('profile.totalIncome'),   value: fmt(data.income),         color: C.emerald     },
    { label: t('profile.totalExpenses'), value: fmt(data.expense),         color: C.clay        },
    { label: t('profile.netSavings'),    value: fmt(data.net),             color: C.emeraldDark },
    { label: t('profile.savingsRate'),   value: `${data.savingsRate}%`,    color: C.gold        },
  ];

  const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: 'light',  label: t('profile.themeModeLight')  },
    { value: 'dark',   label: t('profile.themeModeDark')   },
    { value: 'system', label: t('profile.themeModeSystem') },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <Pressable onPress={() => setAvatarPickerOpen(true)} hitSlop={8}>
            <AvatarDisplay config={data.avatar} initials={initials} size={80} />
          </Pressable>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={() => {
                  setName(nameInput);
                  setEditingName(false);
                }}
                onBlur={() => {
                  setName(nameInput);
                  setEditingName(false);
                }}
              />
            </View>
          ) : (
            <Pressable onPress={() => { setNameInput(data.name); setEditingName(true); }} hitSlop={8}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{data.name}</Text>
                <Text style={styles.nameEditIcon}>✎</Text>
              </View>
            </Pressable>
          )}
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
                <View style={[styles.incBadge, { backgroundColor: inc.type === 'salary' ? C.emerald + '20' : C.gold + '20' }]}>
                  <Text style={[styles.incBadgeText, { color: inc.type === 'salary' ? C.emeraldDark : C.goldText }]}>
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

        {/* Reports row */}
        <Link href="/reports" asChild>
          <Pressable style={styles.langRow}>
            <Text style={styles.langLabel}>{t('reports.title')}</Text>
            <View style={styles.langRight}>
              <Text style={styles.langValue}>📊</Text>
              <Text style={styles.langArrow}>›</Text>
            </View>
          </Pressable>
        </Link>

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

        {/* Display theme */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.themeMode')}</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = currentTheme === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.themeBtn, active && styles.themeBtnActive]}
                  onPress={() => setThemeMode(opt.value)}>
                  <Text style={[styles.themeBtnText, active && styles.themeBtnTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Backup & Restore */}
        <View style={styles.card}>
          <View style={styles.backupHeader}>
            <Text style={styles.cardTitle}>{t('backup.title')}</Text>
            <Text style={styles.backupMeta}>
              {lastExportAt
                ? t('backup.lastExport', { date: new Date(lastExportAt).toLocaleDateString() })
                : t('backup.neverExported')}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.backupRow, pressed && styles.backupRowPressed]}
            onPress={handleExport}
            disabled={backupBusy}>
            <Text style={styles.backupRowIcon}>📤</Text>
            <View style={styles.backupRowBody}>
              <Text style={styles.backupRowLabel}>{t('backup.exportBtn')}</Text>
              <Text style={styles.backupRowSub}>{t('backup.exportSub')}</Text>
            </View>
            <Text style={styles.backupArrow}>›</Text>
          </Pressable>

          <View style={styles.backupDivider} />

          <Pressable
            style={({ pressed }) => [styles.backupRow, pressed && styles.backupRowPressed]}
            onPress={handleImport}
            disabled={backupBusy}>
            <Text style={styles.backupRowIcon}>📥</Text>
            <View style={styles.backupRowBody}>
              <Text style={styles.backupRowLabel}>{t('backup.importBtn')}</Text>
              <Text style={styles.backupRowSub}>{t('backup.importSub')}</Text>
            </View>
            <Text style={styles.backupArrow}>›</Text>
          </Pressable>
        </View>

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

        <AvatarPicker
          visible={avatarPickerOpen}
          current={data.avatar}
          initials={initials}
          onChange={(cfg) => setAvatar(cfg)}
          onClose={() => setAvatarPickerOpen(false)}
        />

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

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },

    avatarSection: { alignItems: 'center', paddingVertical: MS.xl, gap: MS.sm },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: MS.xs },
    name: { fontSize: 24, fontFamily: MF.bold, color: C.ink },
    nameEditIcon: { fontSize: 16, color: C.muted, marginTop: 4 },
    nameEditRow: { width: '70%' },
    nameInput: {
      fontSize: 24,
      fontFamily: MF.bold,
      color: C.ink,
      borderBottomWidth: 2,
      borderBottomColor: C.emerald,
      textAlign: 'center',
      paddingVertical: MS.xs,
    },
    nameSub: { fontSize: 13, fontFamily: MF.regular, color: C.muted },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MS.sm },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.lg,
      padding: MS.md,
      gap: 3,
    },
    statLabel: { fontSize: 11, fontFamily: MF.medium, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
    statValue: { fontSize: 20, fontFamily: MF.bold },

    card: {
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
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
    cardTitle: { fontSize: 15, fontFamily: MF.bold, color: C.ink },
    addBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: C.emerald,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.emerald,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    addBtnText: { fontSize: 20, color: '#fff', lineHeight: 24, fontFamily: MF.regular },

    incRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MS.sm },
    incRowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
    incRowPressed: { opacity: 0.6 },
    incEditArrow: { fontSize: 18, color: C.muted, marginLeft: MS.sm },
    incLeft: { flexDirection: 'row', alignItems: 'center', gap: MS.sm, flex: 1 },
    incLabel: { fontSize: 14, fontFamily: MF.medium, color: C.ink, flex: 1 },
    incBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    incBadgeText: { fontSize: 10, fontFamily: MF.bold },
    incAmt: { fontSize: 14, fontFamily: MF.bold, color: C.ink },

    indepCard: { backgroundColor: C.goldLight, borderColor: C.goldBorder, gap: MS.md },
    indepBadge: {
      fontSize: 10,
      fontFamily: MF.bold,
      color: C.goldText,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    indepHeadline: { fontSize: 18, fontFamily: MF.bold, color: C.ink, lineHeight: 26 },
    meterBg: { height: 10, backgroundColor: C.goldMeterBg, borderRadius: 6, overflow: 'hidden' },
    meterFill: { height: '100%', backgroundColor: C.gold, borderRadius: 6 },
    indepNote: { fontSize: 12.5, fontFamily: MF.regular, color: C.goldText, lineHeight: 18 },

    themeRow: { flexDirection: 'row', gap: MS.sm },
    themeBtn: {
      flex: 1,
      paddingVertical: MS.sm,
      borderRadius: MR.lg,
      borderWidth: 1.5,
      borderColor: C.line,
      alignItems: 'center',
    },
    themeBtnActive: { borderColor: C.emerald, backgroundColor: C.emerald + '15' },
    themeBtnText: { fontSize: 13, fontFamily: MF.semiBold, color: C.muted },
    themeBtnTextActive: { color: C.emeraldDark },

    appInfo: { alignItems: 'center', gap: 4, paddingVertical: MS.lg },
    appInfoTitle: { fontSize: 13, fontFamily: MF.bold, color: C.ink, opacity: 0.6 },
    appInfoSub: { fontSize: 11, fontFamily: MF.regular, color: C.muted, opacity: 0.6 },
    appInfoNote: { fontSize: 11, fontFamily: MF.regular, color: C.muted, opacity: 0.6 },
    resetBtn: {
      marginTop: MS.md,
      paddingVertical: MS.sm,
      paddingHorizontal: MS.lg,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.clay,
    },
    resetTxt: { fontSize: 12, fontFamily: MF.semiBold, color: C.clay },

    langRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.line,
      borderRadius: MR.lg,
      paddingHorizontal: MS.lg,
      paddingVertical: MS.md,
    },
    langLabel: { fontSize: 15, fontFamily: MF.semiBold, color: C.ink },
    langRight: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
    langValue: { fontSize: 13, fontFamily: MF.regular, color: C.muted },
    langArrow: { fontSize: 18, color: C.muted },

    backupHeader: { gap: 2, marginBottom: MS.xs },
    backupMeta: { fontSize: 11, fontFamily: MF.regular, color: C.muted },
    backupRow: { flexDirection: 'row', alignItems: 'center', gap: MS.md, paddingVertical: MS.sm },
    backupRowPressed: { opacity: 0.55 },
    backupRowIcon: { fontSize: 22, width: 30, textAlign: 'center' },
    backupRowBody: { flex: 1 },
    backupRowLabel: { fontSize: 14, fontFamily: MF.semiBold, color: C.ink },
    backupRowSub: { fontSize: 11, fontFamily: MF.regular, color: C.muted, marginTop: 1 },
    backupArrow: { fontSize: 18, color: C.muted },
    backupDivider: { height: 1, backgroundColor: C.line },
  });
}
