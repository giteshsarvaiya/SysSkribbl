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

## Core Features

### 🎮 Game Loop

- Players join a room via a shareable link — no account required
- Each round, one player is assigned as the Drawer
- The Drawer receives a system design prompt (e.g., "Draw: a URL shortener")
- They have **90 seconds** to draw it on a shared canvas using basic shapes, arrows, labels, and boxes
- All other players type guesses in real time
- Points are awarded based on speed of correct guess
- Roles rotate every round

### 🖊️ Drawing Canvas

- Shared real-time canvas powered by Liveblocks
- Tools: rectangle, circle, arrow, line, text label, eraser, color picker
- All strokes appear instantly across all connected players
- Drawer's cursor is visible to all players as they draw

### 👥 Live Presence

- Player avatars shown at the top of the screen
- Each player has a unique color tied to their session
- Live indicator showing who is currently guessing (typing indicator)
- Drawer is visually highlighted with a special badge

### 💬 Guess Stream

- Real-time chat/guess feed visible to all players
- Correct guesses are highlighted and the round ends
- Wrong guesses appear in the stream with a subtle strikethrough effect
- Players who already guessed correctly can see others still trying

### 🏆 Scoring & Leaderboard

- Points awarded per round based on guess speed
- Cumulative leaderboard updates live after each round
- End-of-game result card generated — shareable as an image

### 📚 Prompt Library

Built-in categories of prompts:

| Category | Example Prompts |
|---|---|
| Classic Systems | URL shortener, rate limiter, web crawler |
| Databases | Read replica setup, sharding strategy, write-ahead log |
| Infra Concepts | CDN, load balancer, message queue |
| Famous Systems | Twitter timeline, Netflix streaming, Uber dispatch |
| Interview Classics | Design WhatsApp, design Google Drive, design Dropbox |

### 🔗 Room System

- Instant room creation with a shareable link
- Public rooms (anyone can join) and private rooms (link-only)
- Room persists until all players leave
- Spectator mode — watch without playing

---

## User Journey

```
Landing Page
     ↓
Create Room / Join Room (via link)
     ↓
Lobby — see who's joined, pick display name
     ↓
Game Starts — Round 1
     ↓
  [If Drawer]                    [If Guesser]
  Receive prompt                 See blank canvas
  Draw on shared canvas          Watch drawing appear live
  See guesses in real time       Type guesses in chat
     ↓                                ↓
         Correct guess → Round ends
                  ↓
         Scores update live
                  ↓
         Next round — new Drawer
                  ↓
         After N rounds → Final Leaderboard
                  ↓
         Shareable result card generated
```

---

## Liveblocks Features Used

### 1. `useStorage` + `LiveList` — Canvas State
The drawing canvas is stored as a `LiveList` of stroke objects in Liveblocks Storage. Every new stroke the Drawer adds is appended to the list and instantly synced to all connected clients. This is the core real-time drawing mechanic.

```ts
// Each stroke stored as a LiveObject
{
  id: string,
  type: "rect" | "arrow" | "circle" | "text",
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  label?: string
}
```

### 2. `useOthers` + Presence — Live Cursors & Player State
Each player broadcasts their cursor position, display name, color, and current role (drawer/guesser) via Liveblocks Presence. All connected players can see each other's cursors moving in real time on the canvas.

```ts
// Presence shape per player
{
  cursor: { x: number, y: number } | null,
  name: string,
  color: string,
  role: "drawer" | "guesser",
  isTyping: boolean
}
```

### 3. `useBroadcastEvent` — Game Events
Game state transitions (round start, correct guess, round end, score update) are broadcast as ephemeral events to all players in the room. These don't need to be persisted — they just need to fire instantly to everyone.

```ts
// Event types broadcast during gameplay
type GameEvent =
  | { type: "ROUND_START"; prompt: string; drawerId: string }
  | { type: "CORRECT_GUESS"; playerId: string; playerName: string }
  | { type: "ROUND_END"; scores: Record<string, number> }
  | { type: "GAME_END"; finalScores: Record<string, number> }
```

### 4. `useStorage` + `LiveObject` — Game State
Persistent game state (current round, scores, whose turn it is, timer) is stored in a `LiveObject` so any player who joins mid-game gets the correct current state immediately.

```ts
// Game state in LiveObject
{
  phase: "lobby" | "drawing" | "roundEnd" | "gameEnd",
  currentRound: number,
  totalRounds: number,
  currentDrawerId: string,
  scores: Record<string, number>,
  timerStartedAt: number
}
```

### 5. Liveblocks Rooms — Session Isolation
Each game session is an isolated Liveblocks Room. Room ID is the unique game code. Multiple games run simultaneously in separate rooms with no cross-contamination.

### Summary Table

| Liveblocks Feature | Used For |
|---|---|
| `LiveList<LiveObject>` | Canvas stroke storage and sync |
| `useOthers` / Presence | Live cursors, player names, typing indicators |
| `useBroadcastEvent` | Round transitions, correct guess notifications |
| `LiveObject` | Persistent game state (scores, round, timer) |
| Rooms | Per-game session isolation |

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript |
| Real-time | Liveblocks |
| Canvas | Rough.js (hand-drawn aesthetic) + React |
| Styling | Tailwind CSS |
| Deployment | Vercel |

> **Note:** No backend required beyond Liveblocks. No database. No auth. Fully serverless.

---

## Why Rough.js for the Canvas?

The hand-drawn, sketchy aesthetic of Rough.js is a deliberate design choice. It makes terrible drawings look intentionally rough rather than just bad. It lowers the barrier for players who feel they "can't draw" — everyone's boxes and arrows look equally chaotic, which is part of the fun.

---

## What Makes This a Strong Liveblocks Demo

1. **Uses the full Liveblocks stack** — Storage, Presence, and Broadcast Events all working together, not just one feature
2. **Real-time is the entire product** — remove Liveblocks and the game doesn't exist. This isn't Liveblocks bolted onto an existing idea
3. **No backend complexity** — demonstrates that Liveblocks alone can power a complete multiplayer application
4. **Presence as gameplay mechanic** — seeing other players' cursors and typing indicators isn't decoration, it's core to the experience
5. **Immediately legible in a video** — open two browser windows side by side, start drawing in one, watch it appear in the other. The demo moment is obvious in the first 5 seconds

---

## Virality Distribution Plan

- **r/buildrealtime** — post the build journey and link the demo
- **Dev Twitter/X** — post a screen recording GIF of a bad system design drawing being guessed
- **Hacker News Show HN** — "I built Skribbl.io for system design interviews"
- **Liveblocks Discord** — share as a community showcase
- **LinkedIn** — tag Steven Fabre and Liveblocks team

---

## Build Timeline Estimate

| Phase | Tasks | Time |
|---|---|---|
| Day 1–2 | Canvas + drawing tools + Liveblocks Storage sync | 2 days |
| Day 3 | Presence — cursors, player list, typing indicators | 1 day |
| Day 4 | Game loop — rounds, timer, Broadcast Events | 1 day |
| Day 5 | Scoring, leaderboard, guess stream | 1 day |
| Day 6 | Prompt library, UI polish, Rough.js integration | 1 day |
| Day 7 | Testing, bug fixes, deployment | 1 day |

**Total: ~1 week of focused work**

---

*Built with Liveblocks — real-time collaboration infrastructure.*

