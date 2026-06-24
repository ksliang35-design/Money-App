import type { FxRates, Holding } from '@/constants/mock-data';

export type HoldingPriceUpdate = { holdingId: string; newValue: number };

// Map from common display names (lowercase) to CoinGecko IDs
const CRYPTO_ID: Record<string, string> = {
  bitcoin: 'bitcoin', btc: 'bitcoin',
  ethereum: 'ethereum', eth: 'ethereum',
  bnb: 'binancecoin', binancecoin: 'binancecoin',
  solana: 'solana', sol: 'solana',
  ripple: 'ripple', xrp: 'ripple',
  cardano: 'cardano', ada: 'cardano',
  dogecoin: 'dogecoin', doge: 'dogecoin',
  litecoin: 'litecoin', ltc: 'litecoin',
  polkadot: 'polkadot', dot: 'polkadot',
  chainlink: 'chainlink', link: 'chainlink',
  avalanche: 'avalanche-2', avax: 'avalanche-2',
  polygon: 'matic-network', matic: 'matic-network',
};

/**
 * Fetch live USD→RM and HKD→RM rates from open.er-api.com (free, no key).
 * Throws on network error or non-success response.
 */
export async function fetchFxRates(): Promise<FxRates> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`ER-API HTTP ${res.status}`);
  const json = await res.json();
  if (json.result !== 'success') throw new Error('ER-API non-success');

  const usdToRM = Number(json.rates?.MYR);
  const usdToHKD = Number(json.rates?.HKD);
  if (!usdToRM || !usdToHKD) throw new Error('ER-API missing MYR/HKD');

  return {
    USD: Number(usdToRM.toFixed(4)),
    HKD: Number((usdToRM / usdToHKD).toFixed(4)),
  };
}

/**
 * Fetch live crypto prices from CoinGecko (free, no key).
 * Only updates holdings that are Crypto-typed and have a units value.
 * Returns an empty array if no eligible holdings or no recognised names.
 * Throws on network error.
 */
export async function fetchCryptoPrices(
  holdings: Holding[],
  fxRates: FxRates,
): Promise<HoldingPriceUpdate[]> {
  // Only crypto holdings that have a units count can be recalculated
  const eligible = holdings.filter(
    (h) => h.assetType === 'Crypto' && h.units != null && h.units > 0,
  );
  if (eligible.length === 0) return [];

  // Build CoinGecko-ID → holdings map
  const idMap = new Map<string, Holding[]>();
  for (const h of eligible) {
    const cgId = CRYPTO_ID[h.name.toLowerCase().trim()];
    if (!cgId) continue;
    const bucket = idMap.get(cgId) ?? [];
    bucket.push(h);
    idMap.set(cgId, bucket);
  }
  if (idMap.size === 0) return [];

  const ids = [...idMap.keys()].join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const prices: Record<string, { usd: number }> = await res.json();

  const updates: HoldingPriceUpdate[] = [];
  for (const [cgId, priceData] of Object.entries(prices)) {
    const usdPrice = priceData.usd;
    for (const h of idMap.get(cgId) ?? []) {
      const ccy = h.currency ?? 'RM';
      let newValue: number;
      if (ccy === 'USD') {
        newValue = h.units! * usdPrice;
      } else if (ccy === 'RM') {
        newValue = h.units! * usdPrice * fxRates.USD;
      } else {
        // HKD: convert USD → RM → HKD
        newValue = h.units! * usdPrice * (fxRates.USD / fxRates.HKD);
      }
      updates.push({ holdingId: h.id, newValue: Number(newValue.toFixed(2)) });
    }
  }
  return updates;
}
