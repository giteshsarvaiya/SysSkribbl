"use client";

export type Tool = "freehand" | "rect" | "circle" | "arrow" | "line" | "text";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "freehand", label: "Pen",     icon: "✏️" },
  { id: "rect",     label: "Rect",    icon: "⬜" },
  { id: "circle",   label: "Circle",  icon: "⭕" },
  { id: "arrow",    label: "Arrow",   icon: "➡️" },
  { id: "line",     label: "Line",    icon: "╱"  },
  { id: "text",     label: "Text",    icon: "T"  },
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

interface DrawingToolsProps {
  tool:        Tool;
  color:       string;
  strokeWidth: number;
  canUndo:     boolean;
  onTool:      (t: Tool) => void;
  onColor:     (c: string) => void;
  onStrokeWidth: (s: number) => void;
  onUndo:      () => void;
  onClear:     () => void;
}

export default function DrawingTools({
  tool, color, strokeWidth, canUndo,
  onTool, onColor, onStrokeWidth, onUndo, onClear,
}: DrawingToolsProps) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-2xl shrink-0 w-max"
      style={{
        backgroundColor: "#1a2635",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Tools */}
      <div className="flex gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => onTool(t.id)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all cursor-pointer font-baloo font-bold"
            style={{
              backgroundColor: tool === t.id ? "rgba(88,166,255,0.2)" : "transparent",
              border: tool === t.id ? "1px solid rgba(88,166,255,0.5)" : "1px solid transparent",
              color: tool === t.id ? "#58a6ff" : "#8b949e",
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 shrink-0" />

      {/* Colors */}
      <div className="flex gap-1 shrink-0">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColor(c)}
            className="rounded-full transition-all cursor-pointer"
            style={{
              width: 20,
              height: 20,
              backgroundColor: c,
              border: color === c ? "2px solid white" : "2px solid transparent",
              outline: color === c ? "2px solid rgba(255,255,255,0.4)" : "none",
              outlineOffset: 1,
            }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 shrink-0" />

      {/* Sizes */}
      <div className="flex gap-1">
        {SIZES.map((s) => (
          <button
            key={s.value}
            onClick={() => onStrokeWidth(s.value)}
            className="w-9 h-9 rounded-lg flex items-center justify-center font-baloo font-bold text-xs transition-all cursor-pointer"
            style={{
              backgroundColor: strokeWidth === s.value ? "rgba(88,166,255,0.2)" : "transparent",
              border: strokeWidth === s.value ? "1px solid rgba(88,166,255,0.5)" : "1px solid transparent",
              color: strokeWidth === s.value ? "#58a6ff" : "#8b949e",
            }}
          >
            <span style={{ fontSize: s.value * 2 + 4 }}>●</span>
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-white/10 shrink-0" />

      {/* Undo / Clear */}
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
  );
}
