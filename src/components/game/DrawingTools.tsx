"use client";

import type { ComponentType } from "@/lib/types";

export type Tool = "freehand" | "rect" | "circle" | "arrow" | "line" | "text" | "component";

const TOOLS: { id: Exclude<Tool, "component">; label: string; icon: string }[] = [
  { id: "freehand", label: "Pen",    icon: "✏️" },
  { id: "rect",     label: "Rect",   icon: "⬜" },
  { id: "circle",   label: "Circle", icon: "⭕" },
  { id: "arrow",    label: "Arrow",  icon: "➡️" },
  { id: "line",     label: "Line",   icon: "╱"  },
  { id: "text",     label: "Text",   icon: "T"  },
];

const COLORS = [
  "#000000", "#ffffff", "#ff7b72", "#ffa657",
  "#e3b341", "#3fb950", "#58a6ff", "#bc8cff",
  "#f0883e", "#79c0ff", "#56d364", "#e6edf3",
];

const SIZES = [
  { label: "S", value: 2  },
  { label: "M", value: 5  },
  { label: "L", value: 10 },
];

export const COMPONENTS: { id: ComponentType; icon: string; label: string }[] = [
  { id: "client",       icon: "💻",  label: "Client"       },
  { id: "mobile",       icon: "📱",  label: "Mobile"       },
  { id: "server",       icon: "🖥️",  label: "Server"       },
  { id: "database",     icon: "🗄️",  label: "Database"     },
  { id: "cache",        icon: "⚡",  label: "Cache"        },
  { id: "queue",        icon: "📋",  label: "Queue"        },
  { id: "storage",      icon: "💾",  label: "Storage"      },
  { id: "search",       icon: "🔍",  label: "Search"       },
  { id: "loadbalancer", icon: "⚖️",  label: "Load Balancer"},
  { id: "gateway",      icon: "🔀",  label: "API Gateway"  },
  { id: "cdn",          icon: "🌐",  label: "CDN"          },
  { id: "firewall",     icon: "🛡️",  label: "Firewall"     },
  { id: "worker",       icon: "⚙️",  label: "Worker"       },
  { id: "external",     icon: "🔌",  label: "External API" },
  { id: "region",       icon: "🗺️",  label: "Region / Zone"},
];

interface DrawingToolsProps {
  tool:              Tool;
  color:             string;
  strokeWidth:       number;
  canUndo:           boolean;
  selectedComponent: ComponentType | null;
  onTool:            (t: Tool) => void;
  onColor:           (c: string) => void;
  onStrokeWidth:     (s: number) => void;
  onUndo:            () => void;
  onClear:           () => void;
  onComponent:       (ct: ComponentType) => void;
}

export default function DrawingTools({
  tool, color, strokeWidth, canUndo, selectedComponent,
  onTool, onColor, onStrokeWidth, onUndo, onClear, onComponent,
}: DrawingToolsProps) {
  const cardStyle = {
    backgroundColor: "#1a2635",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div className="flex flex-col gap-2 w-max">
      {/* Row 1 — drawing tools, colors, sizes, undo */}
      <div className="flex items-center gap-3 px-4 py-2 rounded-2xl" style={cardStyle}>
        <div className="flex gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => onTool(t.id)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer font-baloo font-bold"
              style={{
                backgroundColor: tool === t.id ? "rgba(88,166,255,0.2)" : "transparent",
                border:          tool === t.id ? "1px solid rgba(88,166,255,0.5)" : "1px solid transparent",
                color:           tool === t.id ? "#58a6ff" : "#8b949e",
              }}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/10 shrink-0" />

        <div className="flex gap-1 shrink-0">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColor(c)}
              className="rounded-full transition-all cursor-pointer"
              style={{
                width: 20, height: 20,
                backgroundColor: c,
                border:  color === c ? "2px solid white" : "2px solid transparent",
                outline: color === c ? "2px solid rgba(255,255,255,0.4)" : "none",
                outlineOffset: 1,
              }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-white/10 shrink-0" />

        <div className="flex gap-1">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => onStrokeWidth(s.value)}
              className="w-9 h-9 rounded-lg flex items-center justify-center font-baloo font-bold text-xs transition-all cursor-pointer"
              style={{
                backgroundColor: strokeWidth === s.value ? "rgba(88,166,255,0.2)" : "transparent",
                border:          strokeWidth === s.value ? "1px solid rgba(88,166,255,0.5)" : "1px solid transparent",
                color:           strokeWidth === s.value ? "#58a6ff" : "#8b949e",
              }}
            >
              <span style={{ fontSize: s.value * 2 + 4 }}>●</span>
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/10 shrink-0" />

        <div className="flex gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: "#8b949e" }}
          >
            ↩
          </button>
          <button
            onClick={onClear}
            title="Clear canvas"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer"
            style={{ color: "#ff7b72" }}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Row 2 — system design component stamps */}
      <div className="flex items-center gap-1 px-3 py-2 rounded-2xl" style={cardStyle}>
        <span className="font-nunito text-[9px] text-game-muted uppercase tracking-wider shrink-0 mr-2 select-none">
          Shapes
        </span>
        {COMPONENTS.map((c) => {
          const active = tool === "component" && selectedComponent === c.id;
          return (
            <button
              key={c.id}
              title={c.label}
              onClick={() => onComponent(c.id)}
              className="flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all cursor-pointer"
              style={{
                width: 46,
                height: 42,
                backgroundColor: active ? "rgba(63,185,80,0.15)" : "rgba(255,255,255,0.03)",
                border:          active ? "1px solid rgba(63,185,80,0.5)" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-base leading-none">{c.icon}</span>
              <span
                className="font-nunito text-[8px] leading-none text-center px-0.5"
                style={{
                  color: active ? "#3fb950" : "#8b949e",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 42,
                }}
              >
                {c.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
