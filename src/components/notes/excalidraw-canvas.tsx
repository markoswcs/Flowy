"use client";

import { CircleDot, Diamond, Flag, GitBranch, Plus, RectangleHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type FlowNodeKind = "start" | "process" | "decision" | "end";

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  x: number;
  y: number;
}

export interface ExcalidrawScene {
  version: 1;
  nodes: FlowNode[];
  connections: Array<{ from: string; to: string }>;
}

const nodeStyles: Record<FlowNodeKind, string> = {
  start: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  process: "border-primary/50 bg-primary/15 text-primary-foreground",
  decision: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  end: "border-rose-400/50 bg-rose-500/15 text-rose-100",
};

const nodeIcons = {
  start: CircleDot,
  process: RectangleHorizontal,
  decision: Diamond,
  end: Flag,
};

const nodeLabels: Record<FlowNodeKind, string> = {
  start: "Início",
  process: "Processo",
  decision: "Decisão",
  end: "Fim",
};

export function ExcalidrawCanvas({
  scene,
  onChange,
}: {
  scene: ExcalidrawScene | null;
  onChange: (scene: ExcalidrawScene) => void;
}) {
  const initialScene = useRef<ExcalidrawScene>(scene ?? { version: 1, nodes: [], connections: [] });
  const [nodes, setNodes] = useState(initialScene.current.nodes);
  const [connections, setConnections] = useState(initialScene.current.connections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    onChange({ version: 1, nodes, connections });
  }, [connections, nodes, onChange]);

  function addNode(kind: FlowNodeKind) {
    const offset = nodes.length * 28;
    const id = crypto.randomUUID();
    setNodes((current) => [
      ...current,
      { id, kind, label: nodeLabels[kind], x: 120 + (offset % 600), y: 120 + ((offset * 2) % 360) },
    ]);
    setSelectedId(id);
  }

  function handleNodeClick(id: string) {
    if (connecting && selectedId && selectedId !== id) {
      setConnections((current) =>
        current.some((connection) => connection.from === selectedId && connection.to === id)
          ? current
          : [...current, { from: selectedId, to: id }],
      );
      setConnecting(false);
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>, node: FlowNode) {
    if ((event.target as HTMLElement).tagName === "INPUT") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { id: node.id, offsetX: event.clientX - rect.left - node.x, offsetY: event.clientY - rect.top - node.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveNode(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const x = Math.max(16, Math.min(1000, event.clientX - rect.left - drag.offsetX));
    const y = Math.max(76, Math.min(620, event.clientY - rect.top - drag.offsetY));
    setNodes((current) => current.map((node) => (node.id === drag.id ? { ...node, x, y } : node)));
  }

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border)/.7)_1px,transparent_0)] bg-[size:24px_24px]">
      <div
        ref={canvasRef}
        className="relative min-h-[720px] min-w-[1200px]"
        onPointerMove={moveNode}
        onPointerUp={() => { dragRef.current = null; }}
      >
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          {(Object.keys(nodeLabels) as FlowNodeKind[]).map((kind) => {
            const Icon = nodeIcons[kind];
            return (
              <button key={kind} type="button" onClick={() => addNode(kind)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium hover:border-primary/50 hover:text-primary">
                <Icon className="size-3.5" aria-hidden="true" /> {nodeLabels[kind]}
              </button>
            );
          })}
          <button type="button" disabled={!selectedId} onClick={() => setConnecting((current) => !current)} className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
            <GitBranch className="size-3.5" aria-hidden="true" /> {connecting ? "Escolha o destino" : "Conectar"}
          </button>
        </div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 720" aria-hidden="true">
          <defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="currentColor" /></marker></defs>
          {connections.map((connection) => {
            const from = nodes.find((node) => node.id === connection.from);
            const to = nodes.find((node) => node.id === connection.to);
            return from && to ? <line key={`${connection.from}-${connection.to}`} x1={from.x + 170} y1={from.y + 34} x2={to.x} y2={to.y + 34} className="text-primary/80" stroke="currentColor" strokeWidth="2" markerEnd="url(#flow-arrow)" /> : null;
          })}
        </svg>
        {nodes.map((node) => {
          const Icon = nodeIcons[node.kind];
          return (
            <div key={node.id} role="button" tabIndex={0} onClick={() => handleNodeClick(node.id)} onPointerDown={(event) => startDrag(event, node)} className={`absolute z-10 w-[170px] cursor-grab rounded-xl border p-3 shadow-lg active:cursor-grabbing ${nodeStyles[node.kind]} ${selectedId === node.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`} style={{ left: node.x, top: node.y }}>
              <div className="flex items-center gap-2"><Icon className="size-4 shrink-0" aria-hidden="true" /><input value={node.label} onChange={(event) => setNodes((current) => current.map((item) => item.id === node.id ? { ...item, label: event.target.value } : item))} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Texto do bloco" /></div>
            </div>
          );
        })}
        {nodes.length === 0 ? <div className="absolute inset-0 grid place-items-center pt-12 text-center text-muted-foreground"><div><Plus className="mx-auto size-8 text-primary" /><p className="mt-3 text-sm font-medium">Comece adicionando um bloco ao seu fluxo.</p><p className="mt-1 text-xs">Arraste os blocos e use Conectar para criar as setas.</p></div></div> : null}
      </div>
    </div>
  );
}
