/**
 * src/pages/AIAssistantPage.jsx
 *
 * A simple chat UI. Every question+answer pair is saved server-side
 * (see chat.controller.js -> ChatHistory.model.js), so history is
 * loaded once on mount and new messages are appended locally as they
 * come back — no need to re-fetch the whole list after every send.
 */

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSend } from 'react-icons/fi';

import { getChatHistory, sendMessage } from '../api/chat';

const AIAssistantPage = () => {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getChatHistory();
        // Server returns newest-first (for a "history list"); a chat
        // window reads top-to-bottom oldest-first, so flip it here.
        setHistory([...res.data].reverse());
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

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message) return;

    setInput('');
    setSending(true);
    try {
      const res = await sendMessage(message);
      setHistory((prev) => [...prev, res.data]);
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

      <div className="card flex-1 overflow-y-auto space-y-4 mb-4">
        {history.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            Ask me anything about your family's portfolio.
          </p>
        )}
        {history.map((entry) => (
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
  );
};

export default AIAssistantPage;
