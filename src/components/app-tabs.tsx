import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MC, MF } from '@/constants/money-theme';

const TABS = [
  { name: 'home', href: '/' as const, icon: '⊞', label: 'Home' },
  { name: 'expenses', href: '/expenses' as const, icon: '💸', label: 'Expenses' },
  { name: 'invest', href: '/invest' as const, icon: '📈', label: 'Invest' },
  { name: 'coach', href: '/coach' as const, icon: '🧭', label: 'Coach' },
  { name: 'profile', href: '/profile' as const, icon: '👤', label: 'Profile' },
] as const;

export default function AppTabs() {
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
        </BottomBar>
      </TabList>
    </Tabs>
  );
}

const BottomBar = forwardRef<View, any>(({ children, ...props }, ref) => {
  const insets = useSafeAreaInsets();
  return (
    <View ref={ref} {...props} style={[styles.bar, { paddingBottom: insets.bottom || 8 }]}>
      {children}
    </View>
  );
});

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
    flexDirection: 'row',
    backgroundColor: MC.card,
    borderTopWidth: 1,
    borderTopColor: MC.line,
    paddingTop: 6,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  tabIcon: { fontSize: 20, opacity: 0.45 },
  tabIconActive: { opacity: 1 },
  tabLabel: {
    fontSize: 10,
    fontFamily: MF.semiBold,
  },
  tabLabelActive: { color: MC.emeraldDark },
  tabLabelInactive: { color: MC.muted },
});
