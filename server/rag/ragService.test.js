const test = require('node:test');
const assert = require('node:assert/strict');
const ChatMessage = require('../models/ChatMessage');
const { answerQuestion, removeUnverifiedLinks } = require('./ragService');

test('removes model-generated URLs that are not in retrieved source metadata', () => {
  const trusted = 'https://www.nhs.uk/conditions/periods/';
  const answer = removeUnverifiedLinks(`Read ${trusted} or https://made-up.example/`, [{ sourceUrl: trusted }]);

  assert.match(answer, /https:\/\/www\.nhs\.uk\/conditions\/periods\//);
  assert.doesNotMatch(answer, /made-up\.example/);
});

test('saves user and deterministic safety response under the authenticated account', async () => {
  const originalFind = ChatMessage.find;
  const originalInsertMany = ChatMessage.insertMany;
  const userId = '507f1f77bcf86cd799439011';
  const savedDocuments = [];
  ChatMessage.find = () => ({
    sort: () => ({
      limit: () => ({
        select: () => ({ lean: async () => [] }),
      }),
    }),
  });
  ChatMessage.insertMany = async (documents) => documents.map((document, index) => {
    const saved = { ...document, _id: `message-${index}`, createdAt: new Date() };
    savedDocuments.push(saved);
    return saved;
  });

  try {
    const result = await answerQuestion({ userId, message: 'Do I have PCOS?' });
    assert.equal(result.messages.length, 2);
    assert.equal(result.messages[1].role, 'assistant');
    assert.match(result.messages[1].message, /cannot diagnose/i);
    assert.deepEqual(savedDocuments.map(({ userId: savedUserId }) => savedUserId), [userId, userId]);
    assert.deepEqual(savedDocuments[1].sources, []);
  } finally {
    ChatMessage.find = originalFind;
    ChatMessage.insertMany = originalInsertMany;
  }
});
