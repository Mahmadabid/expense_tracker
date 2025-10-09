import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel, NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse, errorResponse } from '@/lib/utils/apiResponse';
import { decryptObject, encryptObject } from '@/lib/utils/encryption';

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// POST /api/loans/:id/pending-changes/:changeId/approve - Approve a pending change
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; changeId: string }> }
) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Only counterparty or owner can approve changes
    const loanAny: any = loan;
    const decrypted = decryptObject<any>(loanAny.encryptedData);
    if (!decrypted) return serverErrorResponse('Failed to decrypt loan data');

    const isOwner = loan.userId === a.uid;
    const isCounterparty = decrypted.counterparty?.userId === a.uid;
    
    if (!isOwner && !isCounterparty) {
      return unauthorizedResponse('Only the loan parties can approve changes');
    }

    // Find the pending change
    if (!loanAny.pendingChanges) loanAny.pendingChanges = [];
    const changeIndex = loanAny.pendingChanges.findIndex(
      (c: any) => String(c._id) === params.changeId && c.status === 'pending'
    );

    if (changeIndex === -1) {
      return notFoundResponse('Pending change not found or already processed');
    }

    const change = loanAny.pendingChanges[changeIndex];

    // Can't approve your own change
    if (change.requestedBy === a.uid) {
      return errorResponse('You cannot approve your own change');
    }

    // Get approver info
    const user = await UserModel.findOne({ firebaseUid: a.uid }).select('displayName').lean();
    const userName = user?.displayName || 'User';

    // Apply the change based on type
    if (change.type === 'payment') {
      // Add the payment
      if (!decrypted.payments) decrypted.payments = [];
      const newPayment = {
        ...change.data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
      };
      decrypted.payments.push(newPayment);
      
      // Update remaining amount
      decrypted.remainingAmount = Math.max(0, decrypted.remainingAmount - change.data.amount);
      if (decrypted.remainingAmount === 0) {
        loan.status = 'paid';
      }
    } else if (change.type === 'loan_addition') {
      // Add loan addition
      if (!decrypted.loanAdditions) decrypted.loanAdditions = [];
      
      // Get user name for the addition record
      const addedByUser = await UserModel.findOne({ firebaseUid: change.requestedBy }).select('displayName').lean();
      const addedByName = addedByUser?.displayName || change.requestedByName || 'User';
      
      const newAddition = {
        ...change.data,
        _id: new mongoose.Types.ObjectId(),
        addedBy: change.requestedBy,
        addedByName,
        date: new Date(),
        createdAt: new Date(),
        version: 1,
      };
      decrypted.loanAdditions.push(newAddition);
      
      // Add a comment to track the approved addition
      if (!decrypted.comments) decrypted.comments = [];
      decrypted.comments.push({
        _id: new mongoose.Types.ObjectId(),
        userId: change.requestedBy,
        userName: addedByName,
        message: `Added +${loan.currency || 'PKR'} ${change.data.amount.toFixed(2)}${change.data.description ? ' (' + change.data.description + ')' : ''}`,
        createdAt: new Date(),
      });
      
      // Update amounts (preserve originalAmount as initial principal)
      const addAmount = change.data.amount;
      decrypted.amount = (decrypted.amount || 0) + addAmount;
      decrypted.remainingAmount = (decrypted.remainingAmount || 0) + addAmount;
      // Don't modify originalAmount - it should remain as the initial principal
    } else if (change.type === 'payment_deletion') {
      // Delete payment
      const paymentId = change.data.paymentId;
      const paymentIndex = decrypted.payments.findIndex((p: any) => String(p._id) === String(paymentId));
      if (paymentIndex !== -1) {
        const deletedPayment = decrypted.payments[paymentIndex];
        decrypted.remainingAmount += deletedPayment.amount;
        decrypted.payments.splice(paymentIndex, 1);
        if (loan.status === 'paid') {
          loan.status = 'active';
        }
      }
    } else if (change.type === 'addition_deletion') {
      // Delete loan addition
      const additionId = change.data.additionId;
      const additionIndex = decrypted.loanAdditions?.findIndex((a: any) => String(a._id) === String(additionId));
      if (additionIndex !== undefined && additionIndex !== -1) {
        const deletedAddition = decrypted.loanAdditions[additionIndex];
        decrypted.amount = (decrypted.amount || 0) - deletedAddition.amount;
        decrypted.remainingAmount = (decrypted.remainingAmount || 0) - deletedAddition.amount;
        // Don't modify originalAmount - it should remain as the initial principal
        decrypted.loanAdditions.splice(additionIndex, 1);
      }
    }

    // Mark change as approved
    change.status = 'approved';
    change.reviewedAt = new Date();
    change.reviewedBy = a.uid;
    change.reviewerName = userName;

    // Re-encrypt the data
    loanAny.encryptedData = encryptObject(decrypted);
    
    // Add audit entry
    loan.addAuditEntry(
      `change_approved`,
      a.uid,
      userName,
      { changeType: change.type, changeId: params.changeId }
    );

    loan.lastModifiedBy = a.uid;
    await loan.save();

    // Send notification to the requester
    await NotificationModel.create({
      userId: change.requestedBy,
      type: 'loan_approved',
      title: 'Change Approved',
      message: `${userName} approved your ${change.type} request`,
      relatedId: String(loan._id),
      relatedModel: 'Loan',
      actionUrl: `/loans/${String(loan._id)}`,
      priority: 'normal',
    });

    return successResponse({ loan, change }, 'Change approved successfully');
  } catch (error) {
    console.error('Approve change error:', error);
    return serverErrorResponse();
  }
}
