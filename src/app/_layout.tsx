import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import AppTabs from '@/components/app-tabs';
import { LanguagePicker } from '@/components/language-picker';
import { AppDataProvider, useAppData } from '@/store/AppDataProvider';
import { DARK } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Language } from '@/i18n';

SplashScreen.preventAutoHideAsync();

function LanguageGate() {
  const { data, loaded, setLanguage } = useAppData();
  if (!loaded) return null;
  if (!data.language) {
    return <LanguagePicker onSelect={(lang: Language) => setLanguage(lang)} />;
  }
  return <AppTabs />;
}

function ThemedApp() {
  const C = useTheme();
  return (
    <ThemeProvider value={C === DARK ? DarkTheme : DefaultTheme}>
      <LanguageGate />
    </ThemeProvider>
  );
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AppDataProvider>
      <ThemedApp />
    </AppDataProvider>
  );
}
