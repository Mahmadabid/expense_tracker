# Dashboard Loan Decryption Fix

## Issue
Runtime error in `PendingLoanCard` component:
```
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
loan.amount.toLocaleString()
```

## Root Cause

The dashboard API was returning loans with encrypted data that wasn't being decrypted. The problem occurred because:

1. **Using `.lean()`**: The dashboard route was using `.lean()` on the loan query, which returns plain JavaScript objects and **bypasses all Mongoose middleware**, including the post-find decryption hook.

2. **Using `.select()` without `encryptedData`**: The select statement was trying to fetch fields like `amount` and `remainingAmount` directly, but these fields don't exist as schema properties - they're stored in `encryptedData`.

3. **Aggregation on encrypted field**: The code was trying to use MongoDB aggregation to calculate loan totals by summing `remainingAmount`, but this field is encrypted and not available at the database level.

## Solution

### 1. Removed `.lean()` from Loan Queries
```typescript
// BEFORE (broken)
LoanModel.find({ ... })
  .select('direction remainingAmount amount date description counterpartyUserId loanStatus')
  .sort({ date: -1 })
  .lean(),  // ❌ Bypasses decryption middleware

// AFTER (fixed)
LoanModel.find({ ... })
  .select('encryptedData currency date counterpartyUserId loanStatus direction status isPersonal dueDate version createdBy lastModifiedBy')
  .sort({ date: -1 }),  // ✅ Mongoose middleware runs, decrypts data
```

### 2. Fetch `encryptedData` Instead of Individual Fields
Since `amount`, `remainingAmount`, `description`, and `counterparty` are all stored encrypted, we must:
- Fetch `encryptedData` field
- Let Mongoose middleware decrypt it
- Access the decrypted fields after the query

### 3. Calculate Loan Totals After Decryption
```typescript
// BEFORE (broken) - trying to aggregate encrypted data
LoanModel.aggregate([
  { $match: { status: 'active' } },
  { $group: {
    _id: '$direction',
    total: { $sum: '$remainingAmount' }  // ❌ Field doesn't exist, it's encrypted
  }}
])

// AFTER (fixed) - calculate after decryption
const loans = await LoanModel.find({ status: 'active' });
// Middleware decrypts each loan
let totalLoaned = 0;
let totalBorrowed = 0;
loans.forEach((loan: any) => {
  const remaining = loan.remainingAmount || 0;  // ✅ Now available after decryption
  if (loan.direction === 'lent') {
    totalLoaned += remaining;
  } else if (loan.direction === 'borrowed') {
    totalBorrowed += remaining;
  }
});
```

## How Loan Decryption Works

### Loan Schema Structure
```typescript
{
  // Unencrypted fields (for queries and indexes)
  userId: string,
  currency: string,
  date: Date,
  direction: 'lent' | 'borrowed',
  loanStatus: 'pending' | 'accepted' | 'rejected',
  counterpartyUserId: string,
  isPersonal: boolean,
  
  // All sensitive data encrypted as one field
  encryptedData: string,  // Contains: amount, remainingAmount, description, counterparty, payments, comments
}
```

### Decryption Middleware
```typescript
// Runs after find, findOne, save operations
LoanSchema.post('find', function(docs: LoanDocument[]) {
  docs.forEach(decryptLoanData);
});

function decryptLoanData(doc: any) {
  if (doc.encryptedData && !doc.amount) {
    const decrypted = decryptObject(doc.encryptedData);
    doc.amount = decrypted.amount;
    doc.remainingAmount = decrypted.remainingAmount;
    doc.description = decrypted.description;
    doc.counterparty = decrypted.counterparty;
    doc.payments = decrypted.payments;
    // ... etc
  }
}
```

### toJSON Method
When sending to client, the `toJSON` method:
1. Decrypts data if not already done
2. Removes `encryptedData` from response
3. Converts `_id` to string
4. Adds `isLoan: true` flag

## Files Modified

### `src/app/api/dashboard/route.ts`
- ✅ Removed `.lean()` from loan query
- ✅ Changed `.select()` to fetch `encryptedData` instead of individual fields
- ✅ Removed broken aggregation for loan totals
- ✅ Calculate loan totals after decryption in JavaScript

## Performance Considerations

### Why Not Keep Aggregation?
- **Encrypted data can't be aggregated in MongoDB**
- Even if we could, summing encrypted values wouldn't make sense
- Must decrypt first, then calculate

### Is This Slower?
Slightly, but necessary:
- **Before**: 2 aggregation pipelines (fast but broken)
- **After**: 1 aggregation (entries) + 1 find with decryption (loans)
- **Trade-off**: Correctness > micro-optimization

### Optimization Still Present
- ✅ Entry totals still use aggregation (not encrypted)
- ✅ Only fetch necessary fields
- ✅ Use indexes for queries
- ✅ Limit fields with `.select()`

## Testing Checklist

- [x] Pending loans display correctly in UI
- [x] Loan amounts show with currency formatting
- [x] Counterparty names display
- [x] Loan descriptions visible
- [x] Dashboard summary totals calculate correctly
- [x] Personal loans work
- [x] Collaborative loans work
- [x] No TypeScript errors
- [x] Decryption middleware runs automatically

## Why .lean() Was Used Initially

`.lean()` is a Mongoose optimization that:
- Returns plain JavaScript objects instead of Mongoose documents
- Faster (no hydration overhead)
- Uses less memory
- **But bypasses ALL middleware and virtuals**

## When to Use .lean()

✅ **Safe to use when**:
- Querying unencrypted data only
- No middleware/hooks needed
- Read-only operations
- High-performance requirements

❌ **Don't use when**:
- Data needs transformation (like decryption)
- Middleware must run (pre/post hooks)
- Using virtuals or methods
- Data requires processing before sending to client

## Best Practices Going Forward

1. **For Encrypted Models**: Never use `.lean()` - need middleware for decryption
2. **For Unencrypted Models** (like Entry): `.lean()` is fine for performance
3. **Aggregations**: Only use on unencrypted fields
4. **Select Fields**: Always include `encryptedData` if querying encrypted models
5. **Testing**: Always test with actual data to catch decryption issues

## Alternative Solutions Considered

### Option 1: Decrypt in Frontend ❌
- **Rejected**: Security risk, encryption keys shouldn't be in client
- Would expose encryption implementation

### Option 2: Store Decrypted Copy ❌
- **Rejected**: Defeats purpose of encryption
- Would duplicate data
- Sync issues between encrypted/decrypted copies

### Option 3: Hybrid Approach (Current) ✅
- **Chosen**: Decrypt on server after fetch
- Middleware handles it automatically
- Clean separation of concerns
- Secure

## Impact Summary

**Before Fix:**
- ❌ Loans returned without decrypted data
- ❌ `loan.amount` was `undefined`
- ❌ PendingLoanCard crashed
- ❌ Dashboard showed incorrect loan totals

**After Fix:**
- ✅ Loans properly decrypted via middleware
- ✅ All loan fields accessible
- ✅ PendingLoanCard displays correctly
- ✅ Dashboard calculates accurate totals

---

**Status:** ✅ Fixed and Tested
**Version:** 1.0
**Date:** December 2024
