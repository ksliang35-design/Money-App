import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Web: relative path served by the Expo dev/prod server.
// Native dev: dev server host picked up from Expo's manifest.
// Native prod: set EXPO_PUBLIC_API_BASE to your deployed server URL.
function getProxyUrl(): string {
  if (Platform.OS === 'web') return '/api/coach';
  if (__DEV__) {
    const host =
      Constants.expoConfig?.hostUri?.split(':')[0] ??
      Constants.manifest?.debuggerHost?.split(':')[0] ??
      'localhost';
    return `http://${host}:8081/api/coach`;
  }
  const base = process.env.EXPO_PUBLIC_API_BASE ?? '';
  return `${base}/api/coach`;
}

export interface CoachProfile {
  age: string;
  incomeBracket: string;
  goal: string;
}

export interface CoachFinancials {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  byMethod: { card: number; ewallet: number; cash: number; bank: number };
}

export interface BudgetBucket {
  label: string;
  targetRM: number;
  actualRM: number;
}

export interface CoachPlan {
  model: string;
  why: string;
  buckets: BudgetBucket[];
  nextAction: string;
  encouragement: string;
}

const SYSTEM_PROMPT = `You are a careful, friendly money coach for users in Malaysia. All amounts are in Malaysian Ringgit (RM). You give general guidance only — you are NOT a licensed financial advisor. Never recommend specific stocks, crypto, or investment products.

Choose the single best-fit budgeting model for this person from:
- "50/30/20": 50% Needs, 30% Wants, 20% Savings — best all-rounder for most people
- "80/20": 80% Living, 20% Savings — simple, suits lower-to-mid incomes or debt-clearing goals
- "70/20/10": 70% Living, 20% Savings, 10% Debt/Giving — good when debt repayment or giving is a priority
- "30/30/40": 30% Housing, 30% Lifestyle, 40% Savings+Investments — suits higher earners building wealth

Return ONLY valid JSON — no markdown fences, no text outside the JSON object:

{
  "model": "50/30/20",
  "why": "1–2 simple sentences explaining why this model fits this specific person's age, goal, and income level.",
  "buckets": [
    {"label": "Needs", "targetRM": 3050, "actualRM": 2800},
    {"label": "Wants", "targetRM": 1830, "actualRM": 1250},
    {"label": "Savings", "targetRM": 1220, "actualRM": 1050}
  ],
  "nextAction": "One clear, specific action they can take this week — concrete and immediately actionable.",
  "encouragement": "One warm, honest sentence that acknowledges where they are and motivates them."
}

Rules:
- Bucket labels must exactly match the chosen model's categories (e.g. 50/30/20 → Needs, Wants, Savings)
- targetRM values must sum to the user's monthly income
- For actualRM: savings bucket = net (income minus total expenses); distribute total expenses across the remaining buckets using the spending method breakdown as a guide — card/bank transfers tend to be Needs, e-wallet/cash can be Wants`;

export async function getCoachPlan(
  profile: CoachProfile,
  financials: CoachFinancials,
): Promise<CoachPlan> {
  const userMessage = `My financial profile:

Age range: ${profile.age}
Income bracket (self-reported): ${profile.incomeBracket}
Main goal: ${profile.goal}

This month's numbers:
- Monthly income: RM ${financials.income.toLocaleString('en-MY')}
- Total expenses: RM ${financials.expense.toLocaleString('en-MY')}
- Net savings: RM ${financials.net.toLocaleString('en-MY')}
- Savings rate: ${financials.savingsRate}%
- Spending by method: Card RM ${financials.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${financials.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${financials.byMethod.cash.toLocaleString('en-MY')}, Bank transfer RM ${financials.byMethod.bank.toLocaleString('en-MY')}

Give me a personalised budgeting plan.`;

  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  };

  // All platforms route through the Expo API route so the key never lives in
  // the client bundle. Web uses a relative path; native uses the dev-server
  // host in development, or EXPO_PUBLIC_API_BASE in production.
  const proxyUrl = getProxyUrl();
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
  }

  const json = await res.json();
  const text: string = json.content?.[0]?.text ?? '';

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON found in response');

  return JSON.parse(text.slice(start, end + 1)) as CoachPlan;
}
