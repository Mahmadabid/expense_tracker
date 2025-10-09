import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { EntryModel, LoanModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils/apiResponse';

// Optimized: Single endpoint to fetch all dashboard data
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken) {
      return unauthorizedResponse('Invalid token');
    }

    await connectDB();
    const userId = decodedToken.uid;

    // Optimized: Use MongoDB aggregation for entries (non-encrypted data)
    const [entryStats, entries, loans] = await Promise.all([
      // Calculate income/expense totals in DB
      EntryModel.aggregate([
        { $match: { userId, status: 'active' } },
        { $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }}
      ]),
      // Fetch only necessary fields for entries
      EntryModel.find({ userId, status: 'active' })
        .select('type amount date category description')
        .sort({ date: -1 })
        .lean(),
      // Fetch loans - need to decrypt so don't use .lean()
      // Can't use aggregation because remainingAmount is encrypted
      // Only show loans where user is owner, or where user is counterparty/collaborator AND requiresCollaboration is true
      // Exclude rejected loans from the dashboard
      LoanModel.find({ 
        $or: [
          { userId }, // User is the owner - show all their loans
          { 'collaborators.userId': userId, requiresCollaboration: true }, // User is collaborator and collaboration enabled
          { counterpartyUserId: userId, requiresCollaboration: true } // User is counterparty and collaboration enabled
        ], 
        status: 'active',
        loanStatus: { $ne: 'rejected' } // Exclude rejected loans
      })
        .select('encryptedData currency date counterpartyUserId loanStatus direction status isPersonal requiresCollaboration dueDate version createdBy lastModifiedBy')
        .sort({ date: -1 }),
    ]);

    // Extract entry totals from aggregation
    const totalIncome = entryStats.find(s => s._id === 'income')?.total || 0;
    const totalExpense = entryStats.find(s => s._id === 'expense')?.total || 0;
    
    // Calculate loan totals after decryption (middleware will decrypt)
    let totalLoaned = 0;
    let totalBorrowed = 0;
    loans.forEach((loan: any) => {
      const remaining = loan.remainingAmount || 0;
      if (loan.direction === 'lent') {
        totalLoaned += remaining;
      } else if (loan.direction === 'borrowed') {
        totalBorrowed += remaining;
      }
    });

    const balance = totalIncome - totalExpense;
    const netLoan = totalLoaned - totalBorrowed; // positive means others owe user
    const netWorth = balance + netLoan; // simplistic net worth metric

    return successResponse({
      summary: {
        totalIncome,
        totalExpense,
        balance,
        totalLoaned,
        totalBorrowed,
        netLoan,
        netWorth,
        totalsScope: 'all-active',
      },
      entries, // full arrays
      loans,
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return serverErrorResponse();
  }
}
