import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarDisplay } from '@/components/avatar-display';
import { AvatarPicker } from '@/components/avatar-picker';
import { IncomeEditModal, type IncomeModalMode } from '@/components/income-edit-modal';
import { LanguagePicker } from '@/components/language-picker';
import { NotesScreen } from '@/components/notes-screen';
import { TabAgentOverlay } from '@/components/tab-agent-overlay';
import { Card } from '@/components/ui/Card';
import { TabSelector } from '@/components/ui/TabSelector';
import { MF, MR, MS, fmt } from '@/constants/money-theme';
import { shadow } from '@/constants/shadow';
import { type AppTheme, type ThemeMode } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/i18n';
import type { Language } from '@/i18n';
import { exportJSON, pickJSONFile } from '@/lib/backup';
import { homeAgentConfig } from '@/lib/agents/home-agent';
import { useAppData } from '@/store/AppDataProvider';

const LAST_EXPORT_KEY = 'money-hub-last-export';

type ProfileTab = 'finance' | 'settings';

function isValidBackup(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const b = obj as Record<string, unknown>;
  return Array.isArray(b.incomes) && Array.isArray(b.expenses) && Array.isArray(b.goals);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data, importData, resetData, setLanguage, setAvatar, setName, setThemeMode, addBill } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const [tab, setTab] = useState<ProfileTab>('finance');
  const [modalMode, setModalMode] = useState<IncomeModalMode>(null);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
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
        version: 1, exportedAt: new Date().toISOString(),
        name: data.name, month: data.month,
        incomes: data.incomes, expenses: data.expenses,
        goals: data.goals, holdings: data.holdings ?? [],
        notes: data.notes ?? [], bills: data.bills ?? [],
        history: data.history, coachProfile: data.coachProfile,
        coachPlan: data.coachPlan, language: data.language, avatar: data.avatar,
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
      if (!isValidBackup(parsed)) { showAlert('Import', t('backup.importError')); return; }
      const doImport = () => {
        importData(parsed as Parameters<typeof importData>[0]);
        showAlert('Import', t('backup.importSuccess'));
      };
      if (Platform.OS === 'web') {
        if (window.confirm(`${t('backup.confirmImportTitle')}\n\n${t('backup.confirmImportMsg')}`)) doImport();
        return;
      }
      Alert.alert(t('backup.confirmImportTitle'), t('backup.confirmImportMsg'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('backup.confirmImportOk'), style: 'destructive', onPress: doImport },
      ]);
    } catch {
      showAlert('Import', t('backup.importError'));
    } finally {
      setBackupBusy(false);
    }
  };

  const handleReset = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${t('profile.resetTitle')}?\n\n${t('profile.resetMsg')}`)) resetData();
      return;
    }
    Alert.alert(t('profile.resetTitle'), t('profile.resetMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.resetConfirm'), style: 'destructive', onPress: resetData },
    ]);
  };

  const initials = data.name.slice(0, 2).toUpperCase();
  const currentTheme = data.themeMode ?? 'system';
  const currentLangLabel =
    (data as any).language === 'ms' ? 'Bahasa Malaysia'
    : (data as any).language === 'zh' ? '中文'
    : 'English';

  const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: 'light',  label: t('profile.themeModeLight')  },
    { value: 'dark',   label: t('profile.themeModeDark')   },
    { value: 'system', label: t('profile.themeModeSystem') },
  ];

  const TAB_OPTIONS: { key: ProfileTab; label: string }[] = [
    { key: 'finance',  label: '💰  Finance'  },
    { key: 'settings', label: '⚙  Settings' },
  ];

  const NAV_ROWS = [
    { label: t('reports.title'),   icon: '📊', badge: null,                        href: '/reports' as const },
    { label: t('bills.title'),     icon: '🗓', badge: String((data.bills ?? []).length), href: '/bills' as const },
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Profile hero banner */}
        <LinearGradient
          colors={[C.indigo, C.indigo + 'CC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHero}>
          <View style={styles.profileHeroTop}>
            <Pressable onPress={() => setAvatarPickerOpen(true)} hitSlop={8}>
              <AvatarDisplay config={data.avatar} initials={initials} size={60} />
            </Pressable>
            <View style={styles.profileHeroInfo}>
              {editingName ? (
                <TextInput
                  style={styles.nameInputHero}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={() => { setName(nameInput); setEditingName(false); }}
                  onBlur={() => { setName(nameInput); setEditingName(false); }}
                />
              ) : (
                <Pressable onPress={() => { setNameInput(data.name); setEditingName(true); }} hitSlop={8}>
                  <View style={styles.heroNameRow}>
                    <Text style={styles.heroName}>{data.name}</Text>
                    <Text style={styles.heroNameEdit}>✎</Text>
                  </View>
                </Pressable>
              )}
              <Text style={styles.heroSnap}>{t('profile.snapshot', { month: data.month })}</Text>
            </View>
            <Pressable style={styles.aiBadge} onPress={() => setAiOpen(true)}>
              <Text style={styles.aiBadgeGlyph}>♞</Text>
            </Pressable>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatKey}>TOTAL INCOME</Text>
              <Text style={styles.heroStatVal}>{fmt(data.income)}</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatKey}>SAVED</Text>
              <Text style={styles.heroStatVal}>{data.savingsRate}%</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatKey}>SIDE SHARE</Text>
              <Text style={styles.heroStatVal}>{data.sideShare}%</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tab switcher */}
        <TabSelector tabs={TAB_OPTIONS} active={tab} onSelect={setTab} activeColor={C.indigo} />

        {/* ══ FINANCE TAB ══ */}
        {tab === 'finance' && (
          <>
            {/* Income streams */}
            <Card gap={MS.sm}>
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
            </Card>

            {/* Independence goal */}
            <Card style={styles.indepCard} gap={MS.md}>
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
            </Card>
          </>
        )}

        {/* ══ SETTINGS TAB ══ */}
        {tab === 'settings' && (
          <>
            {/* Navigation group */}
            <Card gap={MS.sm}>
              <Text style={styles.settingsGroupTitle}>Navigation</Text>
              {NAV_ROWS.map((row, i) => (
                <Link key={row.href} href={row.href} asChild>
                  <Pressable style={({ pressed }) => [styles.settingsRow, i < NAV_ROWS.length - 1 && styles.settingsRowBorder, pressed && styles.settingsRowPressed]}>
                    <Text style={styles.settingsIcon}>{row.icon}</Text>
                    <Text style={styles.settingsLabel}>{row.label}</Text>
                    <View style={styles.settingsRight}>
                      {row.badge !== null && <Text style={styles.settingsBadge}>{row.badge}</Text>}
                      <Text style={styles.settingsArrow}>›</Text>
                    </View>
                  </Pressable>
                </Link>
              ))}
              <View style={styles.settingsRowBorder}>
                <Pressable
                  style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
                  onPress={() => setNotesOpen(true)}>
                  <Text style={styles.settingsIcon}>📝</Text>
                  <Text style={styles.settingsLabel}>{t('notes.notesRow')}</Text>
                  <View style={styles.settingsRight}>
                    <Text style={styles.settingsBadge}>{(data.notes ?? []).length}</Text>
                    <Text style={styles.settingsArrow}>›</Text>
                  </View>
                </Pressable>
              </View>
            </Card>

            {/* Language */}
            <Pressable style={styles.settingsCard} onPress={() => setLangPickerOpen(true)}>
              <Text style={styles.settingsIcon}>🌐</Text>
              <Text style={styles.settingsLabel}>{t('profile.language')}</Text>
              <View style={styles.settingsRight}>
                <Text style={styles.settingsValue}>{currentLangLabel}</Text>
                <Text style={styles.settingsArrow}>›</Text>
              </View>
            </Pressable>

            {/* Theme */}
            <Card gap={MS.sm}>
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
            </Card>

            {/* Backup & Restore */}
            <Card gap={MS.sm}>
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
            </Card>

            {/* App info */}
            <View style={styles.appInfo}>
              <Text style={styles.appInfoTitle}>{t('profile.appName')}</Text>
              <Text style={styles.appInfoSub}>{t('profile.appSub')}</Text>
              <Text style={styles.appInfoNote}>{t('profile.appNote')}</Text>
              <Pressable style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetTxt}>{t('profile.reset')}</Text>
              </Pressable>
            </View>
          </>
        )}

        <View style={{ height: MS.xxl }} />
      </ScrollView>

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

      <IncomeEditModal mode={modalMode} onClose={() => setModalMode(null)} />
      <NotesScreen visible={notesOpen} onClose={() => setNotesOpen(false)} />

      <TabAgentOverlay
        config={homeAgentConfig}
        visible={aiOpen}
        onClose={() => setAiOpen(false)}
        userName={data.name}
        data={{
          salary: data.salary,
          side: data.side,
          income: data.income,
          net: data.net,
          savingsRate: data.savingsRate,
          sideShare: data.sideShare,
        }}
        ops={{ addBill }}
      />
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },

    // ── Profile hero ──
    profileHero: { borderRadius: MR.xxl, padding: MS.xl, gap: MS.lg, ...shadow('#000', 0, 8, 16, 0.3), elevation: 6 },
    profileHeroTop: { flexDirection: 'row', alignItems: 'center', gap: MS.lg },
    profileHeroInfo: { flex: 1 },
    aiBadge: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    },
    aiBadgeGlyph: { fontSize: 18, color: '#fff' },
    heroNameRow: { flexDirection: 'row', alignItems: 'center', gap: MS.xs },
    heroName: { fontSize: 22, fontFamily: MF.bold, color: '#fff' },
    heroNameEdit: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    nameInputHero: {
      fontSize: 22, fontFamily: MF.bold, color: '#fff',
      borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.6)',
      paddingVertical: MS.xs,
    },
    heroSnap: { fontSize: 12, fontFamily: MF.regular, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
    heroStatsRow: { flexDirection: 'row', alignItems: 'center' },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatKey: { fontSize: 9, fontFamily: MF.semiBold, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroStatVal: { fontSize: 15, fontFamily: MF.bold, color: '#fff', marginTop: 3 },
    heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

    // ── Generic card ──
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: MS.sm },
    cardTitle: { fontSize: 15, fontFamily: MF.bold, color: C.ink },
    addBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: C.emerald, alignItems: 'center', justifyContent: 'center',
      ...shadow(C.emerald, 0, 3, 6, 0.3), elevation: 4,
    },
    addBtnText: { fontSize: 20, color: '#fff', lineHeight: 24, fontFamily: MF.regular },

    // ── Income rows ──
    incRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: MS.sm },
    incRowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
    incRowPressed: { opacity: 0.6 },
    incEditArrow: { fontSize: 18, color: C.muted, marginLeft: MS.sm },
    incLeft: { flexDirection: 'row', alignItems: 'center', gap: MS.sm, flex: 1 },
    incLabel: { fontSize: 14, fontFamily: MF.medium, color: C.ink, flex: 1 },
    incBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
    incBadgeText: { fontSize: 10, fontFamily: MF.bold },
    incAmt: { fontSize: 14, fontFamily: MF.bold, color: C.ink },

    // ── Independence goal ──
    indepCard: { backgroundColor: C.goldLight, borderColor: C.goldBorder, gap: MS.md },
    indepBadge: { fontSize: 10, fontFamily: MF.bold, color: C.goldText, textTransform: 'uppercase', letterSpacing: 0.6 },
    indepHeadline: { fontSize: 18, fontFamily: MF.bold, color: C.ink, lineHeight: 26 },
    meterBg: { height: 10, backgroundColor: C.goldMeterBg, borderRadius: 6, overflow: 'hidden' },
    meterFill: { height: '100%', backgroundColor: C.gold, borderRadius: 6 },
    indepNote: { fontSize: 12.5, fontFamily: MF.regular, color: C.goldText, lineHeight: 18 },

    // ── Settings rows ──
    settingsGroupTitle: { fontSize: 11, fontFamily: MF.bold, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: MS.xs },
    settingsCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: MR.lg, paddingHorizontal: MS.lg, paddingVertical: MS.md,
      gap: MS.md,
    },
    settingsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: MS.md, gap: MS.md },
    settingsRowBorder: { borderTopWidth: 1, borderTopColor: C.line },
    settingsRowPressed: { opacity: 0.6 },
    settingsIcon: { fontSize: 18, width: 26, textAlign: 'center' },
    settingsLabel: { flex: 1, fontSize: 15, fontFamily: MF.semiBold, color: C.ink },
    settingsRight: { flexDirection: 'row', alignItems: 'center', gap: MS.sm },
    settingsBadge: { fontSize: 13, fontFamily: MF.regular, color: C.muted },
    settingsValue: { fontSize: 13, fontFamily: MF.regular, color: C.muted },
    settingsArrow: { fontSize: 18, color: C.muted },

    // ── Theme ──
    themeRow: { flexDirection: 'row', gap: MS.sm },
    themeBtn: { flex: 1, paddingVertical: MS.sm, borderRadius: MR.lg, borderWidth: 1.5, borderColor: C.line, alignItems: 'center' },
    themeBtnActive: { borderColor: C.indigo, backgroundColor: C.indigo + '15' },
    themeBtnText: { fontSize: 13, fontFamily: MF.semiBold, color: C.muted },
    themeBtnTextActive: { color: C.indigo },

    // ── Backup ──
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

    // ── App info ──
    appInfo: { alignItems: 'center', gap: 4, paddingVertical: MS.lg },
    appInfoTitle: { fontSize: 13, fontFamily: MF.bold, color: C.ink, opacity: 0.6 },
    appInfoSub: { fontSize: 11, fontFamily: MF.regular, color: C.muted, opacity: 0.6 },
    appInfoNote: { fontSize: 11, fontFamily: MF.regular, color: C.muted, opacity: 0.6 },
    resetBtn: { marginTop: MS.md, paddingVertical: MS.sm, paddingHorizontal: MS.lg, borderRadius: 999, borderWidth: 1, borderColor: C.clay },
    resetTxt: { fontSize: 12, fontFamily: MF.semiBold, color: C.clay },
  });
}
