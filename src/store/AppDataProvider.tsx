import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { MOCK, type Expense, type ExpenseCategory, type Goal, type Holding, type Income, type HistoryEntry, type Note, type HoldingCurrency, type FxRates } from '@/constants/mock-data';
import { loadData, saveData } from '@/lib/storage';
import { FX_DEFAULTS, toRM, convertCcy } from '@/lib/fx';
import type { CoachProfile, CoachPlan } from '@/lib/coach';
import type { Language } from '@/i18n';
import { getLogger } from '@/lib/logger';
import type { AvatarConfig } from '@/constants/avatar';
import { type ThemeMode } from '@/constants/theme';

const log = getLogger('AppDataProvider');

// Moved outside component — pure function, no closure over state needed
const nextId = (prefix: string) => `${prefix}${Date.now()}`;

// Always derived from the real clock — never persisted/imported, so a stale
// stored or backed-up value can't leave the app stuck on an old month.
const monthLabel = (date: Date) => date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
const monthKeyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthLabelForKey = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return monthLabel(new Date(y, m - 1, 1));
};

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  type: 'bill' | 'payday';
  reminder?: 'none' | 'daily' | 'weekly';
  notes?: string;
  /** Full ISO date (YYYY-MM-DD) for a one-time reminder. When set, this bill fires once on
   *  that exact date instead of recurring monthly on `dueDay`. */
  date?: string;
}

export interface MonthlyRecord {
  monthKey: string; // 'YYYY-MM' for sorting/dedup
  month: string;    // display name e.g. 'January 2026'
  byCategory: Partial<Record<ExpenseCategory, number>>;
  income: number;
  expense: number;
  net: number;
}

export interface RawData {
  name: string;
  month: string;
  /** monthKey ('YYYY-MM') the live expenses/incomes were last known to belong to.
   *  Compared against the real clock on load to detect a month boundary and
   *  auto-archive the month that just ended. */
  lastActiveMonthKey: string;
  incomes: Income[];
  expenses: Expense[];
  goals: Goal[];
  holdings: Holding[];
  notes: Note[];
  bills: Bill[];
  history: HistoryEntry[];
  monthlyRecords: MonthlyRecord[];
  coachProfile: CoachProfile | null;
  coachPlan: CoachPlan | null;
  language: Language | null;
  avatar: AvatarConfig | null;
  displayCurrency: HoldingCurrency;
  fxRates: FxRates;
  pricesUpdatedAt: number | null;
  themeMode: ThemeMode;
}

export interface DerivedData extends RawData {
  income: number;
  salary: number;
  side: number;
  expense: number;
  net: number;
  savingsRate: number;
  sideShare: number;
  byMethod: { card: number; ewallet: number; cash: number; bank: number };
  byCategory: Record<ExpenseCategory, number>;
  byCategoryArray: Array<{ cat: ExpenseCategory; amt: number }>;
  portfolioValue: number;        // RM-equivalent total (for home screen / backward compat)
  portfolioValueDisplay: number; // total in the chosen display currency (for invest screen)
}

interface AppDataContextValue {
  data: DerivedData;
  loaded: boolean;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  updateIncome: (id: string, updates: Partial<Omit<Income, 'id'>>) => void;
  addIncome: (income: Omit<Income, 'id'>) => void;
  deleteIncome: (id: string) => void;
  updateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => void;
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  deleteGoal: (id: string) => void;
  updateHolding: (id: string, updates: Partial<Omit<Holding, 'id'>>) => void;
  addHolding: (holding: Omit<Holding, 'id'>) => void;
  deleteHolding: (id: string) => void;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id'>>) => void;
  addNote: (note: Omit<Note, 'id'>) => void;
  deleteNote: (id: string) => void;
  addBill: (bill: Omit<Bill, 'id'>) => void;
  updateBill: (id: string, updates: Partial<Omit<Bill, 'id'>>) => void;
  deleteBill: (id: string) => void;
  archiveCurrentMonth: () => void;
  importData: (incoming: Partial<RawData>) => void;
  setName: (name: string) => void;
  resetData: () => void;
  saveCoachResult: (profile: CoachProfile, plan: CoachPlan) => void;
  clearCoachResult: () => void;
  setLanguage: (lang: Language) => void;
  setAvatar: (config: AvatarConfig) => void;
  setDisplayCurrency: (ccy: HoldingCurrency) => void;
  setFxRates: (rates: FxRates) => void;
  setPricesUpdatedAt: (ts: number) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const defaultRaw: RawData = {
  name: MOCK.name,
  month: monthLabel(new Date()),
  lastActiveMonthKey: monthKeyOf(new Date()),
  incomes: MOCK.incomes,
  expenses: MOCK.expenses,
  goals: MOCK.goals,
  holdings: MOCK.holdings,
  notes: MOCK.notes,
  bills: [],
  history: MOCK.history,
  monthlyRecords: [
    { monthKey: '2026-05', month: 'May 2026',      byCategory: { food: 310, transport: 270, bills: 1450, shopping: 160, health: 600, other: 1000, entertainment: 90, education: 50 }, income: 6300, expense: 3930, net: 2370 },
    { monthKey: '2026-04', month: 'April 2026',    byCategory: { food: 400, transport: 290, bills: 1450, shopping: 280, health: 600, other: 1000, entertainment: 150, education: 0  }, income: 6100, expense: 4170, net: 1930 },
    { monthKey: '2026-03', month: 'March 2026',    byCategory: { food: 280, transport: 310, bills: 1450, shopping: 210, health: 600, other: 1000, entertainment: 80,  education: 100 }, income: 6200, expense: 4030, net: 2170 },
    { monthKey: '2026-02', month: 'February 2026', byCategory: { food: 350, transport: 260, bills: 1450, shopping: 340, health: 600, other: 1000, entertainment: 120, education: 0  }, income: 6100, expense: 4120, net: 1980 },
    { monthKey: '2026-01', month: 'January 2026',  byCategory: { food: 320, transport: 280, bills: 1450, shopping: 190, health: 600, other: 1000, entertainment: 60,  education: 0  }, income: 6100, expense: 3900, net: 2200 },
  ],
  coachProfile: null,
  coachPlan: null,
  language: null,
  avatar: null,
  displayCurrency: 'RM',
  fxRates: FX_DEFAULTS,
  pricesUpdatedAt: null,
  themeMode: 'system',
};

function derive(raw: RawData): DerivedData {
  // Single pass through incomes
  let salary = 0, side = 0;
  for (const i of raw.incomes) {
    if (i.type === 'salary') salary += i.amount;
    else side += i.amount;
  }
  const income = salary + side;

  // Single pass through expenses — collect byMethod and byCategory simultaneously
  const byMethod = { card: 0, ewallet: 0, cash: 0, bank: 0 };
  const byCategory: Record<ExpenseCategory, number> = { food: 0, transport: 0, shopping: 0, bills: 0, entertainment: 0, health: 0, education: 0, other: 0 };
  for (const e of raw.expenses) {
    byMethod[e.method] = (byMethod[e.method] ?? 0) + e.amount;
    const cat = (e.category ?? 'other') as ExpenseCategory;
    byCategory[cat] = (byCategory[cat] ?? 0) + e.amount;
  }
  const expense = byMethod.card + byMethod.ewallet + byMethod.cash + byMethod.bank;
  const byCategoryArray = (Object.entries(byCategory) as [ExpenseCategory, number][])
    .filter(([, amt]) => amt > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => ({ cat, amt }));
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
  const sideShare = income > 0 ? Math.round((side / income) * 100) : 0;

  const rates = raw.fxRates ?? FX_DEFAULTS;
  const displayCcy = raw.displayCurrency ?? 'RM';
  let portfolioValue = 0, portfolioValueDisplay = 0;
  for (const h of raw.holdings ?? []) {
    const ccy = h.currency ?? 'RM';
    portfolioValue += toRM(h.currentValue, ccy, rates);
    portfolioValueDisplay += convertCcy(h.currentValue, ccy, displayCcy, rates);
  }

  return { ...raw, month: monthLabel(new Date()), income, salary, side, expense, net, savingsRate, sideShare, byMethod, byCategory, byCategoryArray, portfolioValue, portfolioValueDisplay };
}

// Snapshot of aggregate totals only — expenses/incomes have no per-transaction
// date, so this is the best available approximation of "this month's" numbers.
function buildMonthlyRecord(raw: RawData, monthKey: string, month: string): MonthlyRecord {
  const d = derive(raw);
  return { monthKey, month, byCategory: d.byCategory, income: d.income, expense: d.expense, net: d.net };
}

function upsertMonthlyRecord(records: MonthlyRecord[] | undefined, record: MonthlyRecord): MonthlyRecord[] {
  const existing = (records ?? []).findIndex((m) => m.monthKey === record.monthKey);
  const next = existing >= 0
    ? (records ?? []).map((m, i) => (i === existing ? record : m))
    : [...(records ?? []), record];
  return next.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<RawData>(defaultRaw);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData().then((stored) => {
      if (stored) {
        try {
          const merged: RawData = { ...defaultRaw, ...stored };
          const realKey = monthKeyOf(new Date());

          if (merged.lastActiveMonthKey && merged.lastActiveMonthKey !== realKey) {
            // Real time crossed a month boundary since this data was last active.
            // Aggregate-only rollover: archive whatever totals are live right now
            // under the month that just ended, then adopt the new month. Expenses/
            // incomes are NOT cleared — there's no per-transaction date to tell
            // which entries were "last month's", so they carry forward as-is.
            const endedKey = merged.lastActiveMonthKey;
            const alreadyArchived = (merged.monthlyRecords ?? []).some((m) => m.monthKey === endedKey);
            if (!alreadyArchived) {
              // Don't clobber a deliberate manual "Save Current Month" from
              // earlier in that month with today's now-stale cumulative totals.
              const record = buildMonthlyRecord(merged, endedKey, monthLabelForKey(endedKey));
              merged.monthlyRecords = upsertMonthlyRecord(merged.monthlyRecords, record);
              log.info('month rollover: archived', endedKey, '→ now on', realKey);
            }
          }
          merged.lastActiveMonthKey = realKey;

          setRaw(merged);
          log.info('data loaded from storage');
        } catch (e) {
          log.error('failed to parse stored data', e);
        }
      } else {
        log.info('no stored data found, using defaults');
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveData(raw);
    log.debug('data persisted to storage');
  }, [raw, loaded]);

  // Stable mutation object — setRaw from useState is always the same reference,
  // so these functions never need to be recreated across renders.
  const ops = useMemo(() => ({
    updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => {
      log.debug('updateExpense', id);
      setRaw((r) => ({ ...r, expenses: r.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)) }));
    },
    addExpense: (expense: Omit<Expense, 'id'>) => {
      log.debug('addExpense', expense.label);
      setRaw((r) => ({ ...r, expenses: [...r.expenses, { ...expense, id: nextId('e') }] }));
    },
    deleteExpense: (id: string) => {
      log.debug('deleteExpense', id);
      setRaw((r) => ({ ...r, expenses: r.expenses.filter((e) => e.id !== id) }));
    },

    updateIncome: (id: string, updates: Partial<Omit<Income, 'id'>>) => {
      log.debug('updateIncome', id);
      setRaw((r) => ({ ...r, incomes: r.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)) }));
    },
    addIncome: (income: Omit<Income, 'id'>) => {
      log.debug('addIncome', income.label);
      setRaw((r) => ({ ...r, incomes: [...r.incomes, { ...income, id: nextId('i') }] }));
    },
    deleteIncome: (id: string) => {
      log.debug('deleteIncome', id);
      setRaw((r) => ({ ...r, incomes: r.incomes.filter((i) => i.id !== id) }));
    },

    updateGoal: (id: string, updates: Partial<Omit<Goal, 'id'>>) => {
      log.debug('updateGoal', id);
      setRaw((r) => ({ ...r, goals: r.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) }));
    },
    addGoal: (goal: Omit<Goal, 'id'>) => {
      log.debug('addGoal', goal.label);
      setRaw((r) => ({ ...r, goals: [...r.goals, { ...goal, id: nextId('g') }] }));
    },
    deleteGoal: (id: string) => {
      log.debug('deleteGoal', id);
      setRaw((r) => ({ ...r, goals: r.goals.filter((g) => g.id !== id) }));
    },

    updateHolding: (id: string, updates: Partial<Omit<Holding, 'id'>>) => {
      log.debug('updateHolding', id);
      setRaw((r) => ({ ...r, holdings: (r.holdings ?? []).map((h) => (h.id === id ? { ...h, ...updates } : h)) }));
    },
    addHolding: (holding: Omit<Holding, 'id'>) => {
      log.debug('addHolding', holding.name);
      setRaw((r) => ({ ...r, holdings: [...(r.holdings ?? []), { ...holding, id: nextId('h') }] }));
    },
    deleteHolding: (id: string) => {
      log.debug('deleteHolding', id);
      setRaw((r) => ({ ...r, holdings: (r.holdings ?? []).filter((h) => h.id !== id) }));
    },

    updateNote: (id: string, updates: Partial<Omit<Note, 'id'>>) => {
      log.debug('updateNote', id);
      setRaw((r) => ({ ...r, notes: (r.notes ?? []).map((n) => (n.id === id ? { ...n, ...updates } : n)) }));
    },
    addNote: (note: Omit<Note, 'id'>) => {
      log.debug('addNote');
      setRaw((r) => ({ ...r, notes: [{ ...note, id: nextId('no') }, ...(r.notes ?? [])] }));
    },
    deleteNote: (id: string) => {
      log.debug('deleteNote', id);
      setRaw((r) => ({ ...r, notes: (r.notes ?? []).filter((n) => n.id !== id) }));
    },

    addBill: (bill: Omit<Bill, 'id'>) => {
      log.debug('addBill', bill.name);
      setRaw((r) => ({ ...r, bills: [...(r.bills ?? []), { ...bill, id: nextId('bl') }] }));
    },
    updateBill: (id: string, updates: Partial<Omit<Bill, 'id'>>) => {
      log.debug('updateBill', id);
      setRaw((r) => ({ ...r, bills: (r.bills ?? []).map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
    },
    deleteBill: (id: string) => {
      log.debug('deleteBill', id);
      setRaw((r) => ({ ...r, bills: (r.bills ?? []).filter((b) => b.id !== id) }));
    },

    archiveCurrentMonth: () => {
      log.info('archiveCurrentMonth');
      setRaw((r) => {
        const now = new Date();
        const monthKey = monthKeyOf(now);
        const record = buildMonthlyRecord(r, monthKey, monthLabel(now));
        return { ...r, monthlyRecords: upsertMonthlyRecord(r.monthlyRecords, record) };
      });
    },

    importData: (incoming: Partial<RawData>) => {
      log.info('data imported from backup');
      setRaw({ ...defaultRaw, ...incoming });
    },
    setName: (name: string) => {
      log.info('name updated', name);
      setRaw((r) => ({ ...r, name: name.trim() || r.name }));
    },
    resetData: () => {
      log.info('data reset to defaults');
      setRaw(defaultRaw);
    },

    saveCoachResult: (profile: CoachProfile, plan: CoachPlan) => {
      log.info('coach result saved', plan.model);
      setRaw((r) => ({ ...r, coachProfile: profile, coachPlan: plan }));
    },
    clearCoachResult: () => {
      log.info('coach result cleared');
      setRaw((r) => ({ ...r, coachProfile: null, coachPlan: null }));
    },
    setLanguage: (lang: Language) => {
      log.info('language set', lang);
      setRaw((r) => ({ ...r, language: lang }));
    },
    setAvatar: (config: AvatarConfig) => {
      log.info('avatar set', config.type, config.colour);
      setRaw((r) => ({ ...r, avatar: config }));
    },
    setDisplayCurrency: (ccy: HoldingCurrency) => {
      log.info('displayCurrency set', ccy);
      setRaw((r) => ({ ...r, displayCurrency: ccy }));
    },
    setFxRates: (rates: FxRates) => {
      log.info('fxRates updated', rates);
      setRaw((r) => ({ ...r, fxRates: rates }));
    },
    setPricesUpdatedAt: (ts: number) => {
      log.info('pricesUpdatedAt set', ts);
      setRaw((r) => ({ ...r, pricesUpdatedAt: ts }));
    },
    setThemeMode: (mode: ThemeMode) => {
      log.info('themeMode set', mode);
      setRaw((r) => ({ ...r, themeMode: mode }));
    },
  }), []);

  // Re-derive only when raw data or load state actually changes.
  // Prevents every context consumer from re-rendering on unrelated parent renders.
  const value = useMemo<AppDataContextValue>(
    () => ({ data: derive(raw), loaded, ...ops }),
    [raw, loaded, ops],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
