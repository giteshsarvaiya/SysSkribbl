# SysSkribbl 🎨

> *Skribbl.io meets System Design — Draw distributed systems, let others guess.*

---

## What Is It?

SysSkribbl is a multiplayer real-time drawing game where one player draws a system architecture diagram and others race to guess what system it represents. Think Skribbl.io, but the prompts are system design concepts — "Draw: Twitter's feed system", "Draw: a CDN", "Draw: event sourcing."

The game turns one of the most intimidating topics in software engineering — distributed systems and architecture — into something absurd, competitive, and fun.

---

## Why It Will Go Viral

- Every developer has drawn a terrible architecture diagram on a whiteboard
- The moment someone confidently guesses "that's Kafka" from a scribble of boxes and arrows is inherently funny and shareable
- Appeals to two audiences at once — developers who know the concepts, and non-developers who just see chaos
- The GIF of a bad system design drawing being guessed wrong three times is the kind of clip that gets shared on dev Twitter, LinkedIn, and Reddit
- r/buildrealtime, Hacker News, and developer Twitter are the exact distribution channels for this

---

## Target Audience

- Software engineers (mid to senior level)
- System design interview preppers
- Engineering teams who want a fun async activity
- Developer community builders

---

## Architecture Overview

SysSkribbl uses a **thin Next.js API backend** alongside Liveblocks. The split is deliberate:

| Layer | Responsibility |
|---|---|
| **Liveblocks Storage** | Canvas strokes, player presence, round progress, scores |
| **Liveblocks Presence** | Cursors, typing indicators, player roles |
| **Liveblocks Broadcast** | UI-only events (animations, notifications) |
| **Next.js API Routes** | Prompt delivery, guess validation, timer authority, room control |

This split exists because Liveblocks Storage is readable by **all connected clients**. Storing prompts there would instantly leak the answer to every guesser's browser. The backend is intentionally minimal — four routes — not a full server.

```
Client (Drawer) ──► POST /api/guess ──► Validate + Score ──► update Storage scores
Client (Guesser) ──► POST /api/guess ──► Validate + Score ──► update Storage scores
Client (Host) ──► POST /api/room/start ──► Issue timer ──► update Storage gameState
Drawer Client ──► GET /api/prompt?roomId=X&token=Y ──► Returns prompt (drawer only)
```

---

## Core Features

### 🎮 Game Loop

- Players join a room via a shareable link — no account required
- One player is the **Host** (room creator); host controls game start
- Each round, one player is assigned as the **Drawer** (rotates in join order)
- The Drawer privately receives a system design prompt — **no other player can see it**
- They have **90 seconds** to draw it on a shared canvas using shapes, arrows, labels, and boxes
- All other players type guesses in real time
- Points are awarded based on speed of correct guess
- After all players have drawn (or N rounds), the game ends

### 🖊️ Drawing Canvas

- Shared real-time canvas powered by Liveblocks Storage
- **Drawer-only lock**: the canvas input is disabled for guessers at the DOM level; the server ignores strokes from non-drawers
- Tools: rectangle, circle, arrow, line, freehand, text label, eraser, color picker
- **Undo**: last stroke can be undone (LiveList `.delete()` on last item)
- All strokes appear instantly across all connected players via Liveblocks Storage sync
- Drawer's cursor is live for all players via Presence
- Canvas is **cleared** (LiveList wiped) when a new round starts

### 👥 Live Presence

- Player avatars shown at the top of the screen
- Each player has a unique color tied to their session
- Live cursor for the Drawer only (guessers' cursors hidden to reduce noise)
- Typing indicator ("Sarah is guessing...") visible to all players when a guesser is typing
- Drawer is visually highlighted with a special badge
- Disconnected players shown as greyed-out with a reconnect timeout indicator

### 💬 Guess Stream

- Real-time guess feed visible to all players
- Guesses are **validated server-side** — the client never knows the answer
- Correct guesses are highlighted and trigger a round-end animation
- Wrong guesses appear in the stream as plain text (no strikethrough — avoids implying "almost")
- Players who already guessed correctly see a "Waiting for others..." overlay on the canvas
- Drawer can see all guesses but **cannot guess** (their input is locked)
- **Rate limit**: one guess per player per 2 seconds (enforced client-side with a cooldown; backend ignores extras)

### 💡 Hint System

Progressive hints release automatically to prevent rounds from going dead:

| Time Elapsed | Hint Released |
|---|---|
| 45s | Number of words and character count revealed (e.g., `_ _ _   _ _ _ _ _ _ _`) |
| 65s | First letter of each word revealed (e.g., `U _ _   S _ _ _ _ _ _ _`) |
| 80s | One random middle letter per word revealed |

Hints are computed server-side from the prompt and stored in `gameState.hints[]` in Liveblocks Storage as they unlock. Clients watch for hint additions and animate them in.

### 🏆 Scoring

**Guesser points** (per correct guess):

```
points = Math.max(10, Math.round(100 * (1 - elapsed / 90)))
```

- First correct guess at 5s → 94 pts
- Correct guess at 45s → 50 pts
- Correct guess at 85s → 10 pts (floor)
- No correct guess → 0 pts

**Drawer points**:

```
drawerPoints = correctGuessers * 15
```

- More people guess correctly = drawer was a good artist. Max 4 guessers × 15 = 60 pts per round.

**If no one guesses correctly**: everyone gets 0. Round ends at 90s automatically.

Cumulative leaderboard in `gameState.scores` (LiveObject) updates live after each round. End-of-game result card is shareable as an image.

### 📚 Prompt Library

Built-in categories (prompts are stored server-side, never sent to the client until it is that player's turn to draw):

| Category | Example Prompts |
|---|---|
| Classic Systems | URL shortener, rate limiter, web crawler, pastebin |
| Databases | Read replica setup, sharding strategy, write-ahead log, connection pool |
| Infra Concepts | CDN, load balancer, message queue, reverse proxy, circuit breaker |
| Famous Systems | Twitter timeline, Netflix streaming, Uber dispatch, Google search index |
| Interview Classics | Design WhatsApp, design Google Drive, design Dropbox, design TikTok |

Each prompt has a `difficulty: "easy" | "medium" | "hard"` tag. In the lobby, the host selects a category and difficulty filter.

### 🔗 Room System

- Instant room creation — generates a 6-character alphanumeric room code
- Public rooms (listed on landing page) and private rooms (link-only, not listed)
- Room is locked when the game starts — no new players mid-game (spectators can still join)
- Room auto-closes 5 minutes after all players disconnect (Liveblocks webhook → API cleanup)
- Max 8 players per room (6 active + 2 spectators)

### 👀 Spectator Mode

- Spectators join after the game has started
- They see the live canvas, the guess stream, and the leaderboard
- They cannot guess or draw
- Spectators see a "Round in progress — 42s remaining" banner on join
- If they join between rounds, they see the recap screen

---

## Complete User Journey

```
Landing Page
     ↓
Create Room (host) / Join Room (via link or code)
     ↓
Lobby — set display name, see who's joined, host picks category + rounds
     ↓
Host clicks "Start Game" → POST /api/room/start
     ↓
     ┌──────────────── Round N ────────────────┐
     │                                          │
  [Drawer]                               [Guessers]
  GET /api/prompt (drawer token)         See blank canvas
  Receives secret prompt                 Watch drawing appear live
  Draws on shared canvas                 Type guesses → POST /api/guess
  Sees guesses in stream (read only)     See hints unlock at 45s / 65s / 80s
     │                                          │
     └──── Correct guess OR 90s timer ends ─────┘
                         ↓
              Round End Screen (3s)
              "The answer was: Message Queue"
              Show drawing + who guessed + scores
                         ↓
              Scores update in LiveObject
                         ↓
              Canvas wipes (LiveList cleared)
                         ↓
              Next round → next Drawer in rotation
                         ↓
              After N rounds → Final Leaderboard
                         ↓
              Shareable result card generated
```

---

## Edge Cases Handled

### Player Disconnect Mid-Round

- **Drawer disconnects**: Liveblocks Presence drops them. After 10s with no reconnect, the round is auto-skipped, drawer gets 0 pts, next drawer is assigned.
- **Guesser disconnects**: Their slot remains in the leaderboard but they cannot score. If they reconnect before round ends, they can still guess.
- **Host disconnects**: Host role transfers to the next oldest player in the room. The new host can pause or abandon the game.

### What If Nobody Guesses Correctly

Timer hits 90s, server transitions round. No points awarded. "The answer was: [prompt]" is revealed on round-end screen to all players.

### Concurrent Correct Guesses

Two players submit the correct answer in the same 100ms window. Both API calls arrive at the server near-simultaneously. The server processes them in order — both still get points based on their individual timestamps. No race condition — scoring is additive, not singular.

### Guess Fuzzy Matching

Server-side guess validation uses fuzzy matching:

```ts
// Levenshtein distance threshold by prompt length
const threshold = prompt.length <= 8 ? 1 : 2;
const distance = levenshtein(guess.toLowerCase(), prompt.toLowerCase());
const isCorrect = distance <= threshold;
```

Handles: "mesage queue" → "message queue", "url shortner" → "url shortener". Does not accept single-word guesses for multi-word prompts (prevents guessing "queue" for "message queue").

### Late Joiners Mid-Game

- Spectator mode: full canvas state loads from Liveblocks Storage (all current strokes)
- They see the timer already counting down (calculated from `gameState.timerStartedAt`)
- Hints that have already unlocked are already in `gameState.hints[]` — immediately visible

### Single-Player Room

Host alone in a room: "Start Game" button is disabled until at least 2 players are in the lobby. Toast: "Waiting for at least 1 more player..."

### Guess Spam

Client enforces 2s cooldown after each submission. Backend additionally rate-limits by session to 1 guess per 2 seconds (429 response discarded silently). Guess stream only renders last 50 guesses to prevent DOM overflow.

### XSS in Player Names and Guesses

All player-supplied strings are HTML-escaped before rendering. Player names are capped at 20 characters, alphanumeric + spaces only (enforced on input). Guesses are plain text only, stripped of HTML before display.

---

## Liveblocks Features Used

### 1. `useStorage` + `LiveList` — Canvas State

The drawing canvas is stored as a `LiveList` of stroke objects. Every new stroke the Drawer adds is appended instantly to all connected clients. The list is wiped at the start of each round.

```ts
type Stroke = {
  id: string
  type: "rect" | "circle" | "arrow" | "line" | "freehand" | "text"
  x: number
  y: number
  width?: number
  height?: number
  points?: number[]   // for freehand paths
  color: string
  label?: string
  drawerId: string    // server ignores strokes where drawerId !== currentDrawer
}
```

### 2. `useOthers` + Presence — Live Cursors & Player State

Each player broadcasts their cursor position, name, color, and role via Presence. Only the Drawer's cursor is shown on canvas (guessers' cursors would distract). Typing indicator is broadcast when a guesser is actively typing a guess.

```ts
type Presence = {
  cursor: { x: number; y: number } | null
  name: string
  color: string
  role: "drawer" | "guesser" | "spectator"
  isTyping: boolean
  sessionToken: string  // opaque token for server-side identity verification
}
```

### 3. `useBroadcastEvent` — UI-Only Events

Broadcast Events are used exclusively for ephemeral UI effects — not for game state transitions (which go through the backend into Storage instead).

```ts
type UIEvent =
  | { type: "CORRECT_GUESS_ANIMATION"; playerName: string; points: number }
  | { type: "HINT_UNLOCK"; hintIndex: number }
  | { type: "ROUND_ENDING_SOON" }   // fires at T-10s for visual countdown pulse
  | { type: "CONFETTI" }            // end of game
```

### 4. `useStorage` + `LiveObject` — Game State

All persistent, catch-up-safe state lives in a `LiveObject`. A player joining mid-round immediately sees the correct state.

```ts
type GameState = {
  phase: "lobby" | "drawing" | "roundEnd" | "gameEnd"
  currentRound: number
  totalRounds: number
  currentDrawerId: string
  drawerOrder: string[]          // rotation order determined at game start
  scores: Record<string, number>
  timerStartedAt: number         // server-issued Unix ms timestamp
  roundDurationMs: number        // always 90000, but configurable by host
  correctGuessers: string[]      // playerIds who guessed correctly this round
  hints: string[]                // progressive hints unlocked so far ["_ _ _", "U _ _", ...]
  category: string
  difficulty: "easy" | "medium" | "hard"
  // NOTE: the actual prompt is NEVER stored here — it lives only on the server
  //       and is fetched privately by the drawer via GET /api/prompt
}
```

### 5. Liveblocks Rooms — Session Isolation

Each game session is an isolated Liveblocks Room. Room ID is the 6-character game code. Multiple games run simultaneously in separate rooms with zero cross-contamination.

### 6. Liveblocks Webhooks — Room Lifecycle

Liveblocks webhooks notify the backend when:
- `roomCreated` → initialize game state in Storage
- `userLeft` → check if drawer left, auto-skip if needed
- `roomEmpty` → schedule room cleanup after 5 min

### Summary Table

| Liveblocks Feature | Used For |
|---|---|
| `LiveList<Stroke>` | Canvas stroke storage and real-time sync |
| `LiveObject` (GameState) | Round, scores, timer, hints — catch-up for late joiners |
| `useOthers` / Presence | Drawer's live cursor, typing indicators, player roles |
| `useBroadcastEvent` | UI animations (correct guess burst, confetti, round pulse) |
| Rooms | Per-game session isolation |
| Webhooks | Drawer disconnect detection, room cleanup |

---

## Backend API Routes (Minimal)

Four Next.js API routes. No database. Prompts are hardcoded in a server-only module.

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/room/create` | — | Generate room code, init Liveblocks room |
| `POST /api/room/start` | Host token | Validate player count, pick prompt order, write initial GameState to Storage, issue drawer tokens |
| `GET /api/prompt` | Drawer session token | Return this round's prompt to the current drawer only |
| `POST /api/guess` | Player session token | Validate guess against prompt, compute score, write to Storage |

Session tokens are short-lived JWTs (1 hour) containing `{ playerId, roomId, role }`. They are issued on room join and stored in `localStorage`. The backend verifies the token on every API call.

Prompt delivery is the most security-sensitive route:

```ts
// GET /api/prompt?roomId=X
// Authorization: Bearer <drawerToken>

const { playerId, roomId } = verifyToken(req.headers.authorization)
const gameState = await liveblocks.getStorageDocument(roomId)

if (gameState.currentDrawerId !== playerId) {
  return res.status(403).json({ error: "Not the current drawer" })
}

const prompt = PROMPT_LIBRARY[gameState.category][gameState.currentRound]
return res.json({ prompt })
// prompt never touches Liveblocks Storage
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 + TypeScript |
| Real-time | Liveblocks |
| Canvas | Rough.js (hand-drawn aesthetic) + React |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes (serverless, Vercel) |
| Auth | Short-lived JWTs (no external auth provider) |
| Deployment | Vercel |

---

## Why Rough.js for the Canvas?

The hand-drawn, sketchy aesthetic of Rough.js is a deliberate design choice. It makes terrible drawings look intentionally rough rather than just bad. It lowers the barrier for players who feel they "can't draw" — everyone's boxes and arrows look equally chaotic, which is part of the fun. A perfect rectangle labeled "DB" looks worse than a wobbly Rough.js rectangle labeled "DB".

---

## What Makes This a Strong Liveblocks Demo

1. **Uses the full Liveblocks stack** — Storage, Presence, and Broadcast Events all working together in distinct roles
2. **Real-time is the entire product** — remove Liveblocks and the game doesn't exist
3. **Presence as gameplay mechanic** — the typing indicator isn't decoration, it's tension-building
4. **Storage as game state** — late joiners get complete state for free; no "catch up" protocol needed
5. **Broadcast Events for ephemerality** — correct guess animations are fire-and-forget, not state; demonstrates knowing when NOT to use Storage
6. **Immediately legible in a video** — open two browser windows side by side, start drawing in one, watch it appear in the other. The demo moment is obvious in the first 5 seconds

---

## Virality Distribution Plan

- **r/buildrealtime** — post the build journey and link the demo
- **Dev Twitter/X** — post a screen recording GIF of a bad system design drawing being guessed
- **Hacker News Show HN** — "I built Skribbl.io for system design interviews"
- **Liveblocks Discord** — share as a community showcase
- **LinkedIn** — tag Steven Fabre and the Liveblocks team

---

## Build Timeline Estimate

| Phase | Tasks | Time |
|---|---|---|
| Day 1 | Room creation, session tokens, lobby UI, player join flow | 1 day |
| Day 2 | Canvas + drawing tools + Liveblocks Storage sync + Rough.js | 1 day |
| Day 3 | Presence — Drawer cursor, typing indicators, player list | 1 day |
| Day 4 | Guess API route + fuzzy matching + correct guess flow + scoring formula | 1 day |
| Day 5 | Timer (server-issued `timerStartedAt`) + hint system + round-end reveal | 1 day |
| Day 6 | Disconnect handling + edge cases (AFK skip, single player guard, spectators) | 1 day |
| Day 7 | Prompt library + category/difficulty selection + leaderboard + result card | 1 day |
| Day 8 | UI polish, animations, Broadcast Events for confetti + guess burst | 1 day |
| Day 9 | Testing (2-tab local, edge cases) + bug fixes + Vercel deployment | 1 day |

**Total: ~9 days of focused work**

---

*Built with Liveblocks — real-time collaboration infrastructure.*
