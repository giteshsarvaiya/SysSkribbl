"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LiveObject } from "@liveblocks/client";
import {
  useBroadcastEvent,
  useEventListener,
  useStorage,
  useMutation,
} from "@/liveblocks.config";
import type { PlayerTokenPayload, ChatMessage } from "@/lib/types";
import { playCorrect, playWrong, playHint } from "@/lib/sounds";

const MAX_MESSAGES = 50;

interface GuessStreamProps {
  playerInfo: PlayerTokenPayload;
  isDrawer:   boolean;
  prompt:     string | null;
  onCorrect:  (points: number) => void;
}

export default function GuessStream({
  playerInfo,
  isDrawer,
  prompt,
  onCorrect,
}: GuessStreamProps) {
  const [input,   setInput]   = useState("");
  const [sending, setSending] = useState(false);
  const lastSentAt            = useRef(0);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const broadcast             = useBroadcastEvent();

  const rawMessages = useStorage((root) => root.chatMessages);
  const messages: readonly ChatMessage[] = rawMessages ?? [];

  const addChatMessage = useMutation(({ storage }, msg: Omit<ChatMessage, "id">) => {
    const list = storage.get("chatMessages");
    while (list.length >= MAX_MESSAGES) list.delete(0);
    list.push(new LiveObject({ ...msg, id: crypto.randomUUID() }));
  }, []);

  // Auto-scroll to bottom on new messages
  // We can't use useEffect with messages dependency here since rawMessages is from storage
  // Instead we rely on a key trick — use a ref inside the render
  const prevLenRef = useRef(0);
  if (messages.length !== prevLenRef.current) {
    prevLenRef.current = messages.length;
    // Schedule scroll after paint
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  // Listen to broadcasts — sounds only; chat content comes through storage
  useEventListener(({ event }) => {
    if (event.type === "CORRECT_GUESS_ANIMATION") {
      playCorrect();
    }
    if (event.type === "HINT_UNLOCK") {
      playHint();
    }
    if (event.type === "WRONG_GUESS") {
      playWrong();
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

    try {
      const token = localStorage.getItem("playerToken");
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ guess: text }),
      });

      if (res.ok) {
        const { correct, points } = await res.json();
        if (correct) {
          playCorrect();
          addChatMessage({
            playerName:  playerInfo.playerName,
            playerColor: "#3fb950",
            text:        `${playerInfo.playerName} guessed it! (+${points} pts)`,
            type:        "correct",
            timestamp:   Date.now(),
          });
          onCorrect(points);
        } else {
          playWrong();
          addChatMessage({
            playerName:  playerInfo.playerName,
            playerColor: playerInfo.color,
            text,
            type:        "guess",
            timestamp:   Date.now(),
          });
          broadcast({ type: "WRONG_GUESS" });
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
          {[...messages].map((msg) => (
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
                    {msg.text}
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
