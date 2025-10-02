export const SUPPORTED_CURRENCIES = [
  "PKR", "USD", "EUR", "GBP", "JPY", "CNY", "INR", "AUD", "CAD", "CHF", "NZD",
  "SEK", "NOK", "DKK", "SGD", "HKD", "KRW", "MXN", "BRL", "ZAR", "RUB",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);
}

export function getCurrencyFromStorage(): SupportedCurrency {
  if (typeof window === "undefined") return "PKR";
  const stored = localStorage.getItem("preferredCurrency");
  return isSupportedCurrency(stored) ? stored : "PKR";
}

export function setCurrencyToStorage(currency: SupportedCurrency) {
  if (typeof window !== "undefined") {
    localStorage.setItem("preferredCurrency", currency);
  }
}
