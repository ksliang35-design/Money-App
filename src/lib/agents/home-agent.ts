import type { Bill } from '@/store/AppDataProvider';
import type { AgentConfig, AgentToolDecl } from '@/lib/agents/types';

export interface HomeAgentData {
  salary: number;
  side: number;
  income: number;
  net: number;
  savingsRate: number;
  sideShare: number;
}

export interface HomeAgentOps {
  addBill: (bill: Omit<Bill, 'id'>) => void;
}

const INDEPENDENCE_THRESHOLD_PCT = 30;

const TOOLS: AgentToolDecl[] = [
  {
    name: 'getIncomeBreakdown',
    description: 'Returns the user\'s income broken down by salary vs side income, in Malaysian Ringgit (RM), for the current month.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'getIndependenceProgress',
    description: `Returns the user's progress toward "financial independence" — the share of income coming from side income vs a job, versus the ${INDEPENDENCE_THRESHOLD_PCT}% target shown on their Profile screen.`,
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'createReminder',
    description:
      'Creates a reminder that will appear in the app\'s Bills & Reminders tab. Resolve any relative date phrase (e.g. "Sunday", "next Friday", "in 3 days") into an absolute date using today\'s date given in your instructions, and pass it as "date" in ISO format YYYY-MM-DD — e.g. if the user just says "Sunday", use the date of the NEXT upcoming Sunday. By default the reminder is ONE-TIME, firing only on that date. Only set "recurring" to true if the user explicitly asks for something ongoing, e.g. "every week", "every month", "monthly", "recurring" — in that case the reminder repeats monthly on that date\'s day-of-month, and you should mention that to the user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Short title, e.g. "Review my budget".' },
        date: { type: 'STRING', description: 'Absolute date in YYYY-MM-DD format.' },
        recurring: {
          type: 'BOOLEAN',
          description: 'true only if the user explicitly asked for a recurring/weekly/monthly reminder. Defaults to false (one-time).',
        },
      },
      required: ['title', 'date'],
    },
  },
];

export const homeAgentConfig: AgentConfig<HomeAgentData, HomeAgentOps> = {
  id: 'home',
  titleKey: 'ai.home.title',
  glyph: '♞',
  subtitleKey: 'ai.home.sub',
  greetingKey: 'ai.home.greeting',
  placeholderKey: 'ai.home.placeholder',
  quickActions: [
    { icon: '🔍', labelKey: 'ai.home.weeklyCheck', q: 'Give me a quick weekly financial check.' },
    { icon: '❤️', labelKey: 'ai.home.healthCheck', q: 'Am I financially healthy right now?' },
    { icon: '💰', labelKey: 'ai.home.incomeCheck', q: 'How is my income split between salary and side income?' },
    { icon: '🎯', labelKey: 'ai.home.independenceCheck', q: 'How close am I to financial independence?' },
  ],
  statusLabelKeys: {
    getIncomeBreakdown: 'ai.home.statusIncome',
    getIndependenceProgress: 'ai.home.statusIndependence',
    createReminder: 'ai.home.statusReminder',
  },
  tools: TOOLS,
  toolMeta: {
    getIncomeBreakdown: { mutating: false },
    getIndependenceProgress: { mutating: false },
    createReminder: {
      mutating: true,
      describeAction: (args) => ({
        label: `Create reminder: "${String(args.title ?? '')}"`,
        description: args.recurring
          ? `Will be added to Bills & Reminders, repeating monthly on day ${String(args.date ?? '').split('-')[2] ?? '?'} of the month.`
          : `Will be added to Bills & Reminders as a one-time reminder on ${String(args.date ?? '')}.`,
      }),
    },
  },
  buildSystemPrompt: (data, userName) => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

    return `You are a careful, helpful money assistant for ${userName}, a user in Malaysia, focused on their overall income, savings, and financial independence progress. All amounts are in Malaysian Ringgit (RM).

Today is ${weekday}, ${todayISO}.

Rules:
- Give SHORT, helpful replies — 2–5 sentences or a few bullet points max
- You are NOT a licensed financial advisor; say so briefly if asked for investment advice
- You can use the available tools to look up real data and take real actions the user asks for
- You do NOT have visibility into spending-by-category or investment holdings — if asked about those, suggest the user check the Expenses or Investment tabs (or their AI assistants)
- Reply in plain text — no JSON, no markdown fences
- If a tool result contains "declined": true, the user chose not to allow that action — acknowledge this politely and don't repeat it unless asked again

Current finances this month:
- Income: RM ${data.income.toLocaleString('en-MY')}
- Net savings: RM ${data.net.toLocaleString('en-MY')} (${data.savingsRate}% savings rate)
- Side income share: ${data.sideShare}%`;
  },
  buildHandlers: (data, ops) => ({
    getIncomeBreakdown: () => ({
      salaryRM: data.salary,
      sideRM: data.side,
      totalRM: data.income,
      sideSharePct: data.sideShare,
    }),
    getIndependenceProgress: () => ({
      sideSharePct: data.sideShare,
      thresholdPct: INDEPENDENCE_THRESHOLD_PCT,
      gapPct: Math.max(0, INDEPENDENCE_THRESHOLD_PCT - data.sideShare),
    }),
    createReminder: (args) => {
      const title = typeof args.title === 'string' ? args.title.trim() : '';
      const dateStr = typeof args.date === 'string' ? args.date.trim() : '';
      const recurring = args.recurring === true;
      if (!title) return { error: 'Missing or empty title.' };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { error: 'Invalid date; expected YYYY-MM-DD.' };
      const day = parseInt(dateStr.split('-')[2], 10);
      if (!Number.isInteger(day) || day < 1 || day > 31) return { error: 'Day of month must be between 1 and 31.' };
      ops.addBill({
        name: title,
        amount: 0,
        dueDay: day,
        category: 'Reminder',
        type: 'bill',
        notes: 'Added by Money AI',
        ...(recurring ? {} : { date: dateStr }),
      });
      return { success: true, title, date: dateStr, recurring };
    },
  }),
};
