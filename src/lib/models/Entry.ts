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
    // Temporary fields for input - will be encrypted into encryptedData
    // These are NOT persisted to the database
    amount: {
      type: Number,
      required: false,
      select: false, // Don't include in queries by default
    },
    description: {
      type: String,
      required: false,
      select: false, // Don't include in queries by default
    },
    // Encrypted sensitive data stored as single string
    // amount and description are encrypted here
    encryptedData: {
      type: String,
      required: function(this: any) {
        // Only require encryptedData if we don't have plain data
        // This allows the pre-validate middleware to run and encrypt the data
        return this.amount === undefined;
      },
    },
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
    strict: true, // Only allow fields defined in schema
    strictQuery: true,
  }
);

// Indexes
EntrySchema.index({ userId: 1, type: 1 });
EntrySchema.index({ userId: 1, date: -1 });
EntrySchema.index({ userId: 1, status: 1 });
EntrySchema.index({ userId: 1, category: 1 });
EntrySchema.index({ tags: 1 });
EntrySchema.index({ createdAt: -1 });

// Pre-validate middleware - Encrypt BEFORE validation
EntrySchema.pre('validate', function() {
  const doc = this as any;
  
  // Only encrypt if we have plain data (amount is the key indicator)
  const hasPlainData = doc.amount !== undefined;
  
  if (hasPlainData) {
    try {
      const sensitiveData = {
        amount: doc.amount,
        description: doc.description || '',
      };
      
      // Encrypt the sensitive data
      const encrypted = encryptObject(sensitiveData);
      
      if (!encrypted) {
        throw new Error('Encryption returned empty string');
      }
      
      // Set encrypted data on the document
      doc.encryptedData = encrypted;
      
      // Mark the field as modified
      doc.markModified('encryptedData');
      
      // Remove plain fields (they will be cleaned up in pre-save too)
      doc.amount = undefined;
      doc.description = undefined;
    } catch (error) {
      throw error;
    }
  } else if (!doc.encryptedData) {
    // Let schema validation handle missing encryptedData
  }
});

// Pre-save middleware - Version management and cleanup
EntrySchema.pre('save', function() {
  const doc = this as any;
  
  // Remove temporary fields before saving (they should be in encryptedData now)
  if (doc.amount !== undefined) {
    doc.amount = undefined;
  }
  if (doc.description !== undefined) {
    doc.description = undefined;
  }
  
  // Version management
  if (this.isNew) {
    doc.version = 1;
  } else if (this.isModified() && !this.isNew) {
    doc.version = (doc.version || 1) + 1;
  }
});

// Post-find middleware - Decrypt sensitive data
function decryptEntryData(doc: any) {
  if (doc && doc.encryptedData) {
    const decrypted = decryptObject<{ 
      amount: number; 
      description?: string;
    }>(doc.encryptedData);
    if (decrypted) {
      // Set decrypted fields on the document
      doc.set('amount', decrypted.amount, { strict: false });
      doc.set('description', decrypted.description || '', { strict: false });
      
      // Also set on _doc for direct access
      if (doc._doc) {
        doc._doc.amount = decrypted.amount;
        doc._doc.description = decrypted.description || '';
      }
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

EntrySchema.post('save', function(doc: EntryDocument) {
  decryptEntryData(doc);
});

// Methods
EntrySchema.methods.toJSON = function() {
  const entryObject = this.toObject();
  
  // Decrypt data if not already done
  if (entryObject.encryptedData && !entryObject.amount) {
    const decrypted = decryptObject<{ 
      amount: number; 
      description?: string;
    }>(entryObject.encryptedData);
    if (decrypted) {
      entryObject.amount = decrypted.amount;
      entryObject.description = decrypted.description || '';
    }
  }
  
  // Remove encryptedData from the response sent to client
  delete entryObject.encryptedData;
  
  // Convert _id to string
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
// In development, delete the cached model to ensure middleware is registered
if (process.env.NODE_ENV !== 'production' && mongoose.models.Entry) {
  delete mongoose.models.Entry;
  delete (mongoose as any).modelSchemas?.Entry;
}

export const EntryModel = (mongoose.models.Entry || model<EntryDocument, EntryModel>('Entry', EntrySchema)) as EntryModel;
export type { EntryDocument };