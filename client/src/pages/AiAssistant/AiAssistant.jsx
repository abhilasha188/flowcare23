import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  Clipboard,
  HeartPulse,
  LoaderCircle,
  MessageCircle,
  PencilLine,
  Plus,
  Search,
  Send,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
} from 'lucide-react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getApiErrorMessage } from '../../services/api';
import {
  deleteConversation,
  getAssistantHealth,
  getConversationHistory,
  getConversations,
  renameConversation,
  sendAssistantMessage,
  submitAssistantFeedback,
} from '../../services/aiService';

const suggestedQuestions = [
  { title: 'Understand my cycle', text: 'What does a cycle estimate mean?', icon: HeartPulse },
  { title: 'Track a period', text: 'What information should I track in a period diary?', icon: MessageCircle },
  { title: 'Period symptoms', text: 'Where can I find reliable information about period pain?', icon: ShieldCheck },
  { title: 'PMS & wellbeing', text: 'What general information is available about premenstrual symptoms?', icon: HeartPulse },
  { title: 'Nutrition & wellness', text: 'What general nutrition information does the NHS provide?', icon: ShieldCheck },
  { title: 'Cycle changes', text: 'Where can I find reliable information about changes in periods?', icon: Search },
];

function renderInlineMarkdown(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`') && token.endsWith('`')) return <code key={index}>{token.slice(1, -1)}</code>;
    if (token.startsWith('*') && token.endsWith('*')) return <em key={index}>{token.slice(1, -1)}</em>;
    return token;
  });
}

function renderMessage(message) {
  const blocks = message.split(/\n{2,}/);
  return blocks.map((block, index) => {
    const lines = block.split('\n');
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
      return <ul key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ''))}</li>)}</ul>;
    }
    if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) {
      return <ol key={index}>{lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineMarkdown(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>)}</ol>;
    }
    const heading = block.match(/^#{1,3}\s+(.+)$/);
    if (heading) return <h3 key={index}>{renderInlineMarkdown(heading[1])}</h3>;
    return <p key={index}>{lines.map((line, lineIndex) => (
      <Fragment key={lineIndex}>{lineIndex > 0 && <br />}{renderInlineMarkdown(line)}</Fragment>
    ))}</p>;
  });
}

function AiAssistant() {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadedConversationId, setLoadedConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState('');
  const [assistantHealth, setAssistantHealth] = useState(null);
  const [retryQuestion, setRetryQuestion] = useState('');
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const bottomRef = useRef(null);
  const historyLoading = Boolean(conversationId) && loadedConversationId !== conversationId;
  const chatBusy = sending || historyLoading;
  const visibleConversations = conversations.filter((item) => item.title.toLowerCase().includes(search.trim().toLowerCase()));
  const selectedConversation = conversations.find((item) => item.conversationId === conversationId);
  const assistantReady = Boolean(assistantHealth?.success && assistantHealth?.ollama?.chatModelAvailable
    && assistantHealth?.ollama?.embeddingModelAvailable && assistantHealth?.database === 'available');

  useEffect(() => {
    let active = true;
    getAssistantHealth()
      .then((health) => { if (active) setAssistantHealth(health); })
      .catch(() => { if (active) setAssistantHealth(null); });
    return () => { active = false; };
  }, []);

  const refreshConversations = useCallback(async () => {
    const items = await getConversations();
    setConversations(items);
    return items;
  }, []);

  useEffect(() => {
    let active = true;
    getConversations()
      .then((items) => {
        if (!active) return;
        setConversations(items);
        if (items.length) setConversationId(items[0].conversationId);
      })
      .catch((requestError) => {
        if (active) setHistoryError(getApiErrorMessage(requestError, 'Could not load previous conversations.'));
      })
      .finally(() => {
        if (active) setLoadingConversations(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!conversationId) return () => { active = false; };
    getConversationHistory(conversationId)
      .then((items) => {
        if (!active) return;
        setMessages(items);
        setLoadedConversationId(conversationId);
      })
      .catch((requestError) => {
        if (!active) return;
        setHistoryError(getApiErrorMessage(requestError, 'Could not load this conversation.'));
        setLoadedConversationId(conversationId);
      });
    return () => { active = false; };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  async function submitQuestion(event, question = input) {
    event?.preventDefault();
    const text = question.trim();
    if (!text || sending) return;

    setError('');
    setCopyError('');
    setRetryQuestion('');
    setSending(true);
    try {
      const result = await sendAssistantMessage(text, conversationId);
      setConversationId(result.conversationId);
      setMessages((current) => [...current, ...result.messages]);
      setInput('');
      try {
        await refreshConversations();
      } catch (requestError) {
        setHistoryError(getApiErrorMessage(requestError, 'Could not refresh conversation history.'));
      }
    } catch (requestError) {
      setInput(text);
      setRetryQuestion(text);
      setError(getApiErrorMessage(requestError, 'The assistant could not respond. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  function startConversation() {
    setConversationId(null);
    setLoadedConversationId(null);
    setMessages([]);
    setInput('');
    setError('');
    setHistoryError('');
    setMobileHistoryOpen(false);
    setRetryQuestion('');
  }

  async function saveConversationTitle(event) {
    event.preventDefault();
    if (!renameTarget || renaming) return;
    const title = renameDraft.trim();
    if (!title) return;
    setRenaming(true);
    setHistoryError('');
    try {
      await renameConversation(renameTarget.conversationId, title);
      setConversations((current) => current.map((item) => (
        item.conversationId === renameTarget.conversationId ? { ...item, title } : item
      )));
      setRenameTarget(null);
      setRenameDraft('');
    } catch (requestError) {
      setHistoryError(getApiErrorMessage(requestError, 'Could not rename this conversation.'));
    } finally {
      setRenaming(false);
    }
  }

  async function copyMessage(message) {
    setCopyError('');
    try {
      await navigator.clipboard.writeText(message.message);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(''), 1800);
    } catch {
      setCopyError('Could not copy this response. Check your browser clipboard permissions.');
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteConversation(pendingDelete.conversationId);
      const remaining = conversations.filter((item) => item.conversationId !== pendingDelete.conversationId);
      setConversations(remaining);
      if (conversationId === pendingDelete.conversationId) {
        setConversationId(remaining[0]?.conversationId || null);
        setMessages([]);
      }
      setPendingDelete(null);
    } catch (requestError) {
      setHistoryError(getApiErrorMessage(requestError, 'Could not delete this conversation.'));
    } finally {
      setDeleting(false);
    }
  }

  async function giveFeedback(messageId, value) {
    setFeedbackBusy(messageId);
    setError('');
    try {
      await submitAssistantFeedback(messageId, value);
      setMessages((current) => current.map((item) => (
        item.id === messageId ? { ...item, feedback: value } : item
      )));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Could not save your feedback.'));
    } finally {
      setFeedbackBusy('');
    }
  }

  return (
    <div className="feature-page ai-page">
      <header className="feature-heading ai-heading">
        <div>
          <span className="section-eyebrow">REVIEWED HEALTH INFORMATION</span>
          <h2>AI menstrual health assistant</h2>
          <p>Ask general questions and explore educational sources. This assistant cannot diagnose or provide treatment.</p>
        </div>
        <span className="feature-heading-icon"><Bot size={21} /></span>
      </header>

      <div className="ai-privacy-note" role="note">
        <ShieldCheck size={18} />
        <span>Your cycle and symptom records are not attached. Your question and recent chat context are sent to the configured Ollama service to generate a reply.</span>
      </div>

      <div className="ai-workspace">
        <aside className={`ai-conversation-panel${mobileHistoryOpen ? ' is-mobile-open' : ''}`} aria-label="Conversation history">
          <div className="ai-history-heading">
            <div><span className="section-eyebrow">YOUR CHATS</span><h3>History</h3></div>
            <button className="button button-outline ai-new-chat" type="button" onClick={startConversation}>
              <Plus size={16} /><span>New</span>
            </button>
          </div>
          <label className="ai-search">
            <Search size={15} />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
          </label>
          {historyError && <p className="ai-inline-error" role="alert">{historyError}</p>}
          {loadingConversations && !conversations.length
            ? <div className="ai-history-skeleton" role="status" aria-label="Loading conversations"><span /><span /><span /></div>
            : visibleConversations.length === 0
              ? <p className="ai-history-empty">{conversations.length ? 'No conversations match your search.' : 'Your saved conversations will appear here.'}</p>
              : (
                <ul className="ai-conversation-list">
                  {visibleConversations.map((item) => (
                    <li key={item.conversationId}>
                      <button
                        type="button"
                        className={`ai-conversation${conversationId === item.conversationId ? ' is-selected' : ''}`}
                        onClick={() => { setConversationId(item.conversationId); setMobileHistoryOpen(false); }}
                        title={item.title}
                      >
                        <MessageCircle size={16} />
                        <span><strong>{item.title}</strong><small>{new Date(item.lastMessageAt).toLocaleDateString()}</small></span>
                      </button>
                      <div className="ai-conversation-actions">
                        <button className="ai-delete-chat" type="button" aria-label={`Rename conversation: ${item.title}`} onClick={() => { setRenameTarget(item); setRenameDraft(item.title); }}>
                          <PencilLine size={14} />
                        </button>
                        <button className="ai-delete-chat" type="button" aria-label={`Delete conversation: ${item.title}`} onClick={() => setPendingDelete(item)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          {renameTarget && (
            <form className="ai-rename-form" onSubmit={saveConversationTitle}>
              <label htmlFor="conversation-title">Conversation title</label>
              <input id="conversation-title" className="plain-input" maxLength={80} value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} autoFocus />
              <div><button className="button button-muted" type="button" onClick={() => setRenameTarget(null)} disabled={renaming}>Cancel</button><button className="button button-primary" type="submit" disabled={renaming || !renameDraft.trim()}>{renaming ? 'Saving…' : 'Save title'}</button></div>
            </form>
          )}
        </aside>

        <section className="ai-chat-panel" aria-label="Chat with FlowCare">
          <div className="ai-chat-header">
            <div className="ai-chat-identity"><span className="ai-empty-icon"><Bot size={19} /></span><div><strong>FlowCare AI</strong><small className={assistantReady ? 'ai-status-ready' : 'ai-status-unavailable'}><i />{assistantHealth === null ? 'Checking availability…' : assistantReady ? 'Available' : 'Currently unavailable'}</small></div></div>
            <div className="ai-chat-header-tools"><span className="ai-current-conversation">{selectedConversation?.title || 'New conversation'}</span><button className="button button-muted ai-mobile-history-toggle" type="button" onClick={() => setMobileHistoryOpen((open) => !open)}><MessageCircle size={15} /> Chats</button></div>
          </div>
          {assistantHealth && !assistantReady && assistantHealth.message && (
            <p className="ai-service-note" role="status">{assistantHealth.message}</p>
          )}
          <div className="ai-message-list" aria-live="polite">
            {historyLoading
              ? <p className="ai-history-empty">Loading this conversation…</p>
              : messages.length === 0
                ? (
                  <div className="ai-empty-state">
                    <span className="ai-empty-icon"><Bot size={25} /></span>
                    <h3>Your menstrual health companion</h3>
                    <p>Ask general questions, understand your cycle, and explore reliable health information.</p>
                    <div className="ai-suggestions">
                      {suggestedQuestions.map(({ title, text, icon: Icon }) => (
                        <button key={title} type="button" onClick={() => submitQuestion(null, text)} disabled={chatBusy}>
                          <Icon size={17} /><span><strong>{title}</strong><small>{text}</small></span>
                        </button>
                      ))}
                    </div>
                    <small className="ai-welcome-disclaimer">Educational information only; not a substitute for professional medical advice.</small>
                  </div>
                )
                : messages.map((message) => (
                  <article className={`ai-message ai-message-${message.role}`} key={message.id}>
                    <span className="ai-avatar" aria-hidden="true">
                      {message.role === 'assistant' ? <Bot size={17} /> : <UserRound size={17} />}
                    </span>
                    <div className="ai-message-content">
                      <div className="ai-message-bubble">{renderMessage(message.message)}</div>
                      {message.role === 'assistant' && message.sources?.length > 0 && (
                        <details className="ai-sources">
                          <summary>Reviewed sources <span>{message.sources.length}</span></summary>
                          {message.sources.map((source) => <a key={`${source.url}-${source.title}`} href={source.url} target="_blank" rel="noreferrer">{source.title} <span>— {source.organization}</span></a>)}
                        </details>
                      )}
                      {message.role === 'assistant' && (
                        <div className="ai-message-toolbar">
                        <div className="ai-feedback" aria-label="Rate this answer">
                          <span>Was this helpful?</span>
                          <button
                            type="button"
                            aria-label="Helpful"
                            aria-pressed={message.feedback === 'helpful'}
                            disabled={feedbackBusy === message.id}
                            onClick={() => giveFeedback(message.id, 'helpful')}
                          ><ThumbsUp size={15} /></button>
                          <button
                            type="button"
                            aria-label="Not helpful"
                            aria-pressed={message.feedback === 'not_helpful'}
                            disabled={feedbackBusy === message.id}
                            onClick={() => giveFeedback(message.id, 'not_helpful')}
                          ><ThumbsDown size={15} /></button>
                        </div>
                        <button className="ai-copy-button" type="button" onClick={() => copyMessage(message)} aria-label="Copy response">
                          {copiedMessageId === message.id ? <Check size={14} /> : <Clipboard size={14} />}
                          {copiedMessageId === message.id ? 'Copied' : 'Copy'}
                        </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
            {sending && (
              <div className="ai-typing" role="status"><LoaderCircle size={17} className="ai-spinner" /> Searching reviewed sources and preparing a response…</div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <div className="ai-error" role="alert">
              <AlertCircle size={17} /><span>{error}</span>
              <button type="button" onClick={(event) => submitQuestion(event, retryQuestion || input)}>Retry</button>
            </div>
          )}
          {copyError && <p className="ai-inline-error" role="alert">{copyError}</p>}
          <form className="ai-composer" onSubmit={(event) => submitQuestion(event)}>
            <label className="sr-only" htmlFor="ai-question">Your question</label>
            <textarea
              id="ai-question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitQuestion(event);
                }
              }}
              maxLength={2000}
              rows={2}
              placeholder="Ask a general menstrual health question…"
              disabled={chatBusy}
            />
            <div className="ai-composer-footer">
              <small>General education only · {input.length}/2000</small>
              <button className="button button-primary" type="submit" disabled={chatBusy || !input.trim()}>
                {chatBusy ? <LoaderCircle size={16} className="ai-spinner" /> : <Send size={16} />}
                <span>Send</span>
              </button>
            </div>
          </form>
          <small className="ai-composer-disclaimer">FlowCare AI provides educational information and does not replace professional medical advice.</small>
        </section>
      </div>

      <p className="resource-disclaimer">Not medical advice. For personal concerns or urgent symptoms, contact a qualified healthcare professional or local emergency service.</p>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this conversation?"
        description="This permanently deletes the selected conversation and its messages."
        confirmLabel="Delete conversation"
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default AiAssistant;
