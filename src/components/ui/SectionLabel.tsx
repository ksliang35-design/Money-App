import { StyleSheet, Text, type TextStyle } from 'react-native';
import { MF } from '@/constants/money-theme';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  text: string;
  style?: TextStyle;
}

export function SectionLabel({ text, style }: Props) {
  const C = useTheme();
  return (
    <Text style={[styles.label, { color: C.muted }, style]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontFamily: MF.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
