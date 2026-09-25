"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function NoteDrawing({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawing, setHasDrawing] = useState(Boolean(value));

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const image = new Image();
    image.onload = () => {
      const context = canvasRef.current?.getContext("2d");
      if (context) context.drawImage(image, 0, 0, 800, 400);
    };
    image.src = value;
  }, [value]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 800,
      y: ((event.clientY - rect.top) / rect.height) * 400,
    };
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    const current = point(event);
    if (!context || !lastPoint.current) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 5;
    context.strokeStyle = "#a78bfa";
    context.beginPath();
    context.moveTo(lastPoint.current.x, lastPoint.current.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    lastPoint.current = current;
  }

  function finish() {
    if (!drawing.current || !canvasRef.current) return;
    drawing.current = false;
    lastPoint.current = null;
    setHasDrawing(true);
    onChange(canvasRef.current.toDataURL("image/png"));
  }

  function clear() {
    const context = canvasRef.current?.getContext("2d");
    context?.clearRect(0, 0, 800, 400);
    setHasDrawing(false);
    onChange(null);
  }

  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Desenho</h2>
          <p className="text-xs text-muted-foreground">Desenhe com o dedo ou mouse. Salva automaticamente.</p>
        </div>
        {hasDrawing ? (
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <Eraser className="size-3.5" /> Limpar
          </Button>
        ) : null}
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = true;
          lastPoint.current = point(event);
        }}
        onPointerMove={draw}
        onPointerUp={finish}
        onPointerCancel={finish}
        className="h-44 w-full touch-none rounded-lg border border-dashed border-border bg-background"
        aria-label="Área para desenhar na nota"
      />
    </section>
  );
}
