/**
 * Currency Conversion Utility
 * Uses exchangerate-api.com free tier (1,500 requests/month)
 * No API key required for basic usage
 */

export type Currency = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'KWD' | 'JPY' | 'CAD' | 'AUD' | 'SAR' | 'AED';

interface ExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
  baseCurrency: string;
}

const CACHE_KEY = 'currency_rates_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const BASE_CURRENCY = 'PKR'; // Base currency for conversions (Pakistani Rupee)

/**
 * Free API: https://www.exchangerate-api.com/
 * No API key required for basic usage
 * Limit: 1,500 requests/month on free tier
 */
const API_BASE_URL = `https://open.exchangerate-api.com/v6/latest`;

/**
 * Get cached exchange rates from localStorage
 */
function getCachedRates(): CachedRates | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedRates = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - data.timestamp < CACHE_DURATION) {
      return data;
    }

    // Cache expired
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error('Error reading cached rates:', error);
    return null;
  }
}

/**
 * Save exchange rates to localStorage
 */
function setCachedRates(rates: Record<string, number>, baseCurrency: string): void {
  try {
    const data: CachedRates = {
      rates,
      timestamp: Date.now(),
      baseCurrency,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching rates:', error);
  }
}

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    // Check cache first
    const cached = getCachedRates();
    if (cached && cached.baseCurrency === BASE_CURRENCY) {
      console.log('Using cached exchange rates');
      return cached.rates;
    }

    // Fetch fresh rates
    console.log('Fetching fresh exchange rates...');
    const response = await fetch(`${API_BASE_URL}/${BASE_CURRENCY}`);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();
    
    if (data.result !== 'success') {
      throw new Error('API returned unsuccessful result');
    }

    // Cache the rates
    setCachedRates(data.conversion_rates, BASE_CURRENCY);

    return data.conversion_rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Try to return cached rates even if expired
    const cached = getCachedRates();
    if (cached) {
      console.warn('Using expired cached rates due to API error');
      return cached.rates;
    }

    throw new Error('Failed to fetch exchange rates and no cache available');
  }
}

/**
 * Convert amount from one currency to another
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  try {
    const rates = await fetchExchangeRates();

    // Rates are based on BASE_CURRENCY (PKR), so convert through PKR
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} or ${toCurrency}`);
    }

    // Convert: amount in fromCurrency -> PKR -> toCurrency
    const amountInBaseCurrency = amount / fromRate;
    const convertedAmount = amountInBaseCurrency * toRate;

    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw error;
  }
}

/**
 * Get exchange rate between two currencies
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate
 */
export async function getExchangeRate(
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  try {
    const rates = await fetchExchangeRates();

    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not available for ${fromCurrency} or ${toCurrency}`);
    }

    // Calculate rate: 1 fromCurrency = ? toCurrency
    const rate = toRate / fromRate;

    return Math.round(rate * 10000) / 10000; // Round to 4 decimal places
  } catch (error) {
    console.error('Get exchange rate error:', error);
    throw error;
  }
}

/**
 * Convert multiple amounts from different currencies to a single target currency
 * Useful for calculating totals across multiple currencies
 */
export async function convertMultipleCurrencies(
  items: Array<{ amount: number; currency: Currency }>,
  targetCurrency: Currency
): Promise<number> {
  try {
    const rates = await fetchExchangeRates();
    const targetRate = rates[targetCurrency];

    if (!targetRate) {
      throw new Error(`Exchange rate not available for ${targetCurrency}`);
    }

    let total = 0;

    for (const item of items) {
      if (item.currency === targetCurrency) {
        total += item.amount;
      } else {
        const fromRate = rates[item.currency];
        if (!fromRate) {
          console.warn(`Skipping item with unavailable currency: ${item.currency}`);
          continue;
        }

        // Convert to BASE_CURRENCY (PKR) then to target currency
        const amountInBaseCurrency = item.amount / fromRate;
        const convertedAmount = amountInBaseCurrency * targetRate;
        total += convertedAmount;
      }
    }

    return Math.round(total * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Multiple currency conversion error:', error);
    throw error;
  }
}

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: Currency): string {
  const symbols: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    PKR: 'Rs',
    KWD: 'KD',
    CAD: 'C$',
    AUD: 'A$',
    SAR: 'SR',
    AED: 'AED',
  };

  const symbol = symbols[currency] || currency;
  const formatted = amount.toFixed(2);

  return `${symbol} ${formatted}`;
}

/**
 * Clear cached exchange rates (useful for testing or manual refresh)
 */
export function clearRatesCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Check if cached rates are available
 */
export function hasCachedRates(): boolean {
  const cached = getCachedRates();
  return cached !== null;
}

/**
 * Get cache age in hours
 */
export function getCacheAge(): number | null {
  const cached = getCachedRates();
  if (!cached) return null;

  const ageInMs = Date.now() - cached.timestamp;
  return ageInMs / (60 * 60 * 1000); // Convert to hours
}
