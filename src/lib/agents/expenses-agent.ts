import type { Expense, ExpenseCategory } from '@/constants/mock-data';
import type { MonthlyRecord } from '@/store/AppDataProvider';
import type { AgentConfig, AgentToolDecl } from '@/lib/agents/types';

export interface ExpensesAgentData {
  month: string;
  expenses: Expense[];
  byCategory: Record<ExpenseCategory, number>;
  byMethod: { card: number; ewallet: number; cash: number; bank: number };
  monthlyRecords: MonthlyRecord[];
}

export interface ExpensesAgentOps {
  addExpense: (expense: Omit<Expense, 'id'>) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other',
];
const EXPENSE_METHODS = ['card', 'ewallet', 'cash', 'bank'] as const;

const TOOLS: AgentToolDecl[] = [
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
    name: 'addExpense',
    description: 'Adds a new expense transaction for the current month.',
    parameters: {
      type: 'OBJECT',
      properties: {
        label: { type: 'STRING', description: 'Short description, e.g. "Groceries".' },
        amount: { type: 'NUMBER', description: 'Amount in RM.' },
        method: { type: 'STRING', description: 'One of: card, ewallet, cash, bank.' },
        category: { type: 'STRING', description: 'One of: food, transport, shopping, bills, entertainment, health, education, other.' },
      },
      required: ['label', 'amount', 'method', 'category'],
    },
  },
];

export const expensesAgentConfig: AgentConfig<ExpensesAgentData, ExpensesAgentOps> = {
  id: 'expenses',
  titleKey: 'ai.expenses.title',
  glyph: '💸',
  subtitleKey: 'ai.expenses.sub',
  greetingKey: 'ai.expenses.greeting',
  placeholderKey: 'ai.expenses.placeholder',
  quickActions: [
    { icon: '🔍', labelKey: 'ai.expenses.spendingCheck', q: 'What am I spending the most on this month?' },
    { icon: '📆', labelKey: 'ai.expenses.compareMonth', q: 'How does my spending this month compare to last month?' },
    { icon: '💡', labelKey: 'ai.expenses.saveMore', q: 'Suggest 3 ways I could cut spending this month.' },
    { icon: '➕', labelKey: 'ai.expenses.logExpense', q: 'I want to log an expense.' },
  ],
  statusLabelKeys: {
    getSpendingByCategory: 'ai.expenses.statusSpending',
    addExpense: 'ai.expenses.statusAdding',
  },
  tools: TOOLS,
  toolMeta: {
    getSpendingByCategory: { mutating: false },
    addExpense: {
      mutating: true,
      describeAction: (args) => ({
        label: `Add expense: "${String(args.label ?? '')}"`,
        description: `RM ${String(args.amount ?? '')} via ${String(args.method ?? '')}, category ${String(args.category ?? '')}.`,
      }),
    },
  },
  buildSystemPrompt: (data, userName) => {
    const catLine = EXPENSE_CATEGORIES
      .map((c) => `${c.charAt(0).toUpperCase() + c.slice(1)} RM ${(data.byCategory[c] ?? 0).toLocaleString('en-MY')}`)
      .join(', ');

    return `You are a careful, helpful expenses assistant for ${userName}, a user in Malaysia. All amounts are in Malaysian Ringgit (RM).

Rules:
- Give SHORT, helpful replies — 2–5 sentences or a few bullet points max
- You are NOT a licensed financial advisor
- You can use the available tools to look up real spending data and log new expenses the user asks for
- You do NOT have visibility into income, savings, or investments — if asked about those, suggest the user check the Home or Investment tabs (or their AI assistants)
- Reply in plain text — no JSON, no markdown fences
- If a tool result contains "declined": true, the user chose not to allow that action — acknowledge this politely and don't repeat it unless asked again

This month (${data.month}) spending:
- Total: RM ${(data.byMethod.card + data.byMethod.ewallet + data.byMethod.cash + data.byMethod.bank).toLocaleString('en-MY')}
- By method: Card RM ${data.byMethod.card.toLocaleString('en-MY')}, E-wallet RM ${data.byMethod.ewallet.toLocaleString('en-MY')}, Cash RM ${data.byMethod.cash.toLocaleString('en-MY')}, Bank RM ${data.byMethod.bank.toLocaleString('en-MY')}
- By category: ${catLine}`;
  },
  buildHandlers: (data, ops) => ({
    getSpendingByCategory: (args) => {
      const requested = typeof args.month === 'string' ? args.month.trim() : '';
      const isCurrent =
        !requested ||
        /^current$|^this month$/i.test(requested) ||
        requested.toLowerCase() === data.month.toLowerCase();

      if (isCurrent) {
        const total = Object.values(data.byCategory).reduce((s, v) => s + (v ?? 0), 0);
        return { month: data.month, byCategory: data.byCategory, total };
      }

      const rec = data.monthlyRecords.find(
        (m) => m.month.toLowerCase() === requested.toLowerCase() || m.monthKey === requested,
      );
      if (!rec) {
        return {
          error: `No spending data found for "${requested}".`,
          availableMonths: [data.month, ...data.monthlyRecords.map((m) => m.month)],
        };
      }
      return { month: rec.month, byCategory: rec.byCategory, total: rec.expense };
    },
    addExpense: (args) => {
      const label = typeof args.label === 'string' ? args.label.trim() : '';
      const amount = typeof args.amount === 'number' ? args.amount : parseFloat(String(args.amount));
      const method = typeof args.method === 'string' ? args.method.trim() : '';
      const category = typeof args.category === 'string' ? args.category.trim() : '';
      if (!label) return { error: 'Missing or empty label.' };
      if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be a positive number.' };
      if (!(EXPENSE_METHODS as readonly string[]).includes(method)) {
        return { error: `Invalid method; expected one of ${EXPENSE_METHODS.join(', ')}.` };
      }
      if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) {
        return { error: `Invalid category; expected one of ${EXPENSE_CATEGORIES.join(', ')}.` };
      }
      ops.addExpense({
        label,
        amount,
        method: method as 'card' | 'ewallet' | 'cash' | 'bank',
        category: category as ExpenseCategory,
      });
      return { success: true, label, amount, method, category };
    },
  }),
};
