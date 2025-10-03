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
    // amount and description are NOT stored here - only in encryptedData
    encryptedData: {
      type: String,
      required: true,
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
EntrySchema.pre('validate', function(next) {
  const doc = this as any;
  
  // Only encrypt if we have plain data
  const hasPlainData = doc.amount !== undefined;
  
  if (hasPlainData) {
    console.log('[ENTRY PRE-VALIDATE] Encrypting sensitive data...');
    
    try {
      const sensitiveData = {
        amount: doc.amount,
        description: doc.description || '',
        category: doc.category || '',
        tags: doc.tags || [],
      };
      
      // Encrypt
      const encrypted = encryptObject(sensitiveData);
      console.log('[ENTRY PRE-VALIDATE] Encrypted data length:', encrypted?.length);
      
      doc.encryptedData = encrypted;
      
      // Mark encryptedData as modified to ensure it's saved
      doc.markModified('encryptedData');
      
      // Remove plain fields BEFORE validation
      delete doc.amount;
      delete doc.description;
      delete doc.category;
      
      // Keep tags as empty array for schema validity
      doc.tags = [];
      
      if (doc._doc) {
        delete doc._doc.amount;
        delete doc._doc.description;
        delete doc._doc.category;
        doc._doc.tags = [];
      }
      
      console.log('[ENTRY PRE-VALIDATE] Encrypted. EncryptedData exists:', !!doc.encryptedData);
    } catch (error) {
      console.error('[ENTRY PRE-VALIDATE] Encryption error:', error);
      return next(error as Error);
    }
  }
  
  next();
});

// Pre-save middleware - Double-check fields are removed
EntrySchema.pre('save', function(next) {
  const doc = this as any;
  
  // Ensure these don't exist
  delete doc.amount;
  delete doc.description;
  delete doc.category;
  
  // Keep tags as empty array
  if (!Array.isArray(doc.tags)) {
    doc.tags = [];
  }
  
  if (doc._doc) {
    delete doc._doc.amount;
    delete doc._doc.description;
    delete doc._doc.category;
    if (!Array.isArray(doc._doc.tags)) {
      doc._doc.tags = [];
    }
  }
  
  // Version management
  if (this.isNew) {
    doc.version = 1;
  } else if (this.isModified() && !this.isNew) {
    doc.version = (doc.version || 1) + 1;
  }
  
  next();
});

// Post-find middleware - Decrypt sensitive data
function decryptEntryData(doc: any) {
  if (doc && doc.encryptedData) {
    const decrypted = decryptObject<{ 
      amount: number; 
      description?: string;
      category?: string;
      tags?: string[];
    }>(doc.encryptedData);
    if (decrypted) {
      // Set decrypted fields on the document
      doc.set('amount', decrypted.amount, { strict: false });
      doc.set('description', decrypted.description || '', { strict: false });
      doc.set('category', decrypted.category || '', { strict: false });
      doc.set('tags', decrypted.tags || [], { strict: false });
      
      // Also set on _doc for direct access
      if (doc._doc) {
        doc._doc.amount = decrypted.amount;
        doc._doc.description = decrypted.description || '';
        doc._doc.category = decrypted.category || '';
        doc._doc.tags = decrypted.tags || [];
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
      category?: string;
      tags?: string[];
    }>(entryObject.encryptedData);
    if (decrypted) {
      entryObject.amount = decrypted.amount;
      entryObject.description = decrypted.description || '';
      entryObject.category = decrypted.category || '';
      entryObject.tags = decrypted.tags || [];
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