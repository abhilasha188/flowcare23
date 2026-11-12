const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { isMissingVectorIndex, retrieveRelevantChunks } = require('./retrieval');

test('identifies Atlas vector index and dimension configuration errors', () => {
  assert.equal(isMissingVectorIndex(new Error('Search index not found: flowcare_vector_index')), true);
  assert.equal(isMissingVectorIndex(new Error('Query vector has incorrect dimensions')), true);
  assert.equal(isMissingVectorIndex(new Error('embeddingModel needs to be indexed as filter')), true);
  assert.equal(isMissingVectorIndex(new Error('network timeout')), false);
});

test('uses configured Atlas vector search with top K and candidate count', async () => {
  const originalAdapter = axios.defaults.adapter;
  const originalAggregate = KnowledgeChunk.aggregate;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalDimensions = process.env.GEMINI_EMBEDDING_DIMENSIONS;
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.GEMINI_EMBEDDING_DIMENSIONS = '2';
  let pipeline;
  axios.defaults.adapter = async (config) => ({
    data: { embedding: { values: [0.1, 0.2] } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
  KnowledgeChunk.aggregate = async (value) => {
    pipeline = value;
    return [{ text: 'reviewed content', score: 0.8 }];
  };

  try {
    const results = await retrieveRelevantChunks('question');
    assert.equal(results[0].score, 0.8);
    assert.deepEqual(pipeline[0].$vectorSearch, {
      index: 'flowcare_vector_index',
      path: 'embedding',
      queryVector: [0.1, 0.2],
      filter: { embeddingModel: { $eq: 'gemini-embedding-001:2' } },
      numCandidates: 30,
      limit: 3,
    });
  } finally {
    axios.defaults.adapter = originalAdapter;
    KnowledgeChunk.aggregate = originalAggregate;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalDimensions === undefined) delete process.env.GEMINI_EMBEDDING_DIMENSIONS;
    else process.env.GEMINI_EMBEDDING_DIMENSIONS = originalDimensions;
  }
});
