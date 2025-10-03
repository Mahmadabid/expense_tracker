import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse } from '@/lib/utils/apiResponse';

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// POST /api/notifications/mark-all-read
export async function POST(request: NextRequest) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    await connectDB();

    await NotificationModel.updateMany(
      { userId: a.uid, read: false },
      { $set: { read: true } }
    );

    return successResponse({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return serverErrorResponse(error?.message || 'Failed to mark notifications as read');
  }
}
