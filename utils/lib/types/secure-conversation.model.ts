import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IMessage {
  messageId: string;
  sender: string; // email
  senderAzureId: string;
  content: string;
  timestamp: Date;
  attachments?: string[]; // resourceIds
  metadata?: {
    tokens?: number;
    model?: string;
  };
}

export interface ISecureConversation extends Document {
  conversationId: string;
  isGroup: boolean;
  groupId?: string;
  participants: Array<{
    userEmail: string;
    azureAdId: string;
    joinedAt: Date;
    leftAt?: Date;
  }>;
  messages: IMessage[];
  createdBy: string; // email
  createdByAzureId: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  status: 'active' | 'archived' | 'soft_deleted' | 'hard_deleted';
  softDeletedAt?: Date;
  hardDeletedAt?: Date;
  metadata: {
    totalMessages: number;
    totalAttachments: number;
    isPersonalChat: boolean;
  };
}

const MessageSchema = new Schema<IMessage>(
  {
    messageId: { type: String, required: true },
    sender: { type: String, required: true },
    senderAzureId: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    attachments: [{ type: String }],
    metadata: {
      tokens: { type: Number },
      model: { type: String },
    },
  },
  { _id: false }
);

const ParticipantSchema = new Schema(
  {
    userEmail: { type: String, required: true },
    azureAdId: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { _id: false }
);

const SecureConversationSchema = new Schema<ISecureConversation>(
  {
    conversationId: { type: String, required: true, unique: true, index: true },
    isGroup: { type: Boolean, required: true, index: true },
    groupId: { type: String, index: true },
    participants: [ParticipantSchema],
    messages: [MessageSchema],
    createdBy: { type: String, required: true, index: true },
    createdByAzureId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['active', 'archived', 'soft_deleted', 'hard_deleted'],
      default: 'active',
      index: true,
    },
    softDeletedAt: { type: Date, index: true },
    hardDeletedAt: { type: Date },
    metadata: {
      totalMessages: { type: Number, default: 0 },
      totalAttachments: { type: Number, default: 0 },
      isPersonalChat: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: 'Secure_conversations',
  }
);

// Indexes for cleanup queries
SecureConversationSchema.index({ lastMessageAt: 1, 'metadata.isPersonalChat': 1 });
SecureConversationSchema.index({ status: 1, softDeletedAt: 1 });
SecureConversationSchema.index({ groupId: 1, status: 1 });
SecureConversationSchema.index({ 'participants.userEmail': 1 });

// Pre-save hook
SecureConversationSchema.pre('save', function (next) {
  this.metadata.totalMessages = this.messages.length;
  this.metadata.totalAttachments = this.messages.reduce(
    (sum, msg) => sum + (msg.attachments?.length || 0),
    0
  );
  this.metadata.isPersonalChat = !this.isGroup;
  this.updatedAt = new Date();
  next();
});

// Static methods
SecureConversationSchema.statics.findOldPersonalChats = function (retentionDays: number = 60) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  return this.find({
    'metadata.isPersonalChat': true,
    lastMessageAt: { $lt: cutoffDate },
    status: 'active',
  });
};

SecureConversationSchema.statics.findSoftDeletedConversations = function (graceDays: number = 3) {
  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() - graceDays);
  
  return this.find({
    status: 'soft_deleted',
    softDeletedAt: { $lt: gracePeriodDate },
  });
};

SecureConversationSchema.statics.findByGroup = function (groupId: string) {
  return this.find({
    groupId,
    status: { $in: ['active', 'archived'] },
  });
};

SecureConversationSchema.statics.findByUser = function (userEmail: string) {
  return this.find({
    'participants.userEmail': userEmail,
    status: { $in: ['active', 'archived'] },
  });
};

// Methods
SecureConversationSchema.methods.addMessage = function (message: IMessage) {
  this.messages.push(message);
  this.lastMessageAt = message.timestamp;
  return this.save();
};

SecureConversationSchema.methods.softDelete = function () {
  this.status = 'soft_deleted';
  this.softDeletedAt = new Date();
  return this.save();
};

SecureConversationSchema.methods.hardDelete = function () {
  this.status = 'hard_deleted';
  this.hardDeletedAt = new Date();
  return this.save();
};

const SecureConversation: Model<ISecureConversation> =
  mongoose.models.SecureConversation ||
  mongoose.model<ISecureConversation>('SecureConversation', SecureConversationSchema);

export default SecureConversation;
