"use client";

import { useState, memo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import type { GameSettings, Category, Difficulty } from "@/lib/types";

const AVATARS = ["🐱", "🐶", "🐸", "🐻", "🦊", "🐼", "🐰", "🦉"];
const COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4",
  "#ffeaa7", "#dda0dd", "#98d8c8", "#f7b731",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Floating background shapes ───────────────────────────────────────────────

const SHAPES = [
  { kind: "rect",     left: "8%",  top: "18%", w: 80, h: 50, dur: 18, delay: 0  },
  { kind: "rect",     left: "78%", top: "12%", w: 60, h: 40, dur: 22, delay: 3  },
  { kind: "rect",     left: "4%",  top: "68%", w: 72, h: 48, dur: 16, delay: 6  },
  { kind: "rect",     left: "72%", top: "62%", w: 90, h: 56, dur: 20, delay: 1  },
  { kind: "rect",     left: "42%", top: "82%", w: 65, h: 42, dur: 19, delay: 9  },
  { kind: "circle",   left: "23%", top: "38%", r: 26,         dur: 21, delay: 4  },
  { kind: "circle",   left: "63%", top: "28%", r: 32,         dur: 17, delay: 7  },
  { kind: "circle",   left: "88%", top: "72%", r: 22,         dur: 23, delay: 2  },
  { kind: "circle",   left: "14%", top: "52%", r: 28,         dur: 15, delay: 11 },
  { kind: "cylinder", left: "53%", top: "8%",  w: 52, h: 66, dur: 24, delay: 5  },
  { kind: "cylinder", left: "33%", top: "72%", w: 46, h: 62, dur: 18, delay: 8  },
] as const;

const FloatingShapes = memo(function FloatingShapes() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="absolute animate-float opacity-[0.045]"
          style={{
            left: s.left,
            top: s.top,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {s.kind === "circle" ? (
            <div
              className="rounded-full border-2 border-white"
              style={{ width: s.r * 2, height: s.r * 2 }}
            />
          ) : (
            <div
              className="border-2 border-white"
              style={{
                width: s.w,
                height: s.h,
                borderRadius: s.kind === "cylinder" ? 8 : 3,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
});

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: Category; label: string; icon: string }[] = [
  { value: "classic",   label: "Classic Systems",   icon: "🖥️" },
  { value: "databases", label: "Databases",          icon: "🗄️" },
  { value: "infra",     label: "Infrastructure",     icon: "☁️" },
  { value: "famous",    label: "Famous Systems",     icon: "🌟" },
  { value: "interview", label: "Interview Classics", icon: "📋" },
];

const DIFFICULTY_OPTS: { value: Difficulty; label: string; activeClass: string }[] = [
  { value: "easy",   label: "Easy",   activeClass: "border-game-green/40 bg-game-green/15 text-game-green"  },
  { value: "medium", label: "Medium", activeClass: "border-game-yellow/40 bg-game-yellow/15 text-game-yellow" },
  { value: "hard",   label: "Hard",   activeClass: "border-game-red/40 bg-game-red/15 text-game-red"    },
];

const ROUNDS_OPTS = [3, 5, 7] as const;
const TIMER_OPTS  = [60, 90, 120] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();

  const [view, setView]               = useState<"home" | "create" | "join">("home");
  const [name, setName]               = useState("");
  const [roomCode, setRoomCode]       = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState("");

  const [settings, setSettings] = useState<GameSettings>({
    category: "classic",
    difficulty: "medium",
    rounds: 5,
    timerSeconds: 90,
  });

  // Auto-fill room code if redirected from an invite link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setView("join");
      setRoomCode(room.toUpperCase());
    }
  }, []);

  const clearError = () => setError("");

  const handleCreate = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Enter your name first"); return; }
    setIsLoading(true);
    clearError();
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: trimmed,
          avatar: pickRandom(AVATARS),
          color: pickRandom(COLORS),
          ...settings,
        }),
      });
      const data: { roomId?: string; playerToken?: string; error?: string } =
        await res.json();
      if (!res.ok || !data.roomId) {
        setError(data.error ?? "Failed to create room");
        return;
      }
      localStorage.setItem("playerToken", data.playerToken!);
      // Store settings so RoomProvider can initialise Storage correctly
      localStorage.setItem(`room:${data.roomId}:settings`, JSON.stringify(settings));
      router.push(`/room/${data.roomId}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  }, [name, settings, router]);

  const handleJoin = useCallback(async () => {
    const trimmed = name.trim();
    const code = roomCode.trim().toUpperCase();
    if (!trimmed) { setError("Enter your name first"); return; }
    if (!code)    { setError("Enter a room code"); return; }
    setIsLoading(true);
    clearError();
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: trimmed,
          avatar: pickRandom(AVATARS),
          color: pickRandom(COLORS),
          roomId: code,
        }),
      });
      const data: { playerToken?: string; error?: string } = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Room not found");
        return;
      }
      localStorage.setItem("playerToken", data.playerToken!);
      router.push(`/room/${code}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsLoading(false);
    }
  }, [name, roomCode, router]);

  return (
    <main className="h-dvh bg-game-bg relative overflow-hidden flex flex-col items-center justify-center p-4">
      <FloatingShapes />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-baloo text-6xl font-bold leading-none bg-linear-to-r from-game-blue to-game-green bg-clip-text text-transparent">
            SysSkribbl
          </h1>
          <p className="font-nunito text-game-muted mt-2 text-base">
            Draw systems. Guess architecture. 🎨
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            backgroundColor: "#1a2635",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Name — always visible */}
          <div className="mb-4">
            <label className="block text-[10px] font-nunito font-semibold text-game-muted mb-1.5 uppercase tracking-widest">
              Your Name
            </label>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => { setName(e.target.value); clearError(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (view === "create") handleCreate();
                  else if (view === "join") handleJoin();
                }
              }}
              placeholder="e.g. ArchitectAlex"
              className="w-full rounded-xl px-4 py-3 font-nunito text-sm text-white placeholder:text-white/20 focus:outline-none transition-all"
              style={{
                backgroundColor: "#0f1923",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#58a6ff")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          <AnimatePresence mode="wait">
            {/* ── Home view ── */}
            {view === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-3"
              >
                <Btn
                  color="#3fb950"
                  hover="#2da540"
                  onClick={() => setView("create")}
                >
                  🎮 Create Room
                </Btn>
                <Btn
                  color="#58a6ff"
                  hover="#4090e8"
                  onClick={() => setView("join")}
                >
                  🔗 Join Room
                </Btn>
              </motion.div>
            )}

            {/* ── Create view ── */}
            {view === "create" && (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-3"
              >
                {/* Settings toggle */}
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-xl font-nunito text-sm text-game-muted transition-colors cursor-pointer"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)")
                  }
                >
                  <span>⚙️ Room Settings</span>
                  <span
                    style={{
                      display: "inline-block",
                      transition: "transform 0.2s",
                      transform: showSettings ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▼
                  </span>
                </button>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-xl p-4 space-y-3"
                        style={{ backgroundColor: "#0f1923" }}
                      >
                        {/* Category */}
                        <div>
                          <FieldLabel>Category</FieldLabel>
                          <select
                            value={settings.category}
                            onChange={(e) =>
                              setSettings((s) => ({
                                ...s,
                                category: e.target.value as Category,
                              }))
                            }
                            className="w-full rounded-lg px-3 py-2 font-nunito text-sm text-white focus:outline-none cursor-pointer"
                            style={{
                              backgroundColor: "#1a2635",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          >
                            {CATEGORY_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.icon} {o.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Difficulty */}
                        <div>
                          <FieldLabel>Difficulty</FieldLabel>
                          <div className="flex gap-2">
                            {DIFFICULTY_OPTS.map((o) => (
                              <button
                                key={o.value}
                                onClick={() =>
                                  setSettings((s) => ({ ...s, difficulty: o.value }))
                                }
                                className={`flex-1 py-1.5 rounded-lg font-nunito font-semibold text-sm transition-all border cursor-pointer ${
                                  settings.difficulty === o.value
                                    ? o.activeClass
                                    : "border-transparent bg-white/5 text-game-muted hover:bg-white/10"
                                }`}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Rounds & Timer */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <FieldLabel>Rounds</FieldLabel>
                            <div className="flex gap-1">
                              {ROUNDS_OPTS.map((r) => (
                                <PillBtn
                                  key={r}
                                  active={settings.rounds === r}
                                  onClick={() =>
                                    setSettings((s) => ({ ...s, rounds: r }))
                                  }
                                >
                                  {r}
                                </PillBtn>
                              ))}
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Timer</FieldLabel>
                            <div className="flex gap-1">
                              {TIMER_OPTS.map((t) => (
                                <PillBtn
                                  key={t}
                                  active={settings.timerSeconds === t}
                                  onClick={() =>
                                    setSettings((s) => ({ ...s, timerSeconds: t }))
                                  }
                                >
                                  {t}s
                                </PillBtn>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Btn
                  color="#3fb950"
                  hover="#2da540"
                  onClick={handleCreate}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "🚀 Create Room"}
                </Btn>
                <BackBtn onClick={() => { setView("home"); clearError(); }} />
              </motion.div>
            )}

            {/* ── Join view ── */}
            {view === "join" && (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-3"
              >
                <div>
                  <FieldLabel>Room Code</FieldLabel>
                  <input
                    type="text"
                    maxLength={6}
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      clearError();
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="ABC123"
                    className="w-full rounded-xl px-4 py-3 font-baloo text-2xl font-bold tracking-[0.35em] text-center text-white placeholder:text-white/25 placeholder:text-sm placeholder:tracking-widest focus:outline-none transition-all"
                    style={{
                      backgroundColor: "#0f1923",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#58a6ff")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                </div>
                <Btn
                  color="#58a6ff"
                  hover="#4090e8"
                  onClick={handleJoin}
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "🎮 Join Game"}
                </Btn>
                <BackBtn onClick={() => { setView("home"); clearError(); }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 text-game-red font-nunito text-sm text-center"
              >
                ⚠️ {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-5 text-center font-nunito text-game-muted text-xs">
          Draw architecture · Guess the system · Race to win 🏆
        </p>
      </motion.div>

      <div className="absolute bottom-4 font-nunito text-game-muted text-xs">
        Powered by{" "}
        <span className="text-game-blue font-semibold">Liveblocks</span>
      </div>
    </main>
  );
}

// ─── Small reusable primitives ────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-nunito font-semibold text-game-muted mb-1 uppercase tracking-widest">
      {children}
    </label>
  );
}

function PillBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 rounded-lg font-baloo font-bold text-xs transition-all border cursor-pointer ${
        active
          ? "border-game-blue/40 bg-game-blue/20 text-game-blue"
          : "border-transparent bg-white/5 text-game-muted hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Btn({
  color,
  hover,
  onClick,
  disabled,
  children,
}: {
  color: string;
  hover: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-xl font-baloo font-semibold text-lg text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150 cursor-pointer"
      style={{ backgroundColor: color }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.backgroundColor = hover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}
    >
      {children}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2 font-nunito text-sm text-game-muted hover:text-white transition-colors cursor-pointer"
    >
      ← Back
    </button>
  );
}
