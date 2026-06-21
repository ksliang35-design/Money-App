import { type ExpenseCategory } from '@/constants/mock-data';
import { getLogger } from '@/lib/logger';
import { callGemini, extractJSON } from '@/lib/gemini';

const log = getLogger('quickadd');

export interface ParsedExpense {
  isExpense: boolean;
  label: string;
  amount: number;
  method: 'card' | 'ewallet' | 'cash' | 'bank';
  category: ExpenseCategory;
}

export async function parseExpense(text: string): Promise<ParsedExpense> {
  log.info('parseExpense', text.slice(0, 60));

  const prompt = `You extract ONE expense from the user's text for a Malaysian finance app (RM). Return ONLY valid JSON:
{"isExpense":true,"label":"<short name>","amount":<number>,"method":"card|ewallet|cash|bank","category":"food|transport|shopping|bills|entertainment|health|education|other"}
Pick the best-matching category. If it's an OTP, promo, verification code, or not a real expense, set isExpense false (keep other fields as empty string/0/"other").

User text: ${text}`;

  const responseText = await callGemini({ contents: [{ parts: [{ text: prompt }] }] });
  try {
    const parsed = JSON.parse(extractJSON(responseText)) as ParsedExpense;
    log.info('parseExpense success', `isExpense=${parsed.isExpense} label=${parsed.label} amount=${parsed.amount}`);
    return parsed;
  } catch {
    log.error('parseExpense: no JSON in response', responseText.slice(0, 100));
    throw new Error('No JSON found in response');
  }
}
