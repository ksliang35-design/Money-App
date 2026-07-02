import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  value: number;  // 0–100
  color: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ value, color, height = 8, style }: Props) {
  const C = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.track, { height, backgroundColor: C.line }, style]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, height }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: 4, overflow: 'hidden' },
  fill: { borderRadius: 4 },
});
