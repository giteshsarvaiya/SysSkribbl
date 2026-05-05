"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import { LiveObject } from "@liveblocks/client";
import { useStorage, useMutation } from "@/liveblocks.config";
import type { Stroke, ComponentType } from "@/lib/types";
import type { Tool } from "./DrawingTools";
import { COMPONENTS } from "./DrawingTools";

// Fixed internal resolution — all coordinates stored in this space
const CANVAS_W = 1200;
const CANVAS_H = 700;

interface CanvasProps {
  isDrawer:          boolean;
  tool:              Tool;
  color:             string;
  strokeWidth:       number;
  drawerId:          string;
  selectedComponent?: ComponentType | null;
}

interface Point { x: number; y: number }

export default function Canvas({ isDrawer, tool, color, strokeWidth, drawerId, selectedComponent }: CanvasProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const overlayRef   = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const drawing    = useRef(false);
  const startPt    = useRef<Point>({ x: 0, y: 0 });
  const freePts    = useRef<Point[]>([]);

  const strokes = useStorage((root) => root.strokes);

  const pushStroke = useMutation(({ storage }, stroke: Omit<Stroke, "id">) => {
    storage.get("strokes").push(
      new LiveObject({ ...stroke, id: crypto.randomUUID() })
    );
  }, []);

  // Responsive scale: fit canvas into container while preserving aspect ratio
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / CANVAS_W, r.height / CANVAS_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redraw committed strokes whenever Liveblocks storage changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const rc = rough.canvas(canvas);
    for (const s of strokes) {
      renderStroke(ctx, rc, s as unknown as Stroke);
    }
  }, [strokes]);

  const toCanvas = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = overlayRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top)  / scale,
      };
    },
    [scale]
  );

  // ─── Pointer handlers ──────────────────────────────────────────────────────

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isDrawer || tool === "component") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drawing.current = true;
    const pt = toCanvas(e.clientX, e.clientY);
    startPt.current = pt;
    freePts.current = [pt];
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDrawer || !drawing.current || tool === "component") return;
    const pt = toCanvas(e.clientX, e.clientY);
    freePts.current.push(pt);
    renderOverlay(pt);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDrawer || !drawing.current) return;
    drawing.current = false;
    const pt = toCanvas(e.clientX, e.clientY);
    freePts.current.push(pt);

    overlayRef.current!.getContext("2d")!.clearRect(0, 0, CANVAS_W, CANVAS_H);
    commitStroke(pt);
  };

  // Preview while dragging
  const renderOverlay = (pt: Point) => {
    const ov  = overlayRef.current;
    if (!ov) return;
    const ctx = ov.getContext("2d")!;
    const rc  = rough.canvas(ov);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const start = startPt.current;
    const opts  = rOpts(color, strokeWidth);

    if (tool === "freehand") {
      const pts = freePts.current;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = color;
      ctx.lineWidth   = strokeWidth;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.stroke();
    } else if (tool === "rect") {
      rc.rectangle(start.x, start.y, pt.x - start.x, pt.y - start.y, opts);
    } else if (tool === "circle") {
      rc.ellipse(
        (start.x + pt.x) / 2, (start.y + pt.y) / 2,
        Math.abs(pt.x - start.x), Math.abs(pt.y - start.y), opts
      );
    } else if (tool === "line") {
      rc.line(start.x, start.y, pt.x, pt.y, opts);
    } else if (tool === "arrow") {
      arrow(ctx, start, pt, color, strokeWidth);
    }
  };

  // Commit finalized stroke to Liveblocks Storage
  const commitStroke = (endPt: Point) => {
    const start = startPt.current;
    const base = { color, strokeWidth, drawerId };

    if (tool === "freehand") {
      const flat = freePts.current.flatMap((p) => [p.x, p.y]);
      if (flat.length < 4) return;
      pushStroke({ type: "freehand", x: flat[0], y: flat[1], points: flat, ...base });
    } else if (tool === "rect") {
      pushStroke({ type: "rect", x: start.x, y: start.y, width: endPt.x - start.x, height: endPt.y - start.y, ...base });
    } else if (tool === "circle") {
      pushStroke({ type: "circle", x: start.x, y: start.y, width: endPt.x - start.x, height: endPt.y - start.y, ...base });
    } else if (tool === "line") {
      pushStroke({ type: "line", x: start.x, y: start.y, x2: endPt.x, y2: endPt.y, ...base });
    } else if (tool === "arrow") {
      pushStroke({ type: "arrow", x: start.x, y: start.y, x2: endPt.x, y2: endPt.y, ...base });
    }
  };

  const onCanvasClick = (e: React.MouseEvent) => {
    if (!isDrawer) return;
    const pt = toCanvas(e.clientX, e.clientY);

    if (tool === "text") {
      const txt = window.prompt("Enter label:");
      if (txt?.trim()) {
        pushStroke({ type: "text", x: pt.x, y: pt.y, label: txt.trim(), color, strokeWidth, drawerId });
      }
    } else if (tool === "component" && selectedComponent) {
      const label = COMPONENTS.find(c => c.id === selectedComponent)?.label ?? selectedComponent;
      pushStroke({ type: "component", x: pt.x, y: pt.y, componentType: selectedComponent, label, color, strokeWidth, drawerId });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden"
    >
      {/* Committed strokes */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          backgroundColor: "#ffffff",
          borderRadius: 12,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Live preview + pointer capture */}
      <canvas
        ref={overlayRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={onCanvasClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          cursor: isDrawer ? (tool === "text" ? "text" : tool === "component" ? "copy" : "crosshair") : "default",
          touchAction: "none",
          borderRadius: 12,
        }}
      />
    </div>
  );
}

// ─── Rendering helpers ────────────────────────────────────────────────────────

type RC = ReturnType<typeof rough.canvas>;

function renderStroke(ctx: CanvasRenderingContext2D, rc: RC, s: Stroke) {
  const opts = rOpts(s.color, s.strokeWidth);

  switch (s.type) {
    case "freehand": {
      const pts = s.points ?? [];
      if (pts.length < 4) break;
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.strokeStyle = s.color;
      ctx.lineWidth   = s.strokeWidth;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.stroke();
      break;
    }
    case "rect":
      rc.rectangle(s.x, s.y, s.width ?? 0, s.height ?? 0, opts);
      break;
    case "circle":
      rc.ellipse(
        s.x + (s.width ?? 0) / 2,
        s.y + (s.height ?? 0) / 2,
        Math.abs(s.width ?? 0),
        Math.abs(s.height ?? 0),
        opts
      );
      break;
    case "line":
      rc.line(s.x, s.y, s.x2 ?? s.x, s.y2 ?? s.y, opts);
      break;
    case "arrow":
      arrow(ctx, { x: s.x, y: s.y }, { x: s.x2 ?? s.x, y: s.y2 ?? s.y }, s.color, s.strokeWidth);
      break;
    case "text":
      if (s.label) {
        ctx.font         = `bold ${14 + s.strokeWidth * 2}px "Baloo 2", sans-serif`;
        ctx.fillStyle    = s.color;
        ctx.textBaseline = "middle";
        ctx.fillText(s.label, s.x, s.y);
      }
      break;
    case "component":
      if (s.componentType) {
        renderComponent(ctx, rc, s.x, s.y, s.componentType, s.label ?? s.componentType, s.color, s.strokeWidth);
      }
      break;
  }
}

function rOpts(color: string, strokeWidth: number) {
  return { stroke: color, strokeWidth, roughness: 1.4, bowing: 0.8, fill: "none" as const };
}

const COMP_W = 120;
const COMP_H = 65;
const REGION_W = 220;
const REGION_H = 150;

function renderComponent(
  ctx: CanvasRenderingContext2D,
  rc: RC,
  cx: number,
  cy: number,
  type: ComponentType,
  label: string,
  color: string,
  sw: number,
) {
  const w = type === "region" ? REGION_W : COMP_W;
  const h = type === "region" ? REGION_H : COMP_H;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const opts = { stroke: color, strokeWidth: sw, roughness: 1.2, bowing: 0.6, fill: "none" as const };
  const thin = { ...opts, strokeWidth: Math.max(1, sw * 0.6) };

  switch (type) {
    case "server":
      rc.rectangle(x, y, w, h, opts);
      rc.line(x, y + 18, x + w, y + 18, thin);
      rc.circle(x + 12, y + 9, 8, { ...opts, fill: color, fillStyle: "solid" as const, fillWeight: 1 });
      break;

    case "database": {
      const ry = 11;
      rc.ellipse(cx, y + ry, w, ry * 2, opts);
      rc.line(x, y + ry, x, y + h - ry, thin);
      rc.line(x + w, y + ry, x + w, y + h - ry, thin);
      rc.arc(cx, y + h - ry, w, ry * 2, 0, Math.PI, false, opts);
      break;
    }

    case "cache":
      rc.rectangle(x, y, w, h, opts);
      rc.line(x + 6, y + h * 0.35, x + w - 6, y + h * 0.35, thin);
      rc.line(x + 6, y + h * 0.65, x + w - 6, y + h * 0.65, thin);
      break;

    case "queue": {
      rc.rectangle(x, y, w, h, opts);
      const step = w / 4;
      for (let i = 1; i < 4; i++) {
        rc.line(x + step * i, y + 4, x + step * i, y + h - 4, thin);
      }
      break;
    }

    case "loadbalancer":
      rc.polygon([[cx, y], [x + w, cy], [cx, y + h], [x, cy]] as [number, number][], opts);
      break;

    case "cdn":
      rc.ellipse(cx, cy + h * 0.1, w * 0.75, h * 0.6, opts);
      rc.ellipse(cx - w * 0.22, cy - h * 0.1, w * 0.38, h * 0.45, opts);
      rc.ellipse(cx + w * 0.2, cy - h * 0.12, w * 0.35, h * 0.42, opts);
      break;

    case "client": {
      const screenH = h * 0.68;
      rc.rectangle(x, y, w, screenH, opts);
      rc.line(x + 4, y + 14, x + w - 4, y + 14, thin);
      rc.line(cx, y + screenH, cx, y + h - 6, opts);
      rc.line(cx - 18, y + h - 6, cx + 18, y + h - 6, opts);
      break;
    }

    case "storage": {
      const capR = 14;
      rc.ellipse(x + capR, cy, capR * 2, h, opts);
      rc.line(x + capR, y, x + w - capR, y, opts);
      rc.line(x + capR, y + h, x + w - capR, y + h, opts);
      rc.arc(x + w - capR, cy, capR * 2, h, -Math.PI / 2, Math.PI / 2, false, opts);
      break;
    }

    case "gateway": {
      const r = Math.min(w, h) / 2 - 2;
      const pts: [number, number][] = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
      });
      rc.polygon(pts, opts);
      break;
    }

    case "region":
      rc.rectangle(x, y, w, h, { ...opts, strokeLineDash: [10, 5] });
      break;
  }

  ctx.save();
  ctx.font = `bold 12px "Nunito", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelY = type === "region" ? y + 14 : y + h + 15;
  ctx.fillText(label, cx, labelY);
  ctx.restore();
}

interface Point { x: number; y: number }

function arrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string, sw: number) {
  const angle     = Math.atan2(to.y - from.y, to.x - from.x);
  const headLen   = Math.max(14, sw * 3);
  const headAngle = Math.PI / 6;

  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = sw;
  ctx.lineCap     = "round";

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLen * Math.cos(angle - headAngle), to.y - headLen * Math.sin(angle - headAngle));
  ctx.lineTo(to.x - headLen * Math.cos(angle + headAngle), to.y - headLen * Math.sin(angle + headAngle));
  ctx.closePath();
  ctx.fill();
}
