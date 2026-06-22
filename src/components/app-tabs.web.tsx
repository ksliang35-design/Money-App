import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MC, MF } from '@/constants/money-theme';
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

const BottomBar = forwardRef<View, any>(({ children, ...props }, ref) => (
  <View ref={ref} {...props} style={styles.bar}>
    <View style={styles.barInner}>{children}</View>
  </View>
));

const TabBtn = forwardRef<View, TabTriggerSlotProps & { icon: string; label: string }>(
  ({ isFocused, icon, label, ...props }, ref) => (
    <Pressable ref={ref as any} {...props} style={styles.tabBtn}>
      <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : styles.tabLabelInactive]}>
        {label}
      </Text>
    </Pressable>
  )
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: MC.bg },
  slot: { flex: 1 },
  bar: {
    backgroundColor: MC.card,
    borderTopWidth: 1,
    borderTopColor: MC.line,
    alignItems: 'center',
  },
  barInner: {
    flexDirection: 'row',
    maxWidth: 480,
    width: '100%',
    paddingVertical: 6,
    paddingBottom: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    cursor: 'pointer' as any,
  },
  tabIcon: { fontSize: 20, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  tabLabel: { fontSize: 10, fontFamily: MF.semiBold },
  tabLabelActive: { color: MC.emeraldDark },
  tabLabelInactive: { color: MC.muted },
});
