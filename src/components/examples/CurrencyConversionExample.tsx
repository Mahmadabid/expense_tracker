/**
 * Example usage of Currency Conversion Utilities
 * This file demonstrates how to use the currency conversion features
 */

'use client';

import { useState } from 'react';
import {
  convertCurrency,
  getExchangeRate,
  convertMultipleCurrencies,
  formatCurrency,
  clearRatesCache,
  hasCachedRates,
  getCacheAge,
  type Currency
} from '@/lib/utils/currencyConversion';

export default function CurrencyConversionExample() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  // Example 1: Convert single amount
  const handleSingleConversion = async () => {
    setLoading(true);
    try {
      const converted = await convertCurrency(100, 'USD', 'PKR');
      setResult(`100 USD = ${converted} PKR`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Get exchange rate
  const handleGetRate = async () => {
    setLoading(true);
    try {
      const rate = await getExchangeRate('USD', 'PKR');
      setResult(`Current exchange rate: 1 USD = ${rate} PKR`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Example 3: Convert multiple currencies
  const handleMultipleConversion = async () => {
    setLoading(true);
    try {
      const items = [
        { amount: 100, currency: 'USD' as Currency },
        { amount: 50, currency: 'EUR' as Currency },
        { amount: 1000, currency: 'PKR' as Currency },
        { amount: 30, currency: 'GBP' as Currency }
      ];

      const totalInPKR = await convertMultipleCurrencies(items, 'PKR');
      const breakdown = items.map(item => 
        `${item.amount} ${item.currency}`
      ).join(' + ');
      
      setResult(`${breakdown} = ${totalInPKR.toFixed(2)} PKR`);
    } catch (error) {
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Example 4: Format currency
  const handleFormatCurrency = () => {
    const examples = [
      formatCurrency(1234.56, 'USD'),
      formatCurrency(9876.54, 'EUR'),
      formatCurrency(123456, 'PKR'),
      formatCurrency(999.99, 'GBP')
    ];
    setResult(examples.join('\n'));
  };

  // Example 5: Check cache status
  const handleCheckCache = () => {
    const hasCached = hasCachedRates();
    const age = getCacheAge();
    
    if (hasCached && age !== null) {
      setResult(`Cache available: ${age.toFixed(1)} hours old`);
    } else {
      setResult('No cache available');
    }
  };

  // Example 6: Clear cache
  const handleClearCache = () => {
    clearRatesCache();
    setResult('Cache cleared! Next conversion will fetch fresh rates.');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Currency Conversion Examples</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleSingleConversion}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          Convert 100 USD to PKR
        </button>

        <button
          onClick={handleGetRate}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          Get USD to PKR Rate
        </button>

        <button
          onClick={handleMultipleConversion}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50"
        >
          Convert Multiple Currencies
        </button>

        <button
          onClick={handleFormatCurrency}
          className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-medium"
        >
          Format Examples
        </button>

        <button
          onClick={handleCheckCache}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-3 rounded-lg font-medium"
        >
          Check Cache Status
        </button>

        <button
          onClick={handleClearCache}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium"
        >
          Clear Cache
        </button>
      </div>

      {/* Result Display */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Result:</h2>
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Loading...</span>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm">{result || 'Click a button to test'}</pre>
        )}
      </div>

      {/* Code Examples */}
      <div className="mt-8 space-y-6">
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Example 1: Single Conversion</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`import { convertCurrency } from '@/lib/utils/currencyConversion';

const pkrAmount = await convertCurrency(100, 'USD', 'PKR');
console.log(\`100 USD = \${pkrAmount} PKR\`);`}
          </pre>
        </div>

        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Example 2: Calculate Total Expenses</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`import { convertMultipleCurrencies } from '@/lib/utils/currencyConversion';

// Your expenses in different currencies
const expenses = [
  { amount: 50, currency: 'USD' },
  { amount: 100, currency: 'EUR' },
  { amount: 5000, currency: 'PKR' }
];

// Convert all to PKR
const totalInPKR = await convertMultipleCurrencies(expenses, 'PKR');
console.log(\`Total expenses: \${totalInPKR} PKR\`);`}
          </pre>
        </div>

        <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Example 3: Display with Formatting</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
{`import { formatCurrency } from '@/lib/utils/currencyConversion';

const amount = 1234.56;
const formatted = formatCurrency(amount, 'USD');
// Output: "$ 1234.56"`}
          </pre>
        </div>
      </div>
    </div>
  );
}
