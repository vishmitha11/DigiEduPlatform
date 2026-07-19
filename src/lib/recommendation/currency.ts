const EXCHANGE_RATE_CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

let cachedRates: Record<string, number> | null = null;
let cachedAt = 0;

async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < EXCHANGE_RATE_CACHE_TTL_MS) {
    return cachedRates;
  }

  const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates");
  }

  const data = await response.json();
  cachedRates = data.rates as Record<string, number>;
  cachedAt = now;
  return cachedRates;
}

export async function convertToUsd(amount: number, currencyCode: string): Promise<number> {
  if (currencyCode.toUpperCase() === "USD") {
    return amount;
  }

  const rates = await getExchangeRates();
  const rate = rates[currencyCode.toUpperCase()];

  if (!rate) {
    throw new Error(`No exchange rate found for currency: ${currencyCode}`);
  }

  return Math.round((amount / rate) * 100) / 100;
}