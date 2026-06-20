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
  byCategory?: Record<string, number>; // food, transport, shopping, bills, entertainment, health, education, other
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

export interface ModelOption {
  model: string;
  split: Record<string, number>;
  bestFor: string;
  why: string;
}

export interface ModelOptions {
  recommended: string;
  options: ModelOption[];
}

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ms: 'Malay (Bahasa Malaysia)',
  zh: 'Simplified Chinese (中文)',
};

const SYSTEM_PROMPT = `You are a careful, friendly money coach for users in Malaysia. All amounts are in Malaysian Ringgit (RM). You give general guidance only — you are NOT a licensed financial advisor. Never recommend specific stocks, crypto, or investment products.

Choose the single best-fit budgeting model for this person from:
- "50/30/20": 50% Needs, 30% Wants, 20% Savings — best all-rounder for most people
- "80/20": 80% Living, 20% Savings — simple, suits lower-to-mid incomes or debt-clearing goals
- "70/20/10": 70% Living, 20% Savings, 10% Debt/Giving — good when debt repayment or giving is a priority
- "30/30/40": 30% Housing, 30% Lifestyle, 40% Savings+Investments — suits higher earners building wealth
- "60/20/20": 60% Needs, 20% Wants, 20% Savings — for high cost-of-living areas (KL/PJ) where rent alone exceeds 40% of income; more realistic than 50/30/20 for city renters
- "75/15/10": 75% Living, 15% Savings, 10% Giving — for those with charitable obligations: zakat, tithe, or regular family giving
- "Debt-Clearance": 50% Living, 30% Debt Repayment, 20% Emergency Buffer — best when actively clearing significant debt (PTPTN, car loan, credit card)
- "JARS": 55% Necessities, 10% Long-term Savings, 10% Education, 10% Play, 10% Financial Freedom, 5% Give — intentional 6-bucket system for holistic wealth-building; choose when user wants clear purpose for every ringgit
- "Reverse Budget": Pay yourself first — Save First (you set the %), Fixed Commitments, Discretionary; choose for disciplined savers who want one savings target enforced and don't want to micro-manage every category

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
- Bucket labels must exactly match the chosen model's categories:
    50/30/20 → Needs, Wants, Savings
    80/20 → Living, Savings
    70/20/10 → Living, Savings, Debt & Giving
    30/30/40 → Housing, Lifestyle, Savings & Investments
    60/20/20 → Needs, Wants, Savings
    75/15/10 → Living, Savings, Giving
    Debt-Clearance → Living, Debt Repayment, Emergency Buffer
    JARS → Necessities, Long-term Savings, Education, Play, Financial Freedom, Give
    Reverse Budget → Save First, Fixed Commitments, Discretionary
- targetRM values must sum exactly to the user's monthly income
- For Reverse Budget: set Save First target based on goal (Build savings → 20%, Start investing → 25–30%, Just get organized → match current savingsRate or suggest a round number); Fixed Commitments and Discretionary split the remainder
- For JARS: all 6 bucket targetRM values must sum to income (55+10+10+10+10+5 = 100%)
- For actualRM distribution:
    Savings / Save First / Emergency Buffer / Financial Freedom / Long-term Savings bucket → use net (income minus total expenses)
    If spending by category is provided, distribute expenses across non-savings buckets using category totals:
      Needs / Necessities / Living / Fixed Commitments ← bills + transport + health + food + other categories
      Wants / Play / Discretionary ← shopping + entertainment categories
      Education bucket ← education category
      Giving / Give bucket ← not directly tracked; set actualRM to 0 and mention in nextAction
      Debt Repayment ← not directly tracked; set actualRM to 0 and mention in nextAction
    If only payment method data is available, fall back to: bank transfers → Needs/Living; e-wallet/cash → Wants/Discretionary`;

function formatCategory(byCategory: Record<string, number>): string {
  const cats = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
  return cats
    .map((c) => `${c.charAt(0).toUpperCase() + c.slice(1)} RM ${(byCategory[c] ?? 0).toLocaleString('en-MY')}`)
    .join(', ');
}

export async function getCoachPlan(
  profile: CoachProfile,
  financials: CoachFinancials,
): Promise<CoachPlan> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const categoryLine = financials.byCategory
    ? `\n- Spending by category: ${formatCategory(financials.byCategory)}`
    : '';

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
- Spending by method: Card RM ${financials.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${financials.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${financials.byMethod.cash.toLocaleString('en-MY')}, Bank transfer RM ${financials.byMethod.bank.toLocaleString('en-MY')}${categoryLine}

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

  const categoryLine = financials.byCategory
    ? `\n- Categories: ${formatCategory(financials.byCategory)}`
    : '';

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
- Spending: Card RM ${financials.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${financials.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${financials.byMethod.cash.toLocaleString('en-MY')}, Bank RM ${financials.byMethod.bank.toLocaleString('en-MY')}${categoryLine}
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

// ── Model options picker ──────────────────────────────────────────────────────

const OPTIONS_PROMPT = (langName: string) =>
  `You are a careful, friendly money coach for users in Malaysia. All amounts are in Malaysian Ringgit (RM). You give general guidance only — NOT licensed financial advice.

Choose 2-3 budgeting models from this list that best suit this person:
- "50/30/20": 50% Needs, 30% Wants, 20% Savings — best all-rounder
- "80/20": 80% Living, 20% Savings — simple, suits lower-mid incomes
- "70/20/10": 70% Living, 20% Savings, 10% Debt & Giving
- "30/30/40": 30% Housing, 30% Lifestyle, 40% Savings & Investments — higher earners
- "60/20/20": 60% Needs, 20% Wants, 20% Savings — high cost-of-living (KL/PJ)
- "75/15/10": 75% Living, 15% Savings, 10% Giving — for regular givers (zakat/tithe)
- "Debt-Clearance": 50% Living, 30% Debt Repayment, 20% Emergency Buffer
- "JARS": 55% Necessities, 10% Long-term Savings, 10% Education, 10% Play, 10% Financial Freedom, 5% Give
- "Reverse Budget": flexible — Save First, Fixed Commitments, Discretionary

Write ALL "bestFor" and "why" values in: ${langName}

Return ONLY valid JSON — no markdown fences, no text outside the JSON:

{
  "recommended": "50/30/20",
  "options": [
    {
      "model": "50/30/20",
      "split": {"Needs": 50, "Wants": 30, "Savings": 20},
      "bestFor": "one concise phrase, max 10 words",
      "why": "1-2 sentences specific to this user's age, income, and goal."
    }
  ]
}

Rules:
- Return 2 or 3 options total; list the recommended one first
- The "recommended" key must exactly match the first option's "model" value
- Keep "model" values in English exactly as listed above
- "split" key names are English bucket labels; values are integers summing to 100
  JARS split: {"Necessities":55,"Long-term Savings":10,"Education":10,"Play":10,"Financial Freedom":10,"Give":5}
  Reverse Budget: adjust "Save First" % to match the user's goal; Fixed Commitments + Discretionary fill the rest
- "bestFor" and "why" must be written in ${langName}`;

export async function getModelOptions(
  profile: CoachProfile,
  financials: CoachFinancials,
  language = 'en',
): Promise<ModelOptions> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');

  const langName = LANG_NAMES[language] ?? 'English';
  const categoryLine = financials.byCategory
    ? `\n- Spending by category: ${formatCategory(financials.byCategory)}`
    : '';

  const prompt = `${OPTIONS_PROMPT(langName)}

User profile:
- Age range: ${profile.age}
- Monthly income bracket: ${profile.incomeBracket}
- Main financial goal: ${profile.goal}
- Monthly income: RM ${financials.income.toLocaleString('en-MY')}
- Total expenses: RM ${financials.expense.toLocaleString('en-MY')}
- Savings rate: ${financials.savingsRate}%
- Spending by method: Card RM ${financials.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${financials.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${financials.byMethod.cash.toLocaleString('en-MY')}, Bank RM ${financials.byMethod.bank.toLocaleString('en-MY')}${categoryLine}`;

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
    throw new Error(`Gemini error ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  }

  const json = await res.json();
  const parts: Array<{ text?: string; thought?: boolean }> = json.candidates?.[0]?.content?.parts ?? [];
  const text: string = (parts.find((p) => !p.thought) ?? parts[0])?.text ?? '';

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON found in Gemini response');

  return JSON.parse(text.slice(start, end + 1)) as ModelOptions;
}
