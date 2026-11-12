const axios = require('axios');

const DEFAULTS = {
  baseUrl: 'http://localhost:11434',
  chatModel: 'qwen2.5:1.5b',
  embeddingModel: 'nomic-embed-text',
  contextSize: 2048,
  keepAlive: '5m',
  maxOutputTokens: 300,
  temperature: 0.2,
};

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw Object.assign(new Error(`${name} must be a positive whole number.`), { statusCode: 503, code: 'AI_CONFIGURATION_ERROR' });
  }
  return parsed;
}

function getOllamaConfig() {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || DEFAULTS.baseUrl;
  let parsedUrl;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw Object.assign(new Error('OLLAMA_BASE_URL must be a valid HTTP or HTTPS URL.'), { statusCode: 503, code: 'AI_CONFIGURATION_ERROR' });
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw Object.assign(new Error('OLLAMA_BASE_URL must use HTTP or HTTPS.'), { statusCode: 503, code: 'AI_CONFIGURATION_ERROR' });
  }

  const temperature = Number(process.env.AI_TEMPERATURE ?? DEFAULTS.temperature);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw Object.assign(new Error('AI_TEMPERATURE must be between 0 and 2.'), { statusCode: 503, code: 'AI_CONFIGURATION_ERROR' });
  }

  return {
    baseUrl: parsedUrl.toString().replace(/\/+$/, ''),
    chatModel: process.env.OLLAMA_CHAT_MODEL?.trim() || DEFAULTS.chatModel,
    embeddingModel: process.env.OLLAMA_EMBED_MODEL?.trim() || DEFAULTS.embeddingModel,
    contextSize: positiveInteger(process.env.OLLAMA_CONTEXT_SIZE, DEFAULTS.contextSize, 'OLLAMA_CONTEXT_SIZE'),
    keepAlive: process.env.OLLAMA_KEEP_ALIVE ?? DEFAULTS.keepAlive,
    maxOutputTokens: positiveInteger(process.env.AI_MAX_OUTPUT_TOKENS, DEFAULTS.maxOutputTokens, 'AI_MAX_OUTPUT_TOKENS'),
    temperature,
  };
}

function ollamaError(operation) {
  return Object.assign(
    new Error(`Ollama ${operation} is unavailable. Check that the configured Ollama service is running and the required model is installed.`),
    { statusCode: 503, code: 'OLLAMA_UNAVAILABLE' },
  );
}

async function createEmbedding(text) {
  const config = getOllamaConfig();
  let response;
  try {
    response = await axios.post(
      `${config.baseUrl}/api/embed`,
      { model: config.embeddingModel, input: text, keep_alive: config.keepAlive },
      { timeout: 120000 },
    );
  } catch {
    throw ollamaError('embedding');
  }

  const embedding = response.data?.embeddings?.[0];
  if (!Array.isArray(embedding) || embedding.length === 0 || !embedding.every(Number.isFinite)) {
    throw Object.assign(new Error('Ollama returned an invalid embedding vector.'), {
      statusCode: 503,
      code: 'OLLAMA_INVALID_RESPONSE',
    });
  }
  return embedding;
}

async function generateAnswer(messages) {
  const config = getOllamaConfig();
  let response;
  try {
    response = await axios.post(
      `${config.baseUrl}/api/chat`,
      {
        model: config.chatModel,
        messages,
        stream: false,
        keep_alive: config.keepAlive,
        options: {
          num_ctx: config.contextSize,
          num_predict: config.maxOutputTokens,
          temperature: config.temperature,
        },
      },
      { timeout: 180000 },
    );
  } catch {
    throw ollamaError('chat');
  }

  const answer = response.data?.message?.content?.trim();
  if (!answer) {
    throw Object.assign(new Error('Ollama returned an empty answer.'), {
      statusCode: 503,
      code: 'OLLAMA_INVALID_RESPONSE',
    });
  }
  return answer;
}

async function getOllamaStatus() {
  let config;
  try {
    config = getOllamaConfig();
    const response = await axios.get(`${config.baseUrl}/api/tags`, { timeout: 5000 });
    const modelNames = (response.data?.models || []).map((model) => model.name);
    return {
      available: true,
      chatModelAvailable: modelNames.some((name) => name === config.chatModel || name.startsWith(`${config.chatModel}:`)),
      embeddingModelAvailable: modelNames.some((name) => name === config.embeddingModel || name.startsWith(`${config.embeddingModel}:`)),
      configurationValid: true,
    };
  } catch {
    return {
      available: false,
      chatModelAvailable: false,
      embeddingModelAvailable: false,
      configurationValid: Boolean(config),
    };
  }
}

module.exports = { createEmbedding, generateAnswer, getOllamaConfig, getOllamaStatus };
