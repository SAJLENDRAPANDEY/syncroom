import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socketService';
import { MY_USERNAME_KEY } from '../hooks/useRoom';

export default function Home() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!username.trim()) {
      setError('Please enter your name first.');
      return;
    }

    setError('');
    setLoading(true);

    sessionStorage.setItem(MY_USERNAME_KEY, username.trim());

    const socket = getSocket();

    const doCreate = () => {
      socket.emit(
        'create_room',
        {
          username: username.trim(),
        },
        (res: any) => {
          setLoading(false);

          if (res?.ok) {
            navigate(`/room/${res.room.roomId}`);
          } else {
            setError(
              res?.reason ||
                'Could not create the room. Please try again.'
            );
          }
        }
      );
    };

    if (socket.connected) {
      doCreate();
    } else {
      socket.once('connect', doCreate);
    }
  };

  const handleJoin = () => {
    if (!username.trim()) {
      setError('Please enter your name first.');
      return;
    }

    if (!joinCode.trim()) {
      setError('Please enter the room code.');
      return;
    }

    setError('');

    sessionStorage.setItem(
      MY_USERNAME_KEY,
      username.trim()
    );

    navigate(
      `/room/${joinCode.trim().toUpperCase()}`
    );
  };

  const scrollTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: 'smooth',
      });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050816] text-white antialiased">

      {/* =========================================================
          GLOBAL ANIMATIONS
      ========================================================= */}

      <style>{`
        @keyframes sr-float-a {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(35px, 25px, 0) scale(1.08);
          }
        }

        @keyframes sr-float-b {
          0%, 100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-30px, -20px, 0) scale(1.06);
          }
        }

        @keyframes sr-pulse {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.15);
          }
        }

        @keyframes sr-fade-up {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes sr-shimmer {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(120%);
          }
        }

        .sr-fade-up {
          animation: sr-fade-up 0.7s ease-out both;
        }

        .sr-float-a {
          animation: sr-float-a 15s ease-in-out infinite;
        }

        .sr-float-b {
          animation: sr-float-b 19s ease-in-out infinite;
        }

        .sr-pulse {
          animation: sr-pulse 3s ease-in-out infinite;
        }

        .sr-shimmer {
          animation: sr-shimmer 3s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .sr-fade-up,
          .sr-float-a,
          .sr-float-b,
          .sr-pulse,
          .sr-shimmer {
            animation: none;
          }
        }
      `}</style>

      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div className="pointer-events-none fixed inset-0 z-0">

        <div className="absolute inset-0 bg-[#050816]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(99,102,241,0.16),transparent_38%),radial-gradient(circle_at_0%_35%,rgba(139,92,246,0.08),transparent_30%),radial-gradient(circle_at_100%_55%,rgba(6,182,212,0.055),transparent_28%)]" />

        {/* Glow orbs */}

        <div
          className="
            sr-float-a
            absolute
            -left-40
            -top-40
            h-[520px]
            w-[520px]
            rounded-full
            bg-indigo-600/[0.09]
            blur-[130px]
          "
        />

        <div
          className="
            sr-float-b
            absolute
            -right-40
            top-20
            h-[500px]
            w-[500px]
            rounded-full
            bg-violet-600/[0.08]
            blur-[130px]
          "
        />

        <div
          className="
            absolute
            bottom-[-250px]
            left-[35%]
            h-[480px]
            w-[480px]
            rounded-full
            bg-cyan-500/[0.035]
            blur-[140px]
          "
        />

        {/* Grid */}

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              `
              linear-gradient(
                rgba(148,163,184,0.8) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(148,163,184,0.8) 1px,
                transparent 1px
              )
              `,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* =========================================================
          NAVBAR
      ========================================================= */}

      <header className="relative z-30 border-b border-white/[0.055] bg-[#050816]/70 backdrop-blur-xl">

        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">

          {/* Logo */}

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex items-center gap-3"
          >
            <div
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-indigo-500
                to-violet-600
                shadow-[0_10px_35px_-10px_rgba(99,102,241,0.8)]
                transition-transform
                duration-300
                group-hover:scale-105
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M8 5.5L18 12L8 18.5V5.5Z"
                  fill="white"
                />
              </svg>
            </div>

            <div className="text-left">
              <div className="text-[16px] font-bold tracking-tight">
                SyncRoom
              </div>

              <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-slate-600">
                Watch together
              </div>
            </div>
          </button>

          {/* Desktop nav */}

          <nav className="hidden items-center gap-8 md:flex">

            <button
              type="button"
              onClick={() => scrollTo('features')}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Features
            </button>

            <button
              type="button"
              onClick={() => scrollTo('how-it-works')}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              How it works
            </button>

            <button
              type="button"
              onClick={() => scrollTo('why-syncroom')}
              className="text-sm text-slate-400 transition hover:text-white"
            >
              Why SyncRoom
            </button>
          </nav>

          {/* Navbar CTA */}

          <button
            type="button"
            onClick={() => {
              setMode('create');
              setError('');

              document
                .getElementById('room-card')
                ?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
            }}
            className="
              hidden
              rounded-xl
              border
              border-indigo-400/20
              bg-indigo-500/[0.08]
              px-4
              py-2
              text-sm
              font-medium
              text-indigo-200
              transition
              hover:border-indigo-400/35
              hover:bg-indigo-500/[0.14]
              sm:block
            "
          >
            Get Started
          </button>

        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}

      <main className="relative z-10">

        <section className="mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:pb-32 lg:pt-28">

          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">

            {/* Hero content */}

            <div className="sr-fade-up max-w-3xl">

              {/* Badge */}

              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-2 backdrop-blur-xl">

                <span className="relative flex h-2 w-2">
                  <span className="sr-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>

                <span className="text-xs font-medium text-slate-300">
                  Real-time watch parties
                </span>

                <span className="text-slate-600">
                  •
                </span>

                <span className="text-xs text-indigo-300">
                  No extension required
                </span>
              </div>

              {/* Heading */}

              <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">

                Watch together.
                <br />

                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                  Stay perfectly in sync.
                </span>
              </h1>

              {/* Description */}

              <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
                Create a private room, invite your friends, and enjoy
                YouTube videos together with synchronized playback,
                real-time chat, reactions, and role-based controls.
              </p>

              {/* Hero buttons */}

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={() => {
                    setMode('create');
                    setError('');

                    document
                      .getElementById('room-card')
                      ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                  }}
                  className="
                    group
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-gradient-to-r
                    from-indigo-500
                    to-violet-600
                    px-6
                    py-3.5
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_15px_35px_-12px_rgba(99,102,241,0.75)]
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:brightness-110
                    active:scale-[0.98]
                  "
                >
                  Create a Watch Party

                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    <path
                      d="M4 10H16M10.5 4.5L16 10L10.5 15.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('join');
                    setError('');

                    document
                      .getElementById('room-card')
                      ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      });
                  }}
                  className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-white/[0.1]
                    bg-white/[0.035]
                    px-6
                    py-3.5
                    text-sm
                    font-medium
                    text-slate-200
                    backdrop-blur-xl
                    transition
                    hover:border-white/[0.18]
                    hover:bg-white/[0.06]
                  "
                >
                  Join a Room
                </button>

              </div>

              {/* Trust points */}

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Real-time synchronization
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Private rooms
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Browser based
                </div>

              </div>
            </div>

            {/* =====================================================
                ROOM CARD
            ===================================================== */}

            <div
              id="room-card"
              className="relative"
            >

              {/* Glow */}

              <div className="absolute -inset-8 rounded-[40px] bg-indigo-500/[0.06] blur-3xl" />

              <div
                className="
                  relative
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/[0.1]
                  bg-[#0B1222]/85
                  p-5
                  shadow-[0_35px_100px_-45px_rgba(0,0,0,0.95)]
                  backdrop-blur-2xl
                  sm:p-6
                "
              >

                {/* Top highlight */}

                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

                {/* Card header */}

                <div className="mb-6 flex items-center justify-between">

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Start your session
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Create a new room or join an existing one.
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 text-indigo-300"
                    >
                      <path
                        d="M12 3V21M3 12H21"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                </div>

                {/* Tabs */}

                <div className="mb-5 grid grid-cols-2 rounded-xl border border-white/[0.06] bg-black/20 p-1">

                  <button
                    type="button"
                    onClick={() => {
                      setMode('create');
                      setError('');
                    }}
                    className={`
                      rounded-[10px]
                      py-2.5
                      text-sm
                      font-medium
                      transition-all
                      ${
                        mode === 'create'
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'text-slate-500 hover:text-slate-200'
                      }
                    `}
                  >
                    Create Room
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('join');
                      setError('');
                    }}
                    className={`
                      rounded-[10px]
                      py-2.5
                      text-sm
                      font-medium
                      transition-all
                      ${
                        mode === 'join'
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                          : 'text-slate-500 hover:text-slate-200'
                      }
                    `}
                  >
                    Join Room
                  </button>

                </div>

                {/* Name */}

                <div className="mb-4">

                  <label
                    htmlFor="username"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Your name
                  </label>

                  <div className="relative">

                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                      >
                        <circle
                          cx="12"
                          cy="8"
                          r="3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />

                        <path
                          d="M5 20C5.8 16.3 8.1 14.5 12 14.5C15.9 14.5 18.2 16.3 19 20"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>

                    </div>

                    <input
                      id="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          mode === 'create'
                            ? handleCreate()
                            : handleJoin();
                        }
                      }}
                      placeholder="Enter your name"
                      maxLength={30}
                      autoComplete="name"
                      className="
                        w-full
                        rounded-xl
                        border
                        border-white/[0.08]
                        bg-white/[0.035]
                        py-3.5
                        pl-11
                        pr-4
                        text-sm
                        text-white
                        outline-none
                        placeholder:text-slate-600
                        transition
                        focus:border-indigo-400/40
                        focus:bg-white/[0.055]
                        focus:ring-4
                        focus:ring-indigo-500/[0.08]
                      "
                    />

                  </div>

                </div>

                {/* Join code */}

                {mode === 'join' && (
                  <div className="mb-4">

                    <label
                      htmlFor="joinCode"
                      className="mb-2 block text-xs font-medium text-slate-400"
                    >
                      Room code
                    </label>

                    <input
                      id="joinCode"
                      value={joinCode}
                      onChange={(e) => {
                        setJoinCode(
                          e.target.value
                            .replace(/[^a-zA-Z0-9]/g, '')
                            .slice(0, 6)
                            .toUpperCase()
                        );

                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleJoin();
                        }
                      }}
                      placeholder="A7K9P2"
                      maxLength={6}
                      className="
                        w-full
                        rounded-xl
                        border
                        border-white/[0.08]
                        bg-white/[0.035]
                        px-4
                        py-3.5
                        text-center
                        font-mono
                        text-lg
                        font-semibold
                        tracking-[0.35em]
                        text-white
                        outline-none
                        placeholder:text-slate-700
                        transition
                        focus:border-indigo-400/40
                        focus:bg-white/[0.055]
                        focus:ring-4
                        focus:ring-indigo-500/[0.08]
                      "
                    />

                  </div>
                )}

                {/* Error */}

                {error && (
                  <div
                    role="alert"
                    className="
                      mb-4
                      flex
                      items-center
                      gap-2.5
                      rounded-xl
                      border
                      border-red-400/15
                      bg-red-500/[0.07]
                      px-3.5
                      py-3
                      text-xs
                      text-red-300
                    "
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px]">
                      !
                    </span>

                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}

                <button
                  type="button"
                  onClick={
                    mode === 'create'
                      ? handleCreate
                      : handleJoin
                  }
                  disabled={loading}
                  className="
                    group
                    relative
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    overflow-hidden
                    rounded-xl
                    bg-gradient-to-r
                    from-indigo-500
                    via-indigo-500
                    to-violet-600
                    py-3.5
                    text-sm
                    font-semibold
                    text-white
                    shadow-[0_15px_35px_-15px_rgba(99,102,241,0.8)]
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:brightness-110
                    active:scale-[0.99]
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >

                  {/* Button shimmer */}

                  {!loading && (
                    <span className="sr-shimmer pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-white/[0.08]" />
                  )}

                  {loading ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="opacity-25"
                        />

                        <path
                          d="M21 12a9 9 0 0 1-9 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>

                      {mode === 'create'
                        ? 'Creating room...'
                        : 'Joining room...'}
                    </>
                  ) : (
                    <>
                      {mode === 'create'
                        ? 'Create a Watch Party'
                        : 'Join Watch Party'}

                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      >
                        <path
                          d="M4 10H16M10.5 4.5L16 10L10.5 15.5"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </>
                  )}

                </button>

                {/* Security */}

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-600">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-3.5 w-3.5 text-emerald-400/70"
                  >
                    <path
                      d="M12 3L19 6V11C19 15.7 16 19.2 12 21C8 19.2 5 15.7 5 11V6L12 3Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />

                    <path
                      d="M9 12L11 14L15 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  Private room • Real-time connection
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* =========================================================
            FEATURE STRIP
        ========================================================= */}

        <section
          id="features"
          className="border-y border-white/[0.055] bg-white/[0.015]"
        >

          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">

            <div className="mb-10 max-w-xl">

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Everything in one room
              </p>

              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Built for watching together.
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Simple enough to start instantly. Powerful enough to keep
                everyone synchronized.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-3">

              {/* Feature 1 */}

              <div className="group rounded-2xl border border-white/[0.065] bg-[#0A1020]/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-indigo-400/20 hover:bg-[#0C1426]">

                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <path
                      d="M8 5.5L18 12L8 18.5V5.5Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M4 7V17"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      opacity=".5"
                    />
                  </svg>

                </div>

                <h3 className="text-sm font-semibold text-white">
                  Real-Time Sync
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Play, pause, seek and change videos while everyone
                  stays aligned.
                </p>

              </div>

              {/* Feature 2 */}

              <div className="group rounded-2xl border border-white/[0.065] bg-[#0A1020]/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/20 hover:bg-[#0C1426]">

                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <path
                      d="M5 6.5C5 5.67 5.67 5 6.5 5H17.5C18.33 5 19 5.67 19 6.5V14.5C19 15.33 18.33 16 17.5 16H11L7 19V16H6.5C5.67 16 5 15.33 5 14.5V6.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M8 9H16M8 12H13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>

                </div>

                <h3 className="text-sm font-semibold text-white">
                  Live Chat & Reactions
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Talk about the scene, send messages and react without
                  leaving the room.
                </p>

              </div>

              {/* Feature 3 */}

              <div className="group rounded-2xl border border-white/[0.065] bg-[#0A1020]/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/20 hover:bg-[#0C1426]">

                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />

                    <path
                      d="M12 8V12L15 14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>

                </div>

                <h3 className="text-sm font-semibold text-white">
                  Role-Based Control
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Hosts and moderators control playback while participants
                  can simply sit back and watch.
                </p>

              </div>

            </div>
          </div>
        </section>

        {/* =========================================================
            HOW IT WORKS
        ========================================================= */}

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24"
        >

          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">

            <div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                How it works
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                From room code to watch party in seconds.
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-500">
                No complicated setup. Create a room, invite your people,
                choose a video and start watching.
              </p>

            </div>

            <div className="grid gap-3 sm:grid-cols-3">

              {[
                {
                  number: '01',
                  title: 'Create',
                  text: 'Enter your name and create a private room.',
                },
                {
                  number: '02',
                  title: 'Invite',
                  text: 'Share the room code with your friends.',
                },
                {
                  number: '03',
                  title: 'Watch',
                  text: 'Load a YouTube video and watch in sync.',
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="rounded-2xl border border-white/[0.065] bg-[#0A1020]/60 p-5"
                >
                  <div className="font-mono text-xs text-indigo-400">
                    {item.number}
                  </div>

                  <h3 className="mt-5 text-sm font-semibold text-white">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.text}
                  </p>
                </div>
              ))}

            </div>

          </div>
        </section>

        {/* =========================================================
            WHY SYNCROOM
        ========================================================= */}

        <section
          id="why-syncroom"
          className="border-y border-white/[0.055] bg-white/[0.012]"
        >

          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">

            <div className="mx-auto max-w-2xl text-center">

              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                Why SyncRoom
              </p>

              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Your people. Your room. Your moment.
              </h2>

              <p className="mt-4 text-sm leading-7 text-slate-500">
                Whether you are watching a movie, discussing a lecture or
                hanging out with friends, SyncRoom keeps everyone connected
                without getting in the way.
              </p>

            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">

              {[
                ['01', 'Private', 'Room-based sessions for your group.'],
                ['02', 'Synchronized', 'Everyone follows the same playback state.'],
                ['03', 'Interactive', 'Chat and reactions stay inside the room.'],
                ['04', 'Simple', 'Works directly in your browser.'],
              ].map(([num, title, text]) => (
                <div
                  key={num}
                  className="rounded-2xl border border-white/[0.06] bg-[#080E1C]/70 p-5"
                >
                  <span className="font-mono text-[10px] text-slate-600">
                    {num}
                  </span>

                  <h3 className="mt-4 text-sm font-semibold text-white">
                    {title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {text}
                  </p>
                </div>
              ))}

            </div>

          </div>
        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================= */}

        <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 lg:py-28">

          <div className="relative overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.12] via-violet-500/[0.08] to-transparent p-8 text-center sm:p-12">

            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-500/[0.12] blur-[90px]" />

            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-violet-500/[0.1] blur-[90px]" />

            <div className="relative">

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                Ready when you are
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Start your next watch party.
              </h2>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Create a room, share the code and enjoy your video together.
              </p>

              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  setError('');

                  document
                    .getElementById('room-card')
                    ?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    });
                }}
                className="
                  mt-7
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-white
                  px-6
                  py-3.5
                  text-sm
                  font-semibold
                  text-[#080B14]
                  shadow-xl
                  transition
                  hover:-translate-y-0.5
                  hover:bg-slate-100
                "
              >
                Create a Watch Party

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M4 10H16M10.5 4.5L16 10L10.5 15.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

            </div>
          </div>
        </section>

      </main>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="relative z-10 border-t border-white/[0.055]">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between">

          <div className="flex items-center gap-2.5">

            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">

              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-3.5 w-3.5"
              >
                <path
                  d="M8 5.5L18 12L8 18.5V5.5Z"
                  fill="white"
                />
              </svg>

            </div>

            <span className="text-sm font-semibold text-slate-300">
              SyncRoom
            </span>

          </div>

          <p className="text-xs text-slate-600">
            Watch together. Stay in sync.
          </p>

          <p className="text-xs text-slate-700">
            © 2026 SyncRoom
          </p>

        </div>

      </footer>

    </div>
  );
}