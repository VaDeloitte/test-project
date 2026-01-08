import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMemberRights {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageMembers: boolean;
}

export interface IGroupMember {
  userEmail: string;
  azureAdId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  rights: IMemberRights;
}

export interface ISecureGroup extends Document {
  groupId: string;
  groupName: string;
  description?: string;
  createdBy: string; // email
  createdByAzureId: string;
  members: IGroupMember[];
  space_lifetime: number; // in days
  createdAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'soft_deleted' | 'hard_deleted';
  softDeletedAt?: Date;
  hardDeletedAt?: Date;
  metadata: {
    totalMembers: number;
    totalResources: number;
    lastActivityAt: Date;
  };
}

const MemberRightsSchema = new Schema<IMemberRights>(
  {
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
    canInvite: { type: Boolean, default: false },
    canManageMembers: { type: Boolean, default: false },
  },
  { _id: false }
);

const GroupMemberSchema = new Schema<IGroupMember>(
  {
    userEmail: { type: String, required: true },
    azureAdId: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], required: true },
    joinedAt: { type: Date, default: Date.now },
    rights: { type: MemberRightsSchema, required: true },
  },
  { _id: false }
);

const SecureGroupSchema = new Schema<ISecureGroup>(
  {
    groupId: { type: String, required: true, unique: true, index: true },
    groupName: { type: String, required: true },
    description: { type: String },
    createdBy: { type: String, required: true },
    createdByAzureId: { type: String, required: true },
    members: [GroupMemberSchema],
    space_lifetime: { type: Number, required: true, default: 30 }, // days
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'soft_deleted', 'hard_deleted'],
      default: 'active',
      index: true,
    },
    softDeletedAt: { type: Date, index: true },
    hardDeletedAt: { type: Date },
    metadata: {
      totalMembers: { type: Number, default: 0 },
      totalResources: { type: Number, default: 0 },
      lastActivityAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    collection: 'Secure_groups',
  }
);

// Indexes for cleanup queries
SecureGroupSchema.index({ expiresAt: 1, status: 1 });
SecureGroupSchema.index({ softDeletedAt: 1, status: 1 });
SecureGroupSchema.index({ 'members.userEmail': 1 });
SecureGroupSchema.index({ createdBy: 1 });

// Pre-save hook to calculate expiresAt
SecureGroupSchema.pre('save', function (next) {
  if (this.isNew) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + this.space_lifetime);
    this.expiresAt = expirationDate;
    this.metadata.totalMembers = this.members.length;
  }
  next();
});

// Methods
SecureGroupSchema.methods.isExpired = function (): boolean {
  return this.expiresAt < new Date();
};

SecureGroupSchema.methods.isAdmin = function (userEmail: string): boolean {
  return this.members.some(
    (m: IGroupMember) => m.userEmail === userEmail && m.role === 'admin'
  );
};

SecureGroupSchema.methods.canUserPerformAction = function (
  userEmail: string,
  action: keyof IMemberRights
): boolean {
  const member = this.members.find((m: IGroupMember) => m.userEmail === userEmail);
  if (!member) return false;
  if (member.role === 'admin') return true;
  return member.rights[action];
};

// Static methods
SecureGroupSchema.statics.findExpiredGroups = function () {
  return this.find({
    expiresAt: { $lt: new Date() },
    status: 'active',
  });
};

SecureGroupSchema.statics.findSoftDeletedGroups = function (graceDays: number = 3) {
  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() - graceDays);
  
  return this.find({
    status: 'soft_deleted',
    softDeletedAt: { $lt: gracePeriodDate },
  });
};

const SecureGroup: Model<ISecureGroup> =
  mongoose.models.SecureGroup ||
  mongoose.model<ISecureGroup>('SecureGroup', SecureGroupSchema);

export default SecureGroup;
