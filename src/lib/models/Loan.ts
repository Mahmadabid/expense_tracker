import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { Loan, LoanDirection, Payment, LoanCollaborator, PendingApproval } from '@/types';

interface LoanDocument extends Omit<Loan, '_id'>, Document {}

interface LoanModel extends Model<LoanDocument> {
  findByUserId(userId: string): Promise<LoanDocument[]>;
  findSharedLoans(userId: string): Promise<LoanDocument[]>;
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

const LoanSchema = new Schema<LoanDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['loan'],
      default: 'loan',
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be positive'],
    },
    currency: {
      type: String,
      required: true,
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
      default: 'USD',
    },
    description: {
      type: String,
      required: true,
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
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'paid', 'cancelled'],
      default: 'active',
      index: true,
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
    counterparty: {
      userId: String,
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function(v: string) {
            return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
          },
          message: 'Invalid email format',
        },
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 20,
      },
    },
    originalAmount: {
      type: Number,
      required: true,
      min: [0, 'Original amount must be positive'],
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: [0, 'Remaining amount must be non-negative'],
    },
    dueDate: {
      type: Date,
      index: true,
    },
    interestRate: {
      type: Number,
      min: [0, 'Interest rate must be non-negative'],
      max: [100, 'Interest rate cannot exceed 100%'],
    },
    payments: [PaymentSchema],
    collaborators: [LoanCollaboratorSchema],
    pendingApprovals: [PendingApprovalSchema],
    shareToken: {
      type: String,
      index: true,
      sparse: true,
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
LoanSchema.index({ 'counterparty.userId': 1 });
LoanSchema.index({ 'collaborators.userId': 1 });
LoanSchema.index({ dueDate: 1 });
LoanSchema.index({ shareToken: 1 }, { sparse: true });

// Pre-save middleware
LoanSchema.pre('save', function(next) {
  if (this.isNew) {
    this.version = 1;
    this.originalAmount = this.amount;
    this.remainingAmount = this.amount;
  } else if (this.isModified() && !this.isNew) {
    this.version = (this.version || 1) + 1;
  }
  next();
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