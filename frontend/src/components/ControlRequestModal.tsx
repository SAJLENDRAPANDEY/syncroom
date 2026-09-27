import type { ControlRequest } from '../types/room';

interface Props {
  requests: ControlRequest[];
  onResolve: (requestId: string, approve: boolean) => void;
}

const ACTION_LABEL: Record<string, string> = {
  play: 'play the video',
  pause: 'pause the video',
  seek: 'seek the video',
  change_video: 'change the video',
};

export default function ControlRequestModal({ requests, onResolve }: Props) {
  if (requests.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 w-80">
      {requests.map((req) => (
        <div key={req.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl">
          <p className="text-sm text-slate-200 mb-3">
            🔔 <span className="font-medium">{req.requesterName}</span> wants to {ACTION_LABEL[req.action] || req.action}
            {req.action === 'change_video' && req.payload?.videoUrlOrId ? `: ${req.payload.videoUrlOrId}` : ''}
          </p>
          <div className="flex gap-2">
            <button onClick={() => onResolve(req.id, true)} className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium">
              Approve
            </button>
            <button onClick={() => onResolve(req.id, false)} className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium">
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
