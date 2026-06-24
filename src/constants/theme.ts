import { Platform } from 'react-native';

// ─── Legacy Expo template exports (used by boilerplate components) ────────────

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// ─── Money-App2 theme system ──────────────────────────────────────────────────

export interface AppTheme {
  bg: string;
  card: string;
  cardAlt: string;
  ink: string;
  muted: string;
  line: string;
  emerald: string;
  emeraldDark: string;
  gold: string;
  clay: string;
  indigo: string;
  goldLight: string;
  goldBorder: string;
  goldText: string;
  goldMeterBg: string;
  backdrop: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export const LIGHT: AppTheme = {
  bg:          '#EAEEEB',
  card:        '#FFFFFF',
  cardAlt:     '#F4F7F5',
  ink:         '#15241E',
  muted:       '#6B7B73',
  line:        '#E2E7E3',
  emerald:     '#0E7C5A',
  emeraldDark: '#0A5C43',
  gold:        '#C8962E',
  clay:        '#B5523A',
  indigo:      '#5B5BD6',
  goldLight:   '#FBF7EC',
  goldBorder:  '#EDE2C4',
  goldText:    '#8A6D1E',
  goldMeterBg: '#EFE6CE',
  backdrop:    'rgba(0,0,0,0.4)',
};

export const DARK: AppTheme = {
  bg:          '#0F1A14',
  card:        '#1A2820',
  cardAlt:     '#1F2D25',
  ink:         '#E8F0EB',
  muted:       '#7A9080',
  line:        '#273830',
  emerald:     '#1BB87A',
  emeraldDark: '#17A36A',
  gold:        '#D4A43A',
  clay:        '#D4634A',
  indigo:      '#8080EC',
  goldLight:   '#201C0D',
  goldBorder:  '#3A3015',
  goldText:    '#C8962E',
  goldMeterBg: '#2C2010',
  backdrop:    'rgba(0,0,0,0.65)',
};
