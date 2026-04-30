"use client";

import { useEventListener } from "@/liveblocks.config";
import confetti from "canvas-confetti";

const COLORS = ["#58a6ff", "#3fb950", "#e3b341", "#bc8cff", "#ffa657", "#ff7b72"];

export function fireConfetti(origin = { x: 0.5, y: 0.55 }) {
  confetti({
    particleCount: 120,
    spread: 80,
    origin,
    colors: COLORS,
    disableForReducedMotion: true,
  });
}

export default function ConfettiOverlay() {
  useEventListener(({ event }) => {
    if (event.type === "CONFETTI") {
      fireConfetti();
    }
  });
  return null;
}
