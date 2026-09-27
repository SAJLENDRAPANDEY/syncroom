import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/room';

interface Props {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

export default function ChatPanel({ messages, onSend }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-64 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Chat
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {messages.length === 0 && <p className="text-xs text-slate-600">No messages yet — say hi 👋</p>}
        {messages.map((m) => (
          <p key={m.id} className="text-sm break-words">
            <span className="text-accent-light font-medium">{m.username}: </span>
            <span className="text-slate-200">{m.message}</span>
          </p>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-slate-800">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-800 text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-accent"
        />
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-dark text-sm font-medium transition-colors">
          Send
        </button>
      </form>
    </div>
  );
}
