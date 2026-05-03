"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useBroadcastEvent, useEventListener } from "@/liveblocks.config";
import type { PlayerTokenPayload } from "@/lib/types";
import { playCorrect, playWrong, playHint } from "@/lib/sounds";

interface Message {
  id:          string;
  playerName:  string;
  playerColor: string;
  text:        string;
  type:        "guess" | "correct" | "system";
}

interface GuessStreamProps {
  playerInfo:    PlayerTokenPayload;
  isDrawer:      boolean;
  prompt:        string | null;
  onCorrect:     (points: number) => void;
}

function replaceLastGuessWithCorrect(
  prev: Message[],
  playerName: string,
  correctMsg: Message
): Message[] {
  // Find the most recent "guess" message from this player and remove it
  let removeIdx = -1;
  for (let i = prev.length - 1; i >= 0; i--) {
    if (prev[i].type === "guess" && prev[i].playerName === playerName) {
      removeIdx = i;
      break;
    }
  }
  const updated = removeIdx !== -1
    ? [...prev.slice(0, removeIdx), ...prev.slice(removeIdx + 1)]
    : [...prev];
  return [...updated.slice(-99), correctMsg];
}

export default function GuessStream({
  playerInfo,
  isDrawer,
  prompt,
  onCorrect,
}: GuessStreamProps) {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [sending, setSending]       = useState(false);
  const lastSentAt                  = useRef(0);
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const broadcast                   = useBroadcastEvent();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen to incoming broadcasts (fires for everyone EXCEPT the sender)
  useEventListener(({ event }) => {
    if (event.type === "GUESS") {
      setMessages((prev) => [
        ...prev.slice(-99),
        {
          id:          crypto.randomUUID(),
          playerName:  event.playerName,
          playerColor: event.playerColor,
          text:        event.guess,
          type:        "guess",
        },
      ]);
    }

    if (event.type === "CORRECT_GUESS_ANIMATION") {
      playCorrect();
      const correctMsg: Message = {
        id:          crypto.randomUUID(),
        playerName:  event.playerName,
        playerColor: "#3fb950",
        text:        `${event.playerName} guessed it! (+${event.points} pts)`,
        type:        "correct",
      };
      setMessages((prev) => replaceLastGuessWithCorrect(prev, event.playerName, correctMsg));
    }

    if (event.type === "HINT_UNLOCK") {
      playHint();
    }

    if (event.type === "WRONG_GUESS") {
      playWrong();
    }

    if (event.type === "ROUND_ENDING_SOON") {
      setMessages((prev) => [
        ...prev.slice(-99),
        {
          id:          crypto.randomUUID(),
          playerName:  "System",
          playerColor: "#e3b341",
          text:        "⏰ Time is almost up!",
          type:        "system",
        },
      ]);
    }
  });

  const submit = async () => {
    const text = input.trim();
    if (!text || sending || isDrawer || !prompt) return;

    const now = Date.now();
    if (now - lastSentAt.current < 2000) return;
    lastSentAt.current = now;

    setInput("");
    setSending(true);

    // Add own message immediately (broadcasts don't echo back to sender)
    const localId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev.slice(-99),
      {
        id:          localId,
        playerName:  playerInfo.playerName,
        playerColor: playerInfo.color,
        text,
        type:        "guess",
      },
    ]);

    broadcast({
      type:        "GUESS",
      playerName:  playerInfo.playerName,
      playerColor: playerInfo.color,
      guess:       text,
    });

    try {
      const token = localStorage.getItem("playerToken");
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ guess: text }),
      });

      if (res.ok) {
        const { correct, points } = await res.json();
        if (correct) {
          // Replace our local guess message with "guessed it" (others do this via CORRECT_GUESS_ANIMATION)
          playCorrect();
          const correctMsg: Message = {
            id:          crypto.randomUUID(),
            playerName:  playerInfo.playerName,
            playerColor: "#3fb950",
            text:        `You guessed it! (+${points} pts)`,
            type:        "correct",
          };
          setMessages((prev) => replaceLastGuessWithCorrect(prev, playerInfo.playerName, correctMsg));
          onCorrect(points);
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex gap-1.5 items-start"
            >
              {msg.type === "system" ? (
                <p
                  className="font-nunito text-xs w-full text-center py-0.5 rounded"
                  style={{ color: msg.playerColor, backgroundColor: msg.playerColor + "18" }}
                >
                  {msg.text}
                </p>
              ) : (
                <>
                  <span
                    className="font-nunito font-bold text-xs shrink-0 mt-0.5"
                    style={{ color: msg.playerColor }}
                  >
                    {msg.playerName}:
                  </span>
                  <span
                    className="font-nunito text-xs break-words"
                    style={{
                      color:      msg.type === "correct" ? "#3fb950" : "#e6edf3",
                      fontWeight: msg.type === "correct" ? 700 : 400,
                    }}
                  >
                    {msg.type === "correct" ? msg.text : msg.text}
                  </span>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!isDrawer && (
        <div
          className="px-2 py-2 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your guess…"
              maxLength={120}
              autoComplete="off"
              className="flex-1 rounded-lg px-3 py-2 font-nunito text-sm text-game-text placeholder-game-muted outline-none"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="px-3 py-2 rounded-lg font-nunito font-semibold text-xs text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#58a6ff" }}
            >
              ↵
            </button>
          </form>
        </div>
      )}

      {isDrawer && (
        <p className="px-3 py-2 font-nunito text-[11px] text-game-muted text-center shrink-0">
          You are drawing — watch the guesses roll in!
        </p>
      )}
    </div>
  );
}
