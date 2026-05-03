"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useStorage,
  useMutation,
  useBroadcastEvent,
  useCanUndo,
  useUndo,
  useOthers,
  useSelf,
} from "@/liveblocks.config";
import type { PlayerTokenPayload } from "@/lib/types";
import { isMuted, setMuted } from "@/lib/sounds";
import { DRAWER_BONUS } from "@/lib/scoring";
import Canvas from "./Canvas";
import DrawingTools from "./DrawingTools";
import type { Tool } from "./DrawingTools";
import GuessStream from "./GuessStream";
import HintDisplay from "./HintDisplay";
import PlayerList from "./PlayerList";
import Timer from "./Timer";
import ConfettiOverlay from "@/components/ui/ConfettiOverlay";

interface GameRoomProps {
  roomId:     string;
  playerInfo: PlayerTokenPayload;
}

export default function GameRoom({ roomId: _roomId, playerInfo }: GameRoomProps) {
  const gameState = useStorage((root) => root.gameState);
  const broadcast = useBroadcastEvent();
  const canUndo   = useCanUndo();
  const undo      = useUndo();
  const others    = useOthers();
  const self      = useSelf();

  const isDrawer = gameState.currentDrawerId === playerInfo.playerId;
  const isHost   = playerInfo.role === "host";

  const [tool,        setTool]        = useState<Tool>("freehand");
  const [color,       setColor]       = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [muted,       setMutedState]  = useState(false);

  const [prompt, setPrompt]   = useState<string | null>(null);
  const fetchedRound           = useRef(-1);
  const advancingRef           = useRef(false);
  const drawerLeftRef          = useRef(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  // ── Fetch prompt once per round ────────────────────────────────────────────
  useEffect(() => {
    if (
      gameState.phase !== "drawing" ||
      gameState.currentRound === fetchedRound.current
    ) return;
    fetchedRound.current = gameState.currentRound;

    const token   = localStorage.getItem("playerToken");
    const variant = gameState.selectedPromptVariant ?? 0;
    fetch(
      `/api/prompt?round=${gameState.currentRound}` +
      `&category=${gameState.category}` +
      `&difficulty=${gameState.difficulty}` +
      `&variant=${variant}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((data) => { if (data.prompt) setPrompt(data.prompt); })
      .catch(() => {});
  }, [gameState.phase, gameState.currentRound, gameState.category, gameState.difficulty, gameState.selectedPromptVariant]);

  // ── End round: reveal prompt → roundEnd phase ──────────────────────────────
  const endRound = useMutation(({ storage }, revealedPrompt: string) => {
    const gs = storage.get("gameState");
    if (gs.get("phase") !== "drawing") return;
    gs.set("phase",          "roundEnd");
    gs.set("revealedPrompt", revealedPrompt);
    gs.set("roundEndAt",     Date.now());
  }, []);

  // ── Detect drawer disconnect ────────────────────────────────────────────────
  useEffect(() => {
    if (gameState.phase !== "drawing" || !isHost || !prompt) return;
    const drawerId = gameState.currentDrawerId;
    // Drawer is the host themselves — can't detect own disconnect
    if (drawerId === self?.id) return;
    const drawerPresent = others.some((o) => o.id === drawerId);
    if (!drawerPresent && !drawerLeftRef.current) {
      drawerLeftRef.current = true;
      endRound(prompt);
    }
  }, [others, gameState.phase, gameState.currentDrawerId, isHost, prompt, self, endRound]);

  // Reset drawerLeftRef when a new round begins
  useEffect(() => {
    drawerLeftRef.current = false;
  }, [gameState.currentRound]);

  // ── Score correct guess ────────────────────────────────────────────────────
  const recordCorrectGuess = useMutation(
    ({ storage }, guesserPlayerId: string, points: number) => {
      const gs = storage.get("gameState");
      const correctGuessers = gs.get("correctGuessers") as string[];
      if (correctGuessers.includes(guesserPlayerId)) return;

      gs.set("correctGuessers", [...correctGuessers, guesserPlayerId]);

      const scores: Record<string, number> = { ...(gs.get("scores") as Record<string, number>) };
      scores[guesserPlayerId] = (scores[guesserPlayerId] ?? 0) + points;
      const drawerId = gs.get("currentDrawerId") as string;
      scores[drawerId] = (scores[drawerId] ?? 0) + DRAWER_BONUS;
      gs.set("scores", scores);
    },
    []
  );

  // ── Unlock hint ────────────────────────────────────────────────────────────
  const unlockHint = useMutation(({ storage }, hintText: string) => {
    const gs    = storage.get("gameState");
    const hints = gs.get("hints") as string[];
    if (!hints.includes(hintText)) gs.set("hints", [...hints, hintText]);
  }, []);

  // ── Clear canvas ───────────────────────────────────────────────────────────
  const clearCanvas = useMutation(({ storage }) => {
    const s = storage.get("strokes");
    for (let i = s.length - 1; i >= 0; i--) s.delete(i);
  }, []);

  // ── Timer callbacks ────────────────────────────────────────────────────────
  const handleHintUnlock = useCallback(
    async (hintIndex: number) => {
      if (!isHost || !prompt) return;
      const token   = localStorage.getItem("playerToken");
      const variant = gameState.selectedPromptVariant ?? 0;
      const res = await fetch(
        `/api/prompt?round=${gameState.currentRound}` +
        `&category=${gameState.category}` +
        `&difficulty=${gameState.difficulty}` +
        `&variant=${variant}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then((r) => r.json()).catch(() => null);

      if (res?.hints?.[hintIndex]) {
        unlockHint(res.hints[hintIndex]);
        broadcast({ type: "HINT_UNLOCK", hintIndex });
      }
    },
    [isHost, prompt, gameState.currentRound, gameState.category, gameState.difficulty, gameState.selectedPromptVariant, unlockHint, broadcast]
  );

  const handleTimerExpire = useCallback(() => {
    if (!isHost || advancingRef.current || !prompt) return;
    advancingRef.current = true;
    setTimeout(() => {
      endRound(prompt);
      advancingRef.current = false;
    }, 1200);
  }, [isHost, prompt, endRound]);

  // ── Correct guess callback ─────────────────────────────────────────────────
  const handleCorrect = useCallback(
    (points: number) => {
      recordCorrectGuess(playerInfo.playerId, points);
      broadcast({ type: "CORRECT_GUESS_ANIMATION", playerName: playerInfo.playerName, points });
      broadcast({ type: "CONFETTI" });
    },
    [playerInfo, recordCorrectGuess, broadcast]
  );

  const currentRound = gameState.currentRound;
  const totalRounds  = gameState.totalRounds;

  return (
    <div className="h-dvh bg-game-bg flex flex-col overflow-hidden">
      <ConfettiOverlay />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 flex flex-col md:flex-row md:items-center md:justify-between px-3 md:px-4 py-2 gap-1 md:gap-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Row 1 on mobile: logo + round/timer + mute */}
        <div className="flex items-center justify-between md:justify-start gap-2 md:gap-0">
          <h1 className="font-baloo text-lg md:text-xl font-bold text-game-blue shrink-0">
            SysSkribbl
          </h1>

          {/* Round + timer — right side on mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="text-right">
              <p className="font-nunito text-[9px] text-game-muted uppercase tracking-widest">
                Round
              </p>
              <p className="font-baloo font-bold text-sm text-white leading-none">
                {currentRound}/{totalRounds}
              </p>
            </div>
            <Timer
              timerStartedAt={gameState.timerStartedAt}
              durationMs={gameState.roundDurationMs}
              onHintUnlock={handleHintUnlock}
              onExpire={handleTimerExpire}
            />
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer"
              style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            >
              {muted ? "🔇" : "🔔"}
            </button>
          </div>
        </div>

        {/* Row 2 on mobile / center on desktop: hint display */}
        <div className="flex-1 flex justify-center px-2">
          <HintDisplay playerInfo={playerInfo} prompt={prompt} />
        </div>

        {/* Desktop-only: round + timer + mute */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest">
              Round
            </p>
            <p className="font-baloo font-bold text-lg text-white leading-none">
              {currentRound} / {totalRounds}
            </p>
          </div>
          <Timer
            timerStartedAt={gameState.timerStartedAt}
            durationMs={gameState.roundDurationMs}
            onHintUnlock={handleHintUnlock}
            onExpire={handleTimerExpire}
          />
          <button
            onClick={toggleMute}
            title={muted ? "Unmute" : "Mute"}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            {muted ? "🔇" : "🔔"}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* DESKTOP: left player list */}
        <aside
          className="hidden md:flex flex-col w-48 shrink-0 overflow-y-auto p-2"
          style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest mb-2 px-1">
            Players
          </p>
          <PlayerList playerInfo={playerInfo} />
        </aside>

        {/* CENTER: canvas + tools */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-hidden min-h-0">
            <Canvas
              isDrawer={isDrawer}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              drawerId={playerInfo.playerId}
            />
          </div>

          {/* Drawing tools */}
          {isDrawer && (
            <div
              className="shrink-0 overflow-x-auto flex"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="px-3 py-2">
                <DrawingTools
                  tool={tool}
                  color={color}
                  strokeWidth={strokeWidth}
                  canUndo={canUndo}
                  onTool={setTool}
                  onColor={setColor}
                  onStrokeWidth={setStrokeWidth}
                  onUndo={undo}
                  onClear={clearCanvas}
                />
              </div>
            </div>
          )}
        </main>

        {/* DESKTOP ONLY: right guess stream */}
        <aside
          className="hidden md:flex flex-col w-64 shrink-0"
          style={{ borderLeft: "1px solid rgba(255,255,255,0.07)" }}
        >
          <GuessStream
            playerInfo={playerInfo}
            isDrawer={isDrawer}
            prompt={prompt}
            onCorrect={handleCorrect}
          />
        </aside>
      </div>

      {/* MOBILE ONLY: bottom panel — players + chat side by side */}
      <div
        className="md:hidden shrink-0 flex overflow-hidden"
        style={{
          height: 220,
          borderTop: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "#0f1923",
        }}
      >
        {/* Players column */}
        <div
          className="w-32 shrink-0 overflow-y-auto p-2"
          style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="font-nunito text-[9px] text-game-muted uppercase tracking-widest mb-1.5 px-1">
            Players
          </p>
          <PlayerList playerInfo={playerInfo} />
        </div>

        {/* Chat column */}
        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <GuessStream
            playerInfo={playerInfo}
            isDrawer={isDrawer}
            prompt={prompt}
            onCorrect={handleCorrect}
          />
        </div>
      </div>
    </div>
  );
}
