const axios = require('axios');

const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULTS = {
  chatModel: 'gemini-3.5-flash-lite',
  embeddingModel: 'gemini-embedding-001',
  embeddingDimensions: 768,
  maxOutputTokens: 300,
  temperature: 0.2,
};

function configurationError(message) {
  return Object.assign(new Error(message), { statusCode: 503, code: 'AI_CONFIGURATION_ERROR' });
}

function positiveInteger(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw configurationError(`${name} must be a positive whole number.`);
  }
  return parsed;
}

function getGeminiConfig() {
  const temperature = Number(process.env.AI_TEMPERATURE ?? DEFAULTS.temperature);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw configurationError('AI_TEMPERATURE must be between 0 and 2.');
  }

  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || '',
    chatModel: process.env.GEMINI_CHAT_MODEL?.trim() || DEFAULTS.chatModel,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL?.trim() || DEFAULTS.embeddingModel,
    embeddingDimensions: positiveInteger(
      process.env.GEMINI_EMBEDDING_DIMENSIONS,
      DEFAULTS.embeddingDimensions,
      'GEMINI_EMBEDDING_DIMENSIONS',
    ),
    maxOutputTokens: positiveInteger(process.env.AI_MAX_OUTPUT_TOKENS, DEFAULTS.maxOutputTokens, 'AI_MAX_OUTPUT_TOKENS'),
    temperature,
  };
}

function getEmbeddingModelId(config = getGeminiConfig()) {
  return `${config.embeddingModel}:${config.embeddingDimensions}`;
}

function getRequestOptions(config, timeout) {
  return {
    timeout,
    headers: { 'x-goog-api-key': config.apiKey },
  };
}

function classifyGeminiError(error) {
  if ([401, 403].includes(error?.response?.status)) return 'authentication';
  if (error?.response?.status === 404) return 'model_not_found';
  if (error?.response?.status === 429) return 'rate_limited';
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return 'timeout';
  if (error?.response) return 'http_error';
  return 'unreachable';
}

function geminiError(operation) {
  return Object.assign(
    new Error(`Gemini ${operation} is unavailable. Check the server-side API key, model configuration, and Google AI API access.`),
    { statusCode: 503, code: 'GEMINI_UNAVAILABLE' },
  );
}

function invalidResponseError(message) {
  return Object.assign(new Error(message), { statusCode: 503, code: 'GEMINI_INVALID_RESPONSE' });
}

async function createEmbedding(text, taskType = 'RETRIEVAL_QUERY') {
  const config = getGeminiConfig();
  if (!config.apiKey) throw configurationError('GEMINI_API_KEY is not configured on the API server.');
  if (!['RETRIEVAL_QUERY', 'RETRIEVAL_DOCUMENT'].includes(taskType)) {
    throw configurationError('Gemini embedding task type is invalid.');
  }

  let response;
  try {
    response = await axios.post(
      `${API_BASE_URL}/models/${encodeURIComponent(config.embeddingModel)}:embedContent`,
      {
        model: `models/${config.embeddingModel}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: config.embeddingDimensions,
      },
      getRequestOptions(config, 120000),
    );
  } catch {
    throw geminiError('embedding');
  }

  const embedding = response.data?.embedding?.values;
  if (!Array.isArray(embedding)
    || embedding.length !== config.embeddingDimensions
    || !embedding.every(Number.isFinite)) {
    throw invalidResponseError('Gemini returned an invalid embedding vector or unexpected dimensions.');
  }
  return embedding;
}

async function generateAnswer(messages) {
  const config = getGeminiConfig();
  if (!config.apiKey) throw configurationError('GEMINI_API_KEY is not configured on the API server.');

  const systemInstruction = messages
    .filter(({ role }) => role === 'system')
    .map(({ content }) => content)
    .join('\n\n');
  const contents = messages
    .filter(({ role }) => role !== 'system')
    .map(({ role, content }) => ({
      role: role === 'assistant' || role === 'model' ? 'model' : 'user',
      parts: [{ text: content }],
    }));

  let response;
  try {
    response = await axios.post(
      `${API_BASE_URL}/models/${encodeURIComponent(config.chatModel)}:generateContent`,
      {
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        contents,
        generationConfig: {
          maxOutputTokens: config.maxOutputTokens,
          temperature: config.temperature,
        },
      },
      getRequestOptions(config, 180000),
    );
  } catch {
    throw geminiError('chat');
  }

  const answer = response.data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((text) => typeof text === 'string')
    .join('')
    .trim();
  if (!answer) throw invalidResponseError('Gemini returned an empty answer.');
  return answer;
}

async function getGeminiStatus() {
  let config;
  try {
    config = getGeminiConfig();
  } catch {
    return {
      available: false,
      chatModelAvailable: false,
      embeddingModelAvailable: false,
      configurationValid: false,
      endpointError: 'invalid_configuration',
    };
  }

  if (!config.apiKey) {
    return {
      available: false,
      chatModelAvailable: false,
      embeddingModelAvailable: false,
      configurationValid: false,
      endpointError: 'missing_api_key',
    };
  }

  const models = [
    ['chatModelAvailable', config.chatModel],
    ['embeddingModelAvailable', config.embeddingModel],
  ];
  const results = await Promise.all(models.map(async ([key, model]) => {
    try {
      await axios.get(
        `${API_BASE_URL}/models/${encodeURIComponent(model)}`,
        getRequestOptions(config, 8000),
      );
      return [key, true];
    } catch (error) {
      return [key, false, classifyGeminiError(error)];
    }
  }));
  const status = Object.fromEntries(results.map(([key, available]) => [key, available]));
  const endpointError = results.find(([, available]) => !available)?.[2];
  return {
    available: results.every(([, available]) => available),
    ...status,
    configurationValid: true,
    ...(endpointError ? { endpointError } : {}),
  };
}

module.exports = {
  classifyGeminiError,
  createEmbedding,
  generateAnswer,
  getEmbeddingModelId,
  getGeminiConfig,
  getGeminiStatus,
};
