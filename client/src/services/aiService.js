import api from './api';

export async function getAssistantHealth() {
  try {
    const { data } = await api.get('/ai/health', { timeout: 8000 });
    return data;
  } catch (error) {
    if (error.response?.data) return error.response.data;
    throw error;
  }
}

export async function getConversations() {
  const { data } = await api.get('/ai/conversations');
  return data.conversations;
}

export async function getConversationHistory(conversationId) {
  const { data } = await api.get('/ai/history', { params: { conversationId } });
  return data.messages;
}

export async function sendAssistantMessage(message, conversationId) {
  const { data } = await api.post(
    '/ai/chat',
    { message, ...(conversationId ? { conversationId } : {}) },
    { timeout: 200000 },
  );
  return data;
}

export async function deleteConversation(conversationId) {
  const { data } = await api.delete(`/ai/conversations/${conversationId}`);
  return data;
}

export async function renameConversation(conversationId, title) {
  const { data } = await api.patch(`/ai/conversations/${conversationId}`, { title });
  return data;
}

export async function submitAssistantFeedback(messageId, feedback) {
  const { data } = await api.post('/ai/feedback', { messageId, feedback });
  return data;
}
