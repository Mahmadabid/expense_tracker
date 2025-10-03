import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { Entry, EntryType } from '@/types';
import { encryptObject, decryptObject } from '@/lib/utils/encryption';

interface EntryDocument extends Omit<Entry, '_id'>, Document {}

interface EntryModel extends Model<EntryDocument> {
  findByUserId(userId: string): Promise<EntryDocument[]>;
}

const EntrySchema = new Schema(
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
    // Encrypted sensitive data stored as single string
    encryptedData: String,
    // Virtual fields that get populated from encryptedData
    amount: Schema.Types.Mixed,
    description: Schema.Types.Mixed,
    // Keep indexable fields unencrypted for querying
    currency: {
      type: String,
      required: true,
      enum: ['PKR', 'USD', 'EUR', 'GBP', 'KWD', 'JPY', 'CAD', 'AUD', 'SAR', 'AED'],
      default: 'PKR',
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

// Pre-save middleware - Encrypt sensitive data
EntrySchema.pre('save', function(next) {
  // Bundle sensitive data into encrypted field
  const doc = this as any;
  
  // If we have amount and description as separate fields (for backwards compatibility or API input)
  if (doc.amount !== undefined || doc.description !== undefined) {
    const sensitiveData = {
      amount: doc.amount,
      description: doc.description || '',
    };
    
    doc.encryptedData = encryptObject(sensitiveData);
    
    // Remove the plain fields so they don't get stored
    delete doc.amount;
    delete doc.description;
  }
  
  // Version management
  if (this.isNew) {
    (this as any).version = 1;
  } else if (this.isModified() && !this.isNew) {
    (this as any).version = ((this as any).version || 1) + 1;
  }
  
  next();
});

// Post-find middleware - Decrypt sensitive data
function decryptEntryData(doc: any) {
  if (doc && doc.encryptedData) {
    const decrypted = decryptObject<{ amount: number; description?: string }>(doc.encryptedData);
    if (decrypted) {
      doc.amount = decrypted.amount;
      doc.description = decrypted.description || '';
    }
  }
}

EntrySchema.post('find', function(docs: EntryDocument[]) {
  docs.forEach(decryptEntryData);
});

EntrySchema.post('findOne', function(doc: EntryDocument | null) {
  if (doc) decryptEntryData(doc);
});

EntrySchema.post('findOneAndUpdate', function(doc: EntryDocument | null) {
  if (doc) decryptEntryData(doc);
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