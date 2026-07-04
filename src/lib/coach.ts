import AsyncStorage from '@react-native-async-storage/async-storage';

import { COACH_SYSTEM_PROMPT } from '@/constants/coach-prompt';
import { GEMINI_MODEL } from '@/constants/config';
import { getLogger } from '@/lib/logger';
import { callGemini, callGeminiWithTools, extractJSON } from '@/lib/gemini';

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
  split?: Record<string, number>; // user-adjusted percentages, persisted after editing
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

const log = getLogger('coach');

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ms: 'Malay (Bahasa Malaysia)',
  zh: 'Simplified Chinese (中文)',
};

// ── Live expense sync ─────────────────────────────────────────────────────────

const BUCKET_ACTUAL_TYPE: Record<string, 'needs' | 'wants' | 'savings' | 'education' | 'zero'> = {
  Needs: 'needs', Necessities: 'needs', Living: 'needs', 'Fixed Commitments': 'needs', Housing: 'needs',
  Wants: 'wants', Play: 'wants', Discretionary: 'wants', Lifestyle: 'wants',
  Savings: 'savings', 'Save First': 'savings', 'Emergency Buffer': 'savings',
  'Financial Freedom': 'savings', 'Long-term Savings': 'savings', 'Savings & Investments': 'savings',
  Education: 'education',
  Giving: 'zero', Give: 'zero', 'Debt & Giving': 'zero', 'Debt Repayment': 'zero',
};

export function computeActualRM(
  buckets: BudgetBucket[],
  byCategory: Record<string, number>,
  net: number,
): BudgetBucket[] {
  const needsAmt = ['food', 'transport', 'bills', 'health', 'other']
    .reduce((s, c) => s + (byCategory[c] ?? 0), 0);
  const wantsAmt = ['shopping', 'entertainment']
    .reduce((s, c) => s + (byCategory[c] ?? 0), 0);
  const eduAmt = byCategory.education ?? 0;
  const savingsAmt = Math.max(0, net);
  // Only map a single savings bucket to avoid double-counting (e.g. JARS has multiple)
  const singleSavings = buckets.filter((b) => BUCKET_ACTUAL_TYPE[b.label] === 'savings').length === 1;

  return buckets.map((b) => {
    const type = BUCKET_ACTUAL_TYPE[b.label];
    if (type === 'needs') return { ...b, actualRM: needsAmt };
    if (type === 'wants') return { ...b, actualRM: wantsAmt };
    if (type === 'savings') return { ...b, actualRM: singleSavings ? savingsAmt : b.actualRM };
    if (type === 'education') return { ...b, actualRM: eduAmt };
    if (type === 'zero') return { ...b, actualRM: 0 };
    return b;
  });
}

// ── Active Money Wisdom habits (context for prompts) ───────────────────────────

const ACTIVE_HABITS_STORAGE_KEY = 'money-wisdom-active-habits';

interface ActiveHabitContext {
  title: string;
  steps: string[];
}

async function loadActiveHabitsPromptContext(): Promise<string> {
  try {
    const json = await AsyncStorage.getItem(ACTIVE_HABITS_STORAGE_KEY);
    if (!json) return '';
    const habits = JSON.parse(json) as ActiveHabitContext[];
    if (!Array.isArray(habits) || habits.length === 0) return '';
    const habitsList = habits
      .map((h) => `${h.title} (${h.steps.join('; ')})`)
      .join(' | ');
    return `\n\nThe user is following these money habits: ${habitsList}. Reference them naturally in your advice when relevant.`;
  } catch {
    return '';
  }
}

// ── Agentic coach ─────────────────────────────────────────────────────────────

export interface AgenticFinancials extends CoachFinancials {
  goals: Array<{ label: string; target: number; saved: number }>;
  bills: Array<{ name: string; amount: number; dueDay: number }>;
  monthlyHistory: Array<{ month: string; income: number; expense: number; net: number }>;
}

const AGENTIC_TOOLS = [
  {
    name: 'get_expense_breakdown',
    description: 'Returns the current month\'s expenses broken down by category (food, transport, shopping, bills, entertainment, health, education, other) in RM.',
    parameters: { type: 'OBJECT', properties: {}, required: [] as string[] },
  },
  {
    name: 'get_monthly_history',
    description: 'Returns the last 5 months of income, total expenses, and net savings to identify spending trends.',
    parameters: { type: 'OBJECT', properties: {}, required: [] as string[] },
  },
  {
    name: 'get_goals_progress',
    description: 'Returns the user\'s savings goals with their current saved amount, target, and progress percentage.',
    parameters: { type: 'OBJECT', properties: {}, required: [] as string[] },
  },
  {
    name: 'get_upcoming_bills',
    description: 'Returns recurring bills and their due days so the budget plan can account for fixed commitments.',
    parameters: { type: 'OBJECT', properties: {}, required: [] as string[] },
  },
];

export async function getAgenticCoachPlan(
  profile: CoachProfile,
  fin: AgenticFinancials,
  language = 'en',
): Promise<CoachPlan> {
  log.info('getAgenticCoachPlan start', `lang=${language}`);
  const langName = LANG_NAMES[language] ?? 'English';
  const habitsContext = await loadActiveHabitsPromptContext();

  const systemText = `${COACH_SYSTEM_PROMPT}

IMPORTANT — You have tools to examine this user's actual financial data before deciding on a model. You MUST call get_expense_breakdown and get_monthly_history before returning the plan. Optionally call get_goals_progress and get_upcoming_bills for extra context. This ensures the plan is grounded in real spending patterns, not just self-reported estimates.

Write the "why", "nextAction", and "encouragement" fields in: ${langName}${habitsContext}`;

  const userMessage = `My profile:
- Age range: ${profile.age}
- Monthly income bracket: ${profile.incomeBracket}
- Main financial goal: ${profile.goal}
- Monthly income: RM ${fin.income.toLocaleString('en-MY')}
- Total expenses: RM ${fin.expense.toLocaleString('en-MY')}
- Savings rate: ${fin.savingsRate}%
- Spending by method: Card RM ${fin.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${fin.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${fin.byMethod.cash.toLocaleString('en-MY')}, Bank RM ${fin.byMethod.bank.toLocaleString('en-MY')}

Please use the available tools to examine my spending data, then produce my personalised budget plan.`;

  const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
    get_expense_breakdown: () => fin.byCategory ?? {},
    get_monthly_history: () => fin.monthlyHistory,
    get_goals_progress: () =>
      fin.goals.map((g) => ({
        label: g.label,
        target: g.target,
        saved: g.saved,
        progressPct: g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0,
      })),
    get_upcoming_bills: () =>
      [...fin.bills].sort((a, b) => a.dueDay - b.dueDay).map((b) => ({
        name: b.name,
        amountRM: b.amount,
        dueDay: b.dueDay,
      })),
  };

  const text = await callGeminiWithTools(systemText, userMessage, AGENTIC_TOOLS, handlers);
  try {
    const plan = JSON.parse(extractJSON(text)) as CoachPlan;
    log.info('getAgenticCoachPlan success', plan.model);
    return plan;
  } catch {
    log.error('getAgenticCoachPlan: no JSON in response', text.slice(0, 100));
    throw new Error('No JSON found in agentic coach response');
  }
}


function formatCategory(byCategory: Record<string, number>): string {
  const cats = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
  return cats
    .map((c) => `${c.charAt(0).toUpperCase() + c.slice(1)} RM ${(byCategory[c] ?? 0).toLocaleString('en-MY')}`)
    .join(', ');
}

export async function getCoachPlan(
  profile: CoachProfile,
  financials: CoachFinancials,
  chosenModel?: string,
): Promise<CoachPlan> {
  log.info('getCoachPlan start', chosenModel ?? 'auto-select');

  const categoryLine = financials.byCategory
    ? `\n- Spending by category: ${formatCategory(financials.byCategory)}`
    : '';

  const instruction = chosenModel
    ? `IMPORTANT: The user has already chosen the "${chosenModel}" model. You MUST use exactly "${chosenModel}" as the model value in your JSON — do not choose a different one. Generate the full bucket breakdown, nextAction, and encouragement for "${chosenModel}".`
    : 'Give me a personalised budgeting plan.';

  const habitsContext = await loadActiveHabitsPromptContext();

  const fullPrompt = `${COACH_SYSTEM_PROMPT}

My financial profile:
Age range: ${profile.age}
Income bracket (self-reported): ${profile.incomeBracket}
Main goal: ${profile.goal}

This month's numbers:
- Monthly income: RM ${financials.income.toLocaleString('en-MY')}
- Total expenses: RM ${financials.expense.toLocaleString('en-MY')}
- Net savings: RM ${financials.net.toLocaleString('en-MY')}
- Savings rate: ${financials.savingsRate}%
- Spending by method: Card RM ${financials.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${financials.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${financials.byMethod.cash.toLocaleString('en-MY')}, Bank transfer RM ${financials.byMethod.bank.toLocaleString('en-MY')}${categoryLine}${habitsContext}

${instruction}`;

  const text = await callGemini({ contents: [{ parts: [{ text: fullPrompt }] }] });
  try {
    const plan = JSON.parse(extractJSON(text)) as CoachPlan;
    log.info('getCoachPlan success', plan.model);
    return plan;
  } catch {
    log.error('getCoachPlan: no JSON in response', text.slice(0, 100));
    throw new Error('No JSON found in Gemini response');
  }
}

// ── Money AI chat ─────────────────────────────────────────────────────────────

export interface AIReply {
  text: string;
  action?: { label: string; description: string } | null;
}

// Local shapes — deliberately NOT imported from @/store, so coach.ts never takes on its
// first store→lib type dependency just for these tool handlers.
interface MoneyAgentToolDecl {
  name: string;
  description: string;
  parameters: { type: string; properties: Record<string, unknown>; required: string[] };
}

interface MonthSpendingRecord {
  month: string;
  monthKey?: string;
  byCategory: Partial<Record<string, number>>;
  expense: number;
}

export interface MoneyAgentContext {
  month: string;
  monthlyRecords: MonthSpendingRecord[];
  addBill?: (bill: {
    name: string;
    amount: number;
    dueDay: number;
    category: string;
    type: 'bill' | 'payday';
    notes?: string;
  }) => void;
  onStatus?: (toolName: string) => void;
  confirmAction?: (label: string, description: string) => Promise<boolean>;
}

interface MoneyAgentToolMeta {
  mutating: boolean;
  describeAction?: (args: Record<string, unknown>) => { label: string; description: string };
}

const MONEY_AGENT_TOOLS: MoneyAgentToolDecl[] = [
  {
    name: 'getSpendingByCategory',
    description:
      'Returns the user\'s total spending broken down by category (food, transport, shopping, bills, entertainment, health, education, other), in Malaysian Ringgit (RM), for one month. Pass "current" or omit the argument for the current month. For a past month, pass its display name exactly as shown, e.g. "May 2026".',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: {
          type: 'STRING',
          description: 'e.g. "current" or "May 2026". Defaults to the current month if omitted.',
        },
      },
      required: [],
    },
  },
  {
    name: 'createReminder',
    description:
      'Creates a reminder that will appear in the app\'s Bills & Reminders tab. Resolve any relative date phrase (e.g. "Sunday", "next Friday", "in 3 days") into an absolute date using today\'s date given in your instructions, and pass it as "date" in ISO format YYYY-MM-DD. Reminders repeat monthly on that date\'s day-of-month (there is no one-off reminder type) — mention that to the user if relevant.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Short title, e.g. "Review my budget".' },
        date: { type: 'STRING', description: 'Absolute date in YYYY-MM-DD format.' },
      },
      required: ['title', 'date'],
    },
  },
];

const MONEY_AGENT_TOOL_META: Record<string, MoneyAgentToolMeta> = {
  getSpendingByCategory: { mutating: false },
  createReminder: {
    mutating: true,
    describeAction: (args) => ({
      label: `Create reminder: "${String(args.title ?? '')}"`,
      description: `Will be added to Bills & Reminders, repeating monthly on day ${String(args.date ?? '').split('-')[2] ?? '?'} of the month.`,
    }),
  },
};

function handleGetSpendingByCategory(
  args: Record<string, unknown>,
  financials: CoachFinancials,
  ctx: MoneyAgentContext,
): unknown {
  const requested = typeof args.month === 'string' ? args.month.trim() : '';
  const isCurrent =
    !requested ||
    /^current$|^this month$/i.test(requested) ||
    requested.toLowerCase() === ctx.month.toLowerCase();

  if (isCurrent) {
    const byCategory = financials.byCategory ?? {};
    const total = Object.values(byCategory).reduce((s, v) => s + (v ?? 0), 0);
    return { month: ctx.month, byCategory, total };
  }

  const rec = ctx.monthlyRecords.find(
    (m) => m.month.toLowerCase() === requested.toLowerCase() || m.monthKey === requested,
  );
  if (!rec) {
    return {
      error: `No spending data found for "${requested}".`,
      availableMonths: [ctx.month, ...ctx.monthlyRecords.map((m) => m.month)],
    };
  }
  return { month: rec.month, byCategory: rec.byCategory, total: rec.expense };
}

function handleCreateReminder(args: Record<string, unknown>, ctx: MoneyAgentContext): unknown {
  if (!ctx.addBill) return { error: 'Reminder creation is not available right now.' };
  const title = typeof args.title === 'string' ? args.title.trim() : '';
  const dateStr = typeof args.date === 'string' ? args.date.trim() : '';
  if (!title) return { error: 'Missing or empty title.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { error: 'Invalid date; expected YYYY-MM-DD.' };
  const day = parseInt(dateStr.split('-')[2], 10); // parsed from the string directly, no TZ conversion
  if (!Number.isInteger(day) || day < 1 || day > 31) return { error: 'Day of month must be between 1 and 31.' };
  ctx.addBill({ name: title, amount: 0, dueDay: day, category: 'Reminder', type: 'bill', notes: 'Added by Money AI' });
  return { success: true, title, dueDay: day, recurring: true };
}

function buildMoneyAgentHandlers(
  financials: CoachFinancials,
  ctx: MoneyAgentContext,
): Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>> {
  return {
    getSpendingByCategory: (args) => handleGetSpendingByCategory(args, financials, ctx),
    createReminder: (args) => handleCreateReminder(args, ctx),
  };
}

// Purpose-built agentic loop for the Money Agent only. Not a refactor of callGeminiWithTools —
// it needs hooks that helper doesn't have (per-tool onStatus, an awaitable confirmAction gate
// before mutating tools run) and must carry multi-turn chat history, which callGeminiWithTools
// doesn't support. Zero changes to gemini.ts, so Budget Coach (which uses that shared helper)
// is entirely unaffected.
async function callMoneyAgentLoop(
  systemText: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  userMessage: string,
  tools: MoneyAgentToolDecl[],
  handlers: Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>,
  toolMeta: Record<string, MoneyAgentToolMeta>,
  ctx: MoneyAgentContext,
  maxToolRounds = 3,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    log.error('EXPO_PUBLIC_GEMINI_API_KEY not set');
    throw new Error('NO_API_KEY');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const contents: unknown[] = [...history, { role: 'user', parts: [{ text: userMessage }] }];

  for (let round = 0; round <= maxToolRounds; round++) {
    const forcedFinal = round === maxToolRounds;
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
    };
    if (!forcedFinal) body.tools = [{ functionDeclarations: tools }];

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const msg = `Gemini error ${res.status}${errBody ? `: ${errBody.slice(0, 200)}` : ''}`;
      log.error('callMoneyAgentLoop failed', msg);
      throw new Error(msg);
    }

    const json = await res.json();
    const parts: { text?: string; thought?: boolean; functionCall?: { name: string; args: Record<string, unknown> } }[] =
      json.candidates?.[0]?.content?.parts ?? [];

    const textPart = parts.find((p) => !p.thought && p.text);
    if (textPart?.text) {
      log.info('callMoneyAgentLoop text response after', round + 1, 'round(s)');
      return textPart.text;
    }

    const fnCalls = parts.filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => !!p.functionCall);
    if (fnCalls.length === 0) throw new Error('No text or function call in Gemini response');
    if (forcedFinal) throw new Error('Agent could not produce a final answer');

    log.info('callMoneyAgentLoop tool calls', fnCalls.map((p) => p.functionCall.name).join(', '));

    contents.push({ role: 'model', parts });
    const responseParts: unknown[] = [];
    for (const { functionCall } of fnCalls) {
      const { name, args } = functionCall;
      ctx.onStatus?.(name);
      const meta = toolMeta[name];
      if (meta?.mutating && ctx.confirmAction) {
        const { label, description } = meta.describeAction?.(args) ?? { label: name, description: '' };
        const allowed = await ctx.confirmAction(label, description);
        if (!allowed) {
          responseParts.push({ functionResponse: { name, response: { result: { declined: true } } } });
          continue;
        }
      }
      try {
        const result = handlers[name] ? await handlers[name](args) : { error: `Unknown tool: ${name}` };
        responseParts.push({ functionResponse: { name, response: { result } } });
      } catch (e) {
        responseParts.push({
          functionResponse: { name, response: { result: { error: e instanceof Error ? e.message : String(e) } } },
        });
      }
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  throw new Error('Agentic loop exceeded max turns without a text response');
}

export async function getAIReply(
  message: string,
  name: string,
  financials: CoachFinancials,
  goalsText: string,
  history: { role: 'user' | 'ai'; text: string }[],
  ctx: MoneyAgentContext,
): Promise<AIReply> {
  log.info('getAIReply start', `history=${history.length} turns`);

  const categoryLine = financials.byCategory
    ? `\n- Categories: ${formatCategory(financials.byCategory)}`
    : '';

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

  const systemText = `You are a careful, helpful money assistant for ${name}, a user in Malaysia. All amounts are in Malaysian Ringgit (RM).

Today's date is ${todayISO} (${weekday}).

Rules:
- Give SHORT, helpful replies — 2–5 sentences or a few bullet points max
- You are NOT a licensed financial advisor; say so briefly if asked for investment advice
- You can use the available tools to look up real data and take real actions the user asks for
- Reply in plain text — no JSON, no markdown fences
- If a tool result contains "declined": true, the user chose not to allow that action — acknowledge this politely and don't repeat it unless asked again

Current finances this month:
- Income: RM ${financials.income.toLocaleString('en-MY')}
- Expenses: RM ${financials.expense.toLocaleString('en-MY')}
- Net savings: RM ${financials.net.toLocaleString('en-MY')} (${financials.savingsRate}% savings rate)
- Spending: Card RM ${financials.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${financials.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${financials.byMethod.cash.toLocaleString('en-MY')}, Bank RM ${financials.byMethod.bank.toLocaleString('en-MY')}${categoryLine}
- Goals: ${goalsText}`;

  const history_ = history.map((turn) => ({
    role: turn.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: turn.text }],
  }));

  const handlers = buildMoneyAgentHandlers(financials, ctx);

  try {
    const text = await callMoneyAgentLoop(
      systemText,
      history_,
      message,
      MONEY_AGENT_TOOLS,
      handlers,
      MONEY_AGENT_TOOL_META,
      ctx,
    );
    log.info('getAIReply success');
    return { text: text.trim() || 'Sorry, I had trouble with that. Please try again.', action: null };
  } catch (e) {
    log.error('getAIReply failed', e);
    throw e;
  }
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
  log.info('getModelOptions start', `lang=${language}`);

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

  const text = await callGemini({ contents: [{ parts: [{ text: prompt }] }] });
  try {
    const options = JSON.parse(extractJSON(text)) as ModelOptions;
    log.info('getModelOptions success', `recommended=${options.recommended}, count=${options.options.length}`);
    return options;
  } catch {
    log.error('getModelOptions: no JSON in response', text.slice(0, 100));
    throw new Error('No JSON found in Gemini response');
  }
}
