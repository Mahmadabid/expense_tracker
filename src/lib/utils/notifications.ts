import { connectDB } from '@/lib/db/mongodb';
import { NotificationModel } from '@/lib/models';

export async function createNotification({
  userId,
  type,
  message,
  relatedId,
  relatedType,
}: {
  userId: string;
  type: 'loan_invite' | 'payment_added' | 'loan_closed' | 'approval_request' | 'comment_added';
  message: string;
  relatedId?: string;
  relatedType?: 'loan' | 'entry';
}) {
  try {
    await connectDB();
    await NotificationModel.create({
      userId,
      type,
      message,
      relatedId,
      relatedType,
      read: false,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}
