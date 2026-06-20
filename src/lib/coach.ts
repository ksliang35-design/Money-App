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
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const fullPrompt = `${SYSTEM_PROMPT}

My financial profile:
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }

  const json = await res.json();
  // Gemini 2.5 Flash returns thinking in parts[0] (thought:true) and content in parts[1]
  const parts: Array<{ text?: string; thought?: boolean }> = json.candidates?.[0]?.content?.parts ?? [];
  const text: string = (parts.find((p) => !p.thought) ?? parts[0])?.text ?? '';

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON found in Gemini response');

  return JSON.parse(text.slice(start, end + 1)) as CoachPlan;
}

// ── Money AI chat ─────────────────────────────────────────────────────────────

export interface AIReply {
  text: string;
  action?: { label: string; description: string } | null;
}

export async function getAIReply(
  message: string,
  name: string,
  financials: CoachFinancials,
  goalsText: string,
  history: Array<{ role: 'user' | 'ai'; text: string }>,
): Promise<AIReply> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const systemText = `You are a careful, helpful money assistant for ${name}, a user in Malaysia. All amounts are in Malaysian Ringgit (RM).

Rules:
- Give SHORT, helpful replies — 2–5 sentences or a few bullet points max
- You are NOT a licensed financial advisor; say so briefly if asked for investment advice
- You NEVER move money or make real changes — you can only SUGGEST actions for the user to confirm
- When suggesting a concrete action (e.g. set a spending cap, allocate to a goal), include it as an "action"
- Otherwise set "action" to null

Current finances this month:
- Income: RM ${financials.income.toLocaleString('en-MY')}
- Expenses: RM ${financials.expense.toLocaleString('en-MY')}
- Net savings: RM ${financials.net.toLocaleString('en-MY')} (${financials.savingsRate}% savings rate)
- Spending: Card RM ${financials.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${financials.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${financials.byMethod.cash.toLocaleString('en-MY')}, Bank RM ${financials.byMethod.bank.toLocaleString('en-MY')}
- Goals: ${goalsText}

Return ONLY valid JSON — no markdown fences, no extra text:
{"text": "your reply here", "action": {"label": "Short title", "description": "One-line description"} or null}`;

  // Build multi-turn contents; map 'ai' → 'model' for Gemini
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const turn of history) {
    contents.push({ role: turn.role === 'user' ? 'user' : 'model', parts: [{ text: turn.text }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini error ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
  }

  const json = await res.json();
  const replyParts: Array<{ text?: string; thought?: boolean }> = json.candidates?.[0]?.content?.parts ?? [];
  const text: string = (replyParts.find((p) => !p.thought) ?? replyParts[0])?.text ?? '';

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as AIReply;
    } catch {}
  }

  return { text: text.trim() || 'Sorry, I had trouble with that. Please try again.', action: null };
}
