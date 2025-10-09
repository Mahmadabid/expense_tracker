import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel, NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, errorResponse } from '@/lib/utils/apiResponse';

// POST /api/loans/[id]/reject - Reject a loan request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decoded = await verifyIdToken(token);
    if (!decoded) return unauthorizedResponse('Invalid token');

    const userId = decoded.uid;
    
    // Handle empty body gracefully
    let reason = undefined;
    try {
      const body = await request.json();
      reason = body?.reason;
    } catch (e) {
      // No body provided, that's okay
    }

    await connectDB();
    const { id } = await params;

    // Optimized: Query with counterparty filter directly
    const loan = await LoanModel.findOne({ 
      _id: id, 
      counterpartyUserId: userId 
    }).select('userId counterpartyUserId loanStatus version lastModifiedBy');
    
    if (!loan) {
      return errorResponse('Loan not found or you are not the counterparty', 404);
    }

    // Get user info for audit trail - only fetch displayName
    const user = await UserModel.findOne({ firebaseUid: userId }).select('displayName').lean();
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Check if user is the counterparty
    if (loan.counterpartyUserId !== userId) {
      return errorResponse('Only the counterparty can reject this loan', 403);
    }

    // Check if loan is in pending status
    if (loan.loanStatus !== 'pending') {
      return errorResponse(`Loan is already ${loan.loanStatus}`, 400);
    }

    // Reject the loan
    loan.rejectLoan(userId, user.displayName, reason);
    await loan.save();

    // Send notification to loan creator
    await NotificationModel.create({
      userId: loan.userId,
      type: 'loan_rejected',
      title: 'Loan Rejected',
      message: `${user.displayName} has rejected your loan request${reason ? `: ${reason}` : ''}`,
      relatedId: String(loan._id),
      relatedModel: 'Loan',
      actionUrl: `/loans/${String(loan._id)}`,
      priority: 'high',
    });

    return successResponse(loan, 'Loan rejected successfully');
  } catch (error: any) {
    console.error('Loan rejection error:', error);
    return serverErrorResponse(error?.message || 'Failed to reject loan');
  }
}
