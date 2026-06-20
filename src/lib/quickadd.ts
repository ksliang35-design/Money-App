export interface ParsedExpense {
  isExpense: boolean;
  label: string;
  amount: number;
  method: 'card' | 'ewallet' | 'cash' | 'bank';
  category: string;
}

export async function parseExpense(text: string): Promise<ParsedExpense> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const prompt = `You extract ONE expense from the user's text for a Malaysian finance app (RM). Return ONLY valid JSON:
{"isExpense":true,"label":"<short name>","amount":<number>,"method":"card|ewallet|cash|bank","category":"<short>"}
If it's an OTP, promo, verification code, or not a real expense, set isExpense false (keep other fields as empty strings/0).

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
  const responseText: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const start = responseText.indexOf('{');
  const end = responseText.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON found in response');
  return JSON.parse(responseText.slice(start, end + 1)) as ParsedExpense;
}
