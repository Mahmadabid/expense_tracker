# API Security Implementation

## Overview
All API routes are now secured with Firebase JWT authentication. This ensures that only authenticated users can access the API endpoints and users can only access their own data.

## Architecture

### Authentication Helper (`src/lib/auth.ts`)
The `withAuth` wrapper function provides JWT token verification for all API routes:

```typescript
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  // req.user contains the decoded token with uid, email, etc.
  // Your route logic here
});
```

#### Key Features:
- **Token Verification**: Validates Firebase ID tokens using Firebase Auth REST API
- **Simple & Reliable**: Uses Firebase's `accounts:lookup` endpoint instead of manual JWT parsing
- **User Attachment**: Attaches decoded user info to the request object
- **Error Handling**: Returns 401 Unauthorized for invalid/missing tokens

### Client-Side Token Management

#### API Client (`src/lib/apiClient.ts`)
All API calls automatically include the Firebase auth token:

```typescript
async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
```

#### Hooks (`useExpenses`, `useLoans`, `useUsers`)
Each hook fetches the auth token before making API requests:

```typescript
const user = auth.currentUser;
const token = await user.getIdToken();
const response = await fetch(url, {
  headers: { "Authorization": `Bearer ${token}` }
});
```

## Secured Endpoints

### Expenses API (`/api/expenses`)
- **GET**: Users can only fetch their own expenses
- **POST**: Users can only create expenses for themselves
- **Authorization**: Verifies `userId` matches `req.user.uid`

### Expense Management (`/api/expenses/[id]`)
- **DELETE**: Users can only delete their own expenses
- **Authorization**: Verifies expense belongs to authenticated user

### Loans API (`/api/loans`)
- **GET**: Users can only fetch loans they're involved in
- **POST**: Users can only create loans where they're the lender or borrower
- **Authorization**: Verifies user is part of the loan transaction

### Loan Management (`/api/loans/[id]`)
- **PATCH**: Users can only settle loans they're involved in
- **DELETE**: Users can only delete loans they're involved in
- **Authorization**: Verifies user is the lender or borrower

### Users API (`/api/users`)
- **GET**: Returns all users (for loan counterparty selection) or specific user profile
- **POST**: Users can only update their own profile
- **Authorization**: Verifies `uid` matches `req.user.uid`

## Security Measures

1. **Token Validation**: Every request validates the JWT token signature and claims
2. **User Authorization**: Routes verify the authenticated user has permission for the requested action
3. **Data Isolation**: Users can only access/modify their own data
4. **Forbidden Access**: Returns 403 Forbidden when users try to access other users' data
5. **Token Refresh**: Firebase automatically refreshes tokens, client uses `getIdToken()` to get current token

## External User Support

The loan system now supports tracking loans with people who aren't registered:
- Use `"EXTERNAL"` as the ID for unregistered parties
- Store `externalParty: { name: string, email?: string }` in the loan document
- Authorization check allows `"EXTERNAL"` for counterparty IDs

## Testing Authentication

### Get a Test Token
```javascript
// In browser console after signing in
const user = auth.currentUser;
const token = await user.getIdToken();
console.log(token);
```

### Test API with Postman/curl
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/expenses?userId=YOUR_UID
```

### Expected Responses

**Valid Token**:
```json
{ "data": [...] }
```

**No Token**:
```json
{ "error": "Authorization token required" }
```

**Invalid Token**:
```json
{ 
  "error": "Unauthorized",
  "message": "Token verification failed: ..."
}
```

**Forbidden Access**:
```json
{ "error": "Forbidden" }
```

## Implementation Checklist

- ✅ Created `withAuth` wrapper function with JWT verification
- ✅ Updated API client to include auth headers
- ✅ Updated all hooks to fetch and include tokens
- ✅ Secured expenses API endpoints
- ✅ Secured loans API endpoints
- ✅ Secured loan settlement endpoint
- ✅ Secured users API endpoints
- ✅ Added authorization checks (users can only access their own data)
- ✅ Added support for external (unregistered) users in loans
- ✅ All endpoints return proper error codes (401, 403)

## Notes

- Firebase tokens expire after 1 hour; `getIdToken()` automatically refreshes them
- No need for Firebase Admin SDK - uses public key verification
- Uses Web Crypto API (available in Edge runtime and Node.js 15+)
- All sensitive data remains encrypted in MongoDB with AES-256-GCM
