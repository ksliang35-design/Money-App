export type AssetType = 'Stocks' | 'ETF' | 'Crypto' | 'Gold' | 'Cash' | 'Other';

export type NoteTag = 'owed_to_me' | 'i_owe' | 'to_claim' | 'reminder' | 'general';

export type ExpenseCategory =
  | 'food' | 'transport' | 'shopping' | 'bills'
  | 'entertainment' | 'health' | 'education' | 'other';

export const CATEGORY_STYLE: Record<ExpenseCategory, { icon: string; bg: string; fg: string }> = {
  food:          { icon: '🍜', bg: '#E6F4EC', fg: '#1B6B3A' },
  transport:     { icon: '🚗', bg: '#EEF2FF', fg: '#3730A3' },
  shopping:      { icon: '🛍️', bg: '#FFF3E0', fg: '#B45309' },
  bills:         { icon: '💡', bg: '#FEF9EC', fg: '#92400E' },
  entertainment: { icon: '🎬', bg: '#F5F3FF', fg: '#6D28D9' },
  health:        { icon: '❤️', bg: '#FEF2F2', fg: '#B91C1C' },
  education:     { icon: '📚', bg: '#EFF6FF', fg: '#1D4ED8' },
  other:         { icon: '📦', bg: '#F3F4F6', fg: '#6B7280' },
};

export interface Expense {
  id: string;
  label: string;
  amount: number;
  method: 'card' | 'ewallet' | 'cash' | 'bank';
  category?: ExpenseCategory;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string; // ISO date 'YYYY-MM-DD'
  amount: number | null;
  tag: NoteTag | null;
}

export interface Holding {
  id: string;
  name: string;
  assetType: AssetType;
  units?: number;
  buyPrice?: number;
  currentValue: number;
}

export const MOCK = {
  name: 'Steve',
  month: 'June 2026',
  income: 6100,
  salary: 5000,
  side: 1100,
  expense: 4050,
  net: 2050,
  savingsRate: 34,
  sideShare: 18,
  byMethod: { card: 450, ewallet: 470, cash: 180, bank: 2950 },

  incomes: [
    { id: 'i1', label: 'Salary (main job)', amount: 5000, type: 'salary' },
    { id: 'i2', label: 'Shopee / Lazada', amount: 800, type: 'side' },
    { id: 'i3', label: 'Freelance', amount: 300, type: 'side' },
  ],

  expenses: [
    { id: 'e1',  label: 'Rent',                   amount: 1200, method: 'bank',    category: 'bills'         },
    { id: 'e2',  label: 'Family support (China)',  amount: 1000, method: 'bank',    category: 'other'         },
    { id: 'e3',  label: 'Insurance',               amount: 600,  method: 'bank',    category: 'health'        },
    { id: 'e4',  label: 'Transport',               amount: 300,  method: 'ewallet', category: 'transport'     },
    { id: 'e5',  label: 'Shopping',                amount: 213,  method: 'card',    category: 'shopping'      },
    { id: 'e6',  label: 'Food / kopitiam',         amount: 180,  method: 'cash',    category: 'food'          },
    { id: 'e7',  label: 'Groceries',               amount: 157,  method: 'card',    category: 'food'          },
    { id: 'e8',  label: 'Utilities',               amount: 150,  method: 'bank',    category: 'bills'         },
    { id: 'e9',  label: 'Grab rides',              amount: 90,   method: 'ewallet', category: 'transport'     },
    { id: 'e10', label: 'Entertainment',           amount: 80,   method: 'ewallet', category: 'entertainment' },
    { id: 'e11', label: 'Phone bill',              amount: 80,   method: 'card',    category: 'bills'         },
  ] as Expense[],

  goals: [
    { id: 'g1', label: 'Emergency Fund',  target: 12000, saved: 3000, icon: '🛡️' },
    { id: 'g2', label: 'Business Capital', target: 5000, saved: 600,  icon: '🚀' },
    { id: 'g3', label: 'Vacation Fund',   target: 3000,  saved: 750,  icon: '✈️' },
  ],

  history: [
    { month: 'Mar', net: 1500 },
    { month: 'Apr', net: 1900 },
    { month: 'May', net: 1700 },
    { month: 'Jun', net: 2050 },
  ],

  notes: [
    { id: 'no1', text: 'Ahmad owes me for dinner split at Pavilion', createdAt: '2026-06-10', amount: 45, tag: 'owed_to_me' as NoteTag },
    { id: 'no2', text: 'Claim medical bills from Great Eastern insurance', createdAt: '2026-06-14', amount: 320, tag: 'to_claim' as NoteTag },
    { id: 'no3', text: 'Transfer parking reimbursement to office account', createdAt: '2026-06-18', amount: null, tag: 'reminder' as NoteTag },
  ] as Note[],

  holdings: [
    { id: 'h1', name: 'Maybank',          assetType: 'Stocks' as AssetType, units: 500, buyPrice: 8.5, currentValue: 4500 },
    { id: 'h2', name: 'MyETF Dow Jones',  assetType: 'ETF'    as AssetType, units: 200, buyPrice: 1.2, currentValue: 280  },
    { id: 'h3', name: 'Bitcoin',          assetType: 'Crypto' as AssetType, currentValue: 2800 },
    { id: 'h4', name: 'Public Gold 5g',   assetType: 'Gold'   as AssetType, currentValue: 1600 },
    { id: 'h5', name: 'FD / Cash savings', assetType: 'Cash'  as AssetType, currentValue: 5000 },
  ] as Holding[],
};

// Expense is an explicit interface above (supports optional category, backward-compatible with stored data)
export type Goal = (typeof MOCK.goals)[number];
export type Income = (typeof MOCK.incomes)[number];
export type HistoryEntry = (typeof MOCK.history)[number];
// Holding and Note are defined as interfaces above (have optional fields)
