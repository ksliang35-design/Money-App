import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function exportJSON(json: string, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save backup' });
}

export async function pickJSONFile(): Promise<string | null> {
  const result = await File.pickFileAsync({
    mimeTypes: ['application/json', 'text/plain', '*/*'],
  });
  if (result.canceled || !result.result) return null;
  return result.result.text();
}
