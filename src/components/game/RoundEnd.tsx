"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useStorage, useMutation, useSelf, useOthers } from "@/liveblocks.config";
import Avatar from "@/components/ui/Avatar";
import type { PlayerTokenPayload } from "@/lib/types";
import { playRoundEnd } from "@/lib/sounds";

const ROUND_END_DURATION = 6; // seconds before auto-advancing

export default function RoundEnd({
  playerInfo,
}: {
  playerInfo: PlayerTokenPayload;
}) {
  const gameState = useStorage((root) => root.gameState);
  const self      = useSelf();
  const others    = useOthers();
  const isHost    = playerInfo.role === "host";

  const [countdown, setCountdown] = useState(ROUND_END_DURATION);
  const advancedRef = useRef(false);

  const [refData, setRefData] = useState<{
    referenceComponents: string[];
    designNote: string;
  } | null>(null);

  useEffect(() => {
    const token   = localStorage.getItem("playerToken");
    const variant = gameState.selectedPromptVariant ?? 0;
    fetch(
      `/api/prompt?round=${gameState.currentRound}` +
      `&category=${gameState.category}&difficulty=${gameState.difficulty}` +
      `&variant=${variant}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.referenceComponents) {
          setRefData({ referenceComponents: d.referenceComponents, designNote: d.designNote });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play sound once on mount
  useEffect(() => { playRoundEnd(); }, []);

  // Build player map for name/avatar lookups
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

  const scores          = gameState.scores as Record<string, number>;
  const roundScores     = (gameState.roundScores ?? {}) as Record<string, number>;
  const correctGuessers = gameState.correctGuessers as string[];
  const revealedPrompt  = gameState.revealedPrompt ?? "…";
  const currentRound    = gameState.currentRound;
  const totalRounds     = gameState.totalRounds;
  const isLastRound     = currentRound >= totalRounds;

  // Ranked leaderboard
  const ranked = [...playerMap.entries()]
    .map(([id, info]) => ({ id, ...info, score: scores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score);

  // ── Advance to next round or game end ──────────────────────────────────────
  const startNextRound = useMutation(({ storage }) => {
    const gs = storage.get("gameState");
    if (gs.get("phase") !== "roundEnd") return;

    if (isLastRound) {
      gs.set("phase", "gameEnd");
      return;
    }

    const currentRound = gs.get("currentRound") as number;
    const drawerOrder  = gs.get("drawerOrder")  as string[];
    const nextRound    = currentRound + 1;
    const nextDrawerId = drawerOrder[(nextRound - 1) % drawerOrder.length];

    gs.set("phase",                 "selecting");
    gs.set("currentRound",          nextRound);
    gs.set("currentDrawerId",       nextDrawerId);
    gs.set("timerStartedAt",        0);
    gs.set("selectedPromptVariant", 0);
    gs.set("correctGuessers",       []);
    gs.set("hints",                 []);
    gs.set("revealedPrompt",        "");
    gs.set("roundEndAt",            0);
    gs.set("roundScores",           {});

    const strokes = storage.get("strokes");
    for (let i = strokes.length - 1; i >= 0; i--) strokes.delete(i);
  }, [isLastRound]);

  // Countdown — only the host fires the advance mutation
  useEffect(() => {
    const roundEndAt = (gameState.roundEndAt as number | undefined) ?? Date.now();
    advancedRef.current = false;

    const tick = () => {
      const elapsed = (Date.now() - roundEndAt) / 1000;
      const rem = Math.max(0, ROUND_END_DURATION - elapsed);
      setCountdown(Math.ceil(rem));

      if (rem === 0 && !advancedRef.current && isHost) {
        advancedRef.current = true;
        startNextRound();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [gameState.roundEndAt, isHost, startNextRound]);

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div className="h-dvh bg-game-bg flex flex-col items-center justify-center p-4 md:p-6 gap-5 md:gap-6 overflow-y-auto">
      {/* Round badge */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-nunito text-xs text-game-muted uppercase tracking-widest"
      >
        Round {currentRound} of {totalRounds} complete
      </motion.div>

      {/* Answer reveal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 20 }}
        className="text-center"
      >
        <p className="font-nunito text-sm text-game-muted mb-2">The answer was</p>
        <p className="font-baloo font-bold text-5xl text-white tracking-wide">
          {revealedPrompt}
        </p>
      </motion.div>

      <div className="w-full max-w-2xl flex flex-col gap-4 md:flex-row">
        {/* Correct guessers */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 rounded-2xl p-5"
          style={{ backgroundColor: "#1a2635", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest mb-3">
            {correctGuessers.length > 0 ? "🎉 Guessed it!" : "😅 Nobody guessed"}
          </p>

          {correctGuessers.length === 0 ? (
            <p className="font-nunito text-sm text-game-muted text-center py-4">
              Better luck next round!
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {correctGuessers.map((id, i) => {
                  const p = playerMap.get(id);
                  if (!p) return null;
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i }}
                      className="flex items-center gap-3"
                    >
                      <Avatar
                        name={p.name}
                        color={p.color}
                        avatar={p.avatar}
                        size="sm"
                        isSelf={id === self?.id}
                        showName={false}
                      />
                      <span
                        className="font-nunito font-semibold text-sm"
                        style={{ color: p.color }}
                      >
                        {p.name}
                        {id === self?.id && (
                          <span className="text-game-muted font-normal ml-1">(you)</span>
                        )}
                      </span>
                      <span className="ml-auto font-baloo font-bold text-game-green text-sm">
                        ✓
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="flex-1 rounded-2xl p-5"
          style={{ backgroundColor: "#1a2635", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest mb-3">
            Leaderboard
          </p>
          <div className="flex flex-col gap-2">
            {ranked.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.3 }}
                className="flex items-center gap-2"
              >
                <span className="w-5 text-center text-base">
                  {i < 3 ? MEDALS[i] : <span className="font-baloo text-xs text-game-muted">{i + 1}</span>}
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
                <span className="flex flex-col items-end">
                  <span className="font-baloo font-bold text-game-text text-sm leading-none">
                    {p.score}
                  </span>
                  {roundScores[p.id] ? (
                    <span className="font-nunito font-semibold text-[10px] leading-none" style={{ color: "#3fb950" }}>
                      +{roundScores[p.id]}
                    </span>
                  ) : null}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Reference architecture */}
      {refData && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-2xl rounded-2xl p-5"
          style={{ backgroundColor: "#1a2635", border: "1px solid rgba(88,166,255,0.2)" }}
        >
          <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest mb-3">
            Reference Architecture
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {refData.referenceComponents.map((comp, i) => (
              <span key={i} className="flex items-center gap-2">
                <span
                  className="px-2.5 py-1 rounded-lg font-nunito font-semibold text-xs"
                  style={{ backgroundColor: "rgba(88,166,255,0.12)", color: "#58a6ff", border: "1px solid rgba(88,166,255,0.25)" }}
                >
                  {comp}
                </span>
                {i < refData.referenceComponents.length - 1 && (
                  <span className="text-game-muted text-xs">→</span>
                )}
              </span>
            ))}
          </div>

          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
            style={{ backgroundColor: "rgba(227,179,65,0.08)", border: "1px solid rgba(227,179,65,0.2)" }}
          >
            <span className="text-sm shrink-0 mt-0.5">💡</span>
            <p className="font-nunito text-sm leading-relaxed" style={{ color: "#e3b341" }}>
              {refData.designNote}
            </p>
          </div>
        </motion.div>
      )}

      {/* Countdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center gap-1"
      >
        <p className="font-nunito text-xs text-game-muted">
          {isLastRound ? "Game ending in" : "Next round in"}
        </p>
        <p className="font-baloo font-bold text-4xl text-game-blue">
          {countdown}
        </p>
        {isHost && (
          <button
            onClick={() => { if (!advancedRef.current) { advancedRef.current = true; startNextRound(); } }}
            className="mt-2 px-5 py-2 rounded-xl font-nunito font-semibold text-sm text-white cursor-pointer transition-all"
            style={{ backgroundColor: "rgba(88,166,255,0.2)", border: "1px solid rgba(88,166,255,0.4)" }}
          >
            {isLastRound ? "End game now →" : "Next round now →"}
          </button>
        )}
      </motion.div>
    </div>
  );
}
