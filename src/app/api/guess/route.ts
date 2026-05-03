import { NextRequest, NextResponse } from "next/server";
import { verifyPlayerToken } from "@/lib/jwt";
import { getLiveblocks } from "@/lib/liveblocks-server";
import { getPromptForRound, isCorrectGuess } from "@/lib/prompts";
import { calcGuesserPoints } from "@/lib/scoring";
import type { Category, Difficulty, GameStateData } from "@/lib/types";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload;
  try {
    payload = await verifyPlayerToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const guess = typeof body?.guess === "string" ? body.guess.trim() : "";

  if (!guess) {
    return NextResponse.json({ error: "guess is required" }, { status: 400 });
  }

  const liveblocks = getLiveblocks();

  // Read current game state from Liveblocks Storage
  let gsData: GameStateData;
  try {
    const storageRes = await liveblocks.getStorageDocument(payload.roomId, "json") as
      { gameState?: GameStateData } | null;
    if (!storageRes?.gameState) throw new Error("no storage");
    gsData = storageRes.gameState;
  } catch {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (!gsData || gsData.phase !== "drawing") {
    return NextResponse.json({ correct: false, points: 0 });
  }

  // Drawer cannot guess
  if (gsData.currentDrawerId === payload.playerId) {
    return NextResponse.json({ correct: false, points: 0 });
  }

  // Already guessed correctly
  if (gsData.correctGuessers.includes(payload.playerId)) {
    return NextResponse.json({ correct: false, points: 0, alreadyGuessed: true });
  }

  const variant = (gsData.selectedPromptVariant ?? 0) as 0 | 1 | 2;
  const prompt = getPromptForRound(
    gsData.category as Category,
    gsData.difficulty as Difficulty,
    gsData.currentRound - 1,
    variant
  );

  if (!isCorrectGuess(guess, prompt)) {
    return NextResponse.json({ correct: false, points: 0 });
  }

  const elapsed = Date.now() - gsData.timerStartedAt;
  const points  = calcGuesserPoints(elapsed, gsData.roundDurationMs);

  return NextResponse.json({ correct: true, points, prompt });
}
