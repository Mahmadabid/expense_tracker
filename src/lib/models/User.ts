import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { User } from '@/types';

interface UserDocument extends Omit<User, '_id'>, Document {
  lastActive?: Date;
}

interface UserModel extends Model<UserDocument> {
  findByFirebaseUid(firebaseUid: string): Promise<UserDocument | null>;
  findByGuestToken(guestToken: string): Promise<UserDocument | null>;
}

const NotificationPreferencesSchema = new Schema({
  email: {
    invitations: { type: Boolean, default: true },
    approvals: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
  },
  inApp: {
    invitations: { type: Boolean, default: true },
    approvals: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    payments: { type: Boolean, default: true },
  },
});

const UserSchema = new Schema<UserDocument>(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format',
      },
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    photoURL: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid URL format',
      },
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    guestToken: {
      type: String,
      sparse: true,
      index: true,
    },
    preferences: {
      darkMode: { type: Boolean, default: false },
      currency: { 
        type: String, 
        enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'], 
        default: 'USD' 
      },
      timezone: { type: String, default: 'UTC' },
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ firebaseUid: 1 });
UserSchema.index({ guestToken: 1 }, { sparse: true });
UserSchema.index({ lastActive: 1 });

// Pre-save middleware
UserSchema.pre('save', function(next) {
  if (this.lastActive !== undefined) {
    this.lastActive = new Date();
  }
  next();
});

// Methods
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  userObject._id = userObject._id.toString();
  return userObject;
};

// Static methods
UserSchema.statics.findByFirebaseUid = function(firebaseUid: string) {
  return this.findOne({ firebaseUid });
};

UserSchema.statics.findByGuestToken = function(guestToken: string) {
  return this.findOne({ guestToken });
};

// Export model
export const UserModel = (mongoose.models.User || model<UserDocument, UserModel>('User', UserSchema)) as UserModel;
export type { UserDocument };