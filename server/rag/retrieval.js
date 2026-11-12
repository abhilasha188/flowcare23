const KnowledgeChunk = require('../models/KnowledgeChunk');
const { createEmbedding, getEmbeddingModelId, getGeminiConfig } = require('../services/geminiService');

const DEFAULT_INDEX = 'flowcare_vector_index';

class RagError extends Error {
  constructor(message, statusCode = 503, code = 'RAG_UNAVAILABLE') {
    super(message);
    this.name = 'RagError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw Object.assign(new Error(`${name} must be a positive whole number.`), { statusCode: 503, code: 'AI_CONFIGURATION_ERROR' });
  }
  return parsed;
}

function getRagConfig() {
  const threshold = Number(process.env.RAG_RELEVANCE_THRESHOLD ?? 0.35);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw Object.assign(new Error('RAG_RELEVANCE_THRESHOLD must be between 0 and 1.'), { statusCode: 503, code: 'AI_CONFIGURATION_ERROR' });
  }
  return {
    indexName: process.env.RAG_VECTOR_INDEX?.trim() || DEFAULT_INDEX,
    topK: positiveInteger(process.env.RAG_TOP_K, 3, 'RAG_TOP_K'),
    numCandidates: positiveInteger(process.env.RAG_NUM_CANDIDATES, 30, 'RAG_NUM_CANDIDATES'),
    relevanceThreshold: threshold,
  };
}

function isMissingVectorIndex(error) {
  return /search index not found|vector search index|needs to be indexed as vector|needs to be indexed as filter|not indexed as filter|no vector index|index.*not configured|vector.*dimension|dimension.*vector/i
    .test(error?.message || '');
}

async function retrieveRelevantChunks(question) {
  const config = getRagConfig();
  const embeddingModel = getEmbeddingModelId(getGeminiConfig());
  const queryVector = await createEmbedding(question);
  try {
    return await KnowledgeChunk.aggregate([
      {
        $vectorSearch: {
          index: config.indexName,
          path: 'embedding',
          queryVector,
          filter: { embeddingModel: { $eq: embeddingModel } },
          numCandidates: Math.max(config.numCandidates, config.topK),
          limit: config.topK,
        },
      },
      {
        $project: {
          title: 1,
          sourceName: 1,
          sourceUrl: 1,
          category: 1,
          text: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
  } catch (error) {
    if (isMissingVectorIndex(error)) {
      throw new RagError(
        `MongoDB Atlas Vector Search index "${config.indexName}" is missing or not configured for the "embedding" vector and "embeddingModel" filter fields. Follow the Vector Search setup in README.md, including the dimension printed by the ingestion script.`,
        503,
        'VECTOR_INDEX_UNAVAILABLE',
      );
    }
    throw error;
  }
}

module.exports = { RagError, getRagConfig, isMissingVectorIndex, retrieveRelevantChunks };
