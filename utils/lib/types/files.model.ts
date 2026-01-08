import mongoose, { Schema } from 'mongoose';

// File metadata schema
const fileMetadataSchema = new Schema(
  {
    category: { type: String, default: null },
    tags: { type: [String], default: [] },
    description: { type: String, default: null },
    custom: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

// File schema
const fileSchema = new Schema(
  {
    _id: { type: String, required: true },
    id: { type: String, required: true },
    fileId: { type: String, required: true },
    userId: { type: String, required: true, maxlength: 200 },
    partitionKey: { type: String, required: true, maxlength: 200 },
    blobPath: { type: String, required: true, maxlength: 1000 },
    fileName: { type: String, required: true, maxlength: 500 },
    displayName: { type: String, required: true, maxlength: 500 },
    fileType: { type: String, required: true, maxlength: 100 },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now },
    metadata: { type: fileMetadataSchema },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    version: { type: Number, default: 1 }
  },
  {
    collection: 'user_files',
    timestamps: true
  }
);

// Indexes
fileSchema.index({ userId: 1, isDeleted: 1 });
fileSchema.index({ fileId: 1 });
fileSchema.index({ partitionKey: 1 });


const UserFiles =
  mongoose.models?.UserFiles ||
  mongoose.model('UserFiles', fileSchema);

export default UserFiles;
