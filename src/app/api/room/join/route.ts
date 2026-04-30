import { NextRequest, NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { getLiveblocks } from "@/lib/liveblocks-server";
import { signPlayerToken } from "@/lib/jwt";
import type { JoinRoomBody } from "@/lib/types";

const playerId = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  12
);

export async function POST(request: NextRequest) {
  let body: JoinRoomBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playerName, avatar, color, roomId } = body;

  if (!playerName?.trim()) {
    return NextResponse.json({ error: "playerName is required" }, { status: 400 });
  }
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const normalizedRoomId = roomId.trim().toUpperCase();

  // Verify the room exists in Liveblocks
  try {
    await getLiveblocks().getRoom(normalizedRoomId);
  } catch {
    return NextResponse.json(
      { error: "Room not found — check the code and try again" },
      { status: 404 }
    );
  }

  const newPlayerId = playerId();

  const token = await signPlayerToken({
    playerId: newPlayerId,
    roomId: normalizedRoomId,
    playerName: playerName.trim().slice(0, 20),
    color: color ?? "#58a6ff",
    avatar: avatar ?? "🐱",
    role: "player",
  });

  return NextResponse.json({ playerToken: token });
}
