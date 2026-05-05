"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { LiveList, LiveObject } from "@liveblocks/client";
import {
  RoomProvider,
  useStorage,
  useMutation,
  useUpdateMyPresence,
} from "@/liveblocks.config";
import Lobby from "@/components/game/Lobby";
import GameRoom from "@/components/game/GameRoom";
import RoundEnd from "@/components/game/RoundEnd";
import GameEnd from "@/components/game/GameEnd";
import WordSelection from "@/components/game/WordSelection";
import type { GameSettings, PlayerTokenPayload, GameStateData, ChatMessage } from "@/lib/types";

// ─── JWT client-side decode (no verification — server already verified) ───────

function decodeToken(token: string): PlayerTokenPayload | null {
  try {
    const [, payload] = token.split(".");
    const b64    = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as PlayerTokenPayload;
  } catch {
    return null;
  }
}

// ─── Game phase router ────────────────────────────────────────────────────────

function GamePhaseRouter({
  roomId,
  playerInfo,
}: {
  roomId: string;
  playerInfo: PlayerTokenPayload;
}) {
  const gameState      = useStorage((root) => root.gameState);
  const updatePresence = useUpdateMyPresence();

  useEffect(() => {
    updatePresence({
      name:     playerInfo.playerName,
      color:    playerInfo.color,
      avatar:   playerInfo.avatar,
      role:     playerInfo.role === "host" ? "host" : "guesser",
      isTyping: false,
      cursor:   null,
    });
  }, [updatePresence, playerInfo]);

  const registerSelf = useMutation(
    ({ storage }) => {
      const players = storage.get("players");
      for (let i = 0; i < players.length; i++) {
        if (players.get(i)?.get("id") === playerInfo.playerId) return;
      }
      players.push(
        new LiveObject({
          id:       playerInfo.playerId,
          name:     playerInfo.playerName,
          color:    playerInfo.color,
          avatar:   playerInfo.avatar,
          isHost:   playerInfo.role === "host",
          joinedAt: Date.now(),
        })
      );
    },
    [playerInfo]
  );

  useEffect(() => { registerSelf(); }, [registerSelf]);

  switch (gameState.phase) {
    case "lobby":
      return <Lobby roomId={roomId} playerInfo={playerInfo} />;
    case "selecting":
      return <WordSelection roomId={roomId} playerInfo={playerInfo} />;
    case "drawing":
      return <GameRoom roomId={roomId} playerInfo={playerInfo} />;
    case "roundEnd":
      return <RoundEnd playerInfo={playerInfo} />;
    case "gameEnd":
      return <GameEnd playerInfo={playerInfo} />;
    default:
      return <Lobby roomId={roomId} playerInfo={playerInfo} />;
  }
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="h-dvh bg-game-bg flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      <p className="font-nunito text-game-muted text-sm">{message}</p>
    </div>
  );
}

// ─── Root Room component ──────────────────────────────────────────────────────

export default function Room({ roomId }: { roomId: string }) {
  const router      = useRouter();
  const [playerInfo, setPlayerInfo] = useState<PlayerTokenPayload | null>(null);
  const [settings,   setSettings]   = useState<GameSettings | null>(null);
  const [ready,      setReady]      = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("playerToken");
    if (!token) {
      router.push(`/?room=${roomId}`);
      return;
    }
    const decoded = decodeToken(token);
    if (!decoded) {
      localStorage.removeItem("playerToken");
      router.push(`/?room=${roomId}`);
      return;
    }
    if (decoded.roomId !== roomId) {
      router.push(`/?room=${roomId}`);
      return;
    }

    setPlayerInfo(decoded);

    const storedSettings = localStorage.getItem(`room:${roomId}:settings`);
    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings) as GameSettings);
      } catch {
        setSettings({ category: "classic", difficulty: "medium", rounds: 5, timerSeconds: 90 });
      }
    } else {
      setSettings({ category: "classic", difficulty: "medium", rounds: 5, timerSeconds: 90 });
    }
    setReady(true);
  }, [roomId, router]);

  if (!ready || !playerInfo || !settings) {
    return <LoadingScreen message="Connecting..." />;
  }

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor:   null,
        name:     playerInfo.playerName,
        color:    playerInfo.color,
        avatar:   playerInfo.avatar,
        role:     playerInfo.role === "host" ? "host" : "guesser",
        isTyping: false,
      }}
      initialStorage={{
        gameState: new LiveObject<GameStateData>({
          phase:                 "lobby",
          currentRound:          0,
          totalRounds:           settings.rounds,
          currentDrawerId:       "",
          drawerOrder:           [],
          scores:                {},
          roundScores:           {},
          timerStartedAt:        0,
          roundDurationMs:       settings.timerSeconds * 1000,
          correctGuessers:       [],
          hints:                 [],
          category:              settings.category,
          difficulty:            settings.difficulty,
          selectedPromptVariant: 0,
        }),
        strokes:      new LiveList([]),
        players:      new LiveList([]),
        chatMessages: new LiveList<LiveObject<ChatMessage>>([]),
      }}
    >
      <Suspense fallback={<LoadingScreen message="Loading room..." />}>
        <GamePhaseRouter roomId={roomId} playerInfo={playerInfo} />
      </Suspense>
    </RoomProvider>
  );
}
