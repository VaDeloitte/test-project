import mongoose, { Document, Model, Schema } from 'mongoose';

export type UploadType = 'project' | 'group_chat' | 'personal_chat';
export type ResourceStatus = 'Active' | 'Deleted' | 'Inactive' | 'SoftDeleted' | 'HardDeleted';

export interface ISecureResource extends Document {
  resourceId: string;
  fileName: string;
  filePath: string; // Azure Blob Storage path
  fileSize: number; // in bytes
  fileType: string; // MIME type
  uploadType: UploadType;
  uploadedBy: string; // email
  uploadedByAzureId: string;
  groupId?: string; // for group_chat uploads
  conversationId?: string; // for personal_chat uploads
  projectId?: string; // for project uploads
  status: ResourceStatus;
  uploadedAt: Date;
  lastAccessedAt: Date;
  softDeletedAt?: Date;
  hardDeletedAt?: Date;
  metadata: {
    extractedText?: string;
    pageCount?: number;
    indexed?: boolean;
    indexedAt?: Date;
    blobUrl?: string;
    containerName?: string;
  };
}

const SecureResourceSchema = new Schema<ISecureResource>(
  {
    resourceId: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    uploadType: {
      type: String,
      enum: ['project', 'group_chat', 'personal_chat'],
      required: true,
      index: true,
    },
    uploadedBy: { type: String, required: true, index: true },
    uploadedByAzureId: { type: String, required: true },
    groupId: { type: String, index: true },
    conversationId: { type: String, index: true },
    projectId: { type: String, index: true },
    status: {
      type: String,
      enum: ['Active', 'Deleted', 'Inactive', 'SoftDeleted', 'HardDeleted'],
      default: 'Active',
      index: true,
    },
    uploadedAt: { type: Date, default: Date.now, index: true },
    lastAccessedAt: { type: Date, default: Date.now },
    softDeletedAt: { type: Date, index: true },
    hardDeletedAt: { type: Date },
    metadata: {
      extractedText: { type: String },
      pageCount: { type: Number },
      indexed: { type: Boolean, default: false },
      indexedAt: { type: Date },
      blobUrl: { type: String },
      containerName: { type: String },
    },
  },
  {
    timestamps: true,
    collection: 'Secure_resources',
  }
);

// Compound indexes for cleanup queries
SecureResourceSchema.index({ uploadType: 1, uploadedAt: 1 });
SecureResourceSchema.index({ status: 1, softDeletedAt: 1 });
SecureResourceSchema.index({ uploadedBy: 1, uploadType: 1 });
SecureResourceSchema.index({ groupId: 1, status: 1 });

// Static methods for cleanup
SecureResourceSchema.statics.findOldPersonalChats = function (retentionDays: number = 60) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  return this.find({
    uploadType: 'personal_chat',
    uploadedAt: { $lt: cutoffDate },
    status: 'Active',
  });
};

SecureResourceSchema.statics.findSoftDeletedResources = function (graceDays: number = 3) {
  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() - graceDays);
  
  return this.find({
    status: 'SoftDeleted',
    softDeletedAt: { $lt: gracePeriodDate },
  });
};

SecureResourceSchema.statics.findResourcesByGroup = function (groupId: string) {
  return this.find({
    groupId,
    status: { $in: ['Active', 'Inactive'] },
  });
};

SecureResourceSchema.statics.findResourcesByUser = function (userEmail: string) {
  return this.find({
    uploadedBy: userEmail,
    status: { $in: ['Active', 'Inactive'] },
  });
};

// Methods
SecureResourceSchema.methods.softDelete = function () {
  this.status = 'SoftDeleted';
  this.softDeletedAt = new Date();
  return this.save();
};

SecureResourceSchema.methods.hardDelete = function () {
  this.status = 'HardDeleted';
  this.hardDeletedAt = new Date();
  return this.save();
};

const SecureResource: Model<ISecureResource> =
  mongoose.models.SecureResource ||
  mongoose.model<ISecureResource>('SecureResource', SecureResourceSchema);

export default SecureResource;
