import { AuditLogModel } from '@/lib/models';

interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export async function logAudit(
  entityType: 'entry' | 'loan' | 'payment' | 'user',
  entityId: string,
  action: string,
  userId: string,
  changes: AuditChange[] = [],
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    await AuditLogModel.create({
      entityType,
      entityId,
      action,
      userId,
      changes,
      metadata,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Audit log failed:', error);
    // Don't throw - audit failure shouldn't break the main operation
  }
}
