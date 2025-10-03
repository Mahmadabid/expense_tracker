import { NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { connectDB } from '@/lib/db/mongodb';
import { NotificationModel } from '@/lib/models';
import { successResponse, unauthorizedResponse, serverErrorResponse, notFoundResponse } from '@/lib/utils/apiResponse';

async function auth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return { error: unauthorizedResponse('No token provided') };
  const decoded = await verifyIdToken(token);
  if (!decoded) return { error: unauthorizedResponse('Invalid token') };
  return { uid: decoded.uid };
}

// PUT /api/notifications/:id - Mark as read
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    await connectDB();

    const notification = await NotificationModel.findOne({ _id: params.id, userId: a.uid });
    if (!notification) return notFoundResponse('Notification not found');

    const body = await request.json();
    if (body.read !== undefined) notification.read = body.read;
    
    await notification.save();

    return successResponse(notification);
  } catch (error: any) {
    console.error('Notification update error:', error);
    return serverErrorResponse(error?.message || 'Failed to update notification');
  }
}

// DELETE /api/notifications/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const a = await auth(request); if ('error' in a) return a.error;
    await connectDB();

    const result = await NotificationModel.deleteOne({ _id: params.id, userId: a.uid });
    if (result.deletedCount === 0) return notFoundResponse('Notification not found');

    return successResponse({ message: 'Notification deleted' });
  } catch (error: any) {
    console.error('Notification delete error:', error);
    return serverErrorResponse(error?.message || 'Failed to delete notification');
  }
}
