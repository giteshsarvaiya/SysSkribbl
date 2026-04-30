// SERVER ONLY — never import this in client components
import type { Category, Difficulty } from "./types";

type Prompt = { text: string; difficulty: Difficulty };

export const PROMPT_LIBRARY: Record<Category, Prompt[]> = {
  classic: [
    { text: "URL Shortener",        difficulty: "easy"   },
    { text: "Pastebin",             difficulty: "easy"   },
    { text: "Rate Limiter",         difficulty: "medium" },
    { text: "Web Crawler",          difficulty: "medium" },
    { text: "Job Scheduler",        difficulty: "medium" },
    { text: "Notification Service", difficulty: "medium" },
    { text: "Search Autocomplete",  difficulty: "hard"   },
    { text: "Proximity Service",    difficulty: "hard"   },
    { text: "Ride Sharing",         difficulty: "hard"   },
    { text: "Live Leaderboard",     difficulty: "hard"   },
  ],
  databases: [
    { text: "Read Replica",          difficulty: "easy"   },
    { text: "Database Sharding",     difficulty: "medium" },
    { text: "Connection Pool",       difficulty: "medium" },
    { text: "Consistent Hashing",    difficulty: "medium" },
    { text: "B-Tree Index",          difficulty: "medium" },
    { text: "Write-Ahead Log",       difficulty: "hard"   },
    { text: "Leader Election",       difficulty: "hard"   },
    { text: "Two-Phase Commit",      difficulty: "hard"   },
    { text: "Event Sourcing",        difficulty: "hard"   },
    { text: "CQRS Pattern",          difficulty: "hard"   },
  ],
  infra: [
    { text: "CDN",             difficulty: "easy"   },
    { text: "Load Balancer",   difficulty: "easy"   },
    { text: "Message Queue",   difficulty: "easy"   },
    { text: "Reverse Proxy",   difficulty: "easy"   },
    { text: "DNS",             difficulty: "easy"   },
    { text: "Redis Cache",     difficulty: "easy"   },
    { text: "API Gateway",     difficulty: "medium" },
    { text: "Kafka",           difficulty: "medium" },
    { text: "Circuit Breaker", difficulty: "medium" },
    { text: "Service Mesh",    difficulty: "hard"   },
  ],
  famous: [
    { text: "Spotify Playlist",   difficulty: "easy"   },
    { text: "Instagram Feed",     difficulty: "medium" },
    { text: "YouTube Upload",     difficulty: "medium" },
    { text: "Gmail",              difficulty: "medium" },
    { text: "GitHub",             difficulty: "medium" },
    { text: "Slack",              difficulty: "medium" },
    { text: "Twitter Timeline",   difficulty: "hard"   },
    { text: "Netflix Streaming",  difficulty: "hard"   },
    { text: "Uber Dispatch",      difficulty: "hard"   },
    { text: "Google Search Index",difficulty: "hard"   },
  ],
  interview: [
    { text: "Design a Chat App",           difficulty: "medium" },
    { text: "Design a Food Delivery App",  difficulty: "medium" },
    { text: "Design Airbnb",               difficulty: "medium" },
    { text: "Design WhatsApp",             difficulty: "hard"   },
    { text: "Design Google Drive",         difficulty: "hard"   },
    { text: "Design Dropbox",              difficulty: "hard"   },
    { text: "Design TikTok",               difficulty: "hard"   },
    { text: "Design Zoom",                 difficulty: "hard"   },
    { text: "Design Amazon",               difficulty: "hard"   },
    { text: "Design Twitter",              difficulty: "hard"   },
  ],
};

function resolvePool(category: Category, difficulty: Difficulty): Prompt[] {
  const filtered = PROMPT_LIBRARY[category].filter((p) => p.difficulty === difficulty);
  return filtered.length > 0 ? filtered : PROMPT_LIBRARY[category];
}

export function getPromptOptionsForRound(
  category: Category,
  difficulty: Difficulty,
  roundIndex: number
): [string, string, string] {
  const pool = resolvePool(category, difficulty);
  const n    = pool.length;
  const base = roundIndex % n;
  return [
    pool[base % n].text,
    pool[(base + Math.ceil(n / 3)) % n].text,
    pool[(base + Math.ceil((n * 2) / 3)) % n].text,
  ];
}

export function getPromptForRound(
  category: Category,
  difficulty: Difficulty,
  roundIndex: number,
  variant: 0 | 1 | 2 = 0
): string {
  return getPromptOptionsForRound(category, difficulty, roundIndex)[variant];
}

// Build the three progressive hints for a prompt
export function buildHints(prompt: string): [string, string, string] {
  const words = prompt.split(" ");

  // hint 0: all chars replaced with underscores, spaces preserved
  const hint0 = words
    .map((w) => Array.from(w).map(() => "_").join(" "))
    .join("   ");

  // hint 1: reveal first letter of each word
  const hint1 = words
    .map((w) =>
      w.length === 0
        ? ""
        : w[0] +
          Array.from(w.slice(1))
            .map(() => " _")
            .join("")
    )
    .join("   ");

  // hint 2: reveal first + one middle letter of each word
  const hint2 = words
    .map((w) => {
      if (w.length <= 2) return w;
      const mid = Math.floor(w.length / 2);
      return Array.from(w)
        .map((c, i) => (i === 0 || i === mid ? c : "_"))
        .join(" ");
    })
    .join("   ");

  return [hint0, hint1, hint2];
}

// Levenshtein distance for fuzzy guess matching
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function isCorrectGuess(guess: string, prompt: string): boolean {
  const g = guess.trim().toLowerCase();
  const p = prompt.trim().toLowerCase();
  if (g === p) return true;
  // Allow up to 1 edit for short prompts, 2 for longer ones
  const threshold = p.length <= 8 ? 1 : 2;
  // Reject single-word guesses for multi-word prompts
  if (p.includes(" ") && !g.includes(" ") && g.split(" ").length === 1)
    return false;
  return levenshtein(g, p) <= threshold;
}
