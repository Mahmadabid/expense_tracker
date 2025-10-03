# Expense Tracker - Recent Updates

## Summary of Changes

### 1. ✅ Interest Rate Removed
- **Removed from**: Types, Models, API endpoints, and UI
- Loans no longer have interest rate tracking
- Simplified loan creation and management

### 2. ✅ Description Made Optional
- Entry and Loan descriptions are now optional fields
- Forms updated to reflect optional status
- API validation updated to not require description

### 3. ✅ Radio Buttons for Loan Direction
- Changed from dropdown to radio buttons
- Two options:
  - **I Lent** (They owe me)
  - **I Borrowed** (I owe them)
- Improved UX with clearer selection interface

### 4. ✅ User Communication System
A complete commenting/messaging system has been implemented for loans:

#### Comment Features:
- **Add Comments**: Any authorized user (loan owner, counterparty, or collaborators) can comment
- **View Comments**: All participants can view the conversation history
- **Edit Comments**: Users can edit their own comments
- **Delete Comments**: Users can delete their own comments, loan owners can delete any comment
- **User Attribution**: Comments show username and timestamp
- **Character Limit**: 1000 characters per comment

#### API Endpoints Created:

**Comments Management:**
```
POST   /api/loans/:id/comments              - Add a comment
GET    /api/loans/:id/comments              - List all comments
GET    /api/loans/:id/comments/:commentId   - Get specific comment
PUT    /api/loans/:id/comments/:commentId   - Update comment
DELETE /api/loans/:id/comments/:commentId   - Delete comment
```

**Payments Management:**
```
POST   /api/loans/:id/payments              - Add payment
GET    /api/loans/:id/payments              - List all payments
GET    /api/loans/:id/payments/:paymentId   - Get specific payment
PUT    /api/loans/:id/payments/:paymentId   - Update payment
DELETE /api/loans/:id/payments/:paymentId   - Delete payment
```

## How Users Communicate

### Direct Communication
Users can communicate through the commenting system on each loan:

1. **View Loan Details**: Access any loan where you're involved
2. **Add Comments**: Post messages visible to all participants
3. **Real-time Updates**: Comments include timestamps and user names
4. **Thread History**: All comments are preserved chronologically

### Who Can Comment?
- **Loan Owner**: The person who created the loan
- **Counterparty**: The registered user on the other side of the loan
- **Collaborators**: Any accepted collaborators on the loan

### Use Cases for Comments:
- **Payment Coordination**: "I'll pay $100 next week"
- **Reminders**: "Just a reminder, payment is due tomorrow"
- **Confirmations**: "Payment received, thanks!"
- **Questions**: "Can we extend the due date?"
- **Updates**: "Changing the payment schedule"

## Example API Usage

### Adding a Comment:
```bash
POST /api/loans/LOAN_ID/comments
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "message": "I'll make a payment of $200 tomorrow"
}
```

### Getting Comments:
```bash
GET /api/loans/LOAN_ID/comments
Authorization: Bearer TOKEN
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "comment_id",
      "userId": "user_id",
      "userName": "John Doe",
      "message": "I'll make a payment of $200 tomorrow",
      "createdAt": "2025-10-03T10:30:00Z"
    }
  ]
}
```

### Adding a Payment:
```bash
POST /api/loans/LOAN_ID/payments
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "amount": 200,
  "date": "2025-10-03",
  "method": "bank transfer",
  "notes": "Partial payment as discussed"
}
```

## Interconnectivity Features

### Automatic Loan Visibility
When you create a loan with a registered user (by email):
1. The system automatically links the counterparty
2. Both users can see the loan in their dashboard
3. Both can view payment history
4. Both can add payments and comments

### Permissions:
- **Loan Owner**: Full control (edit, delete, add payments/comments)
- **Counterparty**: View loan, add payments, add comments
- **Collaborators**: Based on role (owner/collaborator/viewer)

## Next Steps for Frontend Integration

To complete the user communication experience, you should:

1. **Create a Loan Detail Page** showing:
   - Loan information
   - Payment history
   - Comments section
   - Add payment form
   - Add comment form

2. **Add Real-time Updates** (optional):
   - Use polling or WebSockets for live comment updates
   - Show notifications for new comments

3. **Notification System** (future enhancement):
   - Email notifications for new comments
   - In-app notifications for payment confirmations

## Technical Notes

- All comments and payments are stored in the loan document
- Comments include automatic user name resolution
- Audit logging captures all actions
- Proper authorization checks on all endpoints
- TypeScript types updated for full type safety
