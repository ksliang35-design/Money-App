export const MC = {
  bg: '#EAEEEB',
  ink: '#15241E',
  muted: '#6B7B73',
  emerald: '#0E7C5A',
  emeraldDark: '#0A5C43',
  gold: '#C8962E',
  clay: '#B5523A',
  indigo: '#5B5BD6',
  card: '#FFFFFF',
  line: '#E2E7E3',
  goldLight: '#FBF7EC',
  goldBorder: '#EDE2C4',
} as const;

export const MF = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const MS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const MR = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const fmt = (n: number) =>
  'RM ' + Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
