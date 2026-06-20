import { type ExpenseCategory } from '@/constants/mock-data';

export interface ParsedExpense {
  isExpense: boolean;
  label: string;
  amount: number;
  method: 'card' | 'ewallet' | 'cash' | 'bank';
  category: ExpenseCategory;
}

export async function parseExpense(text: string): Promise<ParsedExpense> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const prompt = `You extract ONE expense from the user's text for a Malaysian finance app (RM). Return ONLY valid JSON:
{"isExpense":true,"label":"<short name>","amount":<number>,"method":"card|ewallet|cash|bank","category":"food|transport|shopping|bills|entertainment|health|education|other"}
Pick the best-matching category. If it's an OTP, promo, verification code, or not a real expense, set isExpense false (keep other fields as empty string/0/"other").

User text: ${text}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini error ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
  }

  const json = await res.json();
  // Gemini 2.5 Flash returns thinking in parts[0] (thought:true) and content in parts[1]
  const parts: Array<{ text?: string; thought?: boolean }> = json.candidates?.[0]?.content?.parts ?? [];
  const responseText: string = (parts.find((p) => !p.thought) ?? parts[0])?.text ?? '';
  const start = responseText.indexOf('{');
  const end = responseText.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON found in response');
  return JSON.parse(responseText.slice(start, end + 1)) as ParsedExpense;
}
