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
    { id: 'e1', label: 'Rent', amount: 1200, method: 'bank' },
    { id: 'e2', label: 'Family support (China)', amount: 1000, method: 'bank' },
    { id: 'e3', label: 'Insurance', amount: 600, method: 'bank' },
    { id: 'e4', label: 'Transport', amount: 300, method: 'ewallet' },
    { id: 'e5', label: 'Shopping', amount: 213, method: 'card' },
    { id: 'e6', label: 'Food / kopitiam', amount: 180, method: 'cash' },
    { id: 'e7', label: 'Groceries', amount: 157, method: 'card' },
    { id: 'e8', label: 'Utilities', amount: 150, method: 'bank' },
    { id: 'e9', label: 'Grab rides', amount: 90, method: 'ewallet' },
    { id: 'e10', label: 'Entertainment', amount: 80, method: 'ewallet' },
    { id: 'e11', label: 'Phone bill', amount: 80, method: 'card' },
  ],

  goals: [
    { id: 'g1', label: 'Emergency Fund', target: 12000, saved: 3000, icon: '🛡️' },
    { id: 'g2', label: 'Business Capital', target: 5000, saved: 600, icon: '🚀' },
    { id: 'g3', label: 'Vacation Fund', target: 3000, saved: 750, icon: '✈️' },
  ],

  history: [
    { month: 'Mar', net: 1500 },
    { month: 'Apr', net: 1900 },
    { month: 'May', net: 1700 },
    { month: 'Jun', net: 2050 },
  ],
};

export type Expense = (typeof MOCK.expenses)[number];
export type Goal = (typeof MOCK.goals)[number];
export type Income = (typeof MOCK.incomes)[number];
export type HistoryEntry = (typeof MOCK.history)[number];
