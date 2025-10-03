import mongoose, { Schema, model, Document, Model } from 'mongoose';

export interface NotificationDocument extends Document {
  userId: string;
  type: 'loan_invite' | 'payment_added' | 'loan_closed' | 'approval_request' | 'comment_added';
  message: string;
  relatedId?: string;
  relatedType?: 'loan' | 'entry';
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['loan_invite', 'payment_added', 'loan_closed', 'approval_request', 'comment_added'],
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    relatedId: {
      type: String,
    },
    relatedType: {
      type: String,
      enum: ['loan', 'entry'],
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
);

// Indexes
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

// Auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const NotificationModel = 
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  model<NotificationDocument>('Notification', NotificationSchema);
