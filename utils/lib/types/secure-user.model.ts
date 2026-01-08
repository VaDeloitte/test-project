import mongoose, { Schema, Document } from "mongoose";

export interface ISecureUser extends Document {
  username: string;
  email: string;
  azureAdId: string; // Azure AD Object ID (homeAccountId)
  serviceLine: string[];
  roles: string[];
  groups: mongoose.Types.ObjectId[];
  status: 'active' | 'inactive' | 'soft_deleted' | 'hard_deleted';
  lastLoginAt: Date | null;
  country?: string;
  department?: string;
  officeLocation?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  softDeletedAt?: Date | null;
  hardDeletedAt?: Date | null;
}

const SecureUserSchema = new Schema<ISecureUser>(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    azureAdId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    serviceLine: {
      type: [String],
      default: [],
    },
    roles: {
      type: [String],
      default: ['user'],
    },
    groups: {
      type: [{ type: Schema.Types.ObjectId, ref: 'SecureGroup' }],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'soft_deleted', 'hard_deleted'],
      default: 'active',
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
      index: true,
    },
    country: {
      type: String,
      default: null,
    },
    department: {
      type: String,
      default: null,
    },
    officeLocation: {
      type: String,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    softDeletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    hardDeletedAt: {
      type: Date,
      default: null,
    },
  },
  { 
    timestamps: true,
    collection: 'Secure_users'
  }
);

// Index for finding inactive users
SecureUserSchema.index({ lastLoginAt: 1, status: 1 });
SecureUserSchema.index({ softDeletedAt: 1, status: 1 });

// Static methods
SecureUserSchema.statics.findInactiveUsers = function (inactivityDays: number = 60) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactivityDays);
  
  return this.find({
    lastLoginAt: { $lt: cutoffDate },
    status: 'active',
  });
};

SecureUserSchema.statics.findSoftDeletedUsers = function (graceDays: number = 3) {
  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() - graceDays);
  
  return this.find({
    status: 'soft_deleted',
    softDeletedAt: { $lt: gracePeriodDate },
  });
};

export default mongoose.models.SecureUser || mongoose.model<ISecureUser>("SecureUser", SecureUserSchema);
