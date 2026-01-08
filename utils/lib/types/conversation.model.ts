import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, required: true },
  content: { type: String, required: false, default: '' },  // Content is optional
  file: [{
    type: mongoose.Schema.Types.Mixed,  // Can be an object or a string
    required: false  // File is also optional
  }],
  citations: [{
    type: mongoose.Schema.Types.Mixed,
    required: false}],
  prompt: { type: Boolean, required: false }
}, {
  _id: false,  // Disable _id for subdocuments
});


const conversationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  messages: [messageSchema],  // Use the messageSchema for validation
  model: {
    id: { type: String, required: false },
    name: { type: String, required: false },
    maxLength: { type: Number, required: false },
    tokenLimit: { type: Number, required: false },
    label: { type: String, required: false }
  },
  prompt: { type: String, required: true },
  temperature: { type: Number, required: true },
  folderId: { type: String, default: null },
  workflow: { type: mongoose.Schema.Types.Mixed, required: false, default: null }, // ✅ Store workflow data
}, { timestamps: true });

export default mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);