const roomService = require('../services/roomService');

/**
 * Extract a YouTube video ID from:
 *
 * - Raw 11-character YouTube ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 */
function extractYouTubeId(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const value = input.trim();

  /**
   * Already a raw YouTube video ID.
   */
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?.*?[&?]v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const regex of patterns) {
    const match = value.match(regex);

    if (match) {
      return match[1];
    }
  }

  /**
   * Final URL-based fallback.
   *
   * This handles normal YouTube URLs with query parameters
   * such as:
   *
   * https://www.youtube.com/watch?v=VIDEO_ID&t=30
   */
  try {
    const url = new URL(value);

    const hostname =
      url.hostname.toLowerCase();

    if (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com'
    ) {
      const queryVideoId =
        url.searchParams.get('v');

      if (
        queryVideoId &&
        /^[a-zA-Z0-9_-]{11}$/.test(
          queryVideoId
        )
      ) {
        return queryVideoId;
      }

      const pathParts =
        url.pathname
          .split('/')
          .filter(Boolean);

      const embedIndex =
        pathParts.indexOf('embed');

      const shortsIndex =
        pathParts.indexOf('shorts');

      const pathIndex =
        embedIndex !== -1
          ? embedIndex
          : shortsIndex;

      if (
        pathIndex !== -1 &&
        pathParts[pathIndex + 1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(
          pathParts[pathIndex + 1]
        )
      ) {
        return pathParts[pathIndex + 1];
      }
    }

    if (
      hostname === 'youtu.be' &&
      url.pathname
    ) {
      const id =
        url.pathname
          .replace(/^\/+/, '')
          .split('/')[0];

      if (
        /^[a-zA-Z0-9_-]{11}$/.test(id)
      ) {
        return id;
      }
    }
  } catch {
    // Invalid URL. Return null below.
  }

  return null;
}

/**
 * Convert and validate playback time.
 *
 * We never allow NaN, Infinity, or negative values
 * to enter room state.
 */
function normalizeTime(value) {
  const time = Number(value);

  if (!Number.isFinite(time)) {
    return null;
  }

  return Math.max(0, time);
}

/**
 * Keep room IDs consistent everywhere.
 */
function normalizeRoomId(roomId) {
  if (
    typeof roomId !== 'string' ||
    !roomId.trim()
  ) {
    return null;
  }

  return roomId.trim().toUpperCase();
}

/**
 * Register all room/socket events.
 */
function registerRoomEvents(io, socket) {

  // ============================================================
  // CREATE ROOM
  // ============================================================

  socket.on(
    'create_room',
    ({ username }, callback) => {
      const safeUsername =
        String(username || 'Host')
          .trim()
          .slice(0, 30) ||
        'Host';

      const room =
        roomService.createRoom(
          socket.id,
          safeUsername
        );

      socket.join(room.roomId);

      socket.data.roomId =
        room.roomId;

      socket.data.username =
        safeUsername;

      callback?.({
        ok: true,
        room:
          roomService.serializeRoom(
            room
          ),
      });
    }
  );

  // ============================================================
  // JOIN ROOM
  // ============================================================

  socket.on(
    'join_room',
    ({ roomId, username }, callback) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        callback?.({
          ok: false,
          reason:
            'Invalid room code',
        });

        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (!room) {
        callback?.({
          ok: false,
          reason:
            'Room not found',
        });

        return;
      }

      const safeUsername =
        String(username || 'Guest')
          .trim()
          .slice(0, 30) ||
        'Guest';

      /**
       * Important:
       *
       * Do not add the same socket twice.
       *
       * This prevents the room creator from being
       * converted into an additional Participant when
       * Room.tsx sends join_room after create_room.
       */
      const existingParticipant =
        roomService.getParticipant(
          room,
          socket.id
        );

      if (!existingParticipant) {
        roomService.joinRoom(
          room.roomId,
          socket.id,
          safeUsername
        );
      }

      socket.join(
        room.roomId
      );

      socket.data.roomId =
        room.roomId;

      socket.data.username =
        existingParticipant?.username ||
        safeUsername;

      const participant =
        roomService.getParticipant(
          room,
          socket.id
        );

      callback?.({
        ok: true,
        room:
          roomService.serializeRoom(
            room
          ),
      });

      /**
       * Notify other users only when this is
       * actually a new participant.
       */
      if (!existingParticipant) {
        socket
          .to(room.roomId)
          .emit(
            'user_joined',
            {
              participant,
            }
          );
      }

      /**
       * Everyone gets the authoritative room state.
       */
      io.to(room.roomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // PLAY
  // ============================================================

  socket.on(
    'play',
    ({ roomId, currentTime }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      const time =
        normalizeTime(currentTime);

      if (
        !normalizedRoomId ||
        time === null
      ) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (
        !room ||
        !roomService.canControlPlayback(
          room,
          socket.id
        )
      ) {
        return;
      }

      const video =
        roomService.updateVideoState(
          room,
          {
            isPlaying: true,
            currentTime: time,
          }
        );

      /**
       * IMPORTANT:
       *
       * Broadcast to everyone EXCEPT the sender.
       *
       * The Host already changed their own player.
       */
      socket
        .to(normalizedRoomId)
        .emit(
          'play',
          {
            currentTime:
              video.currentTime,
          }
        );

      /**
       * Send authoritative room state as well.
       */
      io.to(normalizedRoomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // PAUSE
  // ============================================================

  socket.on(
    'pause',
    ({ roomId, currentTime }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      const time =
        normalizeTime(currentTime);

      if (
        !normalizedRoomId ||
        time === null
      ) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (
        !room ||
        !roomService.canControlPlayback(
          room,
          socket.id
        )
      ) {
        return;
      }

      const video =
        roomService.updateVideoState(
          room,
          {
            isPlaying: false,
            currentTime: time,
          }
        );

      socket
        .to(normalizedRoomId)
        .emit(
          'pause',
          {
            currentTime:
              video.currentTime,
          }
        );

      io.to(normalizedRoomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // SEEK
  // ============================================================

  socket.on(
    'seek',
    ({ roomId, currentTime }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      const time =
        normalizeTime(currentTime);

      if (
        !normalizedRoomId ||
        time === null
      ) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (
        !room ||
        !roomService.canControlPlayback(
          room,
          socket.id
        )
      ) {
        return;
      }

      const video =
        roomService.updateVideoState(
          room,
          {
            currentTime: time,
          }
        );

      /**
       * This is the event responsible for
       * synchronizing seek/skip actions.
       */
      socket
        .to(normalizedRoomId)
        .emit(
          'seek',
          {
            currentTime:
              video.currentTime,
          }
        );

      io.to(normalizedRoomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // CHANGE VIDEO
  // ============================================================

  socket.on(
    'change_video',
    ({ roomId, videoUrlOrId }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (
        !room ||
        !roomService.canControlPlayback(
          room,
          socket.id
        )
      ) {
        return;
      }

      const videoId =
        extractYouTubeId(
          videoUrlOrId
        );

      if (!videoId) {
        socket.emit(
          'action_error',
          {
            reason:
              "That doesn't look like a valid YouTube link or video ID",
          }
        );

        return;
      }

      const video =
        roomService.updateVideoState(
          room,
          {
            videoId,
            currentTime: 0,
            isPlaying: true,
          }
        );

      io.to(normalizedRoomId).emit(
        'change_video',
        {
          videoId:
            video.videoId,
        }
      );

      io.to(normalizedRoomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // TIME SYNC
  // ============================================================

  socket.on(
    'time_sync',
    ({ roomId, currentTime }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      const time =
        normalizeTime(currentTime);

      if (
        !normalizedRoomId ||
        time === null
      ) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (
        !room ||
        !roomService.canControlPlayback(
          room,
          socket.id
        )
      ) {
        return;
      }

      roomService.updateVideoState(
        room,
        {
          currentTime: time,
        }
      );

      /**
       * Host is authoritative.
       *
       * Send the current clock to every other client.
       */
      socket
        .to(normalizedRoomId)
        .emit(
          'time_sync',
          {
            currentTime: time,
          }
        );
    }
  );

  // ============================================================
  // ASSIGN ROLE
  // ============================================================

  socket.on(
    'assign_role',
    ({ roomId, targetId, role }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (!room) {
        return;
      }

      const result =
        roomService.assignRole(
          room,
          socket.id,
          targetId,
          role
        );

      if (!result.ok) {
        socket.emit(
          'action_error',
          {
            reason:
              result.reason,
          }
        );

        return;
      }

      io.to(normalizedRoomId).emit(
        'role_assigned',
        {
          participant:
            result.participant,
        }
      );

      io.to(normalizedRoomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // REMOVE PARTICIPANT
  // ============================================================

  socket.on(
    'remove_participant',
    ({ roomId, targetId }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (!room) {
        return;
      }

      const result =
        roomService.removeParticipant(
          room,
          socket.id,
          targetId
        );

      if (!result.ok) {
        socket.emit(
          'action_error',
          {
            reason:
              result.reason,
          }
        );

        return;
      }

      io.to(normalizedRoomId).emit(
        'participant_removed',
        {
          targetId,
          username:
            result.removed.username,
        }
      );

      const targetSocket =
        io.sockets.sockets.get(
          targetId
        );

      targetSocket?.leave(
        normalizedRoomId
      );

      targetSocket?.emit(
        'you_were_removed'
      );

      io.to(normalizedRoomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // TRANSFER HOST
  // ============================================================

  socket.on(
    'transfer_host',
    ({ roomId, targetId }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (!room) {
        return;
      }

      const result =
        roomService.transferHost(
          room,
          socket.id,
          targetId
        );

      if (!result.ok) {
        socket.emit(
          'action_error',
          {
            reason:
              result.reason,
          }
        );

        return;
      }

      io.to(normalizedRoomId).emit(
        'room_state',
        roomService.serializeRoom(
          room
        )
      );
    }
  );

  // ============================================================
  // CONTROL REQUEST
  // ============================================================

  socket.on(
    'request_control',
    ({
      roomId,
      action,
      payload,
    }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (!room) {
        return;
      }

      const request =
        roomService.addPendingRequest(
          room,
          socket.id,
          action,
          payload
        );

      if (!request) {
        return;
      }

      room.participants.forEach(
        (participant) => {
          if (
            participant.role ===
              'HOST' ||
            participant.role ===
              'MODERATOR'
          ) {
            io.to(
              participant.id
            ).emit(
              'control_request',
              request
            );
          }
        }
      );
    }
  );

  // ============================================================
  // RESOLVE CONTROL REQUEST
  // ============================================================

  socket.on(
    'resolve_request',
    ({
      roomId,
      requestId,
      approve,
    }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (
        !room ||
        !roomService.canControlPlayback(
          room,
          socket.id
        )
      ) {
        return;
      }

      const request =
        roomService.resolvePendingRequest(
          room,
          requestId
        );

      if (!request) {
        return;
      }

      io.to(normalizedRoomId).emit(
        'request_resolved',
        {
          requestId,
          approve,
        }
      );

      if (!approve) {
        return;
      }

      const {
        action,
        payload,
      } = request;

      // --------------------------------------------------------
      // APPROVED PLAY
      // --------------------------------------------------------

      if (action === 'play') {
        const time =
          normalizeTime(
            payload?.currentTime
          ) ??
          normalizeTime(
            room.video.currentTime
          ) ??
          0;

        const video =
          roomService.updateVideoState(
            room,
            {
              isPlaying: true,
              currentTime: time,
            }
          );

        io.to(normalizedRoomId).emit(
          'play',
          {
            currentTime:
              video.currentTime,
          }
        );

        return;
      }

      // --------------------------------------------------------
      // APPROVED PAUSE
      // --------------------------------------------------------

      if (action === 'pause') {
        const time =
          normalizeTime(
            payload?.currentTime
          ) ??
          normalizeTime(
            room.video.currentTime
          ) ??
          0;

        const video =
          roomService.updateVideoState(
            room,
            {
              isPlaying: false,
              currentTime: time,
            }
          );

        io.to(normalizedRoomId).emit(
          'pause',
          {
            currentTime:
              video.currentTime,
          }
        );

        return;
      }

      // --------------------------------------------------------
      // APPROVED SEEK
      // --------------------------------------------------------

      if (action === 'seek') {
        const time =
          normalizeTime(
            payload?.currentTime
          );

        if (time === null) {
          return;
        }

        const video =
          roomService.updateVideoState(
            room,
            {
              currentTime: time,
            }
          );

        io.to(normalizedRoomId).emit(
          'seek',
          {
            currentTime:
              video.currentTime,
          }
        );

        return;
      }

      // --------------------------------------------------------
      // APPROVED VIDEO CHANGE
      // --------------------------------------------------------

      if (
        action ===
        'change_video'
      ) {
        const videoId =
          extractYouTubeId(
            payload?.videoUrlOrId
          );

        if (!videoId) {
          socket.emit(
            'action_error',
            {
              reason:
                "That doesn't look like a valid YouTube link or video ID",
            }
          );

          return;
        }

        const video =
          roomService.updateVideoState(
            room,
            {
              videoId,
              currentTime: 0,
              isPlaying: true,
            }
          );

        io.to(normalizedRoomId).emit(
          'change_video',
          {
            videoId:
              video.videoId,
          }
        );

        return;
      }
    }
  );

  // ============================================================
  // CHAT
  // ============================================================

  socket.on(
    'chat_message',
    ({ roomId, message }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (
        !normalizedRoomId ||
        !message?.trim()
      ) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      if (!room) {
        return;
      }

      const chatMessage =
        roomService.addChatMessage(
          room,
          socket.id,
          message.trim()
        );

      if (chatMessage) {
        io.to(
          normalizedRoomId
        ).emit(
          'chat_message',
          chatMessage
        );
      }
    }
  );

  // ============================================================
  // REACTION
  // ============================================================

  socket.on(
    'reaction',
    ({ roomId, emoji }) => {
      const normalizedRoomId =
        normalizeRoomId(roomId);

      if (!normalizedRoomId) {
        return;
      }

      const room =
        roomService.getRoom(
          normalizedRoomId
        );

      const participant =
        room &&
        roomService.getParticipant(
          room,
          socket.id
        );

      if (
        !room ||
        !participant ||
        !emoji
      ) {
        return;
      }

      io.to(
        normalizedRoomId
      ).emit(
        'reaction',
        {
          emoji,
          username:
            participant.username,
        }
      );
    }
  );

  // ============================================================
  // DISCONNECT
  // ============================================================

  socket.on(
    'disconnect',
    () => {
      const roomId =
        socket.data.roomId;

      if (!roomId) {
        return;
      }

      const result =
        roomService.leaveRoom(
          roomId,
          socket.id
        );

      if (!result) {
        return;
      }

      socket
        .to(roomId)
        .emit(
          'user_left',
          {
            participantId:
              socket.id,
          }
        );

      if (result.room) {
        if (result.newHostId) {
          io.to(
            result.newHostId
          ).emit(
            'you_are_now_host'
          );
        }

        io.to(roomId).emit(
          'room_state',
          roomService.serializeRoom(
            result.room
          )
        );
      }
    }
  );
}

module.exports = {
  registerRoomEvents,
  extractYouTubeId,
};