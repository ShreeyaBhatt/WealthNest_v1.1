/**
 * src/pages/AIAssistantPage.jsx
 *
 * A simple chat UI, split into separate conversations ("chats"). Every
 * question+answer pair is saved server-side (see chat.controller.js ->
 * ChatHistory.model.js) tagged with a sessionId, so this page lets you
 * start a brand new chat or pick an old one from the list to continue
 * it. The page always opens on a blank new chat — it never auto-loads
 * your last conversation for you.
 */

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiSend } from 'react-icons/fi';

import { getChatHistory, getChatSessions, sendMessage } from '../api/chat';

const AIAssistantPage = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true); // initial conversation-list load
  const [loadingChat, setLoadingChat] = useState(false); // switching conversations
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getChatSessions();
        setSessions(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load chat history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSelectSession = async (sessionId) => {
    if (sessionId === activeSessionId) return;
    setActiveSessionId(sessionId);
    setLoadingChat(true);
    try {
      const res = await getChatHistory(sessionId);
      // Server returns newest-first (for a "history list"); a chat
      // window reads top-to-bottom oldest-first, so flip it here.
      setHistory([...res.data].reverse());
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load that conversation');
    } finally {
      setLoadingChat(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setHistory([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;

    setInput('');
    setSending(true);
    try {
      const res = await sendMessage(message, activeSessionId);
      const entry = res.data;
      setHistory((prev) => [...prev, entry]);

      // Keep the conversation list in sync with what just happened —
      // no need to re-fetch the whole list from the server for this.
      if (!activeSessionId) {
        setActiveSessionId(entry.sessionId);
        setSessions((prev) => [
          {
            sessionId: entry.sessionId,
            title: message.slice(0, 60),
            lastMessageAt: entry.createdAt,
            messageCount: 1,
          },
          ...prev,
        ]);
      } else {
        setSessions((prev) => {
          const existing = prev.find((s) => s.sessionId === activeSessionId);
          const updated = {
            ...existing,
            lastMessageAt: entry.createdAt,
            messageCount: (existing?.messageCount || 0) + 1,
          };
          return [updated, ...prev.filter((s) => s.sessionId !== activeSessionId)];
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="skeleton h-64 w-full rounded-2xl" />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <h1 className="section-title mb-4">AI Assistant</h1>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* ─── Conversation list — "Continue Chat" ─────────────── */}
        <div className="card w-64 shrink-0 flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={handleNewChat}
            className="btn-primary flex items-center justify-center gap-2 mb-3 shrink-0"
          >
            <FiPlus /> New Chat
          </button>

          <div className="flex-1 overflow-y-auto space-y-1">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                No conversations yet.
              </p>
            )}
            {sessions.map((s) => (
              <button
                key={s.sessionId}
                type="button"
                onClick={() => handleSelectSession(s.sessionId)}
                title={s.title}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm truncate transition-colors ${
                  s.sessionId === activeSessionId
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {s.title || 'New conversation'}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Active conversation ──────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="card flex-1 overflow-y-auto space-y-4 mb-4">
            {loadingChat && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Loading...</p>
            )}
            {!loadingChat && history.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                Ask me anything about your family's portfolio.
              </p>
            )}
            {!loadingChat &&
              history.map((entry) => (
                <div key={entry._id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-md text-sm">
                      {entry.message}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-100 rounded-2xl rounded-bl-sm px-4 py-2 max-w-md text-sm whitespace-pre-line">
                      {entry.reply}
                    </div>
                  </div>
                </div>
              ))}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="flex gap-3">
            <input
              className="input"
              placeholder="e.g. How is my portfolio performing?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn-primary flex items-center gap-2 shrink-0" disabled={sending}>
              <FiSend /> {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;
