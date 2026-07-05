import type { AssetType, FxRates, Goal, Holding, HoldingCurrency } from '@/constants/mock-data';
import { convertCcy } from '@/lib/fx';
import type { AgentConfig, AgentToolDecl } from '@/lib/agents/types';

export interface InvestAgentData {
  holdings: Holding[];
  goals: Goal[];
  portfolioValueDisplay: number;
  displayCurrency: HoldingCurrency;
  fxRates: FxRates;
  pricesUpdatedAt: number | null;
}

// Read-only in v1 — no add/edit-holding tool yet, since mutating portfolio data has real
// financial-integrity implications (buy price, units, currency) beyond a single confirm-gate.
export type InvestAgentOps = Record<string, never>;

const TOOLS: AgentToolDecl[] = [
  {
    name: 'getPortfolioBreakdown',
    description: 'Returns the user\'s investment portfolio broken down by asset type (Stocks, ETF, Crypto, Gold, Cash, Other), converted into their chosen display currency, plus the grand total and when prices were last updated.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'getGoalsProgress',
    description: 'Returns the user\'s savings goals with their current saved amount, target, and progress percentage.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
];

export const investAgentConfig: AgentConfig<InvestAgentData, InvestAgentOps> = {
  id: 'invest',
  titleKey: 'ai.invest.title',
  glyph: '📈',
  subtitleKey: 'ai.invest.sub',
  greetingKey: 'ai.invest.greeting',
  placeholderKey: 'ai.invest.placeholder',
  quickActions: [
    { icon: '📊', labelKey: 'ai.invest.breakdown', q: 'Give me a breakdown of my portfolio by asset type.' },
    { icon: '🎯', labelKey: 'ai.invest.goalPlan', q: 'How can I reach my savings goals faster?' },
    { icon: '⚖️', labelKey: 'ai.invest.diversify', q: 'Is my portfolio well diversified?' },
    { icon: '💡', labelKey: 'ai.invest.tips', q: 'Any general tips for managing a portfolio like mine?' },
  ],
  statusLabelKeys: {
    getPortfolioBreakdown: 'ai.invest.statusPortfolio',
    getGoalsProgress: 'ai.invest.statusGoals',
  },
  tools: TOOLS,
  toolMeta: {
    getPortfolioBreakdown: { mutating: false },
    getGoalsProgress: { mutating: false },
  },
  buildSystemPrompt: (data, userName) => `You are a careful, helpful investment assistant for ${userName}, a user in Malaysia. Amounts are shown in ${data.displayCurrency}.

Rules:
- Give SHORT, helpful replies — 2–5 sentences or a few bullet points max
- You are NOT a licensed financial advisor; always say so briefly if asked for specific buy/sell advice
- You can use the available tools to look up the user's real portfolio and goals data
- You do NOT have visibility into income or day-to-day spending — if asked about those, suggest the user check the Home or Expenses tabs (or their AI assistants)
- Reply in plain text — no JSON, no markdown fences

Current portfolio: ${data.holdings.length} holding(s), total value ${data.displayCurrency} ${data.portfolioValueDisplay.toLocaleString('en-MY')}.`,
  buildHandlers: (data) => ({
    getPortfolioBreakdown: () => {
      const byType: Partial<Record<AssetType, number>> = {};
      for (const h of data.holdings) {
        const val = convertCcy(h.currentValue, h.currency ?? 'RM', data.displayCurrency, data.fxRates);
        byType[h.assetType] = (byType[h.assetType] ?? 0) + val;
      }
      return {
        displayCurrency: data.displayCurrency,
        byType,
        total: data.portfolioValueDisplay,
        pricesUpdatedAt: data.pricesUpdatedAt,
      };
    },
    getGoalsProgress: () =>
      data.goals.map((g) => ({
        label: g.label,
        target: g.target,
        saved: g.saved,
        progressPct: g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0,
      })),
  }),
};
