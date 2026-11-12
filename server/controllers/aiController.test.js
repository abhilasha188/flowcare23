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

test('reports actionable assistant health without exposing endpoint details', () => {
  assert.equal(
    getHealthMessage(true, { available: false, endpointError: 'unreachable' }, 8),
    'The Ollama service is unreachable from the API. Check OLLAMA_BASE_URL and that its host is running.',
  );
  assert.equal(
    getHealthMessage(true, { available: false, endpointError: 'authentication' }, 8),
    'Ollama rejected the request. Check the optional OLLAMA_API_KEY bearer token.',
  );
  assert.equal(
    getHealthMessage(true, { available: true, chatModelAvailable: false }, 8),
    'The configured Ollama chat model is not installed on the service.',
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
