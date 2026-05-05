import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SysSkribbl — Draw. Guess. Architect.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1923",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background grid dots */}
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 14 }).map((_, col) => (
            <div
              key={`${row}-${col}`}
              style={{
                position: "absolute",
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#1a2635",
                left: col * 90 + 20,
                top: row * 82 + 15,
              }}
            />
          ))
        )}

        {/* Decorative system design nodes — top left */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: 0.35,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                width: 80,
                height: 44,
                border: "2px solid #58a6ff",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#58a6ff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              API GW
            </div>
            <div
              style={{
                width: 80,
                height: 44,
                border: "2px solid #3fb950",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#3fb950",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              AUTH
            </div>
          </div>
          <div
            style={{
              width: 40,
              height: 2,
              background:
                "repeating-linear-gradient(90deg, #58a6ff 0px, #58a6ff 6px, transparent 6px, transparent 12px)",
              marginTop: -30,
            }}
          />
          <div
            style={{
              width: 80,
              height: 44,
              border: "2px solid #bc8cff",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#bc8cff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            SERVICE
          </div>
        </div>

        {/* Decorative nodes — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 60,
            display: "flex",
            alignItems: "center",
            gap: 0,
            opacity: 0.35,
          }}
        >
          <div
            style={{
              width: 80,
              height: 44,
              border: "2px solid #ffa657",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffa657",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            CACHE
          </div>
          <div
            style={{
              width: 40,
              height: 2,
              background:
                "repeating-linear-gradient(90deg, #ffa657 0px, #ffa657 6px, transparent 6px, transparent 12px)",
            }}
          />
          <div
            style={{
              width: 80,
              height: 44,
              border: "2px solid #e3b341",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#e3b341",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            DB
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            zIndex: 1,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 80,
              height: 80,
              background: "#1a2635",
              borderRadius: 20,
              border: "2px solid #58a6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
            }}
          >
            ✏️
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              color: "#e6edf3",
              letterSpacing: -3,
              lineHeight: 1,
              display: "flex",
            }}
          >
            Sys
            <span style={{ color: "#58a6ff" }}>Skribbl</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 28,
              color: "#8b949e",
              fontWeight: 500,
              letterSpacing: 0.5,
              display: "flex",
            }}
          >
            Draw distributed systems. Let others guess.
          </div>

          {/* Tags */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {["System Design", "Multiplayer", "Educational"].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: "6px 18px",
                  border: "1.5px solid #21303f",
                  borderRadius: 999,
                  color: "#8b949e",
                  fontSize: 16,
                  fontWeight: 600,
                  background: "#1a2635",
                  display: "flex",
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
