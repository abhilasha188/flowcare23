const { randomUUID } = require('node:crypto');
const ChatMessage = require('../models/ChatMessage');
const { generateAnswer } = require('../services/ollamaService');
const { NOT_ENOUGH_INFORMATION, getDeterministicSafetyResponse } = require('./safety');
const { buildRagMessages } = require('./promptBuilder');
const { getRagConfig, retrieveRelevantChunks } = require('./retrieval');

function toSources(chunks) {
  const seen = new Set();
  return chunks.flatMap((chunk) => {
    const key = chunk.sourceUrl;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ title: chunk.title, organization: chunk.sourceName, url: chunk.sourceUrl }];
  });
}

function removeUnverifiedLinks(answer, chunks) {
  const trustedUrls = new Set(chunks.map((chunk) => chunk.sourceUrl));
  return answer.replace(/\b(?:https?:\/\/|www\.)[^\s)<>\]]+/gi, (candidate) => {
    const url = candidate.replace(/[.,!?;:]+$/, '');
    return trustedUrls.has(url) ? url : '[unverified link omitted; see Sources below]';
  });
}

async function answerQuestion({ userId, message, conversationId }) {
  const activeConversationId = conversationId || randomUUID();
  const priorMessages = await ChatMessage.find({ userId, conversationId: activeConversationId })
    .sort({ createdAt: -1 })
    .limit(4)
    .select('role message')
    .lean();
  const history = priorMessages.reverse();

  let answer = getDeterministicSafetyResponse(message);
  let sources = [];
  if (!answer) {
    const config = getRagConfig();
    const candidates = await retrieveRelevantChunks(message);
    const relevant = candidates.filter((chunk) => chunk.score >= config.relevanceThreshold);
    if (relevant.length === 0) {
      answer = NOT_ENOUGH_INFORMATION;
    } else {
      const generatedAnswer = await generateAnswer(buildRagMessages({ question: message, chunks: relevant, history }));
      answer = removeUnverifiedLinks(generatedAnswer, relevant);
      sources = toSources(relevant);
    }
  }

  const saved = await ChatMessage.insertMany([
    { userId, conversationId: activeConversationId, role: 'user', message },
    { userId, conversationId: activeConversationId, role: 'assistant', message: answer, sources },
  ]);
  return {
    conversationId: activeConversationId,
    messages: saved.map(({ _id, role, message: savedMessage, sources: savedSources, createdAt }) => ({
      id: _id,
      role,
      message: savedMessage,
      sources: savedSources,
      createdAt,
    })),
  };
}

module.exports = { answerQuestion, removeUnverifiedLinks, toSources };
