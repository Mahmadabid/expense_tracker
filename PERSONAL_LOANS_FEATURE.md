# Personal Loans Feature

## Overview

The loan system now supports **two types of loans**:

1. **Collaborative Loans** - Shared with a counterparty (lender/borrower), with approval workflows and notifications
2. **Personal Loans** - Private tracking for the user only, no counterparty involvement

## Use Cases

### Personal Loans (isPersonal: true)
- Track money lent to friends/family who aren't registered users (without sharing data)
- Record personal borrowing from non-registered sources
- Private financial tracking without collaboration features
- Simpler workflow - no approvals needed

### Collaborative Loans (isPersonal: false)
- Both parties are registered users
- Requires counterparty approval
- Mutual verification for changes
- Real-time notifications
- Full audit trail with both parties

## Implementation Details

### Database Schema Changes

#### Added Fields

**Loan Model (`src/lib/models/Loan.ts`):**
```typescript
isPersonal: {
  type: Boolean,
  required: true,
  default: false,
  index: true,
}
```

**Type Definition (`src/types/index.ts`):**
```typescript
export interface Loan extends Entry {
  isPersonal: boolean; // True for personal tracking, false for collaborative
  counterparty?: {     // Optional now - not needed for personal loans
    userId?: string;
    name: string;
    email?: string;
    phone?: string;
  };
  // ... other fields
}
```

#### Index Updates
```typescript
// New index for filtering personal vs collaborative loans
LoanSchema.index({ userId: 1, isPersonal: 1 });
```

### API Changes

#### POST /api/loans - Create Loan

**Request Body:**
```typescript
{
  amount: number;           // Required
  currency: string;         // Required
  description?: string;
  direction: 'lent' | 'borrowed'; // Required
  isPersonal: boolean;      // NEW - defaults to false
  counterparty?: {          // Required only if isPersonal=false
    name: string;
    email?: string;
    phone?: string;
  };
  dueDate?: Date;
  tags?: string[];
}
```

**Validation Logic:**
```typescript
// Personal loans: counterparty is optional
// Collaborative loans: counterparty.name is required
const isPersonalLoan = isPersonal === true;
if (!isPersonalLoan && (!counterparty || !counterparty.name)) {
  return errorResponse('Counterparty name is required for collaborative loans');
}
```

**Auto-Configuration:**
```typescript
{
  isPersonal: isPersonalLoan,
  loanStatus: isPersonalLoan ? 'accepted' : (counterpartyUserId ? 'pending' : 'accepted'),
  requiresMutualApproval: isPersonalLoan ? false : true,
  counterpartyUserId: isPersonalLoan ? undefined : counterpartyUserId,
}
```

### Behavior Differences

| Feature | Personal Loan | Collaborative Loan |
|---------|--------------|-------------------|
| **Counterparty** | Optional (for notes only) | Required (name mandatory) |
| **Approval Status** | Auto-accepted | Pending if counterparty registered |
| **Notifications** | None | Sent to counterparty |
| **Mutual Approval** | Disabled | Enabled for sensitive changes |
| **Collaborators** | Not available | Can invite collaborators |
| **Audit Trail** | Local only | Shared with counterparty |
| **Access Control** | Owner only | Owner + counterparty + collaborators |

### Frontend Integration

#### Creating Personal Loans

```typescript
// Personal loan (just for tracking)
const personalLoan = {
  amount: 1000,
  currency: 'USD',
  description: 'Lent to John (not registered)',
  direction: 'lent',
  isPersonal: true,
  // counterparty is optional - can omit or provide name for notes
  dueDate: new Date('2025-12-31'),
};

// Collaborative loan (with registered user)
const collaborativeLoan = {
  amount: 1000,
  currency: 'USD',
  description: 'Loan to friend',
  direction: 'lent',
  isPersonal: false,
  counterparty: {
    name: 'Jane Doe',
    email: 'jane@example.com', // Will trigger notification if registered
  },
  dueDate: new Date('2025-12-31'),
};
```

#### UI Considerations

**Loan Creation Form:**
```tsx
<FormCheckbox
  label="Personal Loan (private tracking)"
  checked={isPersonal}
  onChange={(e) => setIsPersonal(e.target.checked)}
/>

{!isPersonal && (
  <FormInput
    label="Counterparty Name"
    required
    value={counterpartyName}
    onChange={(e) => setCounterpartyName(e.target.value)}
  />
)}

{/* Show counterparty email only for collaborative loans */}
{!isPersonal && (
  <FormInput
    label="Counterparty Email (optional)"
    type="email"
    value={counterpartyEmail}
    onChange={(e) => setCounterpartyEmail(e.target.value)}
    helpText="If registered, they'll be notified and can approve"
  />
)}
```

**Loan List Display:**
```tsx
{loan.isPersonal ? (
  <Badge variant="secondary">Personal</Badge>
) : (
  <>
    <Badge variant="primary">Collaborative</Badge>
    {loan.loanStatus === 'pending' && (
      <Badge variant="warning">Pending Approval</Badge>
    )}
  </>
)}
```

### Query Examples

#### Get All Personal Loans
```typescript
const personalLoans = await LoanModel.find({
  userId: currentUserId,
  isPersonal: true,
  status: 'active'
}).sort({ date: -1 });
```

#### Get All Collaborative Loans
```typescript
const collaborativeLoans = await LoanModel.find({
  userId: currentUserId,
  isPersonal: false,
  status: 'active'
}).sort({ date: -1 });
```

#### Get Pending Approvals (Collaborative Only)
```typescript
const pendingLoans = await LoanModel.find({
  counterpartyUserId: currentUserId,
  isPersonal: false,
  loanStatus: 'pending'
}).sort({ date: -1 });
```

### Migration Notes

#### Existing Loans
All existing loans will have `isPersonal: false` by default (collaborative mode).

#### Backward Compatibility
- ✅ All existing loans continue to work
- ✅ `counterparty` field is now optional in TypeScript
- ✅ API accepts both personal and collaborative loans
- ✅ Frontend can detect loan type via `isPersonal` flag

### Security Considerations

#### Personal Loans
- ✅ Only the owner can view/modify
- ✅ No sharing or collaboration features
- ✅ No notifications sent
- ✅ Simpler access control

#### Collaborative Loans
- ✅ Counterparty can view if registered
- ✅ Mutual approval for sensitive changes
- ✅ Audit trail visible to both parties
- ✅ Notifications keep both informed

### Testing Checklist

- [ ] Create personal loan without counterparty
- [ ] Create personal loan with counterparty name (notes only)
- [ ] Create collaborative loan with unregistered counterparty
- [ ] Create collaborative loan with registered counterparty
- [ ] Verify personal loans don't send notifications
- [ ] Verify collaborative loans send notifications
- [ ] Verify personal loans are auto-accepted
- [ ] Verify collaborative loans show pending status
- [ ] Test updating personal loans
- [ ] Test updating collaborative loans
- [ ] Verify mutual approval only required for collaborative
- [ ] Test filtering by isPersonal flag
- [ ] Verify guest mode supports both types

### Benefits

#### For Users
1. **Flexibility**: Choose between private tracking and collaboration
2. **Privacy**: Personal loans don't expose data to counterparty
3. **Simplicity**: No approval workflow for personal tracking
4. **Transparency**: Collaborative loans have full audit trail

#### For System
1. **Reduced Load**: Personal loans skip notification system
2. **Faster Processing**: No approval checks for personal loans
3. **Better Organization**: Clear separation of loan types
4. **Scalability**: Users can track many personal loans without DB overhead

## Example Scenarios

### Scenario 1: Tracking Cash Loan to Friend
```typescript
// Friend isn't registered, just want to track the loan
POST /api/loans
{
  "amount": 50,
  "currency": "USD",
  "description": "Lunch money for Mike",
  "direction": "lent",
  "isPersonal": true,
  "counterparty": { "name": "Mike" } // Optional, just for notes
}
// Result: Loan created, status=active, loanStatus=accepted, no notifications
```

### Scenario 2: Formal Loan with Registered User
```typescript
// Friend is registered, want them to approve and track together
POST /api/loans
{
  "amount": 1000,
  "currency": "USD",
  "description": "Short-term loan",
  "direction": "lent",
  "isPersonal": false,
  "counterparty": {
    "name": "Sarah",
    "email": "sarah@example.com"
  },
  "dueDate": "2025-12-31"
}
// Result: Loan created, status=active, loanStatus=pending
// Sarah receives notification to approve
```

### Scenario 3: Converting Between Types
Not supported directly - user should:
1. Close old loan
2. Create new loan with desired type

## Future Enhancements

- [ ] Bulk import personal loans from CSV
- [ ] Convert personal to collaborative (send invite)
- [ ] Templates for recurring personal loans
- [ ] Personal loan categories/tagging
- [ ] Analytics: personal vs collaborative breakdown
- [ ] Export personal loans for tax purposes

---

**Status:** ✅ Implemented and Ready
**Version:** 1.0
**Last Updated:** December 2024
