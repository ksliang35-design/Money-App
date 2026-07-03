import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { MF, MR, MS } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  value: string | number;
  label: string;
  valueColor?: string;
  style?: ViewStyle;
  numberOfLines?: number;
}

export function StatPill({ value, label, valueColor, style, numberOfLines }: Props) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={[styles.pill, style]}>
      <Text style={[styles.val, valueColor ? { color: valueColor } : undefined]} numberOfLines={numberOfLines ?? 1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    pill: {
      flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: MR.lg, paddingVertical: MS.md, paddingHorizontal: MS.sm,
      alignItems: 'center', gap: 3,
    },
    val: { fontSize: 12, fontFamily: MF.bold, color: C.ink, textAlign: 'center' },
    label: { fontSize: 10, fontFamily: MF.regular, color: C.muted, textAlign: 'center' },
  });
}
