const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { ingestFile, ingestKnowledgeDirectory } = require('./ingestion');

test('does not treat README.md as a knowledge document', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'flowcare-knowledge-'));
  const readmePath = path.join(directory, 'README.md');

  try {
    await fs.writeFile(readmePath, '# Knowledge base documentation');
    await assert.rejects(
      ingestKnowledgeDirectory(directory, () => {}),
      /No \.md or \.pdf knowledge documents found/,
    );
  } finally {
    await fs.unlink(readmePath);
    await fs.rmdir(directory);
  }
});

test('embeds reviewed documents with Gemini and stores the embedding model identity', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'flowcare-gemini-ingestion-'));
  const filePath = path.join(directory, 'periods.md');
  const originalAdapter = axios.defaults.adapter;
  const originalMethods = {
    findOne: KnowledgeChunk.findOne,
    updateOne: KnowledgeChunk.updateOne,
    deleteMany: KnowledgeChunk.deleteMany,
  };
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalDimensions = process.env.GEMINI_EMBEDDING_DIMENSIONS;
  let savedChunk;
  let embeddingRequest;

  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.GEMINI_EMBEDDING_DIMENSIONS = '2';
  KnowledgeChunk.findOne = () => ({ select: () => ({ lean: async () => null }) });
  KnowledgeChunk.updateOne = async (filter, update) => { savedChunk = { filter, update: update.$set }; };
  KnowledgeChunk.deleteMany = async () => ({ deletedCount: 0 });
  axios.defaults.adapter = async (config) => {
    embeddingRequest = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    return {
      data: { embedding: { values: [0.1, 0.2] } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  try {
    await fs.writeFile(filePath, [
      '---',
      'title: Periods',
      'sourceName: Health Service',
      'sourceUrl: https://example.org/periods',
      'category: menstrual-health',
      '---',
      'Periods are a normal part of the menstrual cycle.',
    ].join('\n'));

    const result = await ingestFile(filePath);
    assert.equal(embeddingRequest.taskType, 'RETRIEVAL_DOCUMENT');
    assert.equal(result.embeddingModel, 'gemini-embedding-001:2');
    assert.equal(savedChunk.update.embeddingModel, 'gemini-embedding-001:2');
    assert.deepEqual(savedChunk.update.embedding, [0.1, 0.2]);
  } finally {
    axios.defaults.adapter = originalAdapter;
    KnowledgeChunk.findOne = originalMethods.findOne;
    KnowledgeChunk.updateOne = originalMethods.updateOne;
    KnowledgeChunk.deleteMany = originalMethods.deleteMany;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalDimensions === undefined) delete process.env.GEMINI_EMBEDDING_DIMENSIONS;
    else process.env.GEMINI_EMBEDDING_DIMENSIONS = originalDimensions;
    await fs.unlink(filePath);
    await fs.rmdir(directory);
  }
});
