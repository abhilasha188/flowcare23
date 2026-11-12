const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true, trim: true },
    chunkId: { type: String, required: true, trim: true },
    contentHash: { type: String, required: true },
    chunkIndex: { type: Number, required: true, min: 0 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    sourceName: { type: String, required: true, trim: true, maxlength: 120 },
    sourceUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    text: { type: String, required: true, maxlength: 12000 },
    embeddingModel: { type: String, required: true, trim: true },
    embedding: { type: [Number], required: true, select: false },
  },
  { timestamps: true },
);

knowledgeChunkSchema.index(
  { documentId: 1, contentHash: 1, chunkIndex: 1 },
  { unique: true },
);

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
