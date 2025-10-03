import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { Entry, EntryType, EntryStatus, Currency } from '@/types';

interface EntryDocument extends Omit<Entry, '_id'>, Document {}

interface EntryModel extends Model<EntryDocument> {
  findByUserId(userId: string): Promise<EntryDocument[]>;
}

const EntrySchema = new Schema<EntryDocument>(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense', 'loan'],
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
      validate: {
        validator: function(v: number) {
          return Number.isFinite(v) && v >= 0;
        },
        message: 'Amount must be a valid positive number',
      },
    },
    currency: {
      type: String,
      required: true,
      enum: ['PKR', 'USD', 'EUR', 'GBP', 'KWD', 'JPY', 'CAD', 'AUD', 'SAR', 'AED'],
      default: 'PKR',
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'paid', 'cancelled'],
      default: 'active',
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 50,
    }],
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    createdBy: {
      type: String,
      required: true,
    },
    lastModifiedBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'entries',
  }
);

// Indexes
EntrySchema.index({ userId: 1, type: 1 });
EntrySchema.index({ userId: 1, date: -1 });
EntrySchema.index({ userId: 1, status: 1 });
EntrySchema.index({ userId: 1, category: 1 });
EntrySchema.index({ tags: 1 });
EntrySchema.index({ createdAt: -1 });

// Pre-save middleware
EntrySchema.pre('save', function(next) {
  if (this.isNew) {
    this.version = 1;
  } else if (this.isModified() && !this.isNew) {
    this.version = (this.version || 1) + 1;
  }
  next();
});

// Methods
EntrySchema.methods.toJSON = function() {
  const entryObject = this.toObject();
  entryObject._id = entryObject._id.toString();
  return entryObject;
};

// Static methods
EntrySchema.statics.findByUserId = function(userId: string) {
  return this.find({ userId });
};

EntrySchema.statics.findByUserAndType = function(userId: string, type: EntryType) {
  return this.find({ userId, type });
};

EntrySchema.statics.findByUserAndDateRange = function(userId: string, startDate: Date, endDate: Date) {
  return this.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  });
};

// Export model
export const EntryModel = (mongoose.models.Entry || model<EntryDocument, EntryModel>('Entry', EntrySchema)) as EntryModel;
export type { EntryDocument };