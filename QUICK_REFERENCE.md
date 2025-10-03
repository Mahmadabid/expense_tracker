# Quick Reference: Currency Features

## How Currency Works Now

### 1. **Entering Transactions**
- Select currency from dropdown when adding expense/income/loan
- Default: PKR
- Amount auto-converts if you change currency

### 2. **Currency Auto-Conversion**
```
Example:
- Enter: 100 PKR
- Change to: USD
- Result: ~0.36 USD (auto-calculated)
```

### 3. **Viewing Transactions**
- Each entry shows in its **original currency**
- No mixing of currencies
- Filter by specific currency if needed

### 4. **Currency Filter**
- Click "Filters" button
- Select specific currency or "All Currencies"
- View only items in that currency

### 5. **Currency Conversion API**
- Base: PKR
- Cache: 24 hours
- Free: 1,500 requests/month
- Fallback if API fails

---

## Code Examples

### Convert Amount
```typescript
import { convertCurrency } from '@/lib/utils/currencyConversion';

// Convert 100 USD to PKR
const pkr = await convertCurrency(100, 'USD', 'PKR');
```

### Get Exchange Rate
```typescript
import { getExchangeRate } from '@/lib/utils/currencyConversion';

// Get USD to PKR rate
const rate = await getExchangeRate('USD', 'PKR');
```

### Convert Multiple
```typescript
import { convertMultipleCurrencies } from '@/lib/utils/currencyConversion';

const items = [
  { amount: 100, currency: 'USD' },
  { amount: 50, currency: 'EUR' }
];

const total = await convertMultipleCurrencies(items, 'PKR');
```

---

## Supported Currencies

| Code | Currency | Symbol |
|------|----------|--------|
| PKR | Pakistani Rupee | Rs |
| USD | US Dollar | $ |
| EUR | Euro | € |
| GBP | British Pound | £ |
| KWD | Kuwaiti Dinar | KD |
| JPY | Japanese Yen | ¥ |
| CAD | Canadian Dollar | C$ |
| AUD | Australian Dollar | A$ |
| SAR | Saudi Riyal | SR |
| AED | UAE Dirham | AED |

---

## Loan Sharing

### Current Method
When creating a loan:
1. Enter counterparty email
2. If they have an account → They see the loan
3. They can add payments and comments

### Future: Manage Collaborators
- Add "Manage Collaborators" button
- Invite by email with role (Collaborator/Viewer)
- Remove collaborators
- Approval workflows

See: `HOW_TO_ADD_COLLABORATORS.md` for full guide

---

## Troubleshooting

### Currency not converting?
- Check internet connection (needs API)
- Wait 24 hours for cache refresh
- Try: `clearRatesCache()` in console

### Number input changing on scroll?
- Fixed! Input now blurs on scroll
- No accidental changes

### Can't find currency filter?
- Click "Filters" button (funnel icon)
- Currency dropdown is first option

---

## Files Reference

| Feature | File |
|---------|------|
| Main Component | `src/components/layout/MainContent.tsx` |
| Currency Conversion | `src/lib/utils/currencyConversion.ts` |
| Types | `src/types/index.ts` |
| Loan Model | `src/lib/models/Loan.ts` |

---

## Quick Fixes Applied

✅ Number inputs don't change on scroll
✅ Base currency changed to PKR  
✅ Currency selector auto-converts amounts
✅ Loan sharing documented

See `FIXES_SUMMARY.md` for detailed changes.
