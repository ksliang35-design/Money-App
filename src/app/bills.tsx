import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillEditModal, type BillModalMode } from '@/components/bill-edit-modal';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { MF, MR, MS, fmt } from '@/constants/money-theme';
import { shadow } from '@/constants/shadow';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/i18n';
import { useAppData, type Bill } from '@/store/AppDataProvider';

function billDaysUntil(bill: Bill, today: Date): number {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  const todayMs = new Date(y, m, d).getTime();

  if (bill.date) {
    const [dy, dm, dd] = bill.date.split('-').map(Number);
    return Math.round((new Date(dy, dm - 1, dd).getTime() - todayMs) / 86400000);
  }

  const thisMonthMs = new Date(y, m, bill.dueDay).getTime();
  const daysThisMonth = Math.round((thisMonthMs - todayMs) / 86400000);
  if (daysThisMonth >= -7) return daysThisMonth;
  return Math.round((new Date(y, m + 1, bill.dueDay).getTime() - todayMs) / 86400000);
}

function formatBillDate(dateStr: string): string {
  const [dy, dm, dd] = dateStr.split('-').map(Number);
  return new Date(dy, dm - 1, dd).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function badgeColor(days: number, C: AppTheme): string {
  if (days < 0) return C.clay;
  if (days <= 3) return C.gold;
  return C.emerald;
}

export default function BillsScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useAppData();
  const t = useT();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [modalMode, setModalMode] = useState<BillModalMode>(null);

  const today = new Date();
  const bills = data.bills ?? [];

  const upcomingItems = useMemo(() => {
    return bills
      .map((bill) => ({ bill, daysUntil: billDaysUntil(bill, today) }))
      .filter((item) => item.daysUntil >= -7 && item.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [bills, today.toDateString()]);

  const billsList = bills.filter((b) => b.type === 'bill');
  const paydayList = bills.filter((b) => b.type === 'payday');

  function badgeLabel(days: number): string {
    if (days < 0) return t('bills.overdue');
    if (days === 0) return t('bills.dueToday');
    if (days === 1) return t('bills.dueIn1');
    return t('bills.dueIn', { n: String(days) });
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>{t('bills.title')}</Text>
          <Pressable
            style={styles.addBtn}
            onPress={() => setModalMode({ type: 'add' })}>
            <Text style={styles.addBtnText}>+</Text>
          </Pressable>
        </View>

        {/* Upcoming section */}
        <SectionLabel text={t('bills.upcoming')} />

        {upcomingItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>{t('bills.noUpcoming')}</Text>
          </View>
        ) : (
          upcomingItems.map(({ bill, daysUntil }) => {
            const color = badgeColor(daysUntil, C);
            return (
              <Pressable
                key={bill.id}
                style={({ pressed }) => [styles.upcomingCard, pressed && styles.pressed]}
                onPress={() => setModalMode({ type: 'edit', bill })}>
                <Text style={styles.upcomingIcon}>{bill.type === 'payday' ? '💰' : '💳'}</Text>
                <View style={styles.upcomingBody}>
                  <Text style={styles.upcomingName} numberOfLines={1}>{bill.name}</Text>
                  <Text style={styles.upcomingAmt}>{fmt(bill.amount)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Text style={[styles.badgeTxt, { color }]}>{badgeLabel(daysUntil)}</Text>
                </View>
              </Pressable>
            );
          })
        )}

        {/* All bills & paydays */}
        <SectionLabel text={t('bills.allBills')} style={{ marginTop: MS.sm }} />

        {bills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🗓</Text>
            <Text style={styles.emptyText}>{t('bills.noBills')}</Text>
          </View>
        ) : (
          <>
            {billsList.length > 0 && (
              <Card>
                <SectionLabel text={t('bills.sectionBills')} style={styles.cardSubtitle} />
                {billsList.map((bill, i) => (
                  <Pressable
                    key={bill.id}
                    style={({ pressed }) => [
                      styles.billRow,
                      i < billsList.length - 1 && styles.billRowBorder,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setModalMode({ type: 'edit', bill })}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billName}>{bill.name}</Text>
                      {!!bill.category && (
                        <Text style={styles.billCat}>{bill.category}</Text>
                      )}
                    </View>
                    <View style={styles.billRight}>
                      <Text style={[styles.billAmt, { color: C.clay }]}>{fmt(bill.amount)}</Text>
                      <Text style={styles.billDay}>
                        {bill.date ? t('bills.oneTimeOn', { date: formatBillDate(bill.date) }) : t('bills.dayOfMonth', { n: String(bill.dueDay) })}
                      </Text>
                      {!!bill.reminder && bill.reminder !== 'none' && (
                        <Text style={[styles.reminderBadge, { color: C.indigo }]}>
                          🔔 {bill.reminder === 'daily' ? t('bills.reminderDaily') : t('bills.reminderWeekly')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.billArrow}>›</Text>
                  </Pressable>
                ))}
              </Card>
            )}

            {paydayList.length > 0 && (
              <Card>
                <SectionLabel text={t('bills.sectionPayday')} style={styles.cardSubtitle} />
                {paydayList.map((bill, i) => (
                  <Pressable
                    key={bill.id}
                    style={({ pressed }) => [
                      styles.billRow,
                      i < paydayList.length - 1 && styles.billRowBorder,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => setModalMode({ type: 'edit', bill })}>
                    <View style={styles.billLeft}>
                      <Text style={styles.billName}>{bill.name}</Text>
                      {!!bill.category && (
                        <Text style={styles.billCat}>{bill.category}</Text>
                      )}
                    </View>
                    <View style={styles.billRight}>
                      <Text style={[styles.billAmt, { color: C.emerald }]}>{fmt(bill.amount)}</Text>
                      <Text style={styles.billDay}>
                        {bill.date ? t('bills.oneTimeOn', { date: formatBillDate(bill.date) }) : t('bills.dayOfMonth', { n: String(bill.dueDay) })}
                      </Text>
                      {!!bill.reminder && bill.reminder !== 'none' && (
                        <Text style={[styles.reminderBadge, { color: C.indigo }]}>
                          🔔 {bill.reminder === 'daily' ? t('bills.reminderDaily') : t('bills.reminderWeekly')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.billArrow}>›</Text>
                  </Pressable>
                ))}
              </Card>
            )}
          </>
        )}

        <View style={{ height: MS.xxl }} />
      </ScrollView>

      <BillEditModal mode={modalMode} onClose={() => setModalMode(null)} />
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    content: { padding: MS.lg, gap: MS.md },

    headerRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: MS.sm,
    },
    pageTitle: { fontSize: 26, fontFamily: MF.bold, color: C.ink },
    addBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.emerald, alignItems: 'center', justifyContent: 'center',
      ...shadow(C.emerald, 0, 3, 6, 0.3), elevation: 4,
    },
    addBtnText: { fontSize: 24, color: '#fff', lineHeight: 28 },

    emptyCard: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: MR.xl, padding: MS.xl,
      alignItems: 'center', gap: MS.sm,
    },
    emptyIcon: { fontSize: 28 },
    emptyText: { fontSize: 14, fontFamily: MF.regular, color: C.muted, textAlign: 'center' },

    upcomingCard: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: MR.xl, padding: MS.lg,
      flexDirection: 'row', alignItems: 'center', gap: MS.md,
    },
    pressed: { opacity: 0.65 },
    upcomingIcon: { fontSize: 24 },
    upcomingBody: { flex: 1 },
    upcomingName: { fontSize: 15, fontFamily: MF.semiBold, color: C.ink },
    upcomingAmt: { fontSize: 13, fontFamily: MF.bold, color: C.ink, marginTop: 2 },

    badge: {
      paddingHorizontal: MS.sm, paddingVertical: 4,
      borderRadius: MR.md, borderWidth: 1,
    },
    badgeTxt: { fontSize: 11, fontFamily: MF.bold },

    cardSubtitle: { marginBottom: MS.md },

    billRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: MS.sm, gap: MS.sm,
    },
    billRowBorder: { borderBottomWidth: 1, borderBottomColor: C.line },
    billLeft: { flex: 1 },
    billName: { fontSize: 14, fontFamily: MF.medium, color: C.ink },
    billCat: { fontSize: 11, fontFamily: MF.regular, color: C.muted, marginTop: 2 },
    billRight: { alignItems: 'flex-end' },
    billAmt: { fontSize: 14, fontFamily: MF.bold },
    billDay: { fontSize: 11, fontFamily: MF.regular, color: C.muted, marginTop: 2 },
    reminderBadge: { fontSize: 10, fontFamily: MF.medium, marginTop: 2 },
    billArrow: { fontSize: 18, color: C.muted },
  });
}
