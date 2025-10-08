import mongoose, { Schema, model, Document, Model } from 'mongoose';

export interface NotificationDocument extends Document {
  userId: string;
  type: 'loan_invite' | 'payment_added' | 'loan_closed' | 'approval_request' | 'comment_added' | 'loan_request' | 'loan_approved' | 'loan_rejected' | 'loan_settled';
  title?: string;
  message: string;
  relatedId?: string;
  relatedType?: 'loan' | 'entry';
  relatedModel?: 'Loan' | 'Entry';
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high';
  metadata?: Record<string, any>;
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
      enum: ['loan_invite', 'payment_added', 'loan_closed', 'approval_request', 'comment_added', 'loan_request', 'loan_approved', 'loan_rejected', 'loan_settled'],
    },
    title: {
      type: String,
      maxlength: 200,
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
    relatedModel: {
      type: String,
      enum: ['Loan', 'Entry'],
    },
    actionUrl: {
      type: String,
      maxlength: 500,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    metadata: {
      type: Schema.Types.Mixed,
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

// Force model recreation in development to pick up schema changes
if (mongoose.models.Notification && process.env.NODE_ENV === 'development') {
  delete mongoose.models.Notification;
  // Clear from connection models as well
  const connectionModels = mongoose.connection.models as any;
  if (connectionModels.Notification) {
    delete connectionModels.Notification;
  }
}

export const NotificationModel = 
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  model<NotificationDocument>('Notification', NotificationSchema);
