const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const {
  classifyGeminiError,
  createEmbedding,
  generateAnswer,
  getEmbeddingModelId,
  getGeminiConfig,
  getGeminiStatus,
} = require('./geminiService');

const environmentKeys = [
  'GEMINI_API_KEY',
  'GEMINI_CHAT_MODEL',
  'GEMINI_EMBEDDING_MODEL',
  'GEMINI_EMBEDDING_DIMENSIONS',
  'AI_MAX_OUTPUT_TOKENS',
  'AI_TEMPERATURE',
];

function withEnvironment(values, callback) {
  const original = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  for (const key of environmentKeys) {
    if (Object.hasOwn(values, key)) {
      if (values[key] === undefined) delete process.env[key];
      else process.env[key] = values[key];
    }
  }
  return Promise.resolve()
    .then(callback)
    .finally(() => {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

function withAdapter(adapter, callback) {
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = adapter;
  return Promise.resolve()
    .then(callback)
    .finally(() => { axios.defaults.adapter = originalAdapter; });
}

function response(config, data) {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

test('uses the configured Gemini embedding model and vector dimensions as its index identity', async () => {
  await withEnvironment({
    GEMINI_API_KEY: 'test-gemini-key',
    GEMINI_EMBEDDING_MODEL: 'test-embedding-model',
    GEMINI_EMBEDDING_DIMENSIONS: '3',
  }, async () => {
    const config = getGeminiConfig();
    assert.equal(getEmbeddingModelId(config), 'test-embedding-model:3');
  });
});

test('sends retrieval task and configured output dimensions to Gemini and validates the vector', async () => {
  await withEnvironment({
    GEMINI_API_KEY: 'test-gemini-key',
    GEMINI_EMBEDDING_DIMENSIONS: '3',
  }, async () => withAdapter(async (config) => {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    assert.match(config.url, /models\/gemini-embedding-001:embedContent$/);
    assert.equal(config.headers['x-goog-api-key'], 'test-gemini-key');
    assert.deepEqual(body.content, { parts: [{ text: 'What is a period diary?' }] });
    assert.equal(body.taskType, 'RETRIEVAL_QUERY');
    assert.equal(body.outputDimensionality, 3);
    return response(config, { embedding: { values: [0.1, 0.2, 0.3] } });
  }, async () => {
    assert.deepEqual(await createEmbedding('What is a period diary?'), [0.1, 0.2, 0.3]);
  }));
});

test('maps prompt safety and conversation turns into Gemini content generation', async () => {
  await withEnvironment({ GEMINI_API_KEY: 'test-gemini-key' }, async () => withAdapter(async (config) => {
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
    assert.match(config.url, /models\/gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(config.headers['x-goog-api-key'], 'test-gemini-key');
    assert.deepEqual(body.systemInstruction, { parts: [{ text: 'Safety prompt.' }] });
    assert.deepEqual(body.contents, [
      { role: 'model', parts: [{ text: 'Earlier answer.' }] },
      { role: 'user', parts: [{ text: 'Current question with context.' }] },
    ]);
    assert.deepEqual(body.generationConfig, { maxOutputTokens: 300, temperature: 0.2 });
    return response(config, { candidates: [{ content: { parts: [{ text: 'A source-grounded ' }, { text: 'answer.' }] } }] });
  }, async () => {
    assert.equal(await generateAnswer([
      { role: 'system', content: 'Safety prompt.' },
      { role: 'assistant', content: 'Earlier answer.' },
      { role: 'user', content: 'Current question with context.' },
    ]), 'A source-grounded answer.');
  }));
});

test('rejects invalid embeddings and does not hide provider errors as successful responses', async () => {
  await withEnvironment({
    GEMINI_API_KEY: 'test-gemini-key',
    GEMINI_EMBEDDING_DIMENSIONS: '2',
  }, async () => {
    await withAdapter(async (config) => response(config, { embedding: { values: [0.1] } }), async () => {
      await assert.rejects(createEmbedding('question'), { code: 'GEMINI_INVALID_RESPONSE' });
    });
    await withAdapter(async () => { throw Object.assign(new Error('private upstream details'), { response: { status: 500 } }); }, async () => {
      await assert.rejects(createEmbedding('question'), {
        code: 'GEMINI_UNAVAILABLE',
        message: /Gemini embedding is unavailable/,
      });
    });
  });
});

test('reports missing keys and safely classifies Gemini health failures', async () => {
  await withEnvironment({ GEMINI_API_KEY: undefined }, async () => {
    const status = await getGeminiStatus();
    assert.equal(status.configurationValid, false);
    assert.equal(status.endpointError, 'missing_api_key');
  });
  assert.equal(classifyGeminiError({ response: { status: 401 } }), 'authentication');
  assert.equal(classifyGeminiError({ response: { status: 404 } }), 'model_not_found');
  assert.equal(classifyGeminiError({ response: { status: 429 } }), 'rate_limited');
  assert.equal(classifyGeminiError({ code: 'ETIMEDOUT' }), 'timeout');
  assert.equal(classifyGeminiError({ response: { status: 500 } }), 'http_error');
});

test('checks configured Gemini models without exposing API credentials', async () => {
  await withEnvironment({ GEMINI_API_KEY: 'private-test-key' }, async () => withAdapter(async (config) => {
    assert.equal(config.headers['x-goog-api-key'], 'private-test-key');
    return response(config, { name: config.url });
  }, async () => {
    const status = await getGeminiStatus();
    assert.deepEqual(status, {
      available: true,
      chatModelAvailable: true,
      embeddingModelAvailable: true,
      configurationValid: true,
    });
    assert.equal(JSON.stringify(status).includes('private-test-key'), false);
  }));
});
