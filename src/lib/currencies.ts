export const SUPPORTED_CURRENCIES = [
  "USD",
  "PKR",
  "EUR",
  "GBP",
  "AED",
  "CAD",
  "AUD",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(value: unknown): value is SupportedCurrency {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value as SupportedCurrency);
}
