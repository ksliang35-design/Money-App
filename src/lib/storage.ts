import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'money-hub-data';

export async function loadData(): Promise<Record<string, unknown> | null> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return null;
  return JSON.parse(json) as Record<string, unknown>;
}

export async function saveData(data: unknown): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
