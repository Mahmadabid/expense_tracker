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

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    await connectDB();

    const notifications = await NotificationModel.find({ userId: a.uid })
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse(notifications);
  } catch (error: any) {
    console.error('Notifications fetch error:', error);
    return serverErrorResponse(error?.message || 'Failed to fetch notifications');
  }
}
