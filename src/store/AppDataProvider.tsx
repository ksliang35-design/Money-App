import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { MOCK, type Expense, type ExpenseCategory, type Goal, type Holding, type Income, type HistoryEntry, type Note } from '@/constants/mock-data';
import type { CoachProfile, CoachPlan } from '@/lib/coach';
import type { Language } from '@/i18n';
import { getLogger } from '@/lib/logger';
import type { AvatarConfig } from '@/constants/avatar';

const log = getLogger('AppDataProvider');

const STORAGE_KEY = 'money-hub-data';

// Moved outside component — pure function, no closure over state needed
const nextId = (prefix: string) => `${prefix}${Date.now()}`;

export interface RawData {
  name: string;
  month: string;
  incomes: Income[];
  expenses: Expense[];
  goals: Goal[];
  holdings: Holding[];
  notes: Note[];
  history: HistoryEntry[];
  coachProfile: CoachProfile | null;
  coachPlan: CoachPlan | null;
  language: Language | null;
  avatar: AvatarConfig | null;
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
  portfolioValue: number;
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
  importData: (incoming: Partial<RawData>) => void;
  resetData: () => void;
  saveCoachResult: (profile: CoachProfile, plan: CoachPlan) => void;
  clearCoachResult: () => void;
  setLanguage: (lang: Language) => void;
  setAvatar: (config: AvatarConfig) => void;
}

const defaultRaw: RawData = {
  name: MOCK.name,
  month: MOCK.month,
  incomes: MOCK.incomes,
  expenses: MOCK.expenses,
  goals: MOCK.goals,
  holdings: MOCK.holdings,
  notes: MOCK.notes,
  history: MOCK.history,
  coachProfile: null,
  coachPlan: null,
  language: null,
  avatar: null,
};

function derive(raw: RawData): DerivedData {
  const salary = raw.incomes
    .filter((i) => i.type === 'salary')
    .reduce((s, i) => s + i.amount, 0);
  const side = raw.incomes
    .filter((i) => i.type === 'side')
    .reduce((s, i) => s + i.amount, 0);
  const income = salary + side;
  const byMethod = {
    card:    raw.expenses.filter((e) => e.method === 'card').reduce((s, e) => s + e.amount, 0),
    ewallet: raw.expenses.filter((e) => e.method === 'ewallet').reduce((s, e) => s + e.amount, 0),
    cash:    raw.expenses.filter((e) => e.method === 'cash').reduce((s, e) => s + e.amount, 0),
    bank:    raw.expenses.filter((e) => e.method === 'bank').reduce((s, e) => s + e.amount, 0),
  };
  const expense = Object.values(byMethod).reduce((s, v) => s + v, 0);
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
  const sideShare = income > 0 ? Math.round((side / income) * 100) : 0;
  const ALL_CATS: ExpenseCategory[] = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
  const byCategory = Object.fromEntries(
    ALL_CATS.map((c) => [c, raw.expenses.filter((e) => (e.category ?? 'other') === c).reduce((s, e) => s + e.amount, 0)]),
  ) as Record<ExpenseCategory, number>;
  const portfolioValue = (raw.holdings ?? []).reduce((s, h) => s + h.currentValue, 0);
  return { ...raw, income, salary, side, expense, net, savingsRate, sideShare, byMethod, byCategory, portfolioValue };
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<RawData>(defaultRaw);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) {
        try {
          setRaw({ ...defaultRaw, ...JSON.parse(json) });
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
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

    importData: (incoming: Partial<RawData>) => {
      log.info('data imported from backup');
      setRaw({ ...defaultRaw, ...incoming });
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
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

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
