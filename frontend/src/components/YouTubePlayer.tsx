import { useEffect, useRef, useState } from 'react';
import type { PlayerCommand } from '../hooks/useRoom';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (existingScript) {
      const previousCallback =
        window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.();
        resolve();
      };

      return;
    }

    const tag = document.createElement('script');

    tag.src =
      'https://www.youtube.com/iframe_api';

    tag.async = true;

    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });

  return apiPromise;
}

const DRIFT_THRESHOLD = 0.6;
const SEEK_DETECTION_THRESHOLD = 1.2;
const TIME_UPDATE_INTERVAL = 500;
const REMOTE_SUPPRESS_MS = 800;

interface Props {
  videoId: string | null;

  canControl: boolean;

  onLocalPlay: (time: number) => void;

  onLocalPause: (time: number) => void;

  onLocalSeek: (time: number) => void;

  onDrift: (seconds: number) => void;

  onTimeUpdate?: (time: number) => void;

  command: PlayerCommand | null;
}

export default function YouTubePlayer({
  videoId,
  canControl,
  onLocalPlay,
  onLocalPause,
  onLocalSeek,
  onDrift,
  onTimeUpdate,
  command,
}: Props) {
  /**
   * Outer wrapper.
   *
   * This is the element that will enter browser fullscreen.
   */
  const containerRef =
    useRef<HTMLDivElement>(null);

  /**
   * Actual YouTube player.
   */
  const playerRef =
    useRef<any>(null);

  const readyRef =
    useRef(false);

  const suppressEchoRef =
    useRef(false);

  const lastKnownTimeRef =
    useRef(0);

  const lastPollTimeRef =
    useRef(0);

  const pollRef =
    useRef<number | null>(null);

  const timeUpdateRef =
    useRef<number | null>(null);

  const suppressTimeoutRef =
    useRef<number | null>(null);

  const previousVideoIdRef =
    useRef<string | null>(videoId);

  /**
   * Used only to refresh the custom fullscreen
   * button icon/text.
   */
  const [isFullscreen, setIsFullscreen] =
    useState(false);

  /**
   * Keep callbacks current.
   */
  const onLocalPlayRef =
    useRef(onLocalPlay);

  const onLocalPauseRef =
    useRef(onLocalPause);

  const onLocalSeekRef =
    useRef(onLocalSeek);

  const onDriftRef =
    useRef(onDrift);

  const onTimeUpdateRef =
    useRef(onTimeUpdate);

  const canControlRef =
    useRef(canControl);

  useEffect(() => {
    onLocalPlayRef.current =
      onLocalPlay;
  }, [onLocalPlay]);

  useEffect(() => {
    onLocalPauseRef.current =
      onLocalPause;
  }, [onLocalPause]);

  useEffect(() => {
    onLocalSeekRef.current =
      onLocalSeek;
  }, [onLocalSeek]);

  useEffect(() => {
    onDriftRef.current =
      onDrift;
  }, [onDrift]);

  useEffect(() => {
    onTimeUpdateRef.current =
      onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    canControlRef.current =
      canControl;
  }, [canControl]);

  /**
   * ----------------------------------------------------------
   * FULLSCREEN STATE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        setIsFullscreen(
          document.fullscreenElement ===
            containerRef.current
        );
      };

    document.addEventListener(
      'fullscreenchange',
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
    };
  }, []);

  /**
   * Enter / exit browser fullscreen.
   */
  const handleFullscreen =
    async () => {
      const container =
        containerRef.current;

      if (!container) {
        return;
      }

      try {
        if (
          document.fullscreenElement
        ) {
          await document.exitFullscreen();
          return;
        }

        await container.requestFullscreen();
      } catch (error) {
        console.error(
          'Fullscreen request failed:',
          error
        );
      }
    };

  /**
   * ----------------------------------------------------------
   * REAL YOUTUBE CLOCK
   * ----------------------------------------------------------
   *
   * This continuously reads the actual YouTube
   * player position.
   */
  useEffect(() => {
    timeUpdateRef.current =
      window.setInterval(() => {
        const player =
          playerRef.current;

        if (
          !player ||
          !readyRef.current
        ) {
          return;
        }

        try {
          const currentTime =
            Number(
              player.getCurrentTime?.() ??
                0
            );

          if (
            !Number.isFinite(
              currentTime
            )
          ) {
            return;
          }

          lastKnownTimeRef.current =
            currentTime;

          onTimeUpdateRef.current?.(
            currentTime
          );
        } catch {
          // Player may have been destroyed.
        }
      }, TIME_UPDATE_INTERVAL);

    return () => {
      if (
        timeUpdateRef.current !== null
      ) {
        window.clearInterval(
          timeUpdateRef.current
        );

        timeUpdateRef.current = null;
      }
    };
  }, []);

  /**
   * ----------------------------------------------------------
   * MANUAL SEEK DETECTION
   * ----------------------------------------------------------
   */
  useEffect(() => {
    if (!canControl) {
      return;
    }

    pollRef.current =
      window.setInterval(() => {
        const player =
          playerRef.current;

        if (
          !player ||
          !readyRef.current
        ) {
          return;
        }

        /**
         * Ignore seek events caused by remote commands.
         */
        if (
          suppressEchoRef.current
        ) {
          try {
            const currentTime =
              Number(
                player.getCurrentTime?.() ??
                  0
              );

            if (
              Number.isFinite(
                currentTime
              )
            ) {
              lastPollTimeRef.current =
                currentTime;

              lastKnownTimeRef.current =
                currentTime;
            }
          } catch {
            // Ignore destroyed player.
          }

          return;
        }

        try {
          const currentTime =
            Number(
              player.getCurrentTime?.() ??
                0
            );

          if (
            !Number.isFinite(
              currentTime
            )
          ) {
            return;
          }

          const previousTime =
            lastPollTimeRef.current;

          const difference =
            Math.abs(
              currentTime -
                previousTime
            );

          /**
           * A large jump means the user dragged
           * the YouTube seek bar.
           */
          if (
            previousTime > 0 &&
            difference >=
              SEEK_DETECTION_THRESHOLD
          ) {
            onLocalSeekRef.current(
              currentTime
            );
          }

          lastPollTimeRef.current =
            currentTime;

          lastKnownTimeRef.current =
            currentTime;
        } catch {
          // Ignore player errors.
        }
      }, 500);

    return () => {
      if (
        pollRef.current !== null
      ) {
        window.clearInterval(
          pollRef.current
        );

        pollRef.current = null;
      }
    };
  }, [canControl]);

  /**
   * ----------------------------------------------------------
   * CREATE YOUTUBE PLAYER
   * ----------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    loadYouTubeAPI().then(() => {
      if (
        cancelled ||
        !containerRef.current
      ) {
        return;
      }

      if (playerRef.current) {
        return;
      }

      /**
       * Create a dedicated child element.
       *
       * The parent remains the fullscreen container.
       */
      const playerElement =
        document.createElement('div');

      playerElement.id =
        'syncroom-youtube-player';

      playerElement.className =
        'h-full w-full';

      containerRef.current.appendChild(
        playerElement
      );

      playerRef.current =
        new window.YT.Player(
          playerElement,
          {
            videoId:
              videoId || undefined,

            playerVars: {
              controls:
                canControlRef.current
                  ? 1
                  : 0,

              disablekb:
                canControlRef.current
                  ? 0
                  : 1,

              modestbranding: 1,

              rel: 0,

              /**
               * YouTube fullscreen support.
               */
              fs: 1,

              /**
               * Helps YouTube validate the
               * embedding origin.
               */
              origin:
                window.location.origin,
            },

            events: {
              onReady: () => {
                readyRef.current =
                  true;

                try {
                  const currentTime =
                    Number(
                      playerRef.current?.getCurrentTime?.() ??
                        0
                    );

                  if (
                    Number.isFinite(
                      currentTime
                    )
                  ) {
                    lastKnownTimeRef.current =
                      currentTime;

                    lastPollTimeRef.current =
                      currentTime;

                    onTimeUpdateRef.current?.(
                      currentTime
                    );
                  }
                } catch {
                  // Ignore initial player timing errors.
                }
              },

              onStateChange: (
                event: any
              ) => {
                const player =
                  playerRef.current;

                if (!player) {
                  return;
                }

                try {
                  const time =
                    Number(
                      player.getCurrentTime?.() ??
                        0
                    );

                  if (
                    !Number.isFinite(
                      time
                    )
                  ) {
                    return;
                  }

                  lastKnownTimeRef.current =
                    time;

                  lastPollTimeRef.current =
                    time;

                  onTimeUpdateRef.current?.(
                    time
                  );

                  /**
                   * Remote command generated this
                   * YouTube state change.
                   */
                  if (
                    suppressEchoRef.current
                  ) {
                    return;
                  }

                  /**
                   * Participant is watch-only.
                   */
                  if (
                    !canControlRef.current
                  ) {
                    return;
                  }

                  if (
                    event.data ===
                    window.YT
                      .PlayerState
                      .PLAYING
                  ) {
                    onLocalPlayRef.current(
                      time
                    );
                  }

                  if (
                    event.data ===
                    window.YT
                      .PlayerState
                      .PAUSED
                  ) {
                    onLocalPauseRef.current(
                      time
                    );
                  }
                } catch {
                  // Ignore player state errors.
                }
              },

              onError: (
                event: any
              ) => {
                console.error(
                  'YouTube Player Error:',
                  event?.data
                );
              },
            },
          }
        );
    });

    return () => {
      cancelled = true;

      if (
        suppressTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          suppressTimeoutRef.current
        );

        suppressTimeoutRef.current =
          null;
      }

      readyRef.current = false;

      try {
        playerRef.current?.destroy?.();
      } catch {
        // Ignore destroy errors.
      }

      playerRef.current = null;
    };

    // Player intentionally created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * ----------------------------------------------------------
   * REMOTE COMMAND HANDLING
   * ----------------------------------------------------------
   */
  useEffect(() => {
    if (!command) {
      return;
    }

    const player =
      playerRef.current;

    if (
      !player ||
      !readyRef.current
    ) {
      return;
    }

    try {
      /**
       * PERIODIC SYNC
       */
      if (
        command.type === 'sync'
      ) {
        const localTime =
          Number(
            player.getCurrentTime?.() ??
              0
          );

        const targetTime =
          Number(
            command.time ??
              localTime
          );

        if (
          !Number.isFinite(
            localTime
          ) ||
          !Number.isFinite(
            targetTime
          )
        ) {
          return;
        }

        const drift =
          localTime -
          targetTime;

        onDriftRef.current(
          drift
        );

        /**
         * Less than 0.6 seconds difference
         * is considered acceptable.
         */
        if (
          Math.abs(drift) <
          DRIFT_THRESHOLD
        ) {
          return;
        }
      }

      /**
       * Suppress the YouTube event generated
       * by this remote command.
       */
      suppressEchoRef.current =
        true;

      if (
        suppressTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          suppressTimeoutRef.current
        );
      }

      /**
       * LOAD
       */
      if (
        command.type ===
          'load' &&
        command.videoId
      ) {
        player.loadVideoById({
          videoId:
            command.videoId,

          startSeconds:
            typeof command.time ===
            'number'
              ? command.time
              : 0,
        });

        lastKnownTimeRef.current =
          typeof command.time ===
          'number'
            ? command.time
            : 0;

        lastPollTimeRef.current =
          typeof command.time ===
          'number'
            ? command.time
            : 0;
      }

      /**
       * PLAY
       */
      else if (
        command.type ===
        'play'
      ) {
        if (
          typeof command.time ===
          'number'
        ) {
          player.seekTo(
            command.time,
            true
          );

          lastKnownTimeRef.current =
            command.time;

          lastPollTimeRef.current =
            command.time;
        }

        player.playVideo();
      }

      /**
       * PAUSE
       */
      else if (
        command.type ===
        'pause'
      ) {
        if (
          typeof command.time ===
          'number'
        ) {
          player.seekTo(
            command.time,
            true
          );

          lastKnownTimeRef.current =
            command.time;

          lastPollTimeRef.current =
            command.time;
        }

        player.pauseVideo();
      }

      /**
       * SEEK
       */
      else if (
        command.type ===
          'seek' &&
        typeof command.time ===
          'number'
      ) {
        player.seekTo(
          command.time,
          true
        );

        lastKnownTimeRef.current =
          command.time;

        lastPollTimeRef.current =
          command.time;
      }

      /**
       * SYNC
       */
      else if (
        command.type ===
          'sync' &&
        typeof command.time ===
          'number'
      ) {
        player.seekTo(
          command.time,
          true
        );

        lastKnownTimeRef.current =
          command.time;

        lastPollTimeRef.current =
          command.time;
      }

      /**
       * Release suppression after YouTube
       * finishes firing its state event.
       */
      suppressTimeoutRef.current =
        window.setTimeout(() => {
          suppressEchoRef.current =
            false;

          suppressTimeoutRef.current =
            null;

          try {
            const currentTime =
              Number(
                player.getCurrentTime?.() ??
                  0
              );

            if (
              Number.isFinite(
                currentTime
              )
            ) {
              lastKnownTimeRef.current =
                currentTime;

              lastPollTimeRef.current =
                currentTime;

              onTimeUpdateRef.current?.(
                currentTime
              );
            }
          } catch {
            // Ignore destroyed player.
          }
        }, REMOTE_SUPPRESS_MS);
    } catch {
      suppressEchoRef.current =
        false;
    }
  }, [command]);

  /**
   * ----------------------------------------------------------
   * VIDEO ID CHANGE
   * ----------------------------------------------------------
   */
  useEffect(() => {
    const player =
      playerRef.current;

    if (
      !player ||
      !readyRef.current
    ) {
      previousVideoIdRef.current =
        videoId;

      return;
    }

    /**
     * Ignore same video.
     */
    if (
      videoId ===
      previousVideoIdRef.current
    ) {
      return;
    }

    if (videoId) {
      suppressEchoRef.current =
        true;

      if (
        suppressTimeoutRef.current !==
        null
      ) {
        window.clearTimeout(
          suppressTimeoutRef.current
        );
      }

      try {
        player.loadVideoById({
          videoId,
          startSeconds: 0,
        });

        lastKnownTimeRef.current =
          0;

        lastPollTimeRef.current =
          0;
      } catch {
        // Ignore YouTube load errors.
      }

      suppressTimeoutRef.current =
        window.setTimeout(() => {
          suppressEchoRef.current =
            false;

          suppressTimeoutRef.current =
            null;
        }, REMOTE_SUPPRESS_MS);
    }

    previousVideoIdRef.current =
      videoId;
  }, [videoId]);

  /**
   * ----------------------------------------------------------
   * UI
   * ----------------------------------------------------------
   */
  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black shadow-lg shadow-black/40"
    >
      {!videoId && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-slate-500">
          No video loaded yet —{' '}
          {canControl
            ? 'paste a link below to get started'
            : 'waiting for the host'}
        </div>
      )}

      {/* Custom fullscreen button */}
      <button
        type="button"
        onClick={
          handleFullscreen
        }
        aria-label={
          isFullscreen
            ? 'Exit fullscreen'
            : 'Enter fullscreen'
        }
        title={
          isFullscreen
            ? 'Exit fullscreen'
            : 'Fullscreen'
        }
        className="
          absolute
          bottom-3
          right-3
          z-50
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-lg
          border
          border-white/10
          bg-black/75
          text-white
          shadow-lg
          backdrop-blur-md
          opacity-0
          transition-all
          duration-200
          hover:bg-black
          focus:opacity-100
          group-hover:opacity-100
        "
      >
        {isFullscreen ? (
          /* Exit fullscreen */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M9 3v5H4M15 3v5h5M9 21v-5H4M15 21v-5h5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          /* Enter fullscreen */
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}