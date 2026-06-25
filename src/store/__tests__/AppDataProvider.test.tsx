/**
 * Unit tests for AppDataProvider.tsx
 *
 * RNTL v14 notes:
 * - renderHook(), act(), and waitFor() are all async — always await them.
 * - jest.clearAllMocks() wipes AsyncStorage mock implementations; use
 *   AsyncStorage.clear() instead to reset stored data between tests.
 * - The load effect sets loaded=true asynchronously, so most tests must
 *   waitFor loaded before asserting derived data.
 * - The persist effect fires once when loaded flips true (before any mutation).
 *   mountAndWaitForLoad() clears the setItem spy after load so assertion counts
 *   only reflect mutation-driven writes.
 */

// ─── Mocks (must appear before any imports) ──────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/lib/logger', () => ({
  getLogger: () => ({
    debug: jest.fn(),
    info:  jest.fn(),
    warn:  jest.fn(),
    error: jest.fn(),
  }),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppDataProvider, useAppData } from '../AppDataProvider';
import { MOCK } from '@/constants/mock-data';
import { FX_DEFAULTS } from '@/lib/fx';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'money-hub-data';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap the hook in the provider. */
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AppDataProvider>{children}</AppDataProvider>
);

/**
 * Mount the provider and wait until `loaded` is true.
 * Clears the setItem spy after the initial persist-on-load write so that
 * subsequent assertions only count mutation-driven writes.
 */
async function mountAndWaitForLoad() {
  const { result } = await renderHook(() => useAppData(), { wrapper });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  (AsyncStorage.setItem as jest.Mock).mockClear();
  return result;
}

// ─── beforeEach: reset storage between tests (keep mock implementations) ─────

beforeEach(async () => {
  // Only clear stored data — do NOT call jest.clearAllMocks() here because that
  // would wipe AsyncStorage's mock implementations, causing getItem to return
  // undefined instead of a Promise and breaking the load effect.
  await AsyncStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. useAppData() hook guard
// ═══════════════════════════════════════════════════════════════════════════════

describe('useAppData()', () => {
  test('throws when called outside AppDataProvider', async () => {
    // renderHook in RNTL v14 is async; the thrown error surfaces as a rejection.
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      renderHook(() => useAppData()),
    ).rejects.toThrow('useAppData must be used within AppDataProvider');
    consoleSpy.mockRestore();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AsyncStorage integration — mount behaviour
// ═══════════════════════════════════════════════════════════════════════════════

describe('AsyncStorage integration', () => {
  test('uses default data when storage is empty, and sets loaded=true', async () => {
    const result = await mountAndWaitForLoad();
    expect(result.current.loaded).toBe(true);
    expect(result.current.data.name).toBe(MOCK.name);
    expect(result.current.data.expenses).toHaveLength(MOCK.expenses.length);
  });

  test('merges parsed JSON from storage with defaultRaw on mount', async () => {
    const storedName = 'TestUser';
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ name: storedName }));
    const result = await mountAndWaitForLoad();
    expect(result.current.data.name).toBe(storedName);
    // Fields absent from stored JSON fall back to defaults
    expect(result.current.data.expenses).toHaveLength(MOCK.expenses.length);
    expect(result.current.data.themeMode).toBe('system');
  });

  test('falls back to defaults and still sets loaded=true when stored JSON is corrupt', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{ this is not valid json !!!');
    const result = await mountAndWaitForLoad();
    expect(result.current.loaded).toBe(true);
    expect(result.current.data.name).toBe(MOCK.name);
  });

  test('persists state to storage after a mutation', async () => {
    const result = await mountAndWaitForLoad();
    // mountAndWaitForLoad() already cleared the spy — this write is mutation-only.

    await act(async () => {
      result.current.setName('NewName');
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    const [[key, value]] = (AsyncStorage.setItem as jest.Mock).mock.calls;
    expect(key).toBe(STORAGE_KEY);
    const parsed = JSON.parse(value);
    expect(parsed.name).toBe('NewName');
  });

  test('does not write to storage before loaded becomes true', async () => {
    // Clear any setItem calls that leaked from previous tests in this describe block.
    (AsyncStorage.setItem as jest.Mock).mockClear();

    let resolveGetItem!: (v: string | null) => void;
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(
      new Promise((r) => { resolveGetItem = r; }),
    );

    // Do NOT await renderHook — we need to inspect state while loading is in flight.
    const hookPromise = renderHook(() => useAppData(), { wrapper });

    // Before the load completes, no setItem should have been called.
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    // Resolve the storage read and let the hook finish loading.
    resolveGetItem(null);
    const { result } = await hookPromise;
    await waitFor(() => expect(result.current.loaded).toBe(true));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. derive() — financial computations (tested indirectly via provider data)
// ═══════════════════════════════════════════════════════════════════════════════

describe('derive() financial calculations', () => {
  test('income = salary + side', async () => {
    const result = await mountAndWaitForLoad();
    expect(result.current.data.salary).toBe(MOCK.salary);
    expect(result.current.data.side).toBe(MOCK.side);
    expect(result.current.data.income).toBe(MOCK.salary + MOCK.side);
  });

  test('expense = sum of all payment method buckets', async () => {
    // Assert against the golden value from mock-data — not a recompute from derived fields.
    const result = await mountAndWaitForLoad();
    expect(result.current.data.expense).toBe(MOCK.expense); // 4050
  });

  test('net = income - expense', async () => {
    // Pin to golden value; would catch sign errors or wrong operands in derive().
    const result = await mountAndWaitForLoad();
    expect(result.current.data.net).toBe(MOCK.net); // 2050
  });

  test('savingsRate = round(net/income * 100)', async () => {
    // Pin to golden value (Math.round(2050/6100*100) === 34).
    const result = await mountAndWaitForLoad();
    expect(result.current.data.savingsRate).toBe(MOCK.savingsRate); // 34
  });

  test('savingsRate is 0 when income is zero', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => {
      result.current.importData({ incomes: [], expenses: [] });
    });
    await waitFor(() => expect(result.current.data.income).toBe(0));
    expect(result.current.data.savingsRate).toBe(0);
  });

  test('sideShare = round(side/income * 100)', async () => {
    // Pin to golden value (Math.round(1100/6100*100) === 18).
    const result = await mountAndWaitForLoad();
    expect(result.current.data.sideShare).toBe(MOCK.sideShare); // 18
  });

  test('sideShare is 0 when income is zero', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => {
      result.current.importData({ incomes: [], expenses: [] });
    });
    await waitFor(() => expect(result.current.data.income).toBe(0));
    expect(result.current.data.sideShare).toBe(0);
  });

  test('byMethod groups expenses by payment method correctly', async () => {
    const result = await mountAndWaitForLoad();
    const { byMethod } = result.current.data;
    expect(byMethod.card).toBe(MOCK.byMethod.card);
    expect(byMethod.ewallet).toBe(MOCK.byMethod.ewallet);
    expect(byMethod.cash).toBe(MOCK.byMethod.cash);
    expect(byMethod.bank).toBe(MOCK.byMethod.bank);
  });

  test('byMethod returns zeros when there are no expenses', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => {
      result.current.importData({ expenses: [] });
    });
    await waitFor(() => expect(result.current.data.expense).toBe(0));
    expect(result.current.data.byMethod).toEqual({ card: 0, ewallet: 0, cash: 0, bank: 0 });
  });

  test('byCategory groups expenses by category correctly', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => {
      result.current.importData({
        incomes: [],
        expenses: [
          { id: 'e1', label: 'Coffee', amount: 10, method: 'cash', category: 'food' },
          { id: 'e2', label: 'Lunch',  amount: 20, method: 'cash', category: 'food' },
          { id: 'e3', label: 'Bus',    amount: 5,  method: 'ewallet', category: 'transport' },
        ],
      });
    });
    await waitFor(() => expect(result.current.data.byCategory.food).toBe(30));
    expect(result.current.data.byCategory.transport).toBe(5);
    expect(result.current.data.byCategory.shopping).toBe(0);
  });

  test('byCategory defaults missing category to "other"', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => {
      result.current.importData({
        incomes: [],
        // No category field — derive() should bucket this as 'other'
        expenses: [{ id: 'e1', label: 'Mystery spend', amount: 99, method: 'cash' }],
      });
    });
    await waitFor(() => expect(result.current.data.byCategory.other).toBe(99));
  });

  test('portfolioValue converts holdings to RM using fxRates', async () => {
    // RM holdings: 4500+280+1600+5000 = 11380
    // Bitcoin 629 USD × 4.45 = 2799.05
    // Total ≈ 14179.05
    const result = await mountAndWaitForLoad();
    expect(result.current.data.portfolioValue).toBeCloseTo(14179.05, 1);
  });

  test('portfolioValueDisplay equals portfolioValue when displayCurrency is RM', async () => {
    const result = await mountAndWaitForLoad();
    // Default displayCurrency is 'RM'
    expect(result.current.data.portfolioValueDisplay).toBeCloseTo(
      result.current.data.portfolioValue,
      5,
    );
  });

  test('portfolioValueDisplay converts to the chosen displayCurrency', async () => {
    const result = await mountAndWaitForLoad();
    const rmValue = result.current.data.portfolioValue;

    await act(async () => {
      result.current.setDisplayCurrency('USD');
    });
    await waitFor(() => expect(result.current.data.displayCurrency).toBe('USD'));

    // portfolioValue is in RM; USD display = RM / USD rate
    const expectedUSD = rmValue / FX_DEFAULTS.USD;
    expect(result.current.data.portfolioValueDisplay).toBeCloseTo(expectedUSD, 2);
  });

  test('portfolioValue and portfolioValueDisplay are 0 when there are no holdings', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => {
      result.current.importData({ holdings: [] });
    });
    await waitFor(() => expect(result.current.data.portfolioValue).toBe(0));
    expect(result.current.data.portfolioValueDisplay).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CRUD — expenses
// ═══════════════════════════════════════════════════════════════════════════════

describe('expense CRUD', () => {
  test('addExpense appends a new expense with a generated id starting with "e"', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.expenses.length;

    await act(async () => {
      result.current.addExpense({ label: 'New coffee', amount: 5, method: 'cash', category: 'food' });
    });

    await waitFor(() =>
      expect(result.current.data.expenses).toHaveLength(before + 1),
    );
    const added = result.current.data.expenses[result.current.data.expenses.length - 1];
    expect(added.id).toMatch(/^e\d+/);
    expect(added.label).toBe('New coffee');
    expect(added.amount).toBe(5);
  });

  test('addExpense does not mutate existing expenses', async () => {
    const result = await mountAndWaitForLoad();
    const originalIds = result.current.data.expenses.map((e) => e.id);

    await act(async () => {
      result.current.addExpense({ label: 'Extra', amount: 1, method: 'card', category: 'other' });
    });

    await waitFor(() =>
      expect(result.current.data.expenses.length).toBeGreaterThan(originalIds.length),
    );
    // All original items are still present in the same positions
    const preservedIds = result.current.data.expenses.slice(0, originalIds.length).map((e) => e.id);
    expect(preservedIds).toEqual(originalIds);
  });

  test('updateExpense merges partial updates into the matching item', async () => {
    const result = await mountAndWaitForLoad();
    const target = result.current.data.expenses[0];

    await act(async () => {
      result.current.updateExpense(target.id, { amount: 9999, label: 'Updated' });
    });

    await waitFor(() => {
      const updated = result.current.data.expenses.find((e) => e.id === target.id);
      expect(updated?.amount).toBe(9999);
    });
    const updated = result.current.data.expenses.find((e) => e.id === target.id);
    expect(updated?.label).toBe('Updated');
    expect(updated?.method).toBe(target.method); // unchanged field is preserved
  });

  test('updateExpense does not affect other expenses', async () => {
    const result = await mountAndWaitForLoad();
    const [first, second] = result.current.data.expenses;

    await act(async () => {
      result.current.updateExpense(first.id, { amount: 1 });
    });

    await waitFor(() =>
      expect(result.current.data.expenses.find((e) => e.id === first.id)?.amount).toBe(1),
    );
    expect(result.current.data.expenses.find((e) => e.id === second.id)?.amount).toBe(second.amount);
  });

  test('deleteExpense removes only the targeted expense', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.expenses.length;
    const target = result.current.data.expenses[2];

    await act(async () => {
      result.current.deleteExpense(target.id);
    });

    await waitFor(() =>
      expect(result.current.data.expenses).toHaveLength(before - 1),
    );
    expect(result.current.data.expenses.find((e) => e.id === target.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CRUD — incomes
// ═══════════════════════════════════════════════════════════════════════════════

describe('income CRUD', () => {
  test('addIncome appends a new income with id starting with "i"', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.incomes.length;

    await act(async () => {
      result.current.addIncome({ label: 'Bonus', amount: 500, type: 'side' });
    });

    await waitFor(() =>
      expect(result.current.data.incomes).toHaveLength(before + 1),
    );
    const added = result.current.data.incomes[result.current.data.incomes.length - 1];
    expect(added.id).toMatch(/^i\d+/);
    expect(added.label).toBe('Bonus');
  });

  test('updateIncome merges partial updates into the matching income', async () => {
    const result = await mountAndWaitForLoad();
    const target = result.current.data.incomes[0];

    await act(async () => {
      result.current.updateIncome(target.id, { amount: 8000 });
    });

    await waitFor(() => {
      expect(result.current.data.incomes.find((i) => i.id === target.id)?.amount).toBe(8000);
    });
    // Other fields preserved
    expect(result.current.data.incomes.find((i) => i.id === target.id)?.label).toBe(target.label);
  });

  test('deleteIncome removes only the targeted income', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.incomes.length;
    const target = result.current.data.incomes[0];

    await act(async () => {
      result.current.deleteIncome(target.id);
    });

    await waitFor(() =>
      expect(result.current.data.incomes).toHaveLength(before - 1),
    );
    expect(result.current.data.incomes.find((i) => i.id === target.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CRUD — goals
// ═══════════════════════════════════════════════════════════════════════════════

describe('goal CRUD', () => {
  test('addGoal appends a new goal with id starting with "g"', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.goals.length;

    await act(async () => {
      result.current.addGoal({ label: 'New Car', target: 20000, saved: 0, icon: '🚗' });
    });

    await waitFor(() =>
      expect(result.current.data.goals).toHaveLength(before + 1),
    );
    const added = result.current.data.goals[result.current.data.goals.length - 1];
    expect(added.id).toMatch(/^g\d+/);
    expect(added.label).toBe('New Car');
  });

  test('updateGoal merges partial updates', async () => {
    const result = await mountAndWaitForLoad();
    const target = result.current.data.goals[0];

    await act(async () => {
      result.current.updateGoal(target.id, { saved: 5000 });
    });

    await waitFor(() => {
      expect(result.current.data.goals.find((g) => g.id === target.id)?.saved).toBe(5000);
    });
    // Other fields preserved
    expect(result.current.data.goals.find((g) => g.id === target.id)?.label).toBe(target.label);
  });

  test('deleteGoal removes only the targeted goal', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.goals.length;
    const target = result.current.data.goals[0];

    await act(async () => {
      result.current.deleteGoal(target.id);
    });

    await waitFor(() =>
      expect(result.current.data.goals).toHaveLength(before - 1),
    );
    expect(result.current.data.goals.find((g) => g.id === target.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CRUD — holdings
// ═══════════════════════════════════════════════════════════════════════════════

describe('holding CRUD', () => {
  test('addHolding appends a new holding with id starting with "h"', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.holdings.length;

    await act(async () => {
      result.current.addHolding({ name: 'Apple', assetType: 'Stocks', currentValue: 1000, currency: 'USD' });
    });

    await waitFor(() =>
      expect(result.current.data.holdings).toHaveLength(before + 1),
    );
    const added = result.current.data.holdings[result.current.data.holdings.length - 1];
    expect(added.id).toMatch(/^h\d+/);
    expect(added.name).toBe('Apple');
  });

  test('updateHolding merges partial updates', async () => {
    const result = await mountAndWaitForLoad();
    const target = result.current.data.holdings[0];

    await act(async () => {
      result.current.updateHolding(target.id, { currentValue: 9999 });
    });

    await waitFor(() => {
      expect(result.current.data.holdings.find((h) => h.id === target.id)?.currentValue).toBe(9999);
    });
    expect(result.current.data.holdings.find((h) => h.id === target.id)?.name).toBe(target.name);
  });

  test('deleteHolding removes only the targeted holding', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.holdings.length;
    const target = result.current.data.holdings[0];

    await act(async () => {
      result.current.deleteHolding(target.id);
    });

    await waitFor(() =>
      expect(result.current.data.holdings).toHaveLength(before - 1),
    );
    expect(result.current.data.holdings.find((h) => h.id === target.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CRUD — notes
// ═══════════════════════════════════════════════════════════════════════════════

describe('note CRUD', () => {
  test('addNote PREPENDS the new note (unlike other add* operations which append)', async () => {
    const result = await mountAndWaitForLoad();
    const firstBeforeId = result.current.data.notes[0].id;

    await act(async () => {
      result.current.addNote({ text: 'New note', createdAt: '2026-06-01', amount: null, tag: null });
    });

    await waitFor(() =>
      expect(result.current.data.notes[0].text).toBe('New note'),
    );
    // Previously first note is now second
    expect(result.current.data.notes[1].id).toBe(firstBeforeId);
    expect(result.current.data.notes[0].id).toMatch(/^no\d+/);
  });

  test('updateNote merges partial updates', async () => {
    const result = await mountAndWaitForLoad();
    const target = result.current.data.notes[0];

    await act(async () => {
      result.current.updateNote(target.id, { text: 'Updated text' });
    });

    await waitFor(() => {
      expect(result.current.data.notes.find((n) => n.id === target.id)?.text).toBe('Updated text');
    });
    // Other fields preserved
    expect(result.current.data.notes.find((n) => n.id === target.id)?.tag).toBe(target.tag);
  });

  test('deleteNote removes only the targeted note', async () => {
    const result = await mountAndWaitForLoad();
    const before = result.current.data.notes.length;
    const target = result.current.data.notes[0];

    await act(async () => {
      result.current.deleteNote(target.id);
    });

    await waitFor(() =>
      expect(result.current.data.notes).toHaveLength(before - 1),
    );
    expect(result.current.data.notes.find((n) => n.id === target.id)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. CRUD — bills
// ═══════════════════════════════════════════════════════════════════════════════

describe('bill CRUD', () => {
  const newBill = {
    name: 'Electricity',
    amount: 150,
    dueDay: 5,
    category: 'utilities',
    type: 'bill' as const,
  };

  test('addBill appends a new bill with id starting with "bl"', async () => {
    const result = await mountAndWaitForLoad();

    await act(async () => {
      result.current.addBill(newBill);
    });

    await waitFor(() =>
      expect(result.current.data.bills).toHaveLength(1),
    );
    expect(result.current.data.bills[0].id).toMatch(/^bl\d+/);
    expect(result.current.data.bills[0].name).toBe('Electricity');
  });

  test('updateBill merges partial updates', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => { result.current.addBill(newBill); });
    await waitFor(() => expect(result.current.data.bills).toHaveLength(1));

    const target = result.current.data.bills[0];
    await act(async () => {
      result.current.updateBill(target.id, { amount: 200, notes: 'Peak month' });
    });

    await waitFor(() => {
      expect(result.current.data.bills.find((b) => b.id === target.id)?.amount).toBe(200);
    });
    expect(result.current.data.bills.find((b) => b.id === target.id)?.notes).toBe('Peak month');
    // Unchanged field preserved
    expect(result.current.data.bills.find((b) => b.id === target.id)?.name).toBe(newBill.name);
  });

  test('deleteBill removes only the targeted bill', async () => {
    const result = await mountAndWaitForLoad();

    // Seed two bills with known, distinct ids via importData to avoid the
    // Date.now()-based id collision that can occur when adds happen in the
    // same millisecond tick.
    await act(async () => {
      result.current.importData({
        bills: [
          { id: 'bl-first',  name: 'Electricity', amount: 150, dueDay: 5, category: 'utilities', type: 'bill' },
          { id: 'bl-second', name: 'Water',        amount: 40,  dueDay: 10, category: 'utilities', type: 'bill' },
        ],
      });
    });
    await waitFor(() => expect(result.current.data.bills).toHaveLength(2));

    const target = result.current.data.bills[0]; // 'bl-first' / Electricity
    await act(async () => { result.current.deleteBill(target.id); });

    await waitFor(() =>
      expect(result.current.data.bills).toHaveLength(1),
    );
    expect(result.current.data.bills.find((b) => b.id === target.id)).toBeUndefined();
    expect(result.current.data.bills[0].name).toBe('Water');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. Other mutations
// ═══════════════════════════════════════════════════════════════════════════════

describe('setName()', () => {
  test('trims whitespace from the new name', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => { result.current.setName('  Alice  '); });
    await waitFor(() => expect(result.current.data.name).toBe('Alice'));
  });

  test('falls back to the existing name when result after trim is empty', async () => {
    const result = await mountAndWaitForLoad();
    const originalName = result.current.data.name;
    await act(async () => { result.current.setName('   '); });
    // Name must remain unchanged after a whitespace-only input
    await waitFor(() => expect(result.current.data.name).toBe(originalName));
  });
});

describe('resetData()', () => {
  test('restores the full default dataset (MOCK data)', async () => {
    const result = await mountAndWaitForLoad();

    // Dirty the state first
    await act(async () => { result.current.setName('Dirty'); });
    await waitFor(() => expect(result.current.data.name).toBe('Dirty'));

    await act(async () => { result.current.resetData(); });
    await waitFor(() => expect(result.current.data.name).toBe(MOCK.name));

    expect(result.current.data.expenses).toHaveLength(MOCK.expenses.length);
    expect(result.current.data.incomes).toHaveLength(MOCK.incomes.length);
    expect(result.current.data.goals).toHaveLength(MOCK.goals.length);
    expect(result.current.data.bills).toHaveLength(0); // defaultRaw has empty bills
  });
});

describe('importData()', () => {
  test('replaces data with the incoming partial, filling missing fields from defaultRaw', async () => {
    const result = await mountAndWaitForLoad();

    await act(async () => {
      result.current.importData({
        name: 'Imported',
        expenses: [{ id: 'e99', label: 'Test', amount: 1, method: 'cash', category: 'other' }],
      });
    });

    await waitFor(() => expect(result.current.data.name).toBe('Imported'));
    expect(result.current.data.expenses).toHaveLength(1);
    // Fields not in the imported partial come from defaultRaw
    expect(result.current.data.incomes).toHaveLength(MOCK.incomes.length);
    expect(result.current.data.themeMode).toBe('system');
  });

  test('imported empty arrays produce zero-value derived totals', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => {
      result.current.importData({ incomes: [], expenses: [], holdings: [] });
    });
    await waitFor(() => expect(result.current.data.income).toBe(0));
    expect(result.current.data.expense).toBe(0);
    expect(result.current.data.net).toBe(0);
    expect(result.current.data.portfolioValue).toBe(0);
  });
});

describe('saveCoachResult() / clearCoachResult()', () => {
  const mockProfile = { age: '25-34', incomeBracket: 'RM 5,001–8,000', goal: 'Build savings' };
  const mockPlan = {
    model: '50/30/20',
    why: 'Good fit.',
    buckets: [],
    nextAction: 'Save more.',
    encouragement: 'Keep going!',
  };

  test('saveCoachResult stores the profile and plan', async () => {
    const result = await mountAndWaitForLoad();

    await act(async () => { result.current.saveCoachResult(mockProfile, mockPlan); });

    await waitFor(() => expect(result.current.data.coachProfile).toEqual(mockProfile));
    expect(result.current.data.coachPlan).toEqual(mockPlan);
  });

  test('clearCoachResult nulls both fields', async () => {
    const result = await mountAndWaitForLoad();

    await act(async () => { result.current.saveCoachResult(mockProfile, mockPlan); });
    await waitFor(() => expect(result.current.data.coachProfile).not.toBeNull());

    await act(async () => { result.current.clearCoachResult(); });
    await waitFor(() => expect(result.current.data.coachProfile).toBeNull());
    expect(result.current.data.coachPlan).toBeNull();
  });
});

describe('simple field setters', () => {
  test('setLanguage updates language field', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => { result.current.setLanguage('ms'); });
    await waitFor(() => expect(result.current.data.language).toBe('ms'));
  });

  test('setDisplayCurrency updates displayCurrency field', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => { result.current.setDisplayCurrency('USD'); });
    await waitFor(() => expect(result.current.data.displayCurrency).toBe('USD'));
  });

  test('setFxRates updates fxRates', async () => {
    const result = await mountAndWaitForLoad();
    const newRates = { USD: 4.60, HKD: 0.60 };
    await act(async () => { result.current.setFxRates(newRates); });
    await waitFor(() => expect(result.current.data.fxRates).toEqual(newRates));
  });

  test('setPricesUpdatedAt updates pricesUpdatedAt', async () => {
    const result = await mountAndWaitForLoad();
    const ts = 1700000000;
    await act(async () => { result.current.setPricesUpdatedAt(ts); });
    await waitFor(() => expect(result.current.data.pricesUpdatedAt).toBe(ts));
  });

  test('setThemeMode updates themeMode', async () => {
    const result = await mountAndWaitForLoad();
    await act(async () => { result.current.setThemeMode('dark'); });
    await waitFor(() => expect(result.current.data.themeMode).toBe('dark'));
  });

  test('setAvatar updates avatar config', async () => {
    const result = await mountAndWaitForLoad();
    const config = { type: 'emoji' as const, colour: 'gold' as const, emoji: '🪙' as const };
    await act(async () => { result.current.setAvatar(config); });
    await waitFor(() => expect(result.current.data.avatar).toEqual(config));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11. fxRates effect on derive()
// ═══════════════════════════════════════════════════════════════════════════════

describe('fxRates effect on portfolioValue', () => {
  test('changing fxRates recalculates portfolioValue', async () => {
    const result = await mountAndWaitForLoad();
    const originalValue = result.current.data.portfolioValue;

    // Double the USD rate — the Bitcoin holding should contribute more RM
    const newRates = { USD: FX_DEFAULTS.USD * 2, HKD: FX_DEFAULTS.HKD };
    await act(async () => { result.current.setFxRates(newRates); });

    await waitFor(() =>
      expect(result.current.data.portfolioValue).toBeGreaterThan(originalValue),
    );
  });
});
