const test = require('node:test');
const assert = require('node:assert/strict');
const ChatMessage = require('../models/ChatMessage');
const {
  deleteConversation,
  feedback,
  getHealthMessage,
  renameConversation,
} = require('./aiController');

function responseStub() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('reports actionable Gemini health without exposing endpoint details', () => {
  assert.equal(
    getHealthMessage(true, { configurationValid: false, endpointError: 'missing_api_key' }, 8, 0),
    'GEMINI_API_KEY is not configured on the API server.',
  );
  assert.equal(
    getHealthMessage(true, { configurationValid: true, endpointError: 'authentication' }, 8, 0),
    'Gemini rejected GEMINI_API_KEY. Check that the server-side key is valid and enabled.',
  );
  assert.equal(
    getHealthMessage(true, { configurationValid: true, chatModelAvailable: false }, 8, 8),
    'The configured Gemini chat model is unavailable to this API key.',
  );
  assert.equal(
    getHealthMessage(true, { configurationValid: true, chatModelAvailable: true, embeddingModelAvailable: true }, 8, 0),
    'The reviewed knowledge sources must be re-ingested with the configured Gemini embedding model before the assistant can answer.',
  );
});

test('feedback updates only an assistant message owned by the signed-in user', async () => {
  const originalFindOneAndUpdate = ChatMessage.findOneAndUpdate;
  const userId = '507f1f77bcf86cd799439011';
  const messageId = '507f1f77bcf86cd799439012';
  let filter;
  ChatMessage.findOneAndUpdate = (query) => {
    filter = query;
    return { select: async () => ({ _id: messageId, feedback: 'helpful' }) };
  };
  const res = responseStub();

  try {
    await feedback({ user: { _id: userId }, body: { messageId, feedback: 'helpful' } }, res, (error) => { throw error; });
    assert.deepEqual(filter, { _id: messageId, userId, role: 'assistant' });
    assert.equal(res.statusCode, 200);
  } finally {
    ChatMessage.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('conversation deletion is scoped to the signed-in user', async () => {
  const originalDeleteMany = ChatMessage.deleteMany;
  const userId = '507f1f77bcf86cd799439011';
  const conversationId = '123e4567-e89b-42d3-a456-426614174000';
  let filter;
  ChatMessage.deleteMany = async (query) => {
    filter = query;
    return { deletedCount: 2 };
  };
  const res = responseStub();

  try {
    await deleteConversation({
      user: { _id: userId },
      params: { conversationId },
    }, res, (error) => { throw error; });
    assert.deepEqual(filter, { userId, conversationId });
    assert.equal(res.statusCode, 200);
  } finally {
    ChatMessage.deleteMany = originalDeleteMany;
  }
});

test('conversation rename updates only messages owned by the signed-in user', async () => {
  const originalUpdateMany = ChatMessage.updateMany;
  const userId = '507f1f77bcf86cd799439011';
  const conversationId = '123e4567-e89b-42d3-a456-426614174000';
  let filter;
  let update;
  ChatMessage.updateMany = async (query, changes) => {
    filter = query;
    update = changes;
    return { matchedCount: 2 };
  };
  const res = responseStub();

  try {
    await renameConversation({
      user: { _id: userId },
      params: { conversationId },
      body: { title: '  Cycle notes  ' },
    }, res, (error) => { throw error; });
    assert.deepEqual(filter, { userId, conversationId });
    assert.deepEqual(update, { $set: { conversationTitle: 'Cycle notes' } });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.title, 'Cycle notes');
  } finally {
    ChatMessage.updateMany = originalUpdateMany;
  }
});
