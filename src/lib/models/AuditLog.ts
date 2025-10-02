import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { AuditLog } from '@/types';

interface AuditLogDocument extends Omit<AuditLog, '_id'>, Document {}

interface AuditLogModel extends Model<AuditLogDocument> {
  createLog(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    changes: any[],
    metadata?: Record<string, any>
  ): Promise<AuditLogDocument>;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['entry', 'loan', 'payment', 'user'],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    changes: [{
      field: {
        type: String,
        required: true,
        trim: true,
      },
      oldValue: Schema.Types.Mixed,
      newValue: Schema.Types.Mixed,
    }],
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true;
          // Basic IP validation (supports both IPv4 and IPv6)
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(v) || ipv6Regex.test(v);
        },
        message: 'Invalid IP address format',
      },
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: false, // We use our own timestamp field
    collection: 'audit_logs',
  }
);

// Indexes
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ entityId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 }); // For cleanup and general queries

// Methods
AuditLogSchema.methods.toJSON = function() {
  const auditObject = this.toObject();
  auditObject._id = auditObject._id.toString();
  return auditObject;
};

// Static methods
AuditLogSchema.statics.findByEntity = function(entityType: string, entityId: string) {
  return this.find({ entityType, entityId }).sort({ timestamp: -1 });
};

AuditLogSchema.statics.findByUser = function(userId: string, limit = 100) {
  return this.find({ userId }).sort({ timestamp: -1 }).limit(limit);
};

AuditLogSchema.statics.createLog = function(logData: Omit<AuditLog, '_id' | 'timestamp'>) {
  return this.create({
    ...logData,
    timestamp: new Date(),
  });
};

// Cleanup old logs (older than 1 year)
AuditLogSchema.statics.cleanup = function() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  return this.deleteMany({
    timestamp: { $lt: oneYearAgo },
  });
};

// Export model
export const AuditLogModel = (mongoose.models.AuditLog || model<AuditLogDocument, AuditLogModel>('AuditLog', AuditLogSchema)) as AuditLogModel;
export type { AuditLogDocument };