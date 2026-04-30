"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useStorage, useMutation, useSelf, useOthers } from "@/liveblocks.config";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import type { PlayerTokenPayload } from "@/lib/types";
import { playGameEnd } from "@/lib/sounds";
import { fireConfetti } from "@/components/ui/ConfettiOverlay";

const MEDALS   = ["🥇", "🥈", "🥉"];
const PODIUM_H = [120, 90, 70]; // px heights for 1st/2nd/3rd

export default function GameEnd({
  playerInfo,
}: {
  playerInfo: PlayerTokenPayload;
}) {
  const gameState = useStorage((root) => root.gameState);
  const self      = useSelf();
  const others    = useOthers();
  const router    = useRouter();
  const isHost    = playerInfo.role === "host";
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    playGameEnd();
    // Triple confetti burst
    fireConfetti({ x: 0.2, y: 0.6 });
    setTimeout(() => fireConfetti({ x: 0.5, y: 0.5 }), 300);
    setTimeout(() => fireConfetti({ x: 0.8, y: 0.6 }), 600);
  }, []);

  // Build player map
  const playerMap = new Map<string, { name: string; color: string; avatar: string }>();
  if (self) playerMap.set(self.id, {
    name:   self.info?.name   ?? playerInfo.playerName,
    color:  self.info?.color  ?? playerInfo.color,
    avatar: self.info?.avatar ?? playerInfo.avatar,
  });
  for (const o of others) {
    playerMap.set(o.id, {
      name:   o.info?.name   ?? "Player",
      color:  o.info?.color  ?? "#58a6ff",
      avatar: o.info?.avatar ?? "🐱",
    });
  }

  const scores = gameState.scores as Record<string, number>;

  const ranked = [...playerMap.entries()]
    .map(([id, info]) => ({ id, ...info, score: scores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  const podium = ranked.slice(0, 3);
  // Reorder for visual podium: 2nd left, 1st center, 3rd right
  const podiumDisplay =
    podium.length === 3
      ? [podium[1], podium[0], podium[2]]
      : podium.length === 2
      ? [podium[1], podium[0]]
      : podium;

  // ── Play again: reset game state to drawing round 1 ──────────────────────
  const playAgain = useMutation(({ storage }) => {
    const gs       = storage.get("gameState");
    const players  = storage.get("players");
    const strokes  = storage.get("strokes");

    const ids: string[] = [];
    for (let i = 0; i < players.length; i++) {
      const p = players.get(i);
      if (p) ids.push(p.get("id") as string);
    }
    if (ids.length < 2) return;

    const shuffled = [...ids].sort(() => Math.random() - 0.5);

    gs.set("phase",                 "selecting");
    gs.set("currentRound",          1);
    gs.set("currentDrawerId",       shuffled[0]);
    gs.set("drawerOrder",           shuffled);
    gs.set("timerStartedAt",        0);
    gs.set("selectedPromptVariant", 0);
    gs.set("correctGuessers",       []);
    gs.set("hints",                 []);
    gs.set("revealedPrompt",        "");
    gs.set("roundEndAt",            0);
    gs.set("scores",                Object.fromEntries(shuffled.map((id) => [id, 0])));

    for (let i = strokes.length - 1; i >= 0; i--) strokes.delete(i);
  }, []);

  const handlePlayAgain = () => {
    if (!isHost || restarting) return;
    setRestarting(true);
    playAgain();
  };

  const handleHome = () => {
    localStorage.removeItem("playerToken");
    router.push("/");
  };

  return (
    <div className="h-dvh bg-game-bg flex flex-col items-center justify-center p-4 md:p-6 gap-6 md:gap-8 overflow-y-auto">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <p className="font-nunito text-sm text-game-muted uppercase tracking-widest mb-1">
          Game Over
        </p>
        <h1 className="font-baloo font-bold text-5xl text-white">
          Final Results
        </h1>
      </motion.div>

      {/* Podium */}
      {ranked.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-end justify-center gap-3"
        >
          {podiumDisplay.map((p, i) => {
            const rank =
              podiumDisplay.length === 3
                ? i === 1 ? 0 : i === 0 ? 1 : 2
                : i;
            const barH = PODIUM_H[rank] ?? 60;
            const medal = MEDALS[rank];

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + rank * 0.1 }}
                className="flex flex-col items-center"
              >
                <span className="text-3xl mb-1">{medal}</span>
                <Avatar
                  name={p.name}
                  color={p.color}
                  avatar={p.avatar}
                  size={rank === 0 ? "lg" : "md"}
                  isSelf={p.id === self?.id}
                />
                <div
                  className="mt-2 w-20 rounded-t-xl flex items-start justify-center pt-2"
                  style={{
                    height: barH,
                    backgroundColor: rank === 0
                      ? "rgba(227,179,65,0.25)"
                      : rank === 1
                      ? "rgba(139,148,158,0.2)"
                      : "rgba(255,166,87,0.18)",
                    border: `1px solid ${
                      rank === 0 ? "rgba(227,179,65,0.5)"
                      : rank === 1 ? "rgba(139,148,158,0.4)"
                      : "rgba(255,166,87,0.3)"
                    }`,
                  }}
                >
                  <span className="font-baloo font-bold text-lg text-white">
                    {p.score}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Full leaderboard */}
      {ranked.length > 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm rounded-2xl p-5"
          style={{ backgroundColor: "#1a2635", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest mb-3">
            Full Rankings
          </p>
          <div className="flex flex-col gap-2">
            {ranked.slice(3).map((p, i) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="font-baloo font-bold text-xs text-game-muted w-5 text-center">
                  {i + 4}
                </span>
                <Avatar
                  name={p.name}
                  color={p.color}
                  avatar={p.avatar}
                  size="sm"
                  isSelf={p.id === self?.id}
                  showName={false}
                />
                <span
                  className="flex-1 font-nunito font-semibold text-sm truncate"
                  style={{ color: p.color }}
                >
                  {p.name}
                </span>
                <span className="font-baloo font-bold text-game-text text-sm">
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        {isHost && (
          <button
            onClick={handlePlayAgain}
            disabled={restarting}
            className="w-full py-4 rounded-2xl font-baloo font-bold text-xl text-white transition-all cursor-pointer disabled:opacity-50 active:scale-[0.97]"
            style={{ backgroundColor: "#3fb950" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2da540")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3fb950")}
          >
            {restarting ? "Starting…" : "🎮 Play Again"}
          </button>
        )}
        <button
          onClick={handleHome}
          className="w-full py-3 rounded-2xl font-baloo font-bold text-lg transition-all cursor-pointer active:scale-[0.97]"
          style={{
            backgroundColor: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#8b949e",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e6edf3")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8b949e")}
        >
          🏠 Back to Home
        </button>
      </motion.div>
    </div>
  );
}
