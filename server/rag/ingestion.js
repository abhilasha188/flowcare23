const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { createEmbedding, getEmbeddingModelId, getGeminiConfig } = require('../services/geminiService');
const { chunkText } = require('./chunking');
const { readDocument } = require('./documentProcessor');

const DEFAULT_KNOWLEDGE_DIR = path.resolve(__dirname, '..', 'knowledge-base');

function getChunkingConfig() {
  const size = Number(process.env.RAG_CHUNK_SIZE ?? 800);
  const overlap = Number(process.env.RAG_CHUNK_OVERLAP ?? 100);
  if (!Number.isInteger(size) || size < 1 || !Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
    throw new Error('RAG_CHUNK_SIZE and RAG_CHUNK_OVERLAP must be valid positive integers, with overlap smaller than size.');
  }
  return { size, overlap };
}

async function ingestFile(filePath) {
  const { metadata, text } = await readDocument(filePath);
  const documentId = path.basename(filePath);
  const { size, overlap } = getChunkingConfig();
  const chunks = chunkText(text, size, overlap);
  const gemini = getGeminiConfig();
  const embeddingModel = getEmbeddingModelId(gemini);
  const contentHash = createHash('sha256')
    .update(JSON.stringify({ metadata, size, overlap, embeddingModel }))
    .update('\0')
    .update(text)
    .digest('hex');
  const existing = await KnowledgeChunk.findOne({ documentId, contentHash }).select('+embedding').lean();
  if (existing) {
    const storedCount = await KnowledgeChunk.countDocuments({ documentId, contentHash });
    if (storedCount === chunks.length) {
      return {
        documentId,
        skipped: true,
        chunks: storedCount,
        embeddingDimensions: existing.embedding?.length || null,
      };
    }
  }

  let embeddingDimensions;

  for (let index = 0; index < chunks.length; index += 1) {
    const embedding = await createEmbedding(chunks[index], 'RETRIEVAL_DOCUMENT');
    embeddingDimensions ??= embedding.length;
    if (embedding.length !== embeddingDimensions) {
      throw new Error(`Embedding dimensions changed while processing ${path.basename(filePath)}.`);
    }
    await KnowledgeChunk.updateOne(
      { documentId, contentHash, chunkIndex: index },
      {
        $set: {
          ...metadata,
          documentId,
          chunkId: `${documentId}:${index}`,
          contentHash,
          chunkIndex: index,
          text: chunks[index],
          embedding,
          embeddingModel,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  await KnowledgeChunk.deleteMany({ documentId, contentHash: { $ne: contentHash } });
  return {
    documentId,
    skipped: false,
    chunks: chunks.length,
    embeddingDimensions,
    embeddingModel,
  };
}

async function ingestKnowledgeDirectory(directory = DEFAULT_KNOWLEDGE_DIR, onProgress = console.log) {
  const entries = (await fs.readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile()
      && entry.name.toLowerCase() !== 'readme.md'
      && ['.md', '.pdf'].includes(path.extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name));

  if (entries.length === 0) {
    throw new Error(`No .md or .pdf knowledge documents found in ${directory}. Add reviewed documents and source metadata first.`);
  }

  let totalChunks = 0;
  let embeddingDimensions = null;
  for (const entry of entries) {
    const result = await ingestFile(path.join(directory, entry.name));
    totalChunks += result.chunks;
    if (result.embeddingDimensions && embeddingDimensions && result.embeddingDimensions !== embeddingDimensions) {
      throw new Error('The embedding model returned inconsistent vector dimensions across documents. Verify GEMINI_EMBEDDING_MODEL and GEMINI_EMBEDDING_DIMENSIONS.');
    }
    embeddingDimensions ||= result.embeddingDimensions;
    onProgress(`${result.skipped ? 'Skipped unchanged' : 'Ingested'} ${entry.name}: ${result.chunks} chunks.`);
  }

  if (embeddingDimensions) {
    onProgress(`Embedding dimension: ${embeddingDimensions}. Configure Atlas index flowcare_vector_index with this dimension and path "embedding" (cosine).`);
  }
  return { documents: entries.length, chunks: totalChunks, embeddingDimensions };
}

module.exports = { DEFAULT_KNOWLEDGE_DIR, getChunkingConfig, ingestFile, ingestKnowledgeDirectory };
