export type Phase = "lobby" | "selecting" | "drawing" | "roundEnd" | "gameEnd";
export type Role = "host" | "drawer" | "guesser" | "spectator";
export type Difficulty = "easy" | "medium" | "hard";
export type Category = "classic" | "databases" | "infra" | "famous" | "interview";
export type StrokeType = "rect" | "circle" | "arrow" | "line" | "freehand" | "text" | "component";

export type ComponentType =
  | "server" | "database" | "cache" | "queue"
  | "loadbalancer" | "cdn" | "client" | "storage"
  | "gateway" | "region"
  | "firewall" | "mobile" | "worker" | "external" | "search";

export type GameSettings = {
  category: Category;
  difficulty: Difficulty;
  rounds: 3 | 5 | 7;
  timerSeconds: 60 | 90 | 120;
};

export type Stroke = {
  id: string;
  type: StrokeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
  points?: number[]; // freehand: flattened [x1,y1, x2,y2, ...]
  color: string;
  strokeWidth: number;
  label?: string;
  drawerId: string;
  componentType?: ComponentType;
};

export type PlayerData = {
  id: string;
  name: string;
  color: string;
  avatar: string; // emoji
  isHost: boolean;
  joinedAt: number;
};

export type GameStateData = {
  phase: Phase;
  currentRound: number;
  totalRounds: number;
  currentDrawerId: string;
  drawerOrder: string[]; // playerIds in rotation order
  scores: Record<string, number>;
  timerStartedAt: number; // server-issued ms timestamp
  roundDurationMs: number;
  correctGuessers: string[]; // playerIds who guessed correctly this round
  hints: string[]; // progressively unlocked hint strings
  category: Category;
  difficulty: Difficulty;
  selectedPromptVariant: 0 | 1 | 2;
  revealedPrompt?: string;  // set only during roundEnd phase, cleared on next round
  roundEndAt?: number;      // timestamp when roundEnd started (for countdown sync)
  // prompt is NEVER stored here during drawing — fetched privately via GET /api/prompt
};

// API request bodies
export type CreateRoomBody = {
  playerName: string;
  avatar: string;
  color: string;
} & GameSettings;

export type JoinRoomBody = {
  playerName: string;
  avatar: string;
  color: string;
  roomId: string;
};

export type GuessBody = {
  guess: string;
};

// API response
export type RoomApiResponse = {
  roomId: string;
  playerToken: string;
};

export type ApiError = { error: string };

// JWT payload stored in player session token
export type PlayerTokenPayload = {
  playerId: string;
  roomId: string;
  playerName: string;
  color: string;
  avatar: string;
  role: "host" | "player" | "spectator";
};
