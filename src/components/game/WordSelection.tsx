"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useStorage, useMutation, useSelf, useOthers } from "@/liveblocks.config";
import Avatar from "@/components/ui/Avatar";
import GuessStream from "./GuessStream";
import type { PlayerTokenPayload } from "@/lib/types";
import { startSelectionMusic, stopSelectionMusic } from "@/lib/sounds";

const PICK_SECONDS = 15;

export default function WordSelection({
  roomId,
  playerInfo,
}: {
  roomId: string;
  playerInfo: PlayerTokenPayload;
}) {
  const gameState = useStorage((root) => root.gameState);
  const self      = useSelf();
  const others    = useOthers();

  const isDrawer = gameState.currentDrawerId === playerInfo.playerId;

  // Play ambient music while someone is choosing; stop on phase transition
  useEffect(() => {
    startSelectionMusic();
    return () => stopSelectionMusic();
  }, []);

  // Find drawer info for non-drawer view
  const drawerInfo = (() => {
    if (self?.id === gameState.currentDrawerId) {
      return { name: playerInfo.playerName, color: playerInfo.color, avatar: playerInfo.avatar };
    }
    const o = others.find((o) => o.id === gameState.currentDrawerId);
    return o
      ? { name: o.info?.name ?? "Someone", color: o.info?.color ?? "#58a6ff", avatar: o.info?.avatar ?? "🐱" }
      : null;
  })();

  type PromptOption = { system: string; scenario: string };
  const [options,   setOptions]   = useState<[PromptOption, PromptOption, PromptOption] | null>(null);
  const [countdown, setCountdown] = useState(PICK_SECONDS);
  const [picking,   setPicking]   = useState(false);
  const autoPickRef = useRef(false);

  // Drawer: fetch the 3 word options
  useEffect(() => {
    if (!isDrawer) return;
    const token = localStorage.getItem("playerToken");
    fetch(
      `/api/prompt?options=true&round=${gameState.currentRound}` +
      `&category=${gameState.category}&difficulty=${gameState.difficulty}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((d) => { if (d.options) setOptions(d.options); })
      .catch(() => {});
  }, [isDrawer, gameState.currentRound, gameState.category, gameState.difficulty]);

  // Drawer: 15-second countdown, auto-pick first option if time runs out
  useEffect(() => {
    if (!isDrawer) return;
    const start = Date.now();
    autoPickRef.current = false;

    const id = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const rem = Math.max(0, PICK_SECONDS - elapsed);
      setCountdown(Math.ceil(rem));

      if (rem === 0 && !autoPickRef.current && options) {
        autoPickRef.current = true;
        handlePick(0);
      }
    }, 250);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawer, options]);

  const selectWord = useMutation(
    ({ storage }, variant: 0 | 1 | 2) => {
      const gs = storage.get("gameState");
      if (gs.get("phase") !== "selecting") return;
      gs.set("selectedPromptVariant", variant);
      gs.set("timerStartedAt",        Date.now());
      gs.set("phase",                 "drawing");
    },
    []
  );

  const handlePick = (variant: 0 | 1 | 2) => {
    if (picking) return;
    setPicking(true);
    selectWord(variant);
  };

  // ── Drawer view ──────────────────────────────────────────────────────────────
  if (isDrawer) {
    return (
      <div className="h-dvh bg-game-bg flex flex-col items-center justify-center p-6 gap-6 overflow-hidden">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="font-baloo font-bold text-3xl text-white">
            🎨 Your turn to draw!
          </p>
          <p className="font-nunito text-sm text-game-muted mt-1">
            Pick a word — you have{" "}
            <span
              className="font-bold tabular-nums"
              style={{ color: countdown <= 5 ? "#ff7b72" : "#e3b341" }}
            >
              {countdown}s
            </span>
          </p>
        </motion.div>

        {/* Scenario options */}
        <div className="flex flex-col gap-3 w-full max-w-2xl">
          {options
            ? options.map((opt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => handlePick(i as 0 | 1 | 2)}
                  disabled={picking}
                  className="w-full py-4 px-5 rounded-2xl text-left cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50 flex flex-col gap-1"
                  style={{
                    backgroundColor: "#1a2635",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#58a6ff";
                    e.currentTarget.style.backgroundColor = "rgba(88,166,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.backgroundColor = "#1a2635";
                  }}
                >
                  <span className="font-baloo font-bold text-lg text-white">{opt.system}</span>
                  <span className="font-nunito text-sm text-game-muted leading-snug">{opt.scenario}</span>
                </motion.button>
              ))
            : [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-full py-4 px-5 rounded-2xl animate-pulse"
                  style={{ backgroundColor: "#1a2635", height: 80 }}
                />
              ))}
        </div>

        <p className="font-nunito text-xs text-game-muted">
          Round {gameState.currentRound} of {gameState.totalRounds}
        </p>
      </div>
    );
  }

  // ── Non-drawer view ──────────────────────────────────────────────────────────
  return (
    <div className="h-dvh bg-game-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <h1 className="font-baloo text-xl font-bold text-game-blue">SysSkribbl</h1>
        <span className="font-nunito text-xs text-game-muted">
          Round {gameState.currentRound} of {gameState.totalRounds}
        </span>
      </header>

      {/* Waiting indicator */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-3 py-10">
        {drawerInfo && (
          <Avatar
            name={drawerInfo.name}
            color={drawerInfo.color}
            avatar={drawerInfo.avatar}
            size="lg"
            isDrawer
          />
        )}
        <motion.p
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          className="font-nunito font-semibold text-base text-game-muted"
        >
          {drawerInfo?.name ?? "Someone"} is choosing a word…
        </motion.p>
      </div>

      {/* Chat — guessers can chat while waiting */}
      <div
        className="flex-1 flex flex-col overflow-hidden min-h-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest px-3 pt-2 shrink-0">
          Chat
        </p>
        <GuessStream
          playerInfo={playerInfo}
          isDrawer={false}
          prompt={null}
          onCorrect={() => {}}
        />
      </div>
    </div>
  );
}
