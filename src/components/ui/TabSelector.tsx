import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MF, MR, MS } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Tab<T extends string = string> {
  key: T;
  label: string;
}

interface Props<T extends string = string> {
  tabs: Tab<T>[];
  active: T;
  onSelect: (key: T) => void;
  activeColor: string;
}

export function TabSelector<T extends string>({ tabs, active, onSelect, activeColor }: Props<T>) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.row}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            style={[styles.chip, isActive && { backgroundColor: activeColor, borderColor: activeColor }]}
            onPress={() => onSelect(t.key)}>
            <Text style={[styles.text, isActive && styles.textActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: MS.sm },
    chip: {
      flex: 1, paddingVertical: MS.sm + 3,
      borderRadius: MR.lg, borderWidth: 1.5,
      borderColor: C.line, backgroundColor: C.card,
      alignItems: 'center',
    },
    text: { fontSize: 13.5, fontFamily: MF.semiBold, color: C.muted },
    textActive: { color: '#fff' },
  });
}
