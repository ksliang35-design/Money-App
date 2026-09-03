import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { MF, MR, MS } from '@/constants/money-theme';
import { type AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface MonthOption {
  key: string;
  label: string;
}

interface Props {
  options: MonthOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

/** Horizontally scrolling pill row for picking among month options (e.g. a live
 *  "Current" entry plus archived MonthlyRecord entries). Purely presentational —
 *  callers decide what each key means and what data it maps to. */
export function MonthSelector({ options, selectedKey, onSelect }: Props) {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.pills}>
      {options.map((opt) => {
        const active = opt.key === selectedKey;
        return (
          <Pressable
            key={opt.key}
            style={[styles.pill, active && { backgroundColor: C.emerald + '22', borderColor: C.emerald }]}
            onPress={() => onSelect(opt.key)}>
            <Text style={[styles.pillTxt, active && { color: C.emerald, fontFamily: MF.bold }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(C: AppTheme) {
  return StyleSheet.create({
    scroll: { marginBottom: MS.md },
    pills: { gap: MS.sm, paddingBottom: 2 },
    pill: {
      paddingHorizontal: MS.md, paddingVertical: 7,
      borderRadius: MR.md, borderWidth: 1, borderColor: C.line,
      backgroundColor: C.card,
    },
    pillTxt: { fontSize: 12, fontFamily: MF.medium, color: C.muted },
  });
}
