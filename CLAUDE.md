# SysSkribbl — Claude Instructions

## Workflow rules

- **Always walk through every planned change before editing any file.** List what you intend to do and wait for the user to say yes before writing anything.
- **Never add a `Co-Authored-By` trailer to commit messages.** Plain commit messages only.
- **Use `pnpm`** for all package operations, not `npm` or `yarn`.
- **Use CLI scaffolding commands** (e.g. `pnpm create next-app@latest`) instead of writing config files by hand.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router |
| Realtime | Liveblocks v3 (`@liveblocks/client`, `@liveblocks/react`) |
| Styling | Tailwind v4 — config lives in `src/app/globals.css` inside `@theme {}`, **no** `tailwind.config.ts` |
| Animation | `motion/react` (Motion v12) — import from `"motion/react"`, not `"framer-motion"` |
| Canvas | Rough.js v4 |
| Auth | JWT HS256 via `jose` — helpers in `src/lib/jwt.ts` |
| Sound | Web Audio API — all sounds in `src/lib/sounds.ts`, no audio files |
| Confetti | `canvas-confetti` via `src/components/ui/ConfettiOverlay.tsx` |

## Key conventions

### Liveblocks
- All hooks come from `@/liveblocks.config` (the suspense variants).
- Iterate `LiveList` with a `for` loop — `.toArray()` does not exist in v3.
- `gameState.scores` is typed as `ReadonlyJson`; cast to `Record<string, number>` before arithmetic.
- Broadcast events do **not** echo back to the sender — add messages to local state manually after calling `broadcast()`.

### Game phase flow
```
lobby → selecting → drawing → roundEnd → selecting → ... → gameEnd
```
- `timerStartedAt` is set to `Date.now()` inside the `selectWord` mutation (not at round start).
- The actual prompt word is **never** stored in Liveblocks Storage. Only `selectedPromptVariant: 0 | 1 | 2` is stored; the server reconstructs the word from `category + difficulty + round + variant`.

### Scoring
All point values live in `src/lib/scoring.ts`. Import from there — do not hardcode numbers in components or API routes.

### Mobile layout
- Root containers use `h-dvh` (not `min-h-screen`).
- `html, body` have `overflow: hidden; height: 100dvh; overscroll-behavior: none` in `globals.css` — do not remove these.
- The mobile bottom panel in `GameRoom` shows players and chat **side by side** (no tabs).

### Single GuessStream instance
`GameRoom` renders only one `GuessStream` at a time — desktop sidebar OR mobile panel, never both. This prevents double event listeners and duplicate sounds. Do not revert this.
