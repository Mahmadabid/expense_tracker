# How to Add Other People to Loans

## Overview

The expense tracker supports **collaborative loan management**, allowing you to add other people to view, track, and manage loans together. This is useful for:

- **Shared debts** - Multiple people lending to or borrowing from someone
- **Business loans** - Partners tracking company loans
- **Family finances** - Family members managing loans together
- **Transparency** - Keeping counterparty informed about loan status

---

## Collaborator Roles

### 1. **Owner** 
- Creator of the loan
- Full control over the loan
- Can add/remove collaborators
- Can delete the loan
- Can modify all details

### 2. **Collaborator**
- Can add payments
- Can add comments
- Can view all details
- Cannot delete the loan
- Modifications require owner approval

### 3. **Viewer**
- Read-only access
- Can view loan details
- Can view payments and comments
- Cannot make any changes

---

## How to Add Collaborators

### Method 1: Via Counterparty Email

When creating a loan, if the **counterparty has a registered account** with the app:

1. **Create the loan** with their email in the "Email (Optional)" field
2. The system automatically links the loan to their account
3. They can see the loan in their dashboard
4. They can add payments and comments

### Method 2: Via Share Token (Future Feature)

For people **without an account**:

1. The loan generates a unique **share token**
2. Share the token/link with them
3. They can view the loan without creating an account
4. Read-only access until they create an account

### Method 3: Manual Collaborator Addition (To Be Implemented)

To manually add collaborators to existing loans:

```typescript
// API Endpoint (to be created)
POST /api/loans/{loanId}/collaborators

// Request Body
{
  "email": "user@example.com",  // or userId
  "role": "collaborator"         // owner, collaborator, or viewer
}
```

---

## Current Implementation Status

### ✅ **Currently Available:**

1. **Counterparty Auto-Link**
   - When you add a counterparty email during loan creation
   - If they have an account, the loan appears in their dashboard
   - They can track the loan from their side

2. **Comments System**
   - All parties can leave comments on the loan
   - API endpoint: `POST /api/loans/{loanId}/comments`
   - Comments are visible to everyone with access

3. **Payment Tracking**
   - Counterparty can add payments if they're a registered user
   - API endpoint: `POST /api/loans/{loanId}/payments`

4. **Multi-User Access**
   - Loans query includes collaborator access:
   ```typescript
   {
     $or: [ 
       { userId: currentUser },           // Owner
       { 'collaborators.userId': currentUser }, // Collaborator
       { 'counterparty.userId': currentUser }   // Counterparty
     ] 
   }
   ```

### 🚧 **To Be Implemented:**

1. **Collaborator Management UI**
   - Add "Manage Collaborators" button in loan card
   - Modal to invite collaborators by email
   - Show list of current collaborators
   - Remove collaborators (owner only)

2. **Approval Workflow**
   - Collaborators can request changes
   - Owner approves/rejects modifications
   - Pending approval system

3. **Notifications**
   - Notify when added as collaborator
   - Notify on payment additions
   - Notify on comments

---

## Implementing Collaborator UI (Code Guide)

### Step 1: Create Collaborator API Endpoint

Create: `src/app/api/loans/[id]/collaborators/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, errorResponse } from '@/lib/utils/apiResponse';

// POST /api/loans/{id}/collaborators - Add collaborator
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decoded = await verifyIdToken(token);
    if (!decoded) return unauthorizedResponse('Invalid token');

    await connectDB();
    const { email, role } = await request.json();

    // Validate role
    if (!['collaborator', 'viewer'].includes(role)) {
      return errorResponse('Invalid role. Use collaborator or viewer');
    }

    // Find the user to add
    const userToAdd = await UserModel.findOne({ email });
    if (!userToAdd) {
      return errorResponse('User not found with this email');
    }

    // Find the loan
    const loan = await LoanModel.findById(params.id);
    if (!loan) {
      return errorResponse('Loan not found');
    }

    // Check if requester is owner
    if (loan.userId !== decoded.uid) {
      return unauthorizedResponse('Only loan owner can add collaborators');
    }

    // Check if already a collaborator
    const existing = loan.collaborators?.find(
      (c: any) => c.userId === userToAdd._id.toString()
    );
    if (existing) {
      return errorResponse('User is already a collaborator');
    }

    // Add collaborator
    if (!loan.collaborators) loan.collaborators = [];
    loan.collaborators.push({
      userId: userToAdd._id.toString(),
      role: role,
      status: 'pending',
      invitedAt: new Date(),
      invitedBy: decoded.uid
    });

    await loan.save();

    // TODO: Send notification to the invited user

    return successResponse({ 
      message: 'Collaborator invited successfully',
      collaborator: {
        userId: userToAdd._id,
        email: userToAdd.email,
        role: role,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Add collaborator error:', error);
    return errorResponse('Failed to add collaborator');
  }
}

// GET /api/loans/{id}/collaborators - List collaborators
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decoded = await verifyIdToken(token);
    if (!decoded) return unauthorizedResponse('Invalid token');

    await connectDB();
    const loan = await LoanModel.findById(params.id);
    
    if (!loan) {
      return errorResponse('Loan not found');
    }

    // Check access
    const hasAccess = 
      loan.userId === decoded.uid ||
      loan.collaborators?.some((c: any) => c.userId === decoded.uid) ||
      loan.counterparty?.userId === decoded.uid;

    if (!hasAccess) {
      return unauthorizedResponse('Access denied');
    }

    return successResponse(loan.collaborators || []);
  } catch (error) {
    console.error('Get collaborators error:', error);
    return errorResponse('Failed to get collaborators');
  }
}
```

### Step 2: Add UI Component in LoanCard

Add this to `LoanCard` component in `MainContent.tsx`:

```typescript
// Inside LoanCard component, add state
const [showCollaborators, setShowCollaborators] = useState(false);
const [collaboratorEmail, setCollaboratorEmail] = useState('');
const [collaboratorRole, setCollaboratorRole] = useState('collaborator');

// Add function to invite collaborator
const handleInviteCollaborator = async () => {
  if (!collaboratorEmail.trim()) {
    alert('Please enter an email');
    return;
  }

  setProcessing(true);
  try {
    const authHeaders = await getAuthHeader();
    const res = await fetch(`/api/loans/${loan._id}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        email: collaboratorEmail,
        role: collaboratorRole
      }),
    });
    
    if (res.ok) {
      alert('Collaborator invited successfully!');
      setCollaboratorEmail('');
      setShowCollaborators(false);
      onUpdate();
    } else {
      const data = await res.json();
      alert(data.message || 'Failed to invite collaborator');
    }
  } catch (err) {
    console.error(err);
    alert('Error occurred');
  } finally {
    setProcessing(false);
  }
};

// Add button in the loan card menu
<button
  onClick={() => { setShowCollaborators(true); setShowMenu(false); }}
  className="cursor-pointer w-full px-4 py-3 text-left text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2"
>
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
  Manage Collaborators
</button>

// Add modal for collaborators
{showCollaborators && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-lg shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Manage Collaborators
        </h4>
        <button
          onClick={() => setShowCollaborators(false)}
          className="cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={collaboratorEmail}
            onChange={(e) => setCollaboratorEmail(e.target.value)}
            placeholder="user@example.com"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Role
          </label>
          <select
            value={collaboratorRole}
            onChange={(e) => setCollaboratorRole(e.target.value)}
            className="cursor-pointer w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            <option value="collaborator">Collaborator (Can add payments)</option>
            <option value="viewer">Viewer (Read-only)</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setShowCollaborators(false)}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleInviteCollaborator}
            disabled={processing}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {processing ? 'Inviting...' : 'Invite'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Quick Start for Users

### For Now (Current Features):

1. **When creating a loan:**
   - Enter the counterparty's **email** if they have an account
   - They'll automatically see the loan in their dashboard
   - They can add payments and leave comments

2. **Use comments to communicate:**
   - Click on a loan → Add payment button → Add comments
   - Everyone with access can see and add comments

### Coming Soon:

- Full collaborator management UI
- Invite anyone by email with specific roles
- Approval workflows for modifications
- Real-time notifications

---

## Summary

**Current Way to Share Loans:**
✅ Add counterparty email when creating the loan → They get automatic access

**Future Enhancement:**
🚧 "Manage Collaborators" button → Invite anyone → Set their role → Track who has access

The infrastructure is ready - just needs the UI implementation!
