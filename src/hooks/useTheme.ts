import { useColorScheme } from 'react-native';
import { DARK, LIGHT, type AppTheme } from '@/constants/theme';
import { useAppData } from '@/store/AppDataProvider';

export function useTheme(): AppTheme {
  const { data } = useAppData();
  const systemScheme = useColorScheme();
  const mode = data.themeMode ?? 'system';
  if (mode === 'dark') return DARK;
  if (mode === 'light') return LIGHT;
  return systemScheme === 'dark' ? DARK : LIGHT;
}
