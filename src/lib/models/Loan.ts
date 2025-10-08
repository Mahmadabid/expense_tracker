import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { Loan, Payment, LoanCollaborator, PendingApproval } from '@/types';
import { encryptObject, decryptObject } from '@/lib/utils/encryption';

interface LoanDocument extends Omit<Loan, '_id'>, Document {
  addPayment(payment: Omit<Payment, '_id' | 'createdAt'>): Payment;
  getTotalPaid(): number;
  canUserEdit(userId: string): boolean;
  canUserAddPayment(userId: string): boolean;
  requiresApproval(action: string, userId: string): boolean;
}

interface LoanModel extends Model<LoanDocument> {
  findByUserId(userId: string): Promise<LoanDocument[]>;
  findSharedLoans(userId: string): Promise<LoanDocument[]>;
  findByCounterparty(userId: string, counterpartyUserId: string): Promise<LoanDocument[]>;
}

const PaymentSchema = new Schema<Payment>({
  amount: {
    type: Number,
    required: true,
    min: [0, 'Payment amount must be positive'],
  },
  date: {
    type: Date,
    required: true,
  },
  method: {
    type: String,
    trim: true,
    maxlength: 50,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  paidBy: {
    type: String,
    required: true,
  },
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
  _id: true,
});

const LoanCommentSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
}, {
  timestamps: true,
  _id: true,
});

const LoanCollaboratorSchema = new Schema<LoanCollaborator>({
  userId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['owner', 'collaborator', 'viewer'],
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  invitedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  respondedAt: {
    type: Date,
  },
  invitedBy: {
    type: String,
    required: true,
  },
});

const PendingApprovalSchema = new Schema<PendingApproval>({
  action: {
    type: String,
    required: true,
    enum: ['delete', 'close', 'modify'],
  },
  requestedBy: {
    type: String,
    required: true,
  },
  requiredApprovers: [{
    type: String,
    required: true,
  }],
  approvals: [{
    userId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedAt: Date,
    comments: {
      type: String,
      maxlength: 500,
    },
  }],
  data: Schema.Types.Mixed,
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
  _id: true,
});

const LoanSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['loan'],
      default: 'loan',
    },
    // Encrypted sensitive data bundled as single string
    // amount, originalAmount, remainingAmount, description, counterparty, 
    // payments, comments are NOT stored as real fields - only in encryptedData
    encryptedData: {
      type: String,
      required: true,
    },
    // Keep indexable/queryable fields unencrypted
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
    direction: {
      type: String,
      required: true,
      enum: ['lent', 'borrowed'],
    },
    dueDate: {
      type: Date,
    },
    // Store counterparty userId at top level for querying
    // The full counterparty object (with email, phone, etc) is in encryptedData
    counterpartyUserId: {
      type: String,
      index: true, // Index for queries - sparse by default for optional fields
    },
    collaborators: [LoanCollaboratorSchema],
    pendingApprovals: [PendingApprovalSchema],
    shareToken: {
      type: String,
      sparse: true,
      unique: true,
    },
  },
  {
    timestamps: true,
    collection: 'loans',
    strict: true, // Only allow fields defined in schema
    strictQuery: true,
  }
);

// Indexes
LoanSchema.index({ userId: 1, direction: 1 });
LoanSchema.index({ userId: 1, status: 1 });
LoanSchema.index({ 'collaborators.userId': 1 });
// Note: counterpartyUserId index is defined in the schema field with index: true
LoanSchema.index({ dueDate: 1 });

// Pre-save middleware - Encrypt sensitive data BEFORE Mongoose processes it
LoanSchema.pre('validate', function(next) {
  const doc = this as any;
  // If encryptedData already present (route pre-encrypted), skip
  if (doc.encryptedData && (doc.amount === undefined && doc.counterparty === undefined)) {
    return next();
  }
  
  // Check if we have plain data that needs encryption
  const hasPlainData = doc.amount !== undefined || doc.counterparty !== undefined;
  
  if (hasPlainData) {
    console.log('[LOAN PRE-VALIDATE] Encrypting sensitive data...');
    
    try {
      const sensitiveData: any = {
        amount: doc.amount,
        originalAmount: doc.originalAmount || doc.amount,
        remainingAmount: doc.remainingAmount !== undefined ? doc.remainingAmount : (doc.originalAmount || doc.amount),
        description: doc.description || '',
        counterparty: doc.counterparty || null,
        payments: doc.payments || [],
        loanAdditions: doc.loanAdditions || [],
        comments: doc.comments || [],
        // Encrypt category and tags as well (non-queryable sensitive data)
        category: doc.category || '',
        tags: doc.tags || [],
      };
      
      // Encrypt and set encryptedData
      const encrypted = encryptObject(sensitiveData);
      console.log('[LOAN PRE-VALIDATE] Encrypted data length:', encrypted?.length);
      
      doc.encryptedData = encrypted;
      
      // Mark encryptedData as modified to ensure it's saved
      doc.markModified('encryptedData');
      
      // CRITICAL: Remove these from the document BEFORE validation
      delete doc.amount;
      delete doc.originalAmount;
      delete doc.remainingAmount;
      delete doc.description;
      delete doc.counterparty;
  delete doc.payments;
  delete doc.loanAdditions; // ensure additions not stored in plaintext
  delete doc.comments;
      delete doc.category;
      
      // Keep tags at schema level for querying if needed, but also store encrypted
      // Set to empty array to maintain schema validity
      doc.tags = [];
      
      // Also remove from _doc if it exists
      if (doc._doc) {
        delete doc._doc.amount;
        delete doc._doc.originalAmount;
        delete doc._doc.remainingAmount;
        delete doc._doc.description;
        delete doc._doc.counterparty;
  delete doc._doc.payments;
  delete doc._doc.loanAdditions;
  delete doc._doc.comments;
        delete doc._doc.category;
        doc._doc.tags = [];
      }
      
      console.log('[LOAN PRE-VALIDATE] Encrypted. EncryptedData exists:', !!doc.encryptedData);
    } catch (error) {
      console.error('[LOAN PRE-VALIDATE] Encryption error:', error);
      return next(error as Error);
    }
  }
  
  next();
});

// Also add pre-save to ensure they stay deleted
LoanSchema.pre('save', function(next) {
  const doc = this as any;
  
  // Double-check these fields are not present
  delete doc.amount;
  delete doc.originalAmount;
  delete doc.remainingAmount;
  delete doc.description;
  delete doc.counterparty;
  delete doc.payments;
  delete doc.loanAdditions; // remove plaintext additions
  delete doc.comments;
  delete doc.category;
  
  // Keep tags as empty array
  if (!Array.isArray(doc.tags)) {
    doc.tags = [];
  }
  
  if (doc._doc) {
    delete doc._doc.amount;
    delete doc._doc.originalAmount;
    delete doc._doc.remainingAmount;
    delete doc._doc.description;
    delete doc._doc.counterparty;
  delete doc._doc.payments;
  delete doc._doc.loanAdditions;
  delete doc._doc.comments;
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
function decryptLoanData(doc: any) {
  if (doc && doc.encryptedData) {
    const decrypted = decryptObject<{
      amount: number;
      originalAmount: number;
      remainingAmount: number;
      description?: string;
      counterparty: any;
      payments: any[];
      loanAdditions?: any[];
      comments: any[];
      category?: string;
      tags?: string[];
    }>(doc.encryptedData);
    
    if (decrypted) {
      // Set decrypted fields on the document
      doc.set('amount', decrypted.amount, { strict: false });
      doc.set('originalAmount', decrypted.originalAmount, { strict: false });
      doc.set('remainingAmount', decrypted.remainingAmount, { strict: false });
      doc.set('description', decrypted.description || '', { strict: false });
      doc.set('counterparty', decrypted.counterparty, { strict: false });
      doc.set('payments', decrypted.payments || [], { strict: false });
      doc.set('loanAdditions', decrypted.loanAdditions || [], { strict: false });
      doc.set('comments', decrypted.comments || [], { strict: false });
      doc.set('category', decrypted.category || '', { strict: false });
      doc.set('tags', decrypted.tags || [], { strict: false });
      
      // Also set on _doc for direct access
      if (doc._doc) {
        doc._doc.amount = decrypted.amount;
        doc._doc.originalAmount = decrypted.originalAmount;
        doc._doc.remainingAmount = decrypted.remainingAmount;
        doc._doc.description = decrypted.description || '';
        doc._doc.counterparty = decrypted.counterparty;
        doc._doc.payments = decrypted.payments || [];
        doc._doc.loanAdditions = decrypted.loanAdditions || [];
        doc._doc.comments = decrypted.comments || [];
        doc._doc.category = decrypted.category || '';
        doc._doc.tags = decrypted.tags || [];
      }
    }
  }
}

LoanSchema.post('find', function(docs: LoanDocument[]) {
  docs.forEach(decryptLoanData);
});

LoanSchema.post('findOne', function(doc: LoanDocument | null) {
  if (doc) decryptLoanData(doc);
});

LoanSchema.post('findOneAndUpdate', function(doc: LoanDocument | null) {
  if (doc) decryptLoanData(doc);
});

LoanSchema.post('save', function(doc: LoanDocument) {
  decryptLoanData(doc);
});

// Methods
LoanSchema.methods.toJSON = function() {
  const loanObject = this.toObject();
  
  // Decrypt data if not already done
  if (loanObject.encryptedData && !loanObject.amount) {
    const decrypted = decryptObject<{
      amount: number;
      originalAmount: number;
      remainingAmount: number;
      description?: string;
      counterparty: any;
      payments: any[];
      loanAdditions?: any[];
      comments: any[];
      category?: string;
      tags?: string[];
    }>(loanObject.encryptedData);
    
    if (decrypted) {
      loanObject.amount = decrypted.amount;
      loanObject.originalAmount = decrypted.originalAmount;
      loanObject.remainingAmount = decrypted.remainingAmount;
      loanObject.description = decrypted.description || '';
      loanObject.counterparty = decrypted.counterparty;
      loanObject.payments = decrypted.payments || [];
      loanObject.loanAdditions = decrypted.loanAdditions || [];
      loanObject.comments = decrypted.comments || [];
      loanObject.category = decrypted.category || '';
      loanObject.tags = decrypted.tags || [];
    }
  }
  
  // Remove encryptedData from the response sent to client
  delete loanObject.encryptedData;
  
  // Convert _id to string
  loanObject._id = loanObject._id.toString();
  
  // Add a flag to indicate this is a loan (for client-side filtering)
  loanObject.isLoan = true;
  
  return loanObject;
};

LoanSchema.methods.addPayment = function(payment: Omit<Payment, '_id' | 'createdAt'>) {
  const newPayment = {
    ...payment,
    _id: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
  };
  
  this.payments.push(newPayment);
  this.remainingAmount = Math.max(0, this.remainingAmount - payment.amount);
  
  if (this.remainingAmount === 0) {
    this.status = 'paid';
  }
  
  this.version = (this.version || 1) + 1;
  return newPayment;
};

LoanSchema.methods.getTotalPaid = function(this: LoanDocument) {
  return this.payments.reduce((total: number, payment: Payment) => total + payment.amount, 0);
};

LoanSchema.methods.canUserEdit = function(userId: string) {
  if (this.userId === userId) return true;
  
  const collaborator = this.collaborators.find((c: LoanCollaborator) => c.userId === userId);
  return collaborator && collaborator.status === 'accepted' && 
         (collaborator.role === 'owner' || collaborator.role === 'collaborator');
};

LoanSchema.methods.canUserAddPayment = function(userId: string) {
  // Loan owner, counterparty, or accepted collaborators can add payments
  if (this.userId === userId) return true;
  if (this.counterparty?.userId === userId) return true;
  
  const collaborator = this.collaborators.find((c: LoanCollaborator) => c.userId === userId);
  return collaborator && collaborator.status === 'accepted';
};

LoanSchema.methods.requiresApproval = function(action: string, userId: string) {
  const destructiveActions = ['delete', 'close'];
  return destructiveActions.includes(action) && this.collaborators.length > 0;
};

// Static methods
LoanSchema.statics.findByUserId = function(userId: string) {
  return this.find({
    $or: [
      { userId },
      { 'collaborators.userId': userId },
      { 'counterparty.userId': userId },
    ],
  });
};

LoanSchema.statics.findByCounterparty = function(userId: string, counterpartyUserId: string) {
  return this.find({
    $or: [
      { userId, 'counterparty.userId': counterpartyUserId },
      { userId: counterpartyUserId, 'counterparty.userId': userId },
    ],
  });
};

// Export model
// In development, delete the cached model to ensure middleware is registered
if (process.env.NODE_ENV !== 'production' && mongoose.models.Loan) {
  delete mongoose.models.Loan;
  delete (mongoose as any).modelSchemas?.Loan;
}

export const LoanModel = (mongoose.models.Loan || model<LoanDocument, LoanModel>('Loan', LoanSchema)) as LoanModel;
export type { LoanDocument };