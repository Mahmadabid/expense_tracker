import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { Loan, LoanDirection, Payment, LoanCollaborator, PendingApproval } from '@/types';
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
    encryptedData: String,
    // Virtual fields populated from encryptedData
    amount: Schema.Types.Mixed,
    originalAmount: Schema.Types.Mixed,
    remainingAmount: Schema.Types.Mixed,
    description: Schema.Types.Mixed,
    counterparty: Schema.Types.Mixed,
    payments: Schema.Types.Mixed,
    comments: Schema.Types.Mixed,
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
  }
);

// Indexes
LoanSchema.index({ userId: 1, direction: 1 });
LoanSchema.index({ userId: 1, status: 1 });
LoanSchema.index({ 'collaborators.userId': 1 });
LoanSchema.index({ dueDate: 1 });

// Pre-save middleware - Encrypt sensitive data
LoanSchema.pre('save', function(next) {
  const doc = this as any;
  
  // Bundle all sensitive data into encryptedData field
  if (doc.amount !== undefined || doc.description !== undefined || doc.counterparty) {
    const sensitiveData: any = {
      amount: doc.amount,
      originalAmount: doc.originalAmount || doc.amount,
      remainingAmount: doc.remainingAmount !== undefined ? doc.remainingAmount : doc.amount,
      description: doc.description || '',
      counterparty: doc.counterparty || null,
      payments: doc.payments || [],
      comments: doc.comments || [],
    };
    
    doc.encryptedData = encryptObject(sensitiveData);
    
    // Remove plain fields
    delete doc.amount;
    delete doc.originalAmount;
    delete doc.remainingAmount;
    delete doc.description;
    delete doc.counterparty;
    delete doc.payments;
    delete doc.comments;
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
function decryptLoanData(doc: any) {
  if (doc && doc.encryptedData) {
    const decrypted = decryptObject<{
      amount: number;
      originalAmount: number;
      remainingAmount: number;
      description?: string;
      counterparty: any;
      payments: any[];
      comments: any[];
    }>(doc.encryptedData);
    
    if (decrypted) {
      doc.amount = decrypted.amount;
      doc.originalAmount = decrypted.originalAmount;
      doc.remainingAmount = decrypted.remainingAmount;
      doc.description = decrypted.description || '';
      doc.counterparty = decrypted.counterparty;
      doc.payments = decrypted.payments || [];
      doc.comments = decrypted.comments || [];
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

// Methods
LoanSchema.methods.toJSON = function() {
  const loanObject = this.toObject();
  loanObject._id = loanObject._id.toString();
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
export const LoanModel = (mongoose.models.Loan || model<LoanDocument, LoanModel>('Loan', LoanSchema)) as LoanModel;
export type { LoanDocument };