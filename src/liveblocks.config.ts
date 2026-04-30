import { createClient, LiveList, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import type { Stroke, GameStateData, PlayerData } from "@/lib/types";

const client = createClient({
  // Function form so we can attach the player JWT on every auth request
  authEndpoint: async (room) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("playerToken")
        : null;

    const res = await fetch("/api/liveblocks-auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ room }),
    });

    return res.json();
  },
  throttle: 100,
});

export type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
  avatar: string;
  role: "host" | "drawer" | "guesser" | "spectator";
  isTyping: boolean;
};

export type Storage = {
  gameState: LiveObject<GameStateData>;
  strokes: LiveList<LiveObject<Stroke>>;
  players: LiveList<LiveObject<PlayerData>>;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar: string;
  };
};

export type RoomEvent =
  | { type: "CORRECT_GUESS_ANIMATION"; playerName: string; points: number }
  | { type: "HINT_UNLOCK"; hintIndex: number }
  | { type: "ROUND_ENDING_SOON" }
  | { type: "CONFETTI" }
  | { type: "WRONG_GUESS"; playerName: string }
  | { type: "GUESS"; playerName: string; playerColor: string; guess: string }
  | { type: "ROUND_END"; scores: Record<string, number>; correctGuessers: string[] }
  | { type: "GAME_END" };

export const {
  suspense: {
    RoomProvider,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useBroadcastEvent,
    useEventListener,
    useStorage,
    useMutation,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useStatus,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
