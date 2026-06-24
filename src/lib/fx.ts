import type { FxRates, HoldingCurrency } from '@/constants/mock-data';

export { type FxRates, type HoldingCurrency };

export const FX_DEFAULTS: FxRates = { USD: 4.45, HKD: 0.57 };

/** Convert any holding currency amount to RM. */
export function toRM(amount: number, currency: HoldingCurrency, rates: FxRates): number {
  if (currency === 'RM') return amount;
  return amount * (currency === 'USD' ? rates.USD : rates.HKD);
}

function fromRM(amount: number, to: HoldingCurrency, rates: FxRates): number {
  if (to === 'RM') return amount;
  return amount / (to === 'USD' ? rates.USD : rates.HKD);
}

/** Convert between any two holding currencies via RM as the pivot. */
export function convertCcy(
  amount: number,
  from: HoldingCurrency,
  to: HoldingCurrency,
  rates: FxRates,
): number {
  if (from === to) return amount;
  return fromRM(toRM(amount, from, rates), to, rates);
}

/** Format with currency code prefix. RM uses 0 dp; USD/HKD use 2 dp. */
export function fmtCcy(n: number, ccy: HoldingCurrency): string {
  const dp = ccy === 'RM' ? 0 : 2;
  return `${ccy} ${Number(n || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: dp,
  })}`;
}
