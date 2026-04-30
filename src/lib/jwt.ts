import { SignJWT, jwtVerify } from "jose";
import type { PlayerTokenPayload } from "./types";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  if (secret.length < 32)
    throw new Error("JWT_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function signPlayerToken(
  payload: PlayerTokenPayload
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getSecret());
}

export async function verifyPlayerToken(
  token: string
): Promise<PlayerTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as PlayerTokenPayload;
}
