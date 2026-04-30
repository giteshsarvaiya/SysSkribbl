import { NextRequest } from "next/server";
import { getLiveblocks } from "@/lib/liveblocks-server";
import { verifyPlayerToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const room = body?.room as string | undefined;

  if (!room) {
    return new Response(JSON.stringify({ error: "room is required" }), {
      status: 400,
    });
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  let payload;
  try {
    payload = await verifyPlayerToken(token);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
    });
  }

  // Ensure this player's token is for this room
  if (payload.roomId !== room) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const session = getLiveblocks().prepareSession(payload.playerId, {
    userInfo: {
      name: payload.playerName,
      color: payload.color,
      avatar: payload.avatar,
    },
  });

  session.allow(room, session.FULL_ACCESS);

  const { body: sessionBody, status } = await session.authorize();
  return new Response(sessionBody, { status });
}
