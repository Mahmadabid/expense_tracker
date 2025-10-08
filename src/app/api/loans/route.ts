import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { LoanModel, UserModel, NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, errorResponse } from '@/lib/utils/apiResponse';

// GET /api/loans - list loans for user (owned or collaborator)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decoded = await verifyIdToken(token);
    if (!decoded) return unauthorizedResponse('Invalid token');

    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const direction = searchParams.get('direction');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const base: any = { 
      $or: [ 
        { userId: decoded.uid }, 
        { 'collaborators.userId': decoded.uid },
        { counterpartyUserId: decoded.uid }  // Allow counterparty to see their loans
      ] 
    };
    if (status) base.status = status;
    if (direction) base.direction = direction;

    // Optimized: Select only necessary fields, exclude full collaborators array
    // Use projection to fetch only user's relevant collaborator data
    const loans = await LoanModel.find(base)
      .select('amount remainingAmount description direction status date dueDate currency counterpartyUserId loanStatus createdBy lastModifiedBy version tags')
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    return successResponse(loans);
  } catch (err) {
    console.error('Loans list error:', err);
    return serverErrorResponse();
  }
}

// POST /api/loans - create a loan
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return unauthorizedResponse('No token provided');

    const decoded = await verifyIdToken(token);
    if (!decoded) return unauthorizedResponse('Invalid token');

    const body = await request.json();
    const { amount, currency, description, direction, counterparty, dueDate, tags } = body;

    // Basic validation
    if (!amount || amount <= 0) return errorResponse('Amount must be positive');
    if (!currency) return errorResponse('Currency is required');
    if (!direction || !['lent','borrowed'].includes(direction)) return errorResponse('Direction must be lent or borrowed');
    if (!counterparty || !counterparty.name) return errorResponse('Counterparty name is required');

    await connectDB();
    const userId = decoded.uid;

    console.log('[LOAN API] Creating loan with amount:', amount);

    // Look up counterparty user by email if provided
    let counterpartyUserId = undefined;
    if (counterparty.email) {
      const counterpartyUser = await UserModel.findOne({ 
        email: counterparty.email.toLowerCase().trim() 
      });
      if (counterpartyUser) {
        counterpartyUserId = counterpartyUser.firebaseUid;
        console.log('[LOAN API] Found counterparty user:', counterpartyUserId);
      } else {
        console.log('[LOAN API] Counterparty email not found in system:', counterparty.email);
      }
    }

    // Build sensitive bundle and encrypt here to avoid dependency on middleware timing
    const { encryptObject } = await import('@/lib/utils/encryption');
    const sensitivePayload = {
      amount,
      originalAmount: amount,
      remainingAmount: amount,
      description: description || '',
      counterparty: {
        userId: counterpartyUserId || counterparty.userId || undefined,
        name: counterparty.name,
        email: counterparty.email || undefined,
        phone: counterparty.phone || undefined,
      },
      payments: [],
      comments: [],
      category: body.category || '',
      tags: tags || [],
    };
    const encryptedData = encryptObject(sensitivePayload);

    // Get creator's user info for audit trail
    const creator = await UserModel.findByFirebaseUid(userId);
    const creatorName = creator?.displayName || 'Unknown User';

    const loan = await LoanModel.create({
      userId,
      type: 'loan',
      encryptedData,
      currency,
      date: new Date(),
      status: 'active',
      loanStatus: counterpartyUserId ? 'pending' : 'accepted', // If counterparty is in system, require approval
      // store empty arrays for tags at schema level (tags inside encrypted)
      tags: [],
      version: 1,
      createdBy: userId,
      lastModifiedBy: userId,
      direction,
      counterpartyUserId, // Store at top level for querying
      collaborators: [],
      pendingApprovals: [],
      auditTrail: [],
      requiresMutualApproval: true,
      ...(body.category ? { category: undefined } : {}),
      ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
    });

    // Add initial audit entry
    loan.addAuditEntry('created', userId, creatorName, {
      amount,
      currency,
      direction,
      counterparty: counterparty.name,
      description: description || '',
    });

    await loan.save();

    console.log('[LOAN API] Loan created successfully, has encryptedData:', !!(loan as any).encryptedData);

    // If counterparty is a registered user, send notification
    if (counterpartyUserId) {
      const notificationMessage = direction === 'lent'
        ? `${creatorName} has recorded lending you ${currency} ${amount}`
        : `${creatorName} has recorded borrowing ${currency} ${amount} from you`;

      await NotificationModel.create({
        userId: counterpartyUserId,
        type: 'loan_request',
        title: 'New Loan Request',
        message: notificationMessage,
        relatedId: String(loan._id),
        relatedModel: 'Loan',
        actionUrl: `/loans/${String(loan._id)}`,
        priority: 'high',
        metadata: {
          loanId: String(loan._id),
          creatorId: userId,
          creatorName,
          amount,
          currency,
          direction: direction === 'lent' ? 'borrowed' : 'lent', // Flip for counterparty perspective
        },
      });

      console.log('[LOAN API] Notification sent to counterparty:', counterpartyUserId);
    }

    return successResponse(loan, 'Loan created successfully', 201);
  } catch (error: any) {
    console.error('Loan creation error:', error);
    return serverErrorResponse(error?.message || 'Failed to create loan');
  }
}
