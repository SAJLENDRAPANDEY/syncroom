import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socketService';
import type {
  ChatMessage,
  ControlRequest,
  Participant,
  RoomState,
} from '../types/room';

export const MY_USERNAME_KEY = 'syncroom_username';

/**
 * Commands that the YouTube player must execute.
 *
 * These commands are generated when another user:
 * - plays
 * - pauses
 * - seeks
 * - changes video
 * - sends periodic time synchronization
 */
export interface PlayerCommand {
  seq: number;
  type: 'play' | 'pause' | 'seek' | 'load' | 'sync';
  time?: number;
  videoId?: string;
}

export function useRoom(
  roomId: string | undefined,
  usernameIfCreating?: string
) {
  const navigate = useNavigate();
  const socket = getSocket();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(socket.connected);

  const [reactions, setReactions] = useState<
    { id: number; emoji: string }[]
  >([]);

  const [pendingRequests, setPendingRequests] = useState<
    ControlRequest[]
  >([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [command, setCommand] =
    useState<PlayerCommand | null>(null);

  const [drift, setDrift] = useState(0);

  /**
   * Local command sequence.
   *
   * Every command sent to YouTubePlayer receives a unique
   * sequence number.
   */
  const seqRef = useRef(0);

  /**
   * Prevent duplicate room joins.
   */
  const joinedRef = useRef(false);

  /**
   * Used to identify whether the first room state has already
   * been processed for this connection.
   */
  const initialStateAppliedRef = useRef(false);

  /**
   * Prevents commands with an invalid/duplicate sequence
   * from being applied.
   */
  const lastCommandSeqRef = useRef(0);

  const myId = socket.id;

  const me: Participant | undefined =
    room?.participants.find(
      (participant) => participant.id === myId
    );

  const canControl =
    me?.role === 'HOST' ||
    me?.role === 'MODERATOR';

  const isHost = me?.role === 'HOST';

  /**
   * Generate a command for YouTubePlayer.
   */
  const pushCommand = useCallback(
    (cmd: Omit<PlayerCommand, 'seq'>) => {
      seqRef.current += 1;

      const nextCommand: PlayerCommand = {
        ...cmd,
        seq: seqRef.current,
      };

      lastCommandSeqRef.current = nextCommand.seq;

      setCommand(nextCommand);
    },
    []
  );

  /**
   * Validate a YouTube/player time value.
   */
  const normalizeTime = useCallback(
    (value: unknown): number | null => {
      const time = Number(value);

      if (!Number.isFinite(time)) {
        return null;
      }

      if (time < 0) {
        return 0;
      }

      return time;
    },
    []
  );

  useEffect(() => {
    if (!roomId) {
      return;
    }

    /**
     * JOIN ROOM
     */
    const joinRoom = () => {
      if (joinedRef.current) {
        return;
      }

      const username =
        usernameIfCreating ||
        sessionStorage.getItem(MY_USERNAME_KEY) ||
        `Guest-${Math.floor(Math.random() * 1000)}`;

      socket.emit(
        'join_room',
        {
          roomId: roomId.trim().toUpperCase(),
          username,
        },
        (res: any) => {
          if (!res?.ok) {
            setErrorMsg(
              res?.reason ||
                'Could not join room'
            );

            return;
          }

          const initialRoom =
            res.room as RoomState;

          setRoom(initialRoom);

          joinedRef.current = true;

          /**
           * Reset command state for this connection.
           */
          seqRef.current = 0;
          lastCommandSeqRef.current = 0;
          initialStateAppliedRef.current = false;

          /**
           * IMPORTANT:
           *
           * If a participant joins an already-running room,
           * they need the current video + current time +
           * current playback state.
           *
           * Host does not need this because the Host is
           * already controlling the original player.
           */
          const currentParticipant =
            initialRoom.participants.find(
              (participant) =>
                participant.id === socket.id
            );

          const currentVideo =
            initialRoom.video;

          const currentTime =
            normalizeTime(
              currentVideo?.currentTime
            );

          if (
            currentParticipant?.role !== 'HOST' &&
            currentVideo?.videoId &&
            currentTime !== null
          ) {
            /**
             * Send initial video command.
             *
             * YouTubePlayer will load this video at
             * the authoritative current time.
             */
            pushCommand({
              type: 'load',
              videoId: currentVideo.videoId,
              time: currentTime,
            });

            /**
             * If the room is playing, the next command
             * tells the player to play at that position.
             *
             * If paused, pause command keeps the exact
             * authoritative position.
             */
            if (currentVideo.isPlaying) {
              pushCommand({
                type: 'play',
                time: currentTime,
              });
            } else {
              pushCommand({
                type: 'pause',
                time: currentTime,
              });
            }
          }

          initialStateAppliedRef.current = true;
        }
      );
    };

    /**
     * SOCKET CONNECT
     */
    const onConnect = () => {
      setConnected(true);

      /**
       * Socket.IO can reconnect with a new socket ID.
       * Therefore we must join the room again.
       */
      if (!joinedRef.current) {
        joinRoom();
      }
    };

    /**
     * SOCKET DISCONNECT
     */
    const onDisconnect = () => {
      setConnected(false);

      /**
       * After reconnect, joinRoom() must run again.
       */
      joinedRef.current = false;
      initialStateAppliedRef.current = false;
    };

    /**
     * FULL ROOM STATE
     */
    const onRoomState = (
      state: RoomState
    ) => {
      if (!state) {
        return;
      }

      setRoom(state);

      /**
       * We intentionally do NOT automatically create
       * a player command here.
       *
       * The join callback already synchronizes the initial
       * player state. This prevents the Host from having
       * their own player unexpectedly reloaded.
       */
    };

    /**
     * PLAY EVENT
     */
    const onPlay = ({
      currentTime,
    }: {
      currentTime: number;
    }) => {
      const time = normalizeTime(currentTime);

      if (time === null) {
        return;
      }

      setRoom((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          video: {
            ...previous.video,
            isPlaying: true,
            currentTime: time,
          },
        };
      });

      pushCommand({
        type: 'play',
        time,
      });
    };

    /**
     * PAUSE EVENT
     */
    const onPause = ({
      currentTime,
    }: {
      currentTime: number;
    }) => {
      const time = normalizeTime(currentTime);

      if (time === null) {
        return;
      }

      setRoom((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          video: {
            ...previous.video,
            isPlaying: false,
            currentTime: time,
          },
        };
      });

      pushCommand({
        type: 'pause',
        time,
      });
    };

    /**
     * SEEK EVENT
     */
    const onSeek = ({
      currentTime,
    }: {
      currentTime: number;
    }) => {
      const time = normalizeTime(currentTime);

      if (time === null) {
        return;
      }

      setRoom((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          video: {
            ...previous.video,
            currentTime: time,
          },
        };
      });

      pushCommand({
        type: 'seek',
        time,
      });
    };

    /**
     * CHANGE VIDEO
     */
    const onChangeVideo = ({
      videoId,
    }: {
      videoId: string;
    }) => {
      if (!videoId?.trim()) {
        return;
      }

      const cleanVideoId =
        videoId.trim();

      setRoom((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          video: {
            ...previous.video,
            videoId: cleanVideoId,
            currentTime: 0,
            isPlaying: true,
          },
        };
      });

      pushCommand({
        type: 'load',
        videoId: cleanVideoId,
        time: 0,
      });
    };

    /**
     * PERIODIC TIME SYNC
     */
    const onTimeSync = ({
      currentTime,
    }: {
      currentTime: number;
    }) => {
      const time = normalizeTime(currentTime);

      if (time === null) {
        return;
      }

      setRoom((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          video: {
            ...previous.video,
            currentTime: time,
          },
        };
      });

      /**
       * This is what tells YouTubePlayer:
       *
       * "Compare your local clock with the Host's
       * authoritative clock."
       */
      pushCommand({
        type: 'sync',
        time,
      });
    };

    /**
     * CHAT
     */
    const onChatMessage = (
      message: ChatMessage
    ) => {
      setRoom((previous) => {
        if (!previous) {
          return previous;
        }

        return {
          ...previous,
          chatMessages: [
            ...previous.chatMessages,
            message,
          ],
        };
      });
    };

    /**
     * REACTION
     */
    const onReaction = ({
      emoji,
    }: {
      emoji: string;
    }) => {
      const id =
        Date.now() +
        Math.random();

      setReactions((previous) => [
        ...previous,
        {
          id,
          emoji,
        },
      ]);

      window.setTimeout(() => {
        setReactions((previous) =>
          previous.filter(
            (reaction) =>
              reaction.id !== id
          )
        );
      }, 1800);
    };

    /**
     * CONTROL REQUEST
     */
    const onControlRequest = (
      request: ControlRequest
    ) => {
      setPendingRequests(
        (previous) => [
          ...previous,
          request,
        ]
      );
    };

    /**
     * REQUEST RESOLVED
     */
    const onRequestResolved = ({
      requestId,
    }: {
      requestId: string;
    }) => {
      setPendingRequests(
        (previous) =>
          previous.filter(
            (request) =>
              request.id !== requestId
          )
      );
    };

    /**
     * REMOVED FROM ROOM
     */
    const onYouWereRemoved = () => {
      alert(
        'You were removed from the room by the host.'
      );

      navigate('/');
    };

    /**
     * SERVER ACTION ERROR
     */
    const onActionError = ({
      reason,
    }: {
      reason: string;
    }) => {
      setErrorMsg(
        reason ||
          'Something went wrong.'
      );

      window.setTimeout(() => {
        setErrorMsg(null);
      }, 4000);
    };

    /**
     * Register listeners.
     */
    socket.on(
      'connect',
      onConnect
    );

    socket.on(
      'disconnect',
      onDisconnect
    );

    socket.on(
      'room_state',
      onRoomState
    );

    socket.on(
      'play',
      onPlay
    );

    socket.on(
      'pause',
      onPause
    );

    socket.on(
      'seek',
      onSeek
    );

    socket.on(
      'change_video',
      onChangeVideo
    );

    socket.on(
      'time_sync',
      onTimeSync
    );

    socket.on(
      'chat_message',
      onChatMessage
    );

    socket.on(
      'reaction',
      onReaction
    );

    socket.on(
      'control_request',
      onControlRequest
    );

    socket.on(
      'request_resolved',
      onRequestResolved
    );

    socket.on(
      'you_were_removed',
      onYouWereRemoved
    );

    socket.on(
      'action_error',
      onActionError
    );

    /**
     * If socket is already connected when the page
     * mounts, join immediately.
     */
    if (socket.connected) {
      onConnect();
    }

    /**
     * Cleanup.
     */
    return () => {
      socket.off(
        'connect',
        onConnect
      );

      socket.off(
        'disconnect',
        onDisconnect
      );

      socket.off(
        'room_state',
        onRoomState
      );

      socket.off(
        'play',
        onPlay
      );

      socket.off(
        'pause',
        onPause
      );

      socket.off(
        'seek',
        onSeek
      );

      socket.off(
        'change_video',
        onChangeVideo
      );

      socket.off(
        'time_sync',
        onTimeSync
      );

      socket.off(
        'chat_message',
        onChatMessage
      );

      socket.off(
        'reaction',
        onReaction
      );

      socket.off(
        'control_request',
        onControlRequest
      );

      socket.off(
        'request_resolved',
        onRequestResolved
      );

      socket.off(
        'you_were_removed',
        onYouWereRemoved
      );

      socket.off(
        'action_error',
        onActionError
      );

      joinedRef.current = false;
      initialStateAppliedRef.current = false;
    };

    // Socket listeners intentionally depend only on roomId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /**
   * PLAY
   */
  const emitPlay = useCallback(
    (currentTime: number) => {
      const time = normalizeTime(
        currentTime
      );

      if (time === null || !roomId) {
        return;
      }

      socket.emit(
        'play',
        {
          roomId,
          currentTime: time,
        }
      );
    },
    [roomId, normalizeTime]
  );

  /**
   * PAUSE
   */
  const emitPause = useCallback(
    (currentTime: number) => {
      const time = normalizeTime(
        currentTime
      );

      if (time === null || !roomId) {
        return;
      }

      socket.emit(
        'pause',
        {
          roomId,
          currentTime: time,
        }
      );
    },
    [roomId, normalizeTime]
  );

  /**
   * SEEK
   */
  const emitSeek = useCallback(
    (currentTime: number) => {
      const time = normalizeTime(
        currentTime
      );

      if (time === null || !roomId) {
        return;
      }

      socket.emit(
        'seek',
        {
          roomId,
          currentTime: time,
        }
      );
    },
    [roomId, normalizeTime]
  );

  /**
   * CHANGE VIDEO
   */
  const emitChangeVideo = useCallback(
    (videoUrlOrId: string) => {
      const value =
        videoUrlOrId?.trim();

      if (!value || !roomId) {
        return;
      }

      socket.emit(
        'change_video',
        {
          roomId,
          videoUrlOrId: value,
        }
      );
    },
    [roomId]
  );

  /**
   * HOST TIME SYNC
   */
  const emitTimeSync = useCallback(
    (currentTime: number) => {
      const time = normalizeTime(
        currentTime
      );

      if (time === null || !roomId) {
        return;
      }

      socket.emit(
        'time_sync',
        {
          roomId,
          currentTime: time,
        }
      );
    },
    [roomId, normalizeTime]
  );

  /**
   * CHAT
   */
  const emitChat = useCallback(
    (message: string) => {
      const value =
        message?.trim();

      if (!value || !roomId) {
        return;
      }

      socket.emit(
        'chat_message',
        {
          roomId,
          message: value,
        }
      );
    },
    [roomId]
  );

  /**
   * REACTION
   */
  const emitReaction = useCallback(
    (emoji: string) => {
      if (!emoji || !roomId) {
        return;
      }

      socket.emit(
        'reaction',
        {
          roomId,
          emoji,
        }
      );
    },
    [roomId]
  );

  /**
   * ASSIGN ROLE
   */
  const emitAssignRole = useCallback(
    (
      targetId: string,
      role:
        | 'MODERATOR'
        | 'PARTICIPANT'
    ) => {
      if (!roomId || !targetId) {
        return;
      }

      socket.emit(
        'assign_role',
        {
          roomId,
          targetId,
          role,
        }
      );
    },
    [roomId]
  );

  /**
   * REMOVE PARTICIPANT
   */
  const emitRemove = useCallback(
    (targetId: string) => {
      if (!roomId || !targetId) {
        return;
      }

      socket.emit(
        'remove_participant',
        {
          roomId,
          targetId,
        }
      );
    },
    [roomId]
  );

  /**
   * TRANSFER HOST
   */
  const emitTransferHost =
    useCallback(
      (targetId: string) => {
        if (!roomId || !targetId) {
          return;
        }

        socket.emit(
          'transfer_host',
          {
            roomId,
            targetId,
          }
        );
      },
      [roomId]
    );

  /**
   * REQUEST CONTROL
   */
  const emitRequestControl =
    useCallback(
      (
        action: ControlRequest['action'],
        payload?: ControlRequest['payload']
      ) => {
        if (!roomId) {
          return;
        }

        socket.emit(
          'request_control',
          {
            roomId,
            action,
            payload,
          }
        );
      },
      [roomId]
    );

  /**
   * APPROVE / REJECT CONTROL REQUEST
   */
  const emitResolveRequest =
    useCallback(
      (
        requestId: string,
        approve: boolean
      ) => {
        if (!roomId || !requestId) {
          return;
        }

        socket.emit(
          'resolve_request',
          {
            roomId,
            requestId,
            approve,
          }
        );
      },
      [roomId]
    );

  return {
    room,
    me,
    myId,

    connected,

    canControl,
    isHost,

    reactions,
    pendingRequests,

    errorMsg,

    command,

    drift,

    /**
     * Used by YouTubePlayer to report actual
     * local-vs-authoritative drift.
     */
    reportDrift: setDrift,

    emitPlay,
    emitPause,
    emitSeek,
    emitChangeVideo,
    emitTimeSync,

    emitChat,
    emitReaction,

    emitAssignRole,
    emitRemove,
    emitTransferHost,

    emitRequestControl,
    emitResolveRequest,
  };
}