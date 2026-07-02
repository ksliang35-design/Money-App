import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { MR, MS } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  gap?: number;
}

export function Card({ children, style, gap }: Props) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={[styles.card, gap !== undefined ? { gap } : undefined, style]}>
      {children}
    </View>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
      borderRadius: MR.xl, padding: MS.lg,
    },
  });
}
