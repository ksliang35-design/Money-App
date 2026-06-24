import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MF } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useT } from '@/i18n';

export default function AppTabs() {
  const t = useT();
  const TABS = [
    { name: 'home',     href: '/',        icon: '⊞',  label: t('tabs.home')     },
    { name: 'expenses', href: '/expenses', icon: '💸',  label: t('tabs.expenses') },
    { name: 'invest',   href: '/invest',   icon: '📈',  label: t('tabs.invest')   },
    { name: 'coach',    href: '/coach',    icon: '🧭',  label: t('tabs.coach')    },
    { name: 'profile',  href: '/profile',  icon: '👤',  label: t('tabs.profile')  },
  ];
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <BottomBar>
          {TABS.map((t) => (
            <TabTrigger key={t.name} name={t.name} href={t.href as any} asChild>
              <TabBtn icon={t.icon} label={t.label} />
            </TabTrigger>
          ))}
          {/* Hidden trigger: registers /reports with the Tab navigator so Link navigation works */}
          <TabTrigger name="reports" href="/reports" style={{ display: 'none' }} />
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

const BottomBar = forwardRef<View, any>(({ children, ...props }, ref) => {
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View ref={ref} {...props} style={[styles.bar, { paddingBottom: insets.bottom || 8 }]}>
      {children}
    </View>
  );
});
BottomBar.displayName = 'BottomBar';

const TabBtn = forwardRef<View, TabTriggerSlotProps & { icon: string; label: string }>(
  ({ isFocused, icon, label, ...props }, ref) => {
    const C = useTheme();
    const styles = useMemo(() => makeStyles(C), [C]);
    return (
      <Pressable ref={ref as any} {...props} style={styles.tabBtn}>
        <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>{icon}</Text>
        <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : styles.tabLabelInactive]}>
          {label}
        </Text>
      </Pressable>
    );
  }
);
TabBtn.displayName = 'TabBtn';

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    slot: { flex: 1 },
    bar: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderTopWidth: 1,
      borderTopColor: C.line,
      paddingTop: 6,
    },
    tabBtn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 4 },
    tabIcon: { fontSize: 20, opacity: 0.45 },
    tabIconActive: { opacity: 1 },
    tabLabel: { fontSize: 10, fontFamily: MF.semiBold },
    tabLabelActive: { color: C.emeraldDark },
    tabLabelInactive: { color: C.muted },
  });
}
