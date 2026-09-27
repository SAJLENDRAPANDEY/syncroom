const { generateRoomCode } = require('../utils/roomCode');

// Har room ki state yahi in-memory Map me rehti hai. Chalane ke liye koi
// database chahiye hi nahi - production me chaho to isko Postgres calls se
// replace kar sakte ho, functions ka shape same rakh ke.
//
// RoomState:
// {
//   roomId, hostId,
//   video: { videoId, currentTime, isPlaying, lastUpdated },
//   participants: Map<socketId, { id, username, role }>,
//   chatMessages: [],
//   pendingRequests: Map<requestId, {...}>,
// }
const rooms = new Map();

const ROLES = {
  HOST: 'HOST',
  MODERATOR: 'MODERATOR',
  PARTICIPANT: 'PARTICIPANT',
};

function createRoom(hostSocketId, hostUsername) {
  let roomId = generateRoomCode();
  while (rooms.has(roomId)) roomId = generateRoomCode();

  const room = {
    roomId,
    hostId: hostSocketId,
    video: { videoId: null, currentTime: 0, isPlaying: false, lastUpdated: Date.now() },
    participants: new Map([
      [hostSocketId, { id: hostSocketId, username: hostUsername, role: ROLES.HOST }],
    ]),
    chatMessages: [],
    pendingRequests: new Map(),
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function getParticipant(room, socketId) {
  return room.participants.get(socketId);
}

function joinRoom(roomId, socketId, username) {
  const room = rooms.get(roomId);
  if (!room) return null;

  // Agar ye socket already room me hai (e.g. host apni hi room me
  // dobara "join" bhej deta hai jab Home -> Room page par navigate karta
  // hai), to usko overwrite mat karo warna host PARTICIPANT ban jayega.
  if (room.participants.has(socketId)) return room;

  room.participants.set(socketId, { id: socketId, username, role: ROLES.PARTICIPANT });
  return room;
}

function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.participants.delete(socketId);
  room.pendingRequests.forEach((req, reqId) => {
    if (req.requesterId === socketId) room.pendingRequests.delete(reqId);
  });

  // Room khali ho gaya -> cleanup
  if (room.participants.size === 0) {
    rooms.delete(roomId);
    return { room: null, newHostId: null };
  }

  // Host hi chala gaya -> jo sabse purana participant hai usko host bana do
  let newHostId = null;
  if (room.hostId === socketId) {
    const nextHost = room.participants.values().next().value;
    if (nextHost) {
      nextHost.role = ROLES.HOST;
      room.hostId = nextHost.id;
      newHostId = nextHost.id;
    }
  }

  return { room, newHostId };
}

function canControlPlayback(room, socketId) {
  const p = getParticipant(room, socketId);
  return !!p && (p.role === ROLES.HOST || p.role === ROLES.MODERATOR);
}

function isHost(room, socketId) {
  return room.hostId === socketId;
}

function updateVideoState(room, patch) {
  room.video = { ...room.video, ...patch, lastUpdated: Date.now() };
  return room.video;
}

function assignRole(room, actingSocketId, targetSocketId, role) {
  if (!isHost(room, actingSocketId)) return { ok: false, reason: 'Only host can assign roles' };
  if (![ROLES.MODERATOR, ROLES.PARTICIPANT].includes(role)) return { ok: false, reason: 'Invalid role' };

  const target = room.participants.get(targetSocketId);
  if (!target) return { ok: false, reason: 'Participant not found' };
  if (target.id === room.hostId) return { ok: false, reason: 'Cannot change host role directly' };

  target.role = role;
  return { ok: true, participant: target };
}

function removeParticipant(room, actingSocketId, targetSocketId) {
  if (!isHost(room, actingSocketId)) return { ok: false, reason: 'Only host can remove participants' };
  if (targetSocketId === room.hostId) return { ok: false, reason: 'Host cannot remove itself' };

  const target = room.participants.get(targetSocketId);
  if (!target) return { ok: false, reason: 'Participant not found' };

  room.participants.delete(targetSocketId);
  return { ok: true, removed: target };
}

function transferHost(room, actingSocketId, targetSocketId) {
  if (!isHost(room, actingSocketId)) return { ok: false, reason: 'Only host can transfer host' };

  const target = room.participants.get(targetSocketId);
  if (!target) return { ok: false, reason: 'Participant not found' };

  const currentHost = room.participants.get(room.hostId);
  if (currentHost) currentHost.role = ROLES.MODERATOR;
  target.role = ROLES.HOST;
  room.hostId = target.id;

  return { ok: true };
}

function addChatMessage(room, socketId, message) {
  const participant = getParticipant(room, socketId);
  if (!participant) return null;

  const chatMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    username: participant.username,
    message: String(message).slice(0, 500),
    timestamp: Date.now(),
  };

  room.chatMessages.push(chatMessage);
  if (room.chatMessages.length > 200) room.chatMessages.shift();
  return chatMessage;
}

function addPendingRequest(room, requesterId, action, payload) {
  const participant = getParticipant(room, requesterId);
  if (!participant) return null;

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const request = { id: requestId, requesterId, requesterName: participant.username, action, payload, createdAt: Date.now() };
  room.pendingRequests.set(requestId, request);
  return request;
}

function resolvePendingRequest(room, requestId) {
  const req = room.pendingRequests.get(requestId);
  if (req) room.pendingRequests.delete(requestId);
  return req;
}

function serializeRoom(room) {
  return {
    roomId: room.roomId,
    hostId: room.hostId,
    video: room.video,
    participants: Array.from(room.participants.values()),
    chatMessages: room.chatMessages,
  };
}

module.exports = {
  ROLES,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  getParticipant,
  canControlPlayback,
  isHost,
  updateVideoState,
  assignRole,
  removeParticipant,
  transferHost,
  addChatMessage,
  addPendingRequest,
  resolvePendingRequest,
  serializeRoom,
};
