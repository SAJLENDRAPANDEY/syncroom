import { useState } from 'react';

interface Props {
  canControl: boolean;
  onChangeVideo: (urlOrId: string) => void;
  onRequestChangeVideo: (urlOrId: string) => void;
  onReaction: (emoji: string) => void;
}

const REACTIONS = ['❤️', '😂', '🔥', '😮', '👏'];

export default function ControlBar({ canControl, onChangeVideo, onRequestChangeVideo, onReaction }: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    canControl ? onChangeVideo(input.trim()) : onRequestChangeVideo(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste a YouTube URL or video ID..."
          className="flex-1 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-dark text-sm font-medium transition-colors">
          {canControl ? 'Load' : 'Request'}
        </button>
      </form>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">React:</span>
        {REACTIONS.map((emoji) => (
          <button key={emoji} onClick={() => onReaction(emoji)} className="text-lg hover:scale-125 transition-transform">
            {emoji}
          </button>
        ))}
      </div>

      {!canControl && (
        <p className="text-xs text-slate-500">
          You're a participant — playback changes need host or moderator approval.
        </p>
      )}
    </div>
  );
}
