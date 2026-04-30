import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { getLiveblocks } from "@/lib/liveblocks-server";
import { signPlayerToken } from "@/lib/jwt";
import type { CreateRoomBody } from "@/lib/types";

const roomId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 6);
const playerId = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  12
);

export async function POST(request: NextRequest) {
  let body: CreateRoomBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playerName, avatar, color, category, difficulty, rounds, timerSeconds } =
    body;

  if (!playerName?.trim()) {
    return NextResponse.json({ error: "playerName is required" }, { status: 400 });
  }
  if (!["classic", "databases", "infra", "famous", "interview"].includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
  }
  if (![3, 5, 7].includes(rounds)) {
    return NextResponse.json({ error: "Invalid rounds" }, { status: 400 });
  }
  if (![60, 90, 120].includes(timerSeconds)) {
    return NextResponse.json({ error: "Invalid timerSeconds" }, { status: 400 });
  }

  const newRoomId = roomId();
  const newPlayerId = playerId();

  try {
    await getLiveblocks().createRoom(newRoomId, {
      defaultAccesses: [],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create room — try again" },
      { status: 500 }
    );
  }

  const token = await signPlayerToken({
    playerId: newPlayerId,
    roomId: newRoomId,
    playerName: playerName.trim().slice(0, 20),
    color: color ?? "#58a6ff",
    avatar: avatar ?? "🐱",
    role: "host",
  });

  return NextResponse.json({ roomId: newRoomId, playerToken: token });
}
