import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel, NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse, errorResponse } from '@/lib/utils/apiResponse';
import { decryptObject } from '@/lib/utils/encryption';

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// POST /api/loans/:id/pending-changes/:changeId/reject - Reject a pending change
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; changeId: string }> }
) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    const params = await context.params;
    
    // Handle empty body gracefully
    let reason = undefined;
    try {
      const body = await request.json();
      reason = body?.reason;
    } catch (e) {
      // No body provided, that's okay
    }

    await connectDB();

    const loan = await LoanModel.findById(params.id);
    if (!loan) return notFoundResponse('Loan not found');

    // Only counterparty or owner can reject changes
    const loanAny: any = loan;
    const decrypted = decryptObject<any>(loanAny.encryptedData);
    if (!decrypted) return serverErrorResponse('Failed to decrypt loan data');

    const isOwner = loan.userId === a.uid;
    const isCounterparty = decrypted.counterparty?.userId === a.uid;
    
    if (!isOwner && !isCounterparty) {
      return unauthorizedResponse('Only the loan parties can reject changes');
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

    // Can't reject your own change (though they can cancel it separately)
    if (change.requestedBy === a.uid) {
      return errorResponse('You cannot reject your own change');
    }

    // Get rejector info
    const user = await UserModel.findOne({ firebaseUid: a.uid }).select('displayName').lean();
    const userName = user?.displayName || 'User';

    // Mark change as rejected
    change.status = 'rejected';
    change.reviewedAt = new Date();
    change.reviewedBy = a.uid;
    change.reviewerName = userName;
    change.reason = reason;

    // Add audit entry
    loan.addAuditEntry(
      `change_rejected`,
      a.uid,
      userName,
      { changeType: change.type, changeId: params.changeId, reason }
    );

    loan.lastModifiedBy = a.uid;
    await loan.save();

    // Send notification to the requester
    await NotificationModel.create({
      userId: change.requestedBy,
      type: 'loan_rejected',
      title: 'Change Rejected',
      message: `${userName} rejected your ${change.type} request${reason ? `: ${reason}` : ''}`,
      relatedId: String(loan._id),
      relatedModel: 'Loan',
      actionUrl: `/loans/${String(loan._id)}`,
      priority: 'normal',
    });

    return successResponse({ loan, change }, 'Change rejected');
  } catch (error) {
    console.error('Reject change error:', error);
    return serverErrorResponse();
  }
}
