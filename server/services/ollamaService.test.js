const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const {
  classifyOllamaError,
  createEmbedding,
  generateAnswer,
  getOllamaConfig,
} = require('./ollamaService');

test('keeps Ollama models warm by default between assistant requests', () => {
  const originalKeepAlive = process.env.OLLAMA_KEEP_ALIVE;
  delete process.env.OLLAMA_KEEP_ALIVE;

  try {
    assert.equal(getOllamaConfig().keepAlive, '5m');
  } finally {
    if (originalKeepAlive === undefined) delete process.env.OLLAMA_KEEP_ALIVE;
    else process.env.OLLAMA_KEEP_ALIVE = originalKeepAlive;
  }
});

test('embedding request returns the actual vector dimension from Ollama', async () => {
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async (config) => ({
    data: { embeddings: [[0.1, 0.2, 0.3]] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

  try {
    assert.deepEqual(await createEmbedding('What is a period diary?'), [0.1, 0.2, 0.3]);
  } finally {
    axios.defaults.adapter = originalAdapter;
  }
});

test('chat requests use bounded configured model options and return assistant text', async () => {
  const originalAdapter = axios.defaults.adapter;
  const originalApiKey = process.env.OLLAMA_API_KEY;
  process.env.OLLAMA_API_KEY = 'test-ollama-token';
  let request;
  axios.defaults.adapter = async (config) => {
    request = config;
    return {
      data: { message: { content: 'A source-grounded answer.' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  try {
    assert.equal(await generateAnswer([{ role: 'user', content: 'A question' }]), 'A source-grounded answer.');
    assert.match(request.url, /\/api\/chat$/);
    const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data;
    assert.equal(body.options.num_ctx, 2048);
    assert.equal(body.options.num_predict, 300);
    assert.equal(body.options.temperature, 0.2);
    assert.equal(body.stream, false);
    assert.equal(request.headers.Authorization, 'Bearer test-ollama-token');
  } finally {
    axios.defaults.adapter = originalAdapter;
    if (originalApiKey === undefined) delete process.env.OLLAMA_API_KEY;
    else process.env.OLLAMA_API_KEY = originalApiKey;
  }
});

test('classifies Ollama connectivity and authentication failures without exposing response details', () => {
  assert.equal(classifyOllamaError({ code: 'ECONNREFUSED' }), 'unreachable');
  assert.equal(classifyOllamaError({ code: 'ETIMEDOUT' }), 'timeout');
  assert.equal(classifyOllamaError({ response: { status: 401 } }), 'authentication');
  assert.equal(classifyOllamaError({ response: { status: 403 } }), 'authentication');
  assert.equal(classifyOllamaError({ response: { status: 404 } }), 'not_ollama');
  assert.equal(classifyOllamaError({ response: { status: 500 } }), 'http_error');
});

test('rejects malformed vectors instead of treating them as successful embeddings', async () => {
  const originalAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async (config) => ({
    data: { embeddings: [[]] },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

  try {
    await assert.rejects(createEmbedding('question'), { code: 'OLLAMA_INVALID_RESPONSE' });
  } finally {
    axios.defaults.adapter = originalAdapter;
  }
});
