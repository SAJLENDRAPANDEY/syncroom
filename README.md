# 🎬 SyncRoom — Real-Time YouTube Watch Party

<p align="center">
  <b>Watch together. Stay in sync.</b>
</p>

<p align="center">
  <a href="https://syncroom-seven.vercel.app/"><img alt="Frontend" src="https://img.shields.io/badge/Frontend-Live-brightgreen"></a>
  <a href="https://syncroom-backend-ciwc.onrender.com/health"><img alt="Backend" src="https://img.shields.io/badge/Backend-Live-blue"></a>
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow">
</p>

SyncRoom is a real-time YouTube watch-party application that lets multiple users join the same room and watch a YouTube video together with fully synchronized playback. Built on **Socket.IO/WebSockets** for low-latency communication, it ships a role-based permission system with **Host, Moderator, and Participant** roles — so playback control, chat, and reactions all stay coordinated across every connected client.

---

## 🌐 Live Demo

| Service | Link |
|---|---|
| 🖥️ Frontend | [syncroom-seven.vercel.app](https://syncroom-seven.vercel.app/) |
| ⚙️ Backend | [syncroom-backend-ciwc.onrender.com](https://syncroom-backend-ciwc.onrender.com/) |
| 💓 Health Check | [/health](https://syncroom-backend-ciwc.onrender.com/health) |

---

## 📌 Project Overview

Watching a YouTube video together remotely gets messy fast when every participant controls their own player independently — someone pauses, someone seeks ahead, and the group falls out of sync within seconds.

**SyncRoom solves this** by maintaining a single source of truth for room state on the server and broadcasting every meaningful playback action to all connected clients in real time.

When a permitted user performs an action — **play, pause, seek, or change video** — that action is sent to the backend via Socket.IO. The backend validates the user's role, updates the authoritative room state, and broadcasts the result to every other participant. This gives a truly synchronized watch-party experience without the overhead and latency of continuously polling a REST API.

---

## ✨ Features

### 🏠 Room Management
- Create a unique watch room with a shareable room code.
- Join an existing room using its room code.
- Automatic **Host** assignment to the room creator.
- New joiners are assigned the **Participant** role by default.
- Full room state (video, playback position, participant list) syncs instantly on join.

### 🎬 YouTube Integration
- Native **YouTube IFrame Player** integration.
- Load videos via video ID or supported YouTube URLs.
- Real-time play / pause / seek synchronization.
- Live video-change broadcasting to the whole room.
- Initial playback state sync for participants joining mid-session.
- Custom fullscreen support.
- Restricted native YouTube keyboard shortcuts for non-privileged participants.

### 👥 Role-Based Access Control

| Role | Permissions |
|---|---|
| 👑 **Host** | Full room + playback control |
| 🛡️ **Moderator** | Playback + video control |
| 👤 **Participant** | Watch, chat, react, and request control |

**Host**
Automatically assigned to whoever creates the room.
- Play / Pause / Seek video
- Change video
- Assign Moderator role
- Remove participants
- Transfer Host role
- Approve or deny control requests

**Moderator**
- Play / Pause / Seek video
- Change video
- Chat and send reactions

**Participant**
- Watch the synchronized stream
- Send chat messages and emoji reactions
- Request playback control
- View the live participant list
- ❌ Cannot directly control playback

---

## 🔐 Server-Side Authorization

SyncRoom never trusts the frontend alone to enforce permissions — **every privileged Socket.IO action is re-validated on the backend.**

```text
Client
   │
   │  play / pause / seek / change-video request
   ▼
Socket.IO Server
   │
   ├── Is the user actually inside this room?
   ├── What role does this user hold?
   ├── Is that role permitted to perform this action?
   │
   └── ✅ Validated → broadcast updated state
       ❌ Rejected  → action ignored, no broadcast
   ▼
Other Room Participants
```

This ensures a malicious or modified client cannot bypass the UI and issue unauthorized playback commands — the server is the single source of truth for both **room state** and **permissions**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Real-time Communication | Socket.IO / WebSockets |
| Video Playback | YouTube IFrame Player API |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm or yarn

### Clone the repository
```bash
git clone https://github.com/<your-username>/syncroom.git
cd syncroom
```

### Backend setup
```bash
cd backend
npm install
npm run dev
```

### Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### Environment variables
Create a `.env` file in the backend directory:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
```

And in the frontend directory:
```env
VITE_BACKEND_URL=http://localhost:5000
```

---

## 📂 Project Structure

```text
syncroom/
├── backend/
│   ├── src/
│   │   ├── sockets/       # Socket.IO event handlers
│   │   ├── rooms/         # Room state management
│   │   └── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # UI components (player, chat, controls)
│   │   ├── hooks/         # Socket + room state hooks
│   │   └── pages/
│   └── package.json
└── README.md
```

---

## 🗺️ Roadmap

- [ ] Persistent room history
- [ ] Support for additional video sources
- [ ] Voice chat integration
- [ ] Mobile-optimized UI

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ for watching videos together, in sync.</p>
