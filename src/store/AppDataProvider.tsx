import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { MOCK, type Expense, type Goal, type Holding, type Income, type HistoryEntry, type Note } from '@/constants/mock-data';
import type { CoachProfile, CoachPlan } from '@/lib/coach';
import type { Language } from '@/i18n';

const STORAGE_KEY = 'money-hub-data';

interface RawData {
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
  resetData: () => void;
  saveCoachResult: (profile: CoachProfile, plan: CoachPlan) => void;
  clearCoachResult: () => void;
  setLanguage: (lang: Language) => void;
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
    card: raw.expenses.filter((e) => e.method === 'card').reduce((s, e) => s + e.amount, 0),
    ewallet: raw.expenses.filter((e) => e.method === 'ewallet').reduce((s, e) => s + e.amount, 0),
    cash: raw.expenses.filter((e) => e.method === 'cash').reduce((s, e) => s + e.amount, 0),
    bank: raw.expenses.filter((e) => e.method === 'bank').reduce((s, e) => s + e.amount, 0),
  };
  const expense = Object.values(byMethod).reduce((s, v) => s + v, 0);
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
  const sideShare = income > 0 ? Math.round((side / income) * 100) : 0;
  const portfolioValue = (raw.holdings ?? []).reduce((s, h) => s + h.currentValue, 0);
  return { ...raw, income, salary, side, expense, net, savingsRate, sideShare, byMethod, portfolioValue };
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
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
  }, [raw, loaded]);

  const nextId = (prefix: string) => `${prefix}${Date.now()}`;

  const value: AppDataContextValue = {
    data: derive(raw),
    loaded,

    updateExpense: (id, updates) =>
      setRaw((r) => ({
        ...r,
        expenses: r.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      })),
    addExpense: (expense) =>
      setRaw((r) => ({
        ...r,
        expenses: [...r.expenses, { ...expense, id: nextId('e') }],
      })),
    deleteExpense: (id) =>
      setRaw((r) => ({ ...r, expenses: r.expenses.filter((e) => e.id !== id) })),

    updateIncome: (id, updates) =>
      setRaw((r) => ({
        ...r,
        incomes: r.incomes.map((i) => (i.id === id ? { ...i, ...updates } : i)),
      })),
    addIncome: (income) =>
      setRaw((r) => ({
        ...r,
        incomes: [...r.incomes, { ...income, id: nextId('i') }],
      })),
    deleteIncome: (id) =>
      setRaw((r) => ({ ...r, incomes: r.incomes.filter((i) => i.id !== id) })),

    updateGoal: (id, updates) =>
      setRaw((r) => ({
        ...r,
        goals: r.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      })),
    addGoal: (goal) =>
      setRaw((r) => ({
        ...r,
        goals: [...r.goals, { ...goal, id: nextId('g') }],
      })),
    deleteGoal: (id) =>
      setRaw((r) => ({ ...r, goals: r.goals.filter((g) => g.id !== id) })),

    updateHolding: (id, updates) =>
      setRaw((r) => ({
        ...r,
        holdings: r.holdings.map((h) => (h.id === id ? { ...h, ...updates } : h)),
      })),
    addHolding: (holding) =>
      setRaw((r) => ({
        ...r,
        holdings: [...r.holdings, { ...holding, id: nextId('h') }],
      })),
    deleteHolding: (id) =>
      setRaw((r) => ({ ...r, holdings: r.holdings.filter((h) => h.id !== id) })),

    updateNote: (id, updates) =>
      setRaw((r) => ({
        ...r,
        notes: r.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      })),
    addNote: (note) =>
      setRaw((r) => ({
        ...r,
        notes: [{ ...note, id: nextId('no') }, ...r.notes],
      })),
    deleteNote: (id) =>
      setRaw((r) => ({ ...r, notes: r.notes.filter((n) => n.id !== id) })),

    resetData: () => setRaw(defaultRaw),

    saveCoachResult: (profile, plan) =>
      setRaw((r) => ({ ...r, coachProfile: profile, coachPlan: plan })),
    clearCoachResult: () =>
      setRaw((r) => ({ ...r, coachProfile: null, coachPlan: null })),
    setLanguage: (lang) =>
      setRaw((r) => ({ ...r, language: lang })),
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
