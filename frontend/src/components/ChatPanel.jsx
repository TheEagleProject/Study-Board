import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/apiClient';

export default function ChatPanel({ socket, roomId }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/api/rooms/${roomId}/messages`).then(({ data }) => {
      if (!cancelled) setMessages(data.data.messages);
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (!socket) return undefined;
    function handleMessage(msg) {
      setMessages((prev) => [...prev, msg]);
    }
    socket.on('chat:message', handleMessage);
    return () => socket.off('chat:message', handleMessage);
  }, [socket]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    socket.emit('chat:send', { roomId, body }, (response) => {
      setSending(false);
      if (response?.ok) setDraft('');
    });
  }

  return (
    <div className="flex h-full flex-col rounded-xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2">
        <h2 className="text-sm font-semibold text-slate-700">Room Chat</h2>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-medium text-slate-700">{m.displayName}: </span>
            <span className="text-slate-600">{m.body}</span>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Message the room..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
