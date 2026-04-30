import { Liveblocks } from "@liveblocks/node";

// Lazy singleton — instantiated on first request so module-level imports
// don't throw when LIVEBLOCKS_SECRET_KEY isn't set (e.g. during build).
let _client: Liveblocks | null = null;

export function getLiveblocks(): Liveblocks {
  if (!_client) {
    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      throw new Error("LIVEBLOCKS_SECRET_KEY env var is not set");
    }
    _client = new Liveblocks({ secret });
  }
  return _client;
}
