// SERVER ONLY — never import this in client components
import type { Category, Difficulty } from "./types";

export type SystemDesignPrompt = {
  system: string;
  scenario: string;
  difficulty: Difficulty;
  referenceComponents: string[];
  designNote: string;
};

export const PROMPT_LIBRARY: Record<Category, SystemDesignPrompt[]> = {
  classic: [
    {
      system: "URL Shortener",
      scenario: "Design a service that converts long URLs into short links (like bit.ly). Handle 100M redirects/day with millisecond latency.",
      difficulty: "easy",
      referenceComponents: ["Client", "DNS", "Load Balancer", "App Server", "Hash Service", "Cache (Redis)", "SQL DB", "CDN"],
      designNote: "Redirects are 100:1 read-heavy — cache hot URLs in Redis. Base62 encoding of a monotonic counter gives collision-free short codes.",
    },
    {
      system: "Pastebin",
      scenario: "Design a service where users paste text and get a unique shareable link, with syntax highlighting and optional expiry.",
      difficulty: "easy",
      referenceComponents: ["Client", "Load Balancer", "App Server", "Object Storage", "SQL DB (metadata)", "Cache (Redis)", "CDN"],
      designNote: "Store raw text in object storage (cheap, scalable) and only metadata (expiry, language, owner) in SQL.",
    },
    {
      system: "Rate Limiter",
      scenario: "Design a rate limiter that restricts API clients to N requests per minute. It must work across multiple server instances.",
      difficulty: "medium",
      referenceComponents: ["API Gateway", "Rate Limiter Middleware", "Redis (token bucket)", "App Server"],
      designNote: "Use Redis INCR + EXPIRE for a sliding window counter. Token bucket gives smoother throttling than fixed window.",
    },
    {
      system: "Web Crawler",
      scenario: "Design a distributed system that crawls billions of web pages, extracts links, and stores content for indexing.",
      difficulty: "medium",
      referenceComponents: ["URL Frontier (Queue)", "Fetcher Workers", "DNS Cache", "HTML Parser", "Link Extractor", "Document Store", "Visited URL Store"],
      designNote: "The URL frontier is the core — use priority queues to crawl high-value pages first. Politeness delays prevent overloading hosts.",
    },
    {
      system: "Job Scheduler",
      scenario: "Design a distributed job scheduler that runs millions of cron-style tasks reliably, even if servers fail mid-execution.",
      difficulty: "medium",
      referenceComponents: ["API Server", "Job Database", "Scheduler (cron trigger)", "Message Queue", "Worker Pool", "Heartbeat Monitor"],
      designNote: "Use optimistic locking when workers claim jobs to prevent double execution. Dead worker detection via missed heartbeats.",
    },
    {
      system: "Notification Service",
      scenario: "Design a system that delivers push notifications, emails, and SMS to users across multiple providers at scale.",
      difficulty: "medium",
      referenceComponents: ["API Server", "Message Queue", "Notification Workers", "Provider Adapters (APNS/FCM/SMTP)", "Retry Queue", "User Preference DB"],
      designNote: "Decouple sending from the API call with a queue — retries and dead-letter queues handle transient provider failures.",
    },
    {
      system: "Search Autocomplete",
      scenario: "Design the type-ahead suggestion box that shows top 5 completions as users type, responding in under 100ms.",
      difficulty: "hard",
      referenceComponents: ["Client", "CDN (edge cache)", "Trie Service", "Frequency DB", "Cache Layer", "Data Pipeline (trending updater)"],
      designNote: "Cache the trie at the edge — most users type the same prefixes. Update frequencies asynchronously via batch pipeline, not per query.",
    },
    {
      system: "Proximity Service",
      scenario: "Design a system that finds nearby businesses within a radius (like Yelp's nearby search) for 100M daily active users.",
      difficulty: "hard",
      referenceComponents: ["Client", "Load Balancer", "Location API", "Geohash Index", "Business DB", "Cache (Redis)", "CDN"],
      designNote: "Geohash divides Earth into grid cells — query adjacent cells to handle radius boundary cases. Cache search results per geohash cell.",
    },
    {
      system: "Ride Sharing",
      scenario: "Design a ride-hailing backend that matches riders to nearby drivers in real-time, tracks live locations, and handles payments.",
      difficulty: "hard",
      referenceComponents: ["Mobile Client", "API Gateway", "Location Service", "Matching Service", "Driver Location Store (Redis)", "Notification Service", "Payment Service", "Trip DB"],
      designNote: "Driver locations update every 4 seconds — store in Redis geospatial index (GEORADIUS) for sub-millisecond nearest-driver queries.",
    },
    {
      system: "Live Leaderboard",
      scenario: "Design a real-time leaderboard for a game with 10M concurrent players. Rankings must update within 1 second of a score change.",
      difficulty: "hard",
      referenceComponents: ["Game Client", "Score API", "Redis Sorted Set (ZADD/ZRANK)", "Message Queue", "Leaderboard DB", "WebSocket Server"],
      designNote: "Redis Sorted Sets give O(log N) rank queries. Shard by game segment if global rankings are too large for one node.",
    },
  ],

  databases: [
    {
      system: "Read Replica",
      scenario: "Design a database architecture where one primary handles writes and multiple replicas serve read traffic for a read-heavy app.",
      difficulty: "easy",
      referenceComponents: ["App Server", "Primary DB (writes)", "Replication Log", "Read Replica 1", "Read Replica 2", "Load Balancer (reads)"],
      designNote: "Replicas lag behind the primary — route time-sensitive reads (like post-payment confirmations) to primary, analytics to replicas.",
    },
    {
      system: "Database Sharding",
      scenario: "Design a sharding strategy for a user database that has grown beyond what a single machine can handle, with 1 billion rows.",
      difficulty: "medium",
      referenceComponents: ["App Server", "Shard Router", "Shard 1 (users 0-250M)", "Shard 2 (users 250-500M)", "Shard 3 (users 500-750M)", "Shard 4 (users 750M-1B)"],
      designNote: "Hash-based sharding distributes evenly but makes range queries expensive. Directory-based sharding is flexible but adds a lookup hop.",
    },
    {
      system: "Connection Pool",
      scenario: "Design a connection pooling layer between app servers and a database. 1000 app threads need to share 100 DB connections.",
      difficulty: "medium",
      referenceComponents: ["App Threads (×1000)", "Connection Pool Manager", "Active Connections (×100)", "Queue (waiting threads)", "Database"],
      designNote: "Pools reuse expensive TCP connections. Tune min/max pool size — too small starves threads, too large exhausts the DB.",
    },
    {
      system: "Consistent Hashing",
      scenario: "Design a data distribution scheme for a cache cluster where adding or removing nodes causes minimal data remapping.",
      difficulty: "medium",
      referenceComponents: ["Hash Ring", "Node A", "Node B", "Node C", "Virtual Nodes (vnodes)", "Key → Node Lookup"],
      designNote: "Virtual nodes per physical server smooth out uneven distribution. Only K/N keys remap when a node is added or removed.",
    },
    {
      system: "B-Tree Index",
      scenario: "Illustrate how a B-tree index enables fast lookups, range scans, and sorted access on a database column.",
      difficulty: "medium",
      referenceComponents: ["Root Node", "Internal Nodes (keys + pointers)", "Leaf Nodes (data pointers)", "Disk Pages", "Table Rows"],
      designNote: "B-trees stay balanced by splitting full nodes. Every lookup is O(log N) disk seeks — crucial since disk I/O dominates DB cost.",
    },
    {
      system: "Write-Ahead Log",
      scenario: "Design a crash-recovery mechanism for a database. Changes must be durable even if the server loses power mid-transaction.",
      difficulty: "hard",
      referenceComponents: ["Transaction", "WAL Buffer", "WAL File (disk)", "Buffer Pool (in-memory pages)", "Checkpoint", "Recovery Process"],
      designNote: "Write the log before the data page — on crash, replay WAL from last checkpoint. fsync ensures log is on disk before acking commit.",
    },
    {
      system: "Leader Election",
      scenario: "Design a system where multiple servers must agree on exactly one leader to coordinate distributed tasks, tolerating node failures.",
      difficulty: "hard",
      referenceComponents: ["Node A (candidate)", "Node B (follower)", "Node C (follower)", "Consensus Store (etcd)", "Heartbeat Lease", "New Leader Notification"],
      designNote: "Use Raft or etcd ephemeral keys — leader writes a heartbeat lease; others take over if it expires. Quorum prevents split-brain.",
    },
    {
      system: "Two-Phase Commit",
      scenario: "Design a protocol that ensures a distributed transaction either commits on all participating databases or rolls back on all.",
      difficulty: "hard",
      referenceComponents: ["Coordinator", "Participant DB A", "Participant DB B", "Prepare Phase", "Vote (yes/no)", "Commit / Rollback"],
      designNote: "2PC blocks if the coordinator crashes after prepare — participants hold locks indefinitely. Saga patterns avoid this for long transactions.",
    },
    {
      system: "Event Sourcing",
      scenario: "Design a system where state is derived by replaying an immutable log of events, rather than storing current state directly.",
      difficulty: "hard",
      referenceComponents: ["Command Handler", "Event Store (append-only)", "Event Bus", "Projections (read models)", "Snapshot Store", "Query Service"],
      designNote: "The event store is the system of record — projections can be rebuilt from scratch. Snapshots prevent replaying millions of events on startup.",
    },
    {
      system: "CQRS Pattern",
      scenario: "Design an architecture that separates read models from write models, allowing each to be scaled and optimized independently.",
      difficulty: "hard",
      referenceComponents: ["Write API", "Command Handler", "Write DB (normalized)", "Event Bus", "Read Model Updater", "Read DB (denormalized)", "Query API"],
      designNote: "CQRS shines when read/write loads differ greatly. The read model is eventually consistent — ideal for reporting, terrible for banking.",
    },
  ],

  infra: [
    {
      system: "CDN",
      scenario: "Design a content delivery network that caches static assets (images, JS, CSS) at edge locations close to users worldwide.",
      difficulty: "easy",
      referenceComponents: ["User", "DNS (routes to nearest PoP)", "Edge PoP (cache)", "Origin Server", "Cache Miss → Origin Pull"],
      designNote: "Cache-Control headers drive TTL. Push CDN pre-loads content; pull CDN fetches on first miss — use push for known hot files.",
    },
    {
      system: "Load Balancer",
      scenario: "Design a load balancer that distributes incoming requests across a fleet of servers and removes unhealthy instances automatically.",
      difficulty: "easy",
      referenceComponents: ["Client", "Load Balancer", "Server 1", "Server 2", "Server 3", "Health Check Pings"],
      designNote: "Round-robin ignores server load. Least-connections routes to the most available server. Layer 7 enables content-based routing.",
    },
    {
      system: "Message Queue",
      scenario: "Design a message queue that decouples producers from consumers, enabling async processing and absorbing traffic spikes.",
      difficulty: "easy",
      referenceComponents: ["Producer", "Queue (broker)", "Consumer Group", "Dead Letter Queue", "Acknowledgement", "Retry Logic"],
      designNote: "At-least-once delivery is the safe default — consumers must be idempotent. Exactly-once requires distributed transactions.",
    },
    {
      system: "Reverse Proxy",
      scenario: "Design a reverse proxy that handles SSL termination, request routing, and basic DDoS protection in front of backend servers.",
      difficulty: "easy",
      referenceComponents: ["Client", "Reverse Proxy (Nginx)", "TLS Termination", "Backend Server A", "Backend Server B", "Rate Limiter"],
      designNote: "SSL termination at the proxy saves backend CPU — use plain HTTP on the private network. Add client IP to X-Forwarded-For.",
    },
    {
      system: "DNS",
      scenario: "Illustrate how DNS resolves a domain name into an IP address, from the browser's first query to receiving the final answer.",
      difficulty: "easy",
      referenceComponents: ["Browser Cache", "OS Resolver", "ISP Recursive Resolver", "Root Name Server", "TLD Server (.com)", "Authoritative Server", "IP Address"],
      designNote: "DNS TTL controls caching — low TTL enables fast failover but increases resolver load. Use Anycast for authoritative servers.",
    },
    {
      system: "Redis Cache",
      scenario: "Design a caching layer using Redis to reduce database load for a high-traffic web app serving 50K requests per second.",
      difficulty: "easy",
      referenceComponents: ["App Server", "Redis (cache-aside)", "Database", "Cache Hit (fast path)", "Cache Miss → DB fetch → populate"],
      designNote: "Cache-aside (lazy loading) only caches what's requested. Write-through keeps cache consistent but adds write latency.",
    },
    {
      system: "API Gateway",
      scenario: "Design an API gateway as a single entry point for a microservices backend, handling auth, rate limiting, and service routing.",
      difficulty: "medium",
      referenceComponents: ["Client", "API Gateway", "Auth Service", "Rate Limiter", "Service A", "Service B", "Service C"],
      designNote: "Keep the gateway stateless and thin — it's a chokepoint. Offload auth to an edge token validator to avoid extra round-trips.",
    },
    {
      system: "Kafka",
      scenario: "Design a distributed event streaming platform that handles millions of events/sec with replay capability and consumer group semantics.",
      difficulty: "medium",
      referenceComponents: ["Producers", "Kafka Broker Cluster", "Topics / Partitions", "ZooKeeper (metadata)", "Consumer Groups", "Offset Store"],
      designNote: "Partitions are Kafka's parallelism unit — more partitions = more throughput. Retention on disk enables event replay for new consumers.",
    },
    {
      system: "Circuit Breaker",
      scenario: "Design a circuit breaker pattern that prevents cascading failures when a downstream service becomes slow or unavailable.",
      difficulty: "medium",
      referenceComponents: ["Calling Service", "Circuit Breaker (Closed)", "Downstream Service", "Failure Counter", "Circuit Open (fail fast)", "Half-Open (probe)"],
      designNote: "Three states: Closed (normal), Open (fail fast), Half-Open (test one request). Open prevents thundering herd on a recovering service.",
    },
    {
      system: "Service Mesh",
      scenario: "Design a service mesh that handles inter-service communication, mTLS, observability, and traffic policies without changing application code.",
      difficulty: "hard",
      referenceComponents: ["Service A", "Sidecar Proxy (Envoy)", "Service B", "Sidecar Proxy (Envoy)", "Control Plane (Istio)", "mTLS", "Telemetry Collector"],
      designNote: "Sidecars handle all networking — services talk to localhost, proxy handles mTLS, retries, and tracing. Control plane pushes config.",
    },
  ],

  famous: [
    {
      system: "Spotify Playlist",
      scenario: "Design Spotify's playlist feature — create playlists, add/remove tracks, collaborate with others, and stream songs on demand.",
      difficulty: "easy",
      referenceComponents: ["Client App", "API Gateway", "Playlist Service", "Track Metadata DB", "Audio Streaming Service", "CDN (audio files)", "Collaborative Sync"],
      designNote: "Audio files live in CDN — the service delivers metadata and signed URLs, not the bytes. Collaborative playlists use CRDTs for conflict-free merging.",
    },
    {
      system: "Instagram Feed",
      scenario: "Design Instagram's home feed — show posts from followed users ranked by relevance. Handle celebrities with 100M followers efficiently.",
      difficulty: "medium",
      referenceComponents: ["Client", "Feed Service", "Post DB", "Fan-out Service", "Feed Cache (per user)", "Ranking Model", "Media CDN"],
      designNote: "Fan-out on write for normal users; fan-out on read for celebrities. Hybrid: precompute feeds for most users, merge celebrity posts at read time.",
    },
    {
      system: "YouTube Upload",
      scenario: "Design YouTube's video upload pipeline — accept raw video, transcode to multiple resolutions, and make it streamable globally within minutes.",
      difficulty: "medium",
      referenceComponents: ["Uploader Client", "Upload API (resumable)", "Raw Storage", "Transcoding Queue", "Transcoding Workers", "CDN (output)", "Metadata DB"],
      designNote: "Resumable uploads survive network drops. Transcoding is CPU-heavy — use a worker queue with auto-scaling. Store 360p through 4K variants.",
    },
    {
      system: "Gmail",
      scenario: "Design Gmail's core — receive, store, index, and deliver billions of emails with powerful search, labels, and threading.",
      difficulty: "medium",
      referenceComponents: ["SMTP Receiver", "Spam Filter", "Email Store (Bigtable-style)", "Full-Text Search Index", "Label/Thread Service", "IMAP/API Server", "Client"],
      designNote: "Email is append-heavy — a log-structured store excels. Full-text search requires an inverted index over email bodies and subjects.",
    },
    {
      system: "GitHub",
      scenario: "Design GitHub's core — host Git repositories, serve diffs and file trees to millions of developers, and run pull request workflows.",
      difficulty: "medium",
      referenceComponents: ["Git Client", "Git SSH/HTTPS Server", "Repository Storage (distributed)", "Diff Service", "PR/Issue DB", "CI/CD Trigger", "CDN (static assets)"],
      designNote: "Git objects are content-addressed (SHA of content = key) — store them in object storage. Only metadata (branches, PRs) needs SQL.",
    },
    {
      system: "Slack",
      scenario: "Design Slack's real-time messaging — deliver messages instantly to all members of a channel, across web and mobile clients.",
      difficulty: "medium",
      referenceComponents: ["Client (WebSocket)", "WebSocket Gateway", "Message Service", "Channel Fan-out Service", "Presence Service", "Message DB (Cassandra)", "Push Notification"],
      designNote: "WebSockets maintain persistent connections per client — the gateway routes messages to connected sockets. Fall back to push for offline users.",
    },
    {
      system: "Twitter Timeline",
      scenario: "Design Twitter's home timeline — show tweets from followed accounts ordered by time. Handle @BarackObama with 130M followers.",
      difficulty: "hard",
      referenceComponents: ["Client", "Timeline Service", "Tweet DB", "Fan-out Service", "User Timeline Cache", "Celebrity Tweets (on-read merge)", "Follow Graph DB"],
      designNote: "Precompute timelines on write for users with <1K followers; skip celebrities. At read time, merge cached timeline with recent celebrity tweets.",
    },
    {
      system: "Netflix Streaming",
      scenario: "Design Netflix's video streaming — serve high-quality video to 200M subscribers globally with adaptive bitrate and near-zero buffering.",
      difficulty: "hard",
      referenceComponents: ["Client (adaptive player)", "API Service", "Open Connect CDN (ISP-deployed)", "Video Catalog DB", "Encoding Pipeline", "Recommendation Service"],
      designNote: "Open Connect boxes live inside ISPs — 95% of Netflix traffic never hits the internet backbone. Adaptive bitrate adjusts quality per 2–10s segment.",
    },
    {
      system: "Uber Dispatch",
      scenario: "Design Uber's driver dispatch system — match a rider's request to the nearest available driver within seconds, at global scale.",
      difficulty: "hard",
      referenceComponents: ["Rider App", "Driver App", "API Gateway", "Dispatch Service", "Driver Location (Redis Geo)", "ETA Service", "Trip DB", "Notification Service"],
      designNote: "Redis GEORADIUS finds drivers in milliseconds. Driver locations update every 4s — a dedicated location microservice avoids overloading the trip DB.",
    },
    {
      system: "Google Search Index",
      scenario: "Design the indexing pipeline that takes crawled web pages and builds a searchable inverted index to power Google Search.",
      difficulty: "hard",
      referenceComponents: ["Web Crawler", "Raw Page Store", "HTML Parser", "PageRank Scorer", "Inverted Index Builder", "Distributed Index (sharded)", "Query Serving Layer"],
      designNote: "The inverted index maps term → [doc IDs]. Sharded by term hash. PageRank precomputes document importance — query time just intersects posting lists.",
    },
  ],

  interview: [
    {
      system: "Chat App",
      scenario: "Design a real-time 1-on-1 and group chat application that delivers messages instantly, stores history, and shows online presence.",
      difficulty: "medium",
      referenceComponents: ["Client (WebSocket)", "Chat Server", "Message Queue", "Message DB (Cassandra)", "Presence Service", "Push Notification", "File Storage"],
      designNote: "Use Cassandra for messages — partition by conversation ID, cluster by timestamp for efficient recent-message queries.",
    },
    {
      system: "Food Delivery App",
      scenario: "Design a food delivery app (like DoorDash) — browse restaurants, order food, track delivery in real-time, and pay securely.",
      difficulty: "medium",
      referenceComponents: ["Customer App", "API Gateway", "Order Service", "Restaurant Service", "Driver Tracking (Redis Geo)", "Payment Service", "Notification Service", "Order DB"],
      designNote: "Order state machine (placed→confirmed→preparing→picked up→delivered) needs atomic transitions — use DB transactions or the Saga pattern.",
    },
    {
      system: "Airbnb",
      scenario: "Design Airbnb — hosts list properties, guests search by location and dates, and payments are held in escrow until check-in.",
      difficulty: "medium",
      referenceComponents: ["Client", "Search Service (Elasticsearch)", "Listing DB", "Availability Calendar", "Booking Service", "Payment Service (escrow)", "Media CDN"],
      designNote: "Availability is the hardest part — use optimistic locking on the calendar to prevent double-bookings during concurrent checkout flows.",
    },
    {
      system: "WhatsApp",
      scenario: "Design WhatsApp — 2 billion users send 100 billion messages/day via 1-on-1 and group chats, with end-to-end encryption.",
      difficulty: "hard",
      referenceComponents: ["Client", "WebSocket Server", "Message Store (offline queue)", "Group Fan-out Service", "E2E Encryption (Signal Protocol)", "Media Server", "Push Notification"],
      designNote: "Messages are stored only until delivered — WhatsApp is not an archive. Signal Protocol's double-ratchet algorithm enables forward secrecy.",
    },
    {
      system: "Google Drive",
      scenario: "Design Google Drive — store, sync, and share files across devices, with real-time collaboration and full version history.",
      difficulty: "hard",
      referenceComponents: ["Desktop Client (sync agent)", "Block Store (chunked diffs)", "Metadata Service", "Object Storage", "Collaboration Server", "Version History DB", "CDN"],
      designNote: "Chunk files into 4MB blocks and hash each — only upload changed blocks. Metadata lives in SQL; the bytes live in object storage.",
    },
    {
      system: "Dropbox",
      scenario: "Design Dropbox — sync files across multiple devices for millions of users, efficiently handling large files and merge conflicts.",
      difficulty: "hard",
      referenceComponents: ["Desktop Client", "Sync Engine (delta upload)", "Block Server", "Object Storage (S3)", "Metadata DB", "Notification Service (long poll)"],
      designNote: "Delta sync uploads only changed blocks. Long-polling notifies clients of remote changes — simpler than WebSockets and still near-real-time.",
    },
    {
      system: "TikTok",
      scenario: "Design TikTok — users upload short videos distributed to a personalized 'For You' feed with sub-second delivery globally.",
      difficulty: "hard",
      referenceComponents: ["Mobile Client", "Upload Service", "Video Processing Pipeline", "CDN (edge delivery)", "Recommendation Engine", "Feed Service", "Metadata DB"],
      designNote: "The recommendation engine is the product. TikTok's edge: content graph over social graph means new users get great content immediately.",
    },
    {
      system: "Zoom",
      scenario: "Design Zoom — host video calls with 100+ participants, mixing audio/video streams with low latency for a global audience.",
      difficulty: "hard",
      referenceComponents: ["Client (QUIC/SRTP)", "TURN/STUN Server", "Media Relay (SFU)", "Signaling Server (WebSocket)", "Recording Service", "CDN (playback)", "Meeting DB"],
      designNote: "SFU (Selective Forwarding Unit) relays each participant's stream without server-side mixing. Each client mixes N streams locally, saving server CPU.",
    },
    {
      system: "Amazon",
      scenario: "Design Amazon.com's core shopping flow — product search, catalog browsing, cart, checkout, inventory, and order fulfillment.",
      difficulty: "hard",
      referenceComponents: ["Client", "Search Service", "Product Catalog DB", "Inventory Service", "Cart Service (Redis)", "Order Service", "Payment Gateway", "Fulfillment Service"],
      designNote: "Reserve inventory at add-to-cart (not just checkout) to avoid overselling. Redis for cart — it's read-heavy, ephemeral, and fast.",
    },
    {
      system: "Twitter",
      scenario: "Design Twitter end-to-end — tweet creation, following, timeline serving, trending topics, and real-time search at scale.",
      difficulty: "hard",
      referenceComponents: ["Client", "Tweet Service", "Fan-out Service", "Timeline Cache", "Search Index (Lucene)", "Trending Service", "Social Graph DB"],
      designNote: "Twitter's social graph is huge — use a purpose-built graph store. Trending topics aggregate tweet rates per hashtag with sliding windows.",
    },
  ],
};

function resolvePool(category: Category, difficulty: Difficulty): SystemDesignPrompt[] {
  const filtered = PROMPT_LIBRARY[category].filter((p) => p.difficulty === difficulty);
  return filtered.length > 0 ? filtered : PROMPT_LIBRARY[category];
}

export function getPromptOptionsForRound(
  category: Category,
  difficulty: Difficulty,
  roundIndex: number
): [SystemDesignPrompt, SystemDesignPrompt, SystemDesignPrompt] {
  const pool = resolvePool(category, difficulty);
  const n    = pool.length;
  const base = roundIndex % n;
  return [
    pool[base % n],
    pool[(base + Math.ceil(n / 3)) % n],
    pool[(base + Math.ceil((n * 2) / 3)) % n],
  ];
}

export function getPromptForRound(
  category: Category,
  difficulty: Difficulty,
  roundIndex: number,
  variant: 0 | 1 | 2 = 0
): SystemDesignPrompt {
  return getPromptOptionsForRound(category, difficulty, roundIndex)[variant];
}

export function getCategoryHint(category: Category): string {
  const labels: Record<Category, string> = {
    classic:   "Classic System Design",
    databases: "Database Pattern",
    infra:     "Infrastructure Component",
    famous:    "Real-world Product",
    interview: "Interview System Design",
  };
  return `CATEGORY:${labels[category]}`;
}

export function buildHints(systemName: string): [string, string, string] {
  const words = systemName.split(" ");

  const hint0 = words
    .map((w) => Array.from(w).map(() => "_").join(" "))
    .join("   ");

  const hint1 = words
    .map((w) =>
      w.length === 0
        ? ""
        : w[0] + Array.from(w.slice(1)).map(() => " _").join("")
    )
    .join("   ");

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

export function isCorrectGuess(guess: string, systemName: string): boolean {
  const g = guess.trim().toLowerCase();
  const p = systemName.trim().toLowerCase();
  if (g === p) return true;
  const threshold = p.length <= 8 ? 1 : 2;
  if (p.includes(" ") && !g.includes(" ") && g.split(" ").length === 1) return false;
  return levenshtein(g, p) <= threshold;
}
