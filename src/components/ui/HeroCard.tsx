import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { MF, MR, MS } from '@/constants/money-theme';
import { shadow } from '@/constants/shadow';

interface Props {
  gradient: [string, string];
  label: string;
  amount: string;
  shadowColor?: string;
  amountFontSize?: number;
  children?: ReactNode;
  style?: ViewStyle;
}

export function HeroCard({
  gradient,
  label,
  amount,
  shadowColor,
  amountFontSize = 42,
  children,
  style,
}: Props) {
  const sh = shadowColor
    ? shadow(shadowColor, 0, 10, 18, 0.35)
    : shadow('#000', 0, 8, 16, 0.3);
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, sh, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, { fontSize: amountFontSize, lineHeight: amountFontSize + 8 }]}>
        {amount}
      </Text>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: MR.xxl, padding: MS.xl, elevation: 8 },
  label: {
    fontSize: 11, fontFamily: MF.semiBold,
    color: 'rgba(255,255,255,0.8)', letterSpacing: 0.8, textTransform: 'uppercase',
  },
  amount: { fontFamily: MF.bold, color: '#fff', marginTop: 6 },
});
