const mongoose = require('mongoose');
const ChatMessage = require('../models/ChatMessage');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const { answerQuestion } = require('../rag/ragService');
const { getEmbeddingModelId, getGeminiConfig, getGeminiStatus } = require('../services/geminiService');

function getHealthMessage(database, gemini, knowledgeChunks, geminiChunks) {
  if (!database) return 'MongoDB is unavailable to the API service.';
  if (!gemini.configurationValid) {
    if (gemini.endpointError === 'missing_api_key') return 'GEMINI_API_KEY is not configured on the API server.';
    return 'Gemini configuration is invalid. Check the server-side model settings.';
  }
  if (gemini.endpointError === 'authentication') return 'Gemini rejected GEMINI_API_KEY. Check that the server-side key is valid and enabled.';
  if (gemini.endpointError === 'timeout') return 'Gemini did not respond before the health check timed out.';
  if (gemini.endpointError === 'rate_limited') return 'Gemini API quota or rate limits prevented the health check.';
  if (gemini.endpointError === 'http_error') return 'The Gemini API returned an HTTP error during the health check.';
  if (gemini.endpointError === 'unreachable') return 'The API server could not reach the Gemini API.';
  if (!gemini.chatModelAvailable) return 'The configured Gemini chat model is unavailable to this API key.';
  if (!gemini.embeddingModelAvailable) return 'The configured Gemini embedding model is unavailable to this API key.';
  if (!knowledgeChunks) return 'The reviewed knowledge base has not been ingested.';
  if (!geminiChunks) return 'The reviewed knowledge sources must be re-ingested with the configured Gemini embedding model before the assistant can answer.';
  return undefined;
}

async function chat(req, res, next) {
  try {
    const result = await answerQuestion({
      userId: req.user._id,
      message: req.body.message.trim(),
      conversationId: req.body.conversationId,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
}

async function history(req, res, next) {
  try {
    let { conversationId } = req.query;
    if (!conversationId) {
      const latest = await ChatMessage.findOne({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select('conversationId')
        .lean();
      conversationId = latest?.conversationId;
    }
    if (!conversationId) return res.status(200).json({ success: true, conversationId: null, messages: [] });

    const messages = await ChatMessage.find({ userId: req.user._id, conversationId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.status(200).json({
      success: true,
      conversationId,
      messages: messages.reverse().map(({ _id, role, message, sources, feedback, createdAt }) => ({
        id: _id,
        role,
        message,
        sources,
        feedback,
        createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function conversations(req, res, next) {
  try {
    const results = await ChatMessage.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
      { $sort: { conversationId: 1, createdAt: 1, role: -1 } },
      {
        $group: {
          _id: '$conversationId',
          firstUserMessage: {
            $first: { $cond: [{ $eq: ['$role', 'user'] }, '$message', null] },
          },
          conversationTitle: { $first: '$conversationTitle' },
          lastMessageAt: { $max: '$createdAt' },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          conversationId: '$_id',
          title: {
            $substrCP: [
              { $ifNull: ['$conversationTitle', { $ifNull: ['$firstUserMessage', 'Conversation'] }] },
              0,
              80,
            ],
          },
          lastMessageAt: 1,
          messageCount: 1,
        },
      },
    ]);
    return res.status(200).json({ success: true, conversations: results });
  } catch (error) {
    return next(error);
  }
}

async function deleteConversation(req, res, next) {
  try {
    const result = await ChatMessage.deleteMany({
      userId: req.user._id,
      conversationId: req.params.conversationId,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.', errors: [] });
    }
    return res.status(200).json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    return next(error);
  }
}

async function renameConversation(req, res, next) {
  try {
    const result = await ChatMessage.updateMany(
      { userId: req.user._id, conversationId: req.params.conversationId },
      { $set: { conversationTitle: req.body.title.trim() } },
      { runValidators: true },
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found.', errors: [] });
    }
    return res.status(200).json({ success: true, conversationId: req.params.conversationId, title: req.body.title.trim() });
  } catch (error) {
    return next(error);
  }
}

async function feedback(req, res, next) {
  try {
    const message = await ChatMessage.findOneAndUpdate(
      { _id: req.body.messageId, userId: req.user._id, role: 'assistant' },
      { $set: { feedback: req.body.feedback } },
      { new: true, runValidators: true },
    ).select('_id feedback');
    if (!message) return res.status(404).json({ success: false, message: 'Assistant message not found.', errors: [] });
    return res.status(200).json({ success: true, messageId: message._id, feedback: message.feedback });
  } catch (error) {
    return next(error);
  }
}

async function health(_req, res, next) {
  try {
    const [gemini, knowledgeChunks] = await Promise.all([
      getGeminiStatus(),
      KnowledgeChunk.estimatedDocumentCount(),
    ]);
    const database = mongoose.connection.readyState === 1;
    let config;
    try {
      config = getGeminiConfig();
    } catch (error) {
      return res.status(503).json({
        success: false,
        status: 'degraded',
        database: database ? 'available' : 'unavailable',
        gemini: { ...gemini, configuration: 'invalid' },
        knowledgeBase: { chunks: knowledgeChunks, geminiChunks: 0, vectorIndex: 'checked when searching' },
        message: error.message,
      });
    }
    const geminiChunks = await KnowledgeChunk.countDocuments({
      embeddingModel: getEmbeddingModelId(config),
    });
    const ready = database
      && gemini.available
      && gemini.chatModelAvailable
      && gemini.embeddingModelAvailable
      && knowledgeChunks > 0
      && geminiChunks > 0;
    const message = getHealthMessage(database, gemini, knowledgeChunks, geminiChunks);

    return res.status(ready ? 200 : 503).json({
      success: ready,
      status: ready ? 'healthy' : 'degraded',
      database: database ? 'available' : 'unavailable',
      gemini: {
        ...gemini,
        chatModel: config.chatModel,
        embeddingModel: config.embeddingModel,
        embeddingDimensions: config.embeddingDimensions,
      },
      knowledgeBase: { chunks: knowledgeChunks, geminiChunks, vectorIndex: 'checked when searching' },
      ...(!ready && message ? { message } : {}),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  chat,
  conversations,
  deleteConversation,
  feedback,
  getHealthMessage,
  health,
  history,
  renameConversation,
};
