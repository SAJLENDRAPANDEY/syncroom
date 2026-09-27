interface Props {
  connected: boolean;
  driftSeconds: number;
}

export default function SyncIndicator({ connected, driftSeconds }: Props) {
  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Reconnecting...
      </span>
    );
  }

  const abs = Math.abs(driftSeconds);
  const state =
    abs > 1.2 ? { color: 'text-red-400', dot: 'bg-red-500', label: 'Out of sync' } :
    abs > 0.4 ? { color: 'text-amber-400', dot: 'bg-amber-500', label: 'Syncing' } :
    { color: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Synced' };

  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${state.color}`}>
      <span className={`w-2 h-2 rounded-full ${state.dot}`} />
      {state.label} · {driftSeconds >= 0 ? '+' : ''}{driftSeconds.toFixed(2)}s
    </span>
  );
}
