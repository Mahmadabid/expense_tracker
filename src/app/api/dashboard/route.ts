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

    // Optimized: Use MongoDB aggregation to calculate totals directly in database
    const [entryStats, loanStats, entries, loans] = await Promise.all([
      // Calculate income/expense totals in DB
      EntryModel.aggregate([
        { $match: { userId, status: 'active' } },
        { $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }}
      ]),
      // Calculate loan totals in DB
      LoanModel.aggregate([
        { $match: { 
          $or: [{ userId }, { 'collaborators.userId': userId }], 
          status: 'active' 
        }},
        { $group: {
          _id: '$direction',
          total: { $sum: '$remainingAmount' }
        }}
      ]),
      // Fetch only necessary fields for entries
      EntryModel.find({ userId, status: 'active' })
        .select('type amount date category description')
        .sort({ date: -1 })
        .lean(),
      // Fetch only necessary fields for loans (no collaborators array needed for totals)
      LoanModel.find({ 
        $or: [{ userId }, { 'collaborators.userId': userId }], 
        status: 'active' 
      })
        .select('direction remainingAmount amount date description counterpartyUserId loanStatus')
        .sort({ date: -1 })
        .lean(),
    ]);

    // Extract totals from aggregation results
    const totalIncome = entryStats.find(s => s._id === 'income')?.total || 0;
    const totalExpense = entryStats.find(s => s._id === 'expense')?.total || 0;
    const totalLoaned = loanStats.find(s => s._id === 'lent')?.total || 0;
    const totalBorrowed = loanStats.find(s => s._id === 'borrowed')?.total || 0;

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
