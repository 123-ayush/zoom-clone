"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Pencil, Trash2, X } from "lucide-react";

import type {
  IncomingWSMessage,
  OutgoingWSMessage,
  WhiteboardStroke,
} from "@/lib/ws";

interface Props {
  send: (msg: OutgoingWSMessage) => void;
  subscribe: (handler: (msg: IncomingWSMessage) => void) => () => void;
  selfClientId: number | null;
  onClose: () => void;
}

const COLORS = ["#0F1A2D", "#E45C1B", "#1B6DE4", "#2D8653", "#D4234A"];

export default function Whiteboard({
  send,
  subscribe,
  selfClientId,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(2);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Keep latest values in refs so handler closures stay simple.
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const drawStroke = useCallback((stroke: WhiteboardStroke) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    if (stroke.points.length < 2) return;
    ctx.strokeStyle = stroke.tool === "eraser" ? "#FFFFFF" : stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }, []);

  const clearCanvas = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  // Set up canvas size and the WS subscription on mount.
  useEffect(() => {
    const c = canvasRef.current;
    const container = containerRef.current;
    if (!c || !container) return;
    c.width = container.clientWidth;
    c.height = container.clientHeight;
    clearCanvas();

    // Ask any peer for the current board state.
    send({ type: "wb-snapshot-request", payload: {} });

    return subscribe((msg) => {
      switch (msg.type) {
        case "wb-stroke":
          drawStroke(msg.payload);
          break;
        case "wb-clear":
          clearCanvas();
          break;
        case "wb-snapshot-request": {
          if (msg.payload.from === selfClientId) return;
          const dataUrl = canvasRef.current?.toDataURL("image/png");
          if (dataUrl) {
            send({
              type: "wb-snapshot",
              payload: { to: msg.payload.from, dataUrl },
            });
          }
          break;
        }
        case "wb-snapshot": {
          if (msg.payload.to !== selfClientId) return;
          const img = new Image();
          img.onload = () => {
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx) ctx.drawImage(img, 0, 0);
          };
          img.src = msg.payload.dataUrl;
          break;
        }
        default:
          break;
      }
    });
  }, [subscribe, send, drawStroke, clearCanvas, selfClientId]);

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drawingRef.current = true;
    pointsRef.current = [getPos(e)];
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = getPos(e);
    pointsRef.current.push(p);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = toolRef.current === "eraser" ? "#FFFFFF" : colorRef.current;
    ctx.lineWidth = widthRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const pts = pointsRef.current;
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const stroke: WhiteboardStroke = {
      points: pointsRef.current,
      color: colorRef.current,
      width: widthRef.current,
      tool: toolRef.current,
    };
    pointsRef.current = [];
    if (stroke.points.length >= 2) {
      send({ type: "wb-stroke", payload: stroke });
    }
  };

  const handleClear = () => {
    clearCanvas();
    send({ type: "wb-clear", payload: {} });
  };

  return (
    <div className="fixed inset-0 z-40 bg-zoom-darker flex flex-col">
      <div className="h-12 bg-zoom-panel border-b border-white/10 flex items-center justify-between px-4 shrink-0">
        <span className="text-white font-medium text-sm">Whiteboard</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool("pen")}
            className={`p-1.5 rounded ${
              tool === "pen" ? "bg-white/15" : "hover:bg-white/10"
            }`}
            aria-label="Pen"
            title="Pen"
          >
            <Pencil size={16} className="text-white" />
          </button>
          <button
            onClick={() => setTool("eraser")}
            className={`p-1.5 rounded ${
              tool === "eraser" ? "bg-white/15" : "hover:bg-white/10"
            }`}
            aria-label="Eraser"
            title="Eraser"
          >
            <Eraser size={16} className="text-white" />
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setTool("pen");
                }}
                className={`w-5 h-5 rounded-full border-2 ${
                  color === c && tool === "pen" ? "border-white" : "border-transparent"
                }`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-24 ml-2"
            aria-label="Stroke width"
          />
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-white/10 ml-2"
            aria-label="Clear board"
            title="Clear board"
          >
            <Trash2 size={16} className="text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10"
            aria-label="Close whiteboard"
            title="Close"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 bg-white relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}
