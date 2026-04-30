"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSelf, useOthers, useMutation, useStorage } from "@/liveblocks.config";
import Avatar from "@/components/ui/Avatar";
import type { PlayerTokenPayload } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  classic:   "Classic Systems",
  databases: "Databases",
  infra:     "Infrastructure",
  famous:    "Famous Systems",
  interview: "Interview Classics",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   "text-game-green",
  medium: "text-game-yellow",
  hard:   "text-game-red",
};

export default function Lobby({
  roomId,
  playerInfo,
}: {
  roomId: string;
  playerInfo: PlayerTokenPayload;
}) {
  const gameState = useStorage((root) => root.gameState);
  const self      = useSelf();
  const others    = useOthers();

  const isHost = playerInfo.role === "host";

  // All currently present players (self first)
  const presentPlayers = [
    self
      ? {
          id:     self.id,
          name:   self.info?.name   ?? playerInfo.playerName,
          color:  self.info?.color  ?? playerInfo.color,
          avatar: self.info?.avatar ?? playerInfo.avatar,
          role:   self.presence?.role ?? (isHost ? "host" : "guesser"),
          isSelf: true,
        }
      : null,
    ...others.map((o) => ({
      id:     o.id,
      name:   o.info?.name   ?? "Player",
      color:  o.info?.color  ?? "#58a6ff",
      avatar: o.info?.avatar ?? "🐱",
      role:   o.presence?.role ?? "guesser",
      isSelf: false,
    })),
  ].filter(Boolean) as {
    id: string; name: string; color: string; avatar: string;
    role: string; isSelf: boolean;
  }[];

  const canStart = isHost && presentPlayers.length >= 2;

  const [isStarting, setIsStarting]   = useState(false);
  const [copied, setCopied]           = useState(false);
  const [copyMode, setCopyMode]       = useState<"code" | "link">("link");

  // ── Start game mutation ──────────────────────────────────────────────────
  const startGame = useMutation(
    ({ storage }, playerIds: string[]) => {
      if (playerIds.length < 2) return;

      const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
      const gs = storage.get("gameState");

      gs.set("phase",                 "selecting");
      gs.set("drawerOrder",           shuffled);
      gs.set("currentDrawerId",       shuffled[0]);
      gs.set("currentRound",          1);
      gs.set("timerStartedAt",        0);
      gs.set("selectedPromptVariant", 0);
      gs.set("correctGuessers",       []);
      gs.set("hints",                 []);
      gs.set("scores", Object.fromEntries(shuffled.map((id) => [id, 0])));

      const strokes = storage.get("strokes");
      for (let i = strokes.length - 1; i >= 0; i--) {
        strokes.delete(i);
      }
    },
    []
  );

  const handleStart = () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    startGame(presentPlayers.map((p) => p.id));
  };

  const handleCopy = async () => {
    const text =
      copyMode === "link"
        ? `${window.location.origin}/room/${roomId}`
        : roomId;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers that block clipboard without interaction
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-dvh bg-game-bg flex flex-col overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <h1 className="font-baloo text-2xl font-bold text-game-blue">
          SysSkribbl
        </h1>
        <div className="flex items-center gap-2">
          <span className="font-nunito text-xs text-game-muted uppercase tracking-widest">
            Lobby
          </span>
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: "#3fb950" }}
          />
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 gap-4 md:gap-6 overflow-y-auto">
        {/* Room code card */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "#1a2635",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Code row */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-nunito font-semibold text-game-muted uppercase tracking-widest mb-1">
                  Room Code
                </p>
                <p className="font-baloo text-4xl font-bold text-white tracking-[0.2em] leading-none">
                  {roomId}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* Copy mode toggle */}
                <div
                  className="flex rounded-lg overflow-hidden text-[10px] font-nunito font-semibold"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {(["link", "code"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCopyMode(mode)}
                      className="px-2.5 py-1 transition-colors cursor-pointer"
                      style={{
                        backgroundColor:
                          copyMode === mode
                            ? "rgba(88,166,255,0.2)"
                            : "transparent",
                        color: copyMode === mode ? "#58a6ff" : "#8b949e",
                      }}
                    >
                      {mode === "link" ? "🔗 Link" : "# Code"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCopy}
                  className="px-4 py-1.5 rounded-lg font-nunito font-semibold text-xs text-white transition-all cursor-pointer"
                  style={{ backgroundColor: copied ? "#3fb950" : "#58a6ff" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.opacity = "0.85")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Settings pills */}
            <div className="flex flex-wrap gap-1.5">
              <Pill color="#58a6ff">
                {CATEGORY_LABELS[gameState.category] ?? gameState.category}
              </Pill>
              <Pill
                color={
                  gameState.difficulty === "easy"
                    ? "#3fb950"
                    : gameState.difficulty === "hard"
                    ? "#ff7b72"
                    : "#e3b341"
                }
              >
                {gameState.difficulty.charAt(0).toUpperCase() +
                  gameState.difficulty.slice(1)}
              </Pill>
              <Pill color="#bc8cff">{gameState.totalRounds} Rounds</Pill>
              <Pill color="#ffa657">
                {gameState.roundDurationMs / 1000}s Timer
              </Pill>
            </div>
          </div>
        </motion.div>

        {/* Players grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "#1a2635",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-nunito font-semibold text-game-muted uppercase tracking-widest">
                Players
              </p>
              <span className="font-baloo font-bold text-game-blue text-sm">
                {presentPlayers.length} / 8
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <AnimatePresence>
                {presentPlayers.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex justify-center"
                  >
                    <Avatar
                      name={p.name}
                      color={p.color}
                      avatar={p.avatar}
                      size="md"
                      isHost={p.role === "host"}
                      isSelf={p.isSelf}
                    />
                  </motion.div>
                ))}

                {/* Empty slots */}
                {presentPlayers.length < 2 &&
                  Array.from({
                    length: Math.max(0, 2 - presentPlayers.length),
                  }).map((_, i) => (
                    <motion.div
                      key={`empty-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-center"
                    >
                      <EmptySlot />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>

            {/* Min player hint */}
            {presentPlayers.length < 2 && (
              <p className="mt-4 text-center font-nunito text-game-muted text-xs">
                Need at least 2 players to start
              </p>
            )}
          </div>
        </motion.div>

        {/* Start / waiting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-md"
        >
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || isStarting}
              className="w-full py-4 rounded-2xl font-baloo font-bold text-xl text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] cursor-pointer"
              style={{ backgroundColor: canStart ? "#3fb950" : "#21303f" }}
              onMouseEnter={(e) => {
                if (canStart)
                  e.currentTarget.style.backgroundColor = "#2da540";
              }}
              onMouseLeave={(e) => {
                if (canStart)
                  e.currentTarget.style.backgroundColor = "#3fb950";
              }}
            >
              {isStarting ? "Starting..." : "🚀 Start Game"}
            </button>
          ) : (
            <div className="text-center py-4">
              <p className="font-nunito text-game-muted text-sm">
                <span className="inline-block w-2 h-2 rounded-full bg-game-yellow mr-2 animate-pulse" />
                Waiting for the host to start…
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function Pill({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="px-2.5 py-0.5 rounded-full font-nunito font-semibold text-xs"
      style={{ backgroundColor: color + "22", color }}
    >
      {children}
    </span>
  );
}

function EmptySlot() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex items-center justify-center rounded-full border-2 border-dashed"
        style={{
          width: 52,
          height: 52,
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <span className="text-game-muted text-lg">+</span>
      </div>
      <p className="font-nunito text-[10px] text-game-muted">Waiting…</p>
    </div>
  );
}
