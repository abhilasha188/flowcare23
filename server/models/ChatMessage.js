const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200 },
    organization: { type: String, required: true, maxlength: 120 },
    url: { type: String, required: true, maxlength: 2048 },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: { type: String, required: true, minlength: 36, maxlength: 36 },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    conversationTitle: { type: String, trim: true, maxlength: 80, default: null },
    sources: { type: [sourceSchema], default: [] },
    feedback: { type: String, enum: ['helpful', 'not_helpful'], default: null },
  },
  { timestamps: true },
);

chatMessageSchema.index({ userId: 1, conversationId: 1, createdAt: 1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
