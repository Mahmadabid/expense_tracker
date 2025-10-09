import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel, NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, errorResponse } from '@/lib/utils/apiResponse';

// POST /api/loans/[id]/approve - Accept a loan request
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
    await connectDB();
    
    const { id } = await params;

    // Optimized: Query with counterparty filter directly to avoid unauthorized access
    const loan = await LoanModel.findOne({ 
      _id: id, 
      counterpartyUserId: userId 
    }).select('userId counterpartyUserId loanStatus collaborators version lastModifiedBy');
    
    if (!loan) {
      return errorResponse('Loan not found or you are not the counterparty', 404);
    }

    // Get user info for audit trail - only fetch displayName field
    const user = await UserModel.findOne({ firebaseUid: userId }).select('displayName').lean();
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Check if loan is in pending status
    if (loan.loanStatus !== 'pending') {
      return errorResponse(`Loan is already ${loan.loanStatus}`, 400);
    }

    // Accept the loan
    loan.acceptLoan(userId, user.displayName);
    
    // Automatically add counterparty as collaborator with appropriate role
    const counterpartyRole = loan.direction === 'lent' ? 'viewer' : 'collaborator';
    
    const existingCollaborator = loan.collaborators.find(
      (c: any) => c.userId === userId
    );
    
    if (!existingCollaborator) {
      loan.collaborators.push({
        userId,
        role: counterpartyRole,
        status: 'accepted',
        invitedAt: new Date(),
        respondedAt: new Date(),
        invitedBy: loan.userId,
      });
    }

    await loan.save();

    // Send notification to loan creator
    await NotificationModel.create({
      userId: loan.userId,
      type: 'loan_approved',
      title: 'Loan Approved',
      message: `${user.displayName} has accepted your loan request for ${loan.currency} ${loan.amount}`,
      relatedId: String(loan._id),
      relatedModel: 'Loan',
      actionUrl: `/loans/${String(loan._id)}`,
      priority: 'high',
    });

    return successResponse(loan, 'Loan approved successfully');
  } catch (error: any) {
    console.error('Loan approval error:', error);
    return serverErrorResponse(error?.message || 'Failed to approve loan');
  }
}
