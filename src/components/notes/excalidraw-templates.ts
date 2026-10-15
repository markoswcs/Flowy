import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";

// Ready-made diagrams inserted from the canvas menu. Coordinates are relative
// to the template origin; the caller moves them to a free spot on the canvas.

type Box = { id: string; x: number; y: number; text: string };

const BOX_W = 180;
const BOX_H = 70;

function box(
  { id, x, y, text }: Box,
  shape: "rectangle" | "ellipse" | "diamond" = "rectangle",
  backgroundColor = "transparent",
): ExcalidrawElementSkeleton {
  const diamond = shape === "diamond";
  return {
    type: shape,
    id,
    x,
    y,
    width: diamond ? 200 : BOX_W,
    height: diamond ? 120 : BOX_H,
    roundness: shape === "rectangle" ? { type: 3 } : null,
    backgroundColor,
    fillStyle: "solid",
    label: { text, fontSize: 18 },
  } as ExcalidrawElementSkeleton;
}

function arrow(
  from: string,
  to: string,
  points: { x: number; y: number; dx: number; dy: number },
  label?: string,
): ExcalidrawElementSkeleton {
  return {
    type: "arrow",
    x: points.x,
    y: points.y,
    points: [
      [0, 0],
      [points.dx, points.dy],
    ],
    start: { id: from },
    end: { id: to },
    ...(label ? { label: { text: label, fontSize: 16 } } : {}),
  } as ExcalidrawElementSkeleton;
}

function processFlow(): ExcalidrawElementSkeleton[] {
  const steps = ["Início", "Etapa 1", "Etapa 2", "Etapa 3", "Fim"];
  return steps.flatMap((text, index) => {
    const x = index * 260;
    const element = box(
      { id: `p${index}`, x, y: 0, text },
      index === 0 || index === steps.length - 1 ? "ellipse" : "rectangle",
      index === 0 || index === steps.length - 1 ? "#d0bfff" : "transparent",
    );
    if (index === 0) return [element];
    return [
      element,
      arrow(`p${index - 1}`, `p${index}`, {
        x: x - 80,
        y: BOX_H / 2,
        dx: 80,
        dy: 0,
      }),
    ];
  });
}

function decisionFlow(): ExcalidrawElementSkeleton[] {
  return [
    box({ id: "d-start", x: 10, y: 0, text: "Início" }, "ellipse", "#d0bfff"),
    box({ id: "d-question", x: 0, y: 150, text: "Condição?" }, "diamond", "#ffec99"),
    box({ id: "d-yes", x: -260, y: 340, text: "Caminho A" }),
    box({ id: "d-no", x: 270, y: 340, text: "Caminho B" }),
    box({ id: "d-end", x: 10, y: 520, text: "Fim" }, "ellipse", "#d0bfff"),
    arrow("d-start", "d-question", { x: 100, y: 70, dx: 0, dy: 80 }),
    arrow("d-question", "d-yes", { x: 0, y: 210, dx: -170, dy: 130 }, "Sim"),
    arrow("d-question", "d-no", { x: 200, y: 210, dx: 160, dy: 130 }, "Não"),
    arrow("d-yes", "d-end", { x: -170, y: 410, dx: 180, dy: 145 }),
    arrow("d-no", "d-end", { x: 360, y: 410, dx: -170, dy: 145 }),
  ];
}

function orgChart(): ExcalidrawElementSkeleton[] {
  const children = ["Área 1", "Área 2", "Área 3"];
  return [
    box({ id: "o-root", x: 260, y: 0, text: "Direção" }, "rectangle", "#d0bfff"),
    ...children.flatMap((text, index) => {
      const x = index * 260;
      return [
        box({ id: `o${index}`, x, y: 180, text }),
        arrow("o-root", `o${index}`, {
          x: 350,
          y: BOX_H,
          dx: x + BOX_W / 2 - 350,
          dy: 110,
        }),
      ];
    }),
  ];
}

function timeline(): ExcalidrawElementSkeleton[] {
  const milestones = ["Planejar", "Produzir", "Revisar", "Entregar"];
  return [
    {
      type: "line",
      x: 0,
      y: 120,
      points: [
        [0, 0],
        [milestones.length * 240, 0],
      ],
      strokeWidth: 2,
    } as ExcalidrawElementSkeleton,
    ...milestones.flatMap((text, index) => {
      const x = index * 240 + 30;
      return [
        {
          type: "ellipse",
          x: x + BOX_W / 2 - 12,
          y: 108,
          width: 24,
          height: 24,
          backgroundColor: "#7950f2",
          fillStyle: "solid",
        } as ExcalidrawElementSkeleton,
        box({ id: `t${index}`, x, y: index % 2 ? 170 : 0, text: `${index + 1}. ${text}` }),
      ];
    }),
  ];
}

export const EXCALIDRAW_TEMPLATES = [
  { id: "process", label: "Fluxo de processo", build: processFlow },
  { id: "decision", label: "Decisão (sim/não)", build: decisionFlow },
  { id: "org", label: "Organograma", build: orgChart },
  { id: "timeline", label: "Linha do tempo", build: timeline },
] as const;
