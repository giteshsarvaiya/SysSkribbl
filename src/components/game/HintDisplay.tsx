"use client";

import { useStorage, useSelf, useOthers } from "@/liveblocks.config";
import type { PlayerTokenPayload } from "@/lib/types";

interface HintDisplayProps {
  playerInfo: PlayerTokenPayload;
  prompt:     string | null;
}

export default function HintDisplay({ playerInfo, prompt }: HintDisplayProps) {
  const gameState = useStorage((root) => root.gameState);
  const self      = useSelf();
  const others    = useOthers();

  const isDrawer  = gameState.currentDrawerId === playerInfo.playerId;
  const hints     = gameState.hints as string[];
  const latestHint = hints.length > 0 ? hints[hints.length - 1] : null;

  // Resolve drawer name for non-drawers
  const drawerName = (() => {
    if (isDrawer) return null;
    if (self?.id === gameState.currentDrawerId) return "You";
    const o = others.find((o) => o.id === gameState.currentDrawerId);
    return o?.info?.name ?? "Someone";
  })();

  if (isDrawer) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest">
          You are drawing
        </p>
        <p className="font-baloo font-bold text-xl md:text-2xl text-white tracking-wide">
          {prompt ?? "…"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest">
        {drawerName ? (
          <><span style={{ color: "#58a6ff" }}>{drawerName}</span> is drawing</>
        ) : "Guess the system!"}
      </p>
      <div className="font-baloo font-bold text-xl md:text-2xl text-white tracking-[0.2em] select-none">
        {latestHint ? (
          <HintLetters hint={latestHint} />
        ) : (
          <WordBlocks prompt={prompt} />
        )}
      </div>
    </div>
  );
}

function WordBlocks({ prompt }: { prompt: string | null }) {
  if (!prompt) return <span className="text-game-muted tracking-widest">_ _ _</span>;
  return (
    <span className="flex items-center gap-3 flex-wrap justify-center">
      {prompt.split(" ").map((word, wi) => (
        <span key={wi} className="flex items-center gap-1">
          {word.split("").map((_, ci) => (
            <span
              key={ci}
              className="inline-block border-b-2 border-game-muted"
              style={{ width: 14, height: 20 }}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

function HintLetters({ hint }: { hint: string }) {
  // Hint uses spaces between letters and triple-space between words
  const words = hint.split("   ");
  return (
    <span className="flex items-center gap-3 flex-wrap justify-center">
      {words.map((word, wi) => (
        <span key={wi} className="flex items-center gap-1">
          {word.split(" ").map((ch, ci) =>
            ch === "_" ? (
              <span
                key={ci}
                className="inline-block border-b-2 border-game-muted"
                style={{ width: 14, height: 20 }}
              />
            ) : (
              <span
                key={ci}
                className="inline-block text-game-blue font-bold"
                style={{ width: 14, textAlign: "center" }}
              >
                {ch}
              </span>
            )
          )}
        </span>
      ))}
    </span>
  );
}
