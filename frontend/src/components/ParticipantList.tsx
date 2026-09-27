import type { Participant } from '../types/room';

interface Props {
  participants: Participant[];
  myId: string | undefined;
  isHost: boolean;
  onAssignRole: (targetId: string, role: 'MODERATOR' | 'PARTICIPANT') => void;
  onRemove: (targetId: string) => void;
  onTransferHost: (targetId: string) => void;
}

const ROLE_BADGE: Record<string, { icon: string; label: string; color: string }> = {
  HOST: { icon: '👑', label: 'Host', color: 'text-amber-400' },
  MODERATOR: { icon: '🛡', label: 'Moderator', color: 'text-emerald-400' },
  PARTICIPANT: { icon: '👤', label: 'Participant', color: 'text-slate-400' },
};

export default function ParticipantList({ participants, myId, isHost, onAssignRole, onRemove, onTransferHost }: Props) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
        Room members ({participants.length})
      </h3>

      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
        {participants.map((p) => {
          const badge = ROLE_BADGE[p.role];
          const isMe = p.id === myId;

          return (
            <div key={p.id} className="flex items-center justify-between gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-100 truncate">
                  {p.username} {isMe && <span className="text-slate-500">(you)</span>}
                </p>
                <p className={`text-xs ${badge.color}`}>{badge.icon} {badge.label}</p>
              </div>

              {isHost && !isMe && (
                <div className="flex items-center gap-1 shrink-0">
                  {p.role === 'PARTICIPANT' ? (
                    <button onClick={() => onAssignRole(p.id, 'MODERATOR')} title="Promote to moderator"
                      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-emerald-400">
                      +Mod
                    </button>
                  ) : (
                    <button onClick={() => onAssignRole(p.id, 'PARTICIPANT')} title="Demote to participant"
                      className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400">
                      -Mod
                    </button>
                  )}
                  <button onClick={() => onTransferHost(p.id)} title="Make host"
                    className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-amber-400">
                    👑
                  </button>
                  <button onClick={() => onRemove(p.id)} title="Remove from room"
                    className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-red-900 text-red-400">
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
