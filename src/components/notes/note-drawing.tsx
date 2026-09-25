"use client";

import { Check, X } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";

export function DrawingDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  if (!open) return null;

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * 800, y: ((event.clientY - rect.top) / rect.height) * 400 };
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !lastPoint.current) return;
    const context = canvasRef.current?.getContext("2d");
    const current = point(event);
    if (!context) return;
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

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4" role="presentation">
      <section className="w-full max-w-2xl rounded-xl border border-border bg-card p-4" role="dialog" aria-modal="true" aria-labelledby="drawing-title">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="drawing-title" className="font-semibold">Inserir desenho</h2>
            <p className="text-xs text-muted-foreground">O desenho será inserido no texto da nota.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar desenho"><X className="size-4" /></Button>
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); drawing.current = true; lastPoint.current = point(event); }}
          onPointerMove={draw}
          onPointerUp={() => { drawing.current = false; lastPoint.current = null; }}
          onPointerCancel={() => { drawing.current = false; lastPoint.current = null; }}
          className="h-64 w-full touch-none rounded-lg border border-dashed border-border bg-background"
          aria-label="Área para desenhar"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={() => { if (canvasRef.current) onSave(canvasRef.current.toDataURL("image/png")); onClose(); }}><Check className="size-4" /> Inserir no texto</Button>
        </div>
      </section>
    </div>
  );
}
