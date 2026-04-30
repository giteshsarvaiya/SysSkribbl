"use client";

import { useEffect, useRef, useState } from "react";
import { playTick } from "@/lib/sounds";

interface TimerProps {
  timerStartedAt: number;
  durationMs:     number;
  onHintUnlock?:  (index: number) => void;
  onExpire?:      () => void;
}

const HINT_THRESHOLDS = [45_000, 65_000, 80_000];

export default function Timer({
  timerStartedAt,
  durationMs,
  onHintUnlock,
  onExpire,
}: TimerProps) {
  const [remaining, setRemaining] = useState(durationMs);
  const unlockedHints = useRef<Set<number>>(new Set());
  const expiredRef    = useRef(false);
  const lastTickSec   = useRef(-1);

  useEffect(() => {
    unlockedHints.current = new Set();
    expiredRef.current    = false;
    lastTickSec.current   = -1;

    const tick = () => {
      const elapsed = Date.now() - timerStartedAt;
      const rem     = Math.max(0, durationMs - elapsed);
      setRemaining(rem);

      HINT_THRESHOLDS.forEach((threshold, i) => {
        if (elapsed >= threshold && !unlockedHints.current.has(i)) {
          unlockedHints.current.add(i);
          onHintUnlock?.(i);
        }
      });

      // Tick sound in last 10 seconds, once per second
      const secs = Math.ceil(rem / 1000);
      if (secs <= 10 && secs > 0 && secs !== lastTickSec.current) {
        lastTickSec.current = secs;
        playTick();
      }

      if (rem === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timerStartedAt, durationMs, onHintUnlock, onExpire]);

  const pct          = remaining / durationMs;
  const seconds      = Math.ceil(remaining / 1000);
  const color        = pct > 0.5 ? "#3fb950" : pct > 0.25 ? "#e3b341" : "#ff7b72";
  const circumference = 2 * Math.PI * 22;
  const dashOffset   = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
      <svg width="52" height="52" className="-rotate-90" style={{ position: "absolute" }}>
        <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="26" cy="26" r="20"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.5s" }}
        />
      </svg>
      <span
        className="font-baloo font-bold text-base leading-none z-10"
        style={{ color }}
      >
        {seconds}
      </span>
    </div>
  );
}
