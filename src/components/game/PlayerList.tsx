"use client";

import { useSelf, useOthers, useStorage } from "@/liveblocks.config";
import Avatar from "@/components/ui/Avatar";
import type { PlayerTokenPayload } from "@/lib/types";

export default function PlayerList({
  playerInfo,
}: {
  playerInfo: PlayerTokenPayload;
}) {
  const gameState = useStorage((root) => root.gameState);
  const self      = useSelf();
  const others    = useOthers();

  const players = [
    self
      ? {
          id:       self.id,
          name:     self.info?.name   ?? playerInfo.playerName,
          color:    self.info?.color  ?? playerInfo.color,
          avatar:   self.info?.avatar ?? playerInfo.avatar,
          isHost:   playerInfo.role === "host",
          isSelf:   true,
        }
      : null,
    ...others.map((o) => ({
      id:     o.id,
      name:   o.info?.name   ?? "Player",
      color:  o.info?.color  ?? "#58a6ff",
      avatar: o.info?.avatar ?? "🐱",
      isHost: false,
      isSelf: false,
    })),
  ].filter(Boolean) as {
    id: string; name: string; color: string; avatar: string;
    isHost: boolean; isSelf: boolean;
  }[];

  const scores = gameState.scores as Record<string, number>;
  const sorted = [...players].sort(
    (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0)
  );

  return (
    <div
      className="flex flex-col gap-1 overflow-y-auto"
      style={{ maxHeight: "calc(100dvh - 120px)" }}
    >
      {sorted.map((p, i) => {
        const score    = scores[p.id] ?? 0;
        const isDrawer = gameState.currentDrawerId === p.id;
        const isCorrect = gameState.correctGuessers.includes(p.id);

        return (
          <div
            key={p.id}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-colors"
            style={{
              backgroundColor: isDrawer
                ? "rgba(88,166,255,0.12)"
                : isCorrect
                ? "rgba(63,185,80,0.1)"
                : "rgba(255,255,255,0.03)",
              border: isDrawer
                ? "1px solid rgba(88,166,255,0.3)"
                : "1px solid transparent",
            }}
          >
            <Avatar
              name={p.name}
              color={p.color}
              avatar={p.avatar}
              size="sm"
              isHost={p.isHost}
              isSelf={p.isSelf}
              isDrawer={isDrawer}
              showName={false}
            />

            <div className="flex-1 min-w-0">
              <p
                className="font-nunito font-semibold text-xs truncate leading-tight"
                style={{ color: p.color }}
              >
                {p.name}
              </p>
              {isCorrect && (
                <p className="font-nunito text-[8px] text-game-green leading-none">✓ got it</p>
              )}
              {isDrawer && (
                <p className="font-nunito text-[8px] text-game-blue leading-none">drawing</p>
              )}
              {p.isSelf && !isCorrect && !isDrawer && (
                <p className="font-nunito text-[8px] text-game-muted leading-none">you</p>
              )}
            </div>

            <span className="font-baloo font-bold text-xs text-game-text shrink-0">
              {score}
            </span>
          </div>
        );
      })}
    </div>
  );
}
