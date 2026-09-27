# SyncRoom — Real-time YouTube Watch Party

Watch together, in sync. Room-based YouTube watch party with Host / Moderator /
Participant roles, real-time playback sync over Socket.IO, control-approval
requests, chat and emoji reactions.

## Structure

```
syncroom/
├── backend/     Node.js + Express + Socket.IO
└── frontend/    React + TypeScript + Vite + Tailwind
```

## What's already set up

Both `.env` files are already created and filled in with working local
defaults — you don't need to touch them to run this on your own machine.

- `backend/.env` → `CLIENT_URL=http://localhost:5173`
- `frontend/.env` → `VITE_SOCKET_URL=http://localhost:5000`

No API key needed anywhere — the YouTube IFrame Player is free and only
needs a video ID, not an API key. (A key is only required if you later add
a "search video by title" feature using the YouTube Data API.)

## Running locally

```bash
# terminal 1
cd backend
npm install
npm run dev

# terminal 2
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in two browser tabs — create a room in one,
join with the code in the other.

## How it works

- Room state lives in memory on the backend (`backend/src/services/roomService.js`).
  No database needed to run it. If you want persistence later, swap the
  functions in that file for real DB calls — same shape, same call sites.
- Every privileged Socket.IO event is checked against the sender's role on
  the backend (`backend/src/websocket/roomEvents.js`) — hiding a button on
  the frontend is never treated as a security boundary here.
- The host emits its playback time every 5 seconds; other clients compare
  it to their own local time and only hard-seek if the drift is above
  ~0.6s, so small network jitter doesn't cause visible jumps.
- Manual seek-bar drags by the host/moderator are also picked up via a
  1-second poll of the player's current time, since YouTube's own player
  doesn't reliably fire a distinct "seek" event.

### WebSocket events
```
create_room, join_room
play, pause, seek, change_video, time_sync
assign_role, remove_participant, transfer_host
request_control, resolve_request
chat_message, reaction
room_state, user_joined, user_left, action_error, you_were_removed
```

## Deployment

**Backend → Render**
1. New Web Service, root directory `backend`
2. Build: `npm install` · Start: `npm start`
3. Env var: `CLIENT_URL=<your frontend URL, added after step below>`

**Frontend → Vercel**
1. New Project, root directory `frontend`
2. Build: `npm run build` · Output: `dist`
3. Env var: `VITE_SOCKET_URL=<your Render backend URL>`

Deploy the backend first, copy its URL into the frontend's env var and
deploy that, then go back to Render and update `CLIENT_URL` with the final
Vercel URL and redeploy. That's the only thing that changes between local
and production — nothing else in the code needs touching.

## Pushing to GitHub

```bash
cd syncroom
git init
git add .
git commit -m "SyncRoom: real-time YouTube watch party with RBAC"
git branch -M main
git remote add origin https://github.com/SAJLENDRAPANDEY/syncroom.git
git push -u origin main
```

`.gitignore` is already in place in both folders, so `node_modules`, `.env`
and `dist` won't get committed.

## Requirement checklist

| Requirement | Where |
|---|---|
| Room create/join | `roomService.js`, `Home.tsx` |
| YouTube integration | `YouTubePlayer.tsx` |
| Play/pause/seek/change-video sync | `roomEvents.js`, `useRoom.ts` |
| Host / Moderator / Participant roles | `roomService.js` |
| Backend role enforcement | `canControlPlayback`, `isHost` checks |
| Assign role / remove / transfer host | `assign_role`, `remove_participant`, `transfer_host` |
| Control request + approval | `request_control`, `resolve_request` |
| Sync health indicator + drift correction | `SyncIndicator.tsx`, `YouTubePlayer.tsx` |
| Chat + reactions | `ChatPanel.tsx`, `reaction` event |
| Connection status | `SyncIndicator.tsx` |

## Interview talking points

**Why WebSockets, not REST?** Playback sync is a real-time, bidirectional
problem — when someone with permission plays, pauses, seeks or changes the
video, the server validates their role and immediately pushes the result
to everyone else in the room. Polling would add latency and load for no
benefit here.

**How is it actually secure?** Every privileged event is re-checked against
the sender's role on the server before it's broadcast — a disabled button
on the frontend is a UX hint, not a security control.

**How is drift handled?** The room keeps one authoritative playback state
(video ID, playing/paused, current time). New joiners get it immediately.
The host also re-broadcasts its time periodically so other clients can
self-correct instead of assuming that receiving the same event means
staying perfectly in sync.
