import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  useRoom,
  MY_USERNAME_KEY,
} from '../hooks/useRoom';

import YouTubePlayer from '../components/YouTubePlayer';
import ParticipantList from '../components/ParticipantList';
import ChatPanel from '../components/ChatPanel';
import ControlBar from '../components/ControlBar';
import SyncIndicator from '../components/SyncIndicator';
import ControlRequestModal from '../components/ControlRequestModal';

export default function Room() {
  const { roomId } =
    useParams<{ roomId: string }>();

  const [copied, setCopied] =
    useState(false);

  /**
   * IMPORTANT:
   *
   * This stores the REAL YouTube player time.
   *
   * We do not use:
   *
   * room.video.currentTime
   *
   * for Host synchronization because that value
   * can become stale between socket events.
   */
  const playerTimeRef = useRef(0);

  const username =
    sessionStorage.getItem(
      MY_USERNAME_KEY
    ) || undefined;

  const {
    room,
    myId,
    connected,
    canControl,
    isHost,

    reactions,
    pendingRequests,
    errorMsg,

    command,
    drift,
    reportDrift,

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
  } = useRoom(
    roomId,
    username
  );

  /**
   * HOST AUTHORITATIVE TIME SYNC
   *
   * Every 5 seconds the Host sends the actual
   * YouTube player clock to the backend.
   *
   * This fixes the previous problem where:
   *
   * room.video.currentTime
   *
   * could contain an old/stale value.
   */
  useEffect(() => {
    if (
      !isHost ||
      !room?.video.isPlaying
    ) {
      return;
    }

    const interval =
      window.setInterval(() => {
        const currentTime =
          playerTimeRef.current;

        if (
          !Number.isFinite(
            currentTime
          )
        ) {
          return;
        }

        emitTimeSync(
          currentTime
        );
      }, 5000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    isHost,
    room?.video.isPlaying,
    emitTimeSync,
  ]);

  /**
   * Copy room invitation link.
   */
  const handleCopyLink =
    async () => {
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}/room/${roomId}`
        );

        setCopied(true);

        window.setTimeout(
          () => {
            setCopied(false);
          },
          1500
        );
      } catch {
        setCopied(false);
      }
    };

  /**
   * Loading / connecting state.
   */
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="text-center">
          <div className="mb-3 mx-auto h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />

          <p className="text-slate-500 text-sm">
            {errorMsg ||
              'Connecting to room...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e1b4b,_#020617_60%)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-4">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="flex items-center justify-between mb-4">

          <div className="flex items-center gap-3">

            <div>
              <h1 className="text-lg font-bold text-slate-100">
                SyncRoom
              </h1>

              <p className="text-[10px] uppercase tracking-wider text-slate-600">
                Watch together
              </p>
            </div>

            <button
              onClick={
                handleCopyLink
              }
              title="Copy invite link"
              className="text-xs font-mono bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md text-slate-300 transition-colors"
            >
              Room: {roomId}{' '}
              {copied
                ? '✓ Copied'
                : '⧉'}
            </button>

          </div>

          <SyncIndicator
            connected={
              connected
            }
            driftSeconds={
              drift
            }
          />

        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {errorMsg && (
          <div className="mb-3 text-xs bg-red-950/80 border border-red-900 text-red-300 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}

        {/* =====================================================
            MAIN GRID
        ====================================================== */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* =================================================
              VIDEO + CONTROLS
          ================================================== */}

          <div className="lg:col-span-2 space-y-4">

            <YouTubePlayer
              videoId={
                room.video.videoId
              }
              canControl={
                canControl
              }

              onLocalPlay={
                emitPlay
              }

              onLocalPause={
                emitPause
              }

              onLocalSeek={
                emitSeek
              }

              onDrift={
                reportDrift
              }

              /**
               * REAL YOUTUBE CLOCK
               *
               * YouTubePlayer updates this every
               * 500ms.
               *
               * Host synchronization uses this
               * ref every 5 seconds.
               */
              onTimeUpdate={(
                time
              ) => {
                playerTimeRef.current =
                  time;
              }}

              command={
                command
              }
            />

            <ControlBar
              canControl={
                canControl
              }

              onChangeVideo={
                emitChangeVideo
              }

              onRequestChangeVideo={(
                url
              ) =>
                emitRequestControl(
                  'change_video',
                  {
                    videoUrlOrId:
                      url,
                  }
                )
              }

              onReaction={
                emitReaction
              }
            />

          </div>

          {/* =================================================
              SIDEBAR
          ================================================== */}

          <div className="space-y-4">

            <ParticipantList
              participants={
                room.participants
              }

              myId={myId}

              isHost={
                isHost
              }

              onAssignRole={
                emitAssignRole
              }

              onRemove={
                emitRemove
              }

              onTransferHost={
                emitTransferHost
              }
            />

            <ChatPanel
              messages={
                room.chatMessages
              }
              onSend={
                emitChat
              }
            />

          </div>

        </div>
      </div>

      {/* =====================================================
          FLOATING REACTIONS
      ====================================================== */}

      <div className="fixed bottom-6 left-6 flex flex-col gap-1 pointer-events-none z-40">

        {reactions.map(
          (reaction) => (
            <span
              key={
                reaction.id
              }
              className="text-2xl reaction-float"
            >
              {
                reaction.emoji
              }
            </span>
          )
        )}

      </div>

      {/* =====================================================
          CONTROL REQUEST MODAL
      ====================================================== */}

      <ControlRequestModal
        requests={
          pendingRequests
        }
        onResolve={
          emitResolveRequest
        }
      />

    </div>
  );
}