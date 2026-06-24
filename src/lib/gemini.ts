import { getLogger } from '@/lib/logger';

const log = getLogger('gemini');

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiBody {
  contents: { role?: string; parts: { text: string }[] }[];
  systemInstruction?: { parts: { text: string }[] };
}

export async function callGemini(body: GeminiBody): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    log.error('EXPO_PUBLIC_GEMINI_API_KEY not set');
    throw new Error('NO_API_KEY');
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const msg = `Gemini error ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`;
    log.error('callGemini failed', msg);
    throw new Error(msg);
  }

  const json = await res.json();
  const parts: { text?: string; thought?: boolean }[] =
    json.candidates?.[0]?.content?.parts ?? [];
  return (parts.find((p) => !p.thought) ?? parts[0])?.text ?? '';
}

export function extractJSON(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON found in Gemini response');
  return text.slice(start, end + 1);
}
