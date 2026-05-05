"use client";

import { useStorage, useSelf, useOthers } from "@/liveblocks.config";
import type { PlayerTokenPayload } from "@/lib/types";

interface HintDisplayProps {
  playerInfo: PlayerTokenPayload;
  prompt:     string | null;
  scenario?:  string | null;
}

export default function HintDisplay({ playerInfo, prompt, scenario }: HintDisplayProps) {
  const gameState = useStorage((root) => root.gameState);
  const self      = useSelf();
  const others    = useOthers();

  const isDrawer = gameState.currentDrawerId === playerInfo.playerId;
  const hints    = gameState.hints as string[];

  const categoryHint = hints.find(h => h.startsWith("CATEGORY:"))?.slice(9) ?? null;
  const letterHint   = hints.filter(h => !h.startsWith("CATEGORY:")).at(-1) ?? null;

  const drawerName = (() => {
    if (isDrawer) return null;
    if (self?.id === gameState.currentDrawerId) return "You";
    const o = others.find((o) => o.id === gameState.currentDrawerId);
    return o?.info?.name ?? "Someone";
  })();

  if (isDrawer) {
    return (
      <div className="flex flex-col items-center gap-0.5 max-w-md text-center px-2">
        <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest">
          You are drawing
        </p>
        <p className="font-baloo font-bold text-xl md:text-2xl text-white tracking-wide">
          {prompt ?? "…"}
        </p>
        {scenario && (
          <p className="font-nunito text-xs text-game-muted leading-snug line-clamp-2">
            {scenario}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="font-nunito text-[10px] text-game-muted uppercase tracking-widest">
        {drawerName ? (
          <><span style={{ color: "#58a6ff" }}>{drawerName}</span> is drawing</>
        ) : "Identify the system!"}
      </p>

      {categoryHint && (
        <span
          className="font-nunito text-[10px] font-semibold px-2 py-0.5 rounded-full mb-0.5"
          style={{ backgroundColor: "rgba(88,166,255,0.12)", color: "#58a6ff", border: "1px solid rgba(88,166,255,0.3)" }}
        >
          {categoryHint}
        </span>
      )}

      <div className="font-baloo font-bold text-xl md:text-2xl text-white tracking-[0.2em] select-none">
        {letterHint ? (
          <HintLetters hint={letterHint} />
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
