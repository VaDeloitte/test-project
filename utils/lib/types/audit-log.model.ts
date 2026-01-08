import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  eventType: string;
  entityType: string;
  entityId?: mongoose.Types.ObjectId;
  entityName?: string;
  action: string;
  initiatedBy: {
    userId?: string;
    email?: string;
    source?: string;
  };
  relatedBatchId?: string;
  timestamp: Date;
  reason?: string;
  details?: Record<string, any>;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    entityName: {
      type: String,
      default: null,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    initiatedBy: {
      userId: String,
      email: String,
      source: String,
    },
    relatedBatchId: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reason: {
      type: String,
      default: null,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    collection: 'Secure_audit_logs',
    timestamps: false,
  }
);

// Compound index for querying by entity
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
