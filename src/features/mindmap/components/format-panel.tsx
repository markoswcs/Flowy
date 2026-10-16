"use client";

import {
  Bold,
  ExternalLink,
  ListChecks,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { THEMES } from "@/features/mindmap/themes";
import type {
  LayoutKind,
  MapDoc,
  Relation,
  ThemeId,
  Topic,
  TopicStyle,
} from "@/features/mindmap/types";
import {
  isSafeUrl,
  LAYOUT_OPTIONS,
  SHAPE_OPTIONS,
  TOPIC_ICONS,
} from "@/features/mindmap/components/constants";
import {
  PanelSection,
  Segmented,
  ShapeGlyph,
  Swatches,
} from "@/features/mindmap/components/format-controls";
import { LayoutIcon } from "@/features/mindmap/components/layout-icon";
import { resolveShape } from "@/features/mindmap/components/measure";
import { cn } from "@/lib/utils";

export type TopicPatch = Partial<Omit<Topic, "id" | "children">>;

export interface FormatActions {
  patchTopics: (patch: TopicPatch) => void;
  patchStyle: (patch: TopicStyle) => void;
  openNote: () => void;
  setLayout: (layout: LayoutKind) => void;
  setTheme: (theme: ThemeId) => void;
  updateRelation: (patch: Partial<Omit<Relation, "id">>) => void;
  deleteRelation: () => void;
}

interface FormatPanelProps {
  doc: MapDoc;
  topics: Topic[];
  primaryDepth: number;
  relation: Relation | null;
  actions: FormatActions;
  onClose: () => void;
}

const fieldClass =
  "h-11 w-full min-w-0 rounded-xl border border-border bg-background/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25";

function LinkField({
  topic,
  onSave,
}: {
  topic: Topic;
  onSave: (link: string | undefined) => void;
}) {
  const [draft, setDraft] = useState(topic.link ?? "");
  const trimmed = draft.trim();
  const valid = !trimmed || isSafeUrl(trimmed);
  function save() {
    if (!valid || trimmed === (topic.link ?? "")) return;
    onSave(trimmed || undefined);
  }
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input
          type="url"
          inputMode="url"
          value={draft}
          placeholder="https://"
          aria-label="Link do tópico"
          aria-invalid={!valid}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          className={cn(
            fieldClass,
            !valid && "border-destructive focus:border-destructive",
          )}
        />
        {topic.link && isSafeUrl(topic.link) ? (
          <a
            href={topic.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir link em nova aba"
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="size-4" />
          </a>
        ) : null}
      </div>
      {!valid ? (
        <p className="text-xs text-destructive">
          Use um endereço começando com http:// ou https://
        </p>
      ) : null}
    </div>
  );
}

function TopicFormat({
  topics,
  primaryDepth,
  doc,
  actions,
}: Omit<FormatPanelProps, "relation" | "onClose">) {
  const topic = topics[0];
  if (!topic) return null;
  const style = topic.style ?? {};
  return (
    <>
      <PanelSection title="Forma">
        <Segmented
          label="Forma do tópico"
          value={resolveShape(topic, primaryDepth, doc.layout)}
          columns={6}
          options={SHAPE_OPTIONS.map((shape) => ({
            value: shape.id,
            label: shape.label,
            content: <ShapeGlyph shape={shape.id} />,
          }))}
          onChange={(shape) => actions.patchStyle({ shape })}
        />
      </PanelSection>
      <PanelSection title="Preenchimento">
        <Swatches
          label="Cor de preenchimento"
          value={style.fill}
          withNeutrals
          onChange={(fill) => actions.patchStyle({ fill })}
        />
      </PanelSection>
      <PanelSection title="Texto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={Boolean(style.bold)}
            aria-label="Negrito"
            title="Negrito (Ctrl+B)"
            onClick={() => actions.patchStyle({ bold: !style.bold })}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              style.bold && "border-primary bg-primary/15 text-primary",
            )}
          >
            <Bold className="size-4" />
          </button>
          <span className="text-xs text-muted-foreground">Cor do texto</span>
        </div>
        <Swatches
          label="Cor do texto"
          value={style.color}
          withNeutrals
          onChange={(color) => actions.patchStyle({ color })}
        />
      </PanelSection>
      <PanelSection title="Cor do ramo">
        <Swatches
          label="Cor do ramo"
          value={style.branch}
          onChange={(branch) => actions.patchStyle({ branch })}
        />
      </PanelSection>
      <PanelSection title="Ícone">
        <div className="grid grid-cols-8 gap-1">
          {TOPIC_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-pressed={topic.icon === icon}
              aria-label={`Ícone ${icon}`}
              onClick={() =>
                actions.patchTopics({
                  icon: topic.icon === icon ? undefined : icon,
                })
              }
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-lg transition-transform hover:scale-110 hover:bg-accent active:scale-95 motion-reduce:transform-none",
                topic.icon === icon && "bg-primary/15 ring-1 ring-primary",
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Prioridade e tarefa">
        <Segmented
          label="Prioridade"
          value={topic.priority ?? 0}
          options={[0, 1, 2, 3].map((value) => ({
            value: value as 0 | 1 | 2 | 3,
            label: value ? `Prioridade ${value}` : "Sem prioridade",
            content: value ? value : "—",
          }))}
          onChange={(priority) =>
            actions.patchTopics({ priority: priority || undefined })
          }
        />
        <button
          type="button"
          role="switch"
          aria-checked={topic.done !== undefined}
          onClick={() =>
            actions.patchTopics({
              done: topic.done === undefined ? false : undefined,
            })
          }
          className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-border px-3 text-sm hover:bg-accent"
        >
          <ListChecks className="size-4 text-muted-foreground" />
          <span className="flex-1 text-left">Caixa de tarefa</span>
          <span
            className={cn(
              "relative h-6 w-10 rounded-full bg-muted transition-colors",
              topic.done !== undefined && "bg-primary",
            )}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
                topic.done !== undefined && "translate-x-4",
              )}
            />
          </span>
        </button>
      </PanelSection>
      {topics.length === 1 ? (
        <>
          <PanelSection title="Link">
            <LinkField
              key={topic.id}
              topic={topic}
              onSave={(link) => actions.patchTopics({ link })}
            />
          </PanelSection>
          <PanelSection title="Nota">
            <button
              type="button"
              onClick={actions.openNote}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-border px-3 text-left text-sm hover:bg-accent"
            >
              <StickyNote className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">
                {topic.note ? topic.note : "Adicionar nota"}
              </span>
            </button>
          </PanelSection>
        </>
      ) : null}
    </>
  );
}

function RelationFormat({
  relation,
  actions,
}: {
  relation: Relation;
  actions: FormatActions;
}) {
  const [label, setLabel] = useState(relation.label ?? "");
  const save = () => {
    if (label !== (relation.label ?? ""))
      actions.updateRelation({ label: label.trim() || undefined });
  };
  return (
    <>
      <PanelSection title="Rótulo da ligação">
        <input
          id="map-relation-label"
          value={label}
          placeholder="Ex.: depende de"
          aria-label="Rótulo da ligação"
          onChange={(event) => setLabel(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
          }}
          className={fieldClass}
        />
      </PanelSection>
      <PanelSection title="Estilo">
        <Segmented
          label="Estilo da ligação"
          value={relation.style ?? "auto"}
          options={[
            { value: "auto", label: "Automático", content: "Auto" },
            { value: "dashed", label: "Curva tracejada", content: "Curva ┄" },
            { value: "curve", label: "Curva contínua", content: "Curva" },
            { value: "straight", label: "Reta", content: "Reta" },
          ]}
          columns={4}
          onChange={(value) =>
            actions.updateRelation({
              style: value === "auto" ? undefined : value,
            })
          }
        />
      </PanelSection>
      <button
        type="button"
        onClick={actions.deleteRelation}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 text-sm font-medium text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-4" />
        Excluir ligação
      </button>
    </>
  );
}

function MapFormat({ doc, actions }: { doc: MapDoc; actions: FormatActions }) {
  return (
    <>
      <PanelSection title="Layout">
        <div className="grid grid-cols-2 gap-1.5">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={doc.layout === option.id}
              onClick={() => actions.setLayout(option.id)}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-xl border border-border px-2.5 text-left text-xs font-medium hover:bg-accent",
                doc.layout === option.id &&
                  "border-primary bg-primary/10 text-primary",
              )}
            >
              <LayoutIcon layout={option.id} />
              {option.label}
            </button>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Tema">
        <ThemeList value={doc.theme} onChange={actions.setTheme} />
      </PanelSection>
      <p className="rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
        Selecione um tópico para mudar forma, cores, ícones, prioridade, link e
        nota.
      </p>
    </>
  );
}

export function ThemeList({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}) {
  return (
    <div className="grid gap-1.5">
      {Object.values(THEMES).map((theme) => (
        <button
          key={theme.id}
          type="button"
          aria-pressed={value === theme.id}
          onClick={() => onChange(theme.id)}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm hover:bg-accent",
            value === theme.id && "border-primary bg-primary/10",
          )}
        >
          <span className="flex -space-x-1" aria-hidden="true">
            {[theme.root.fill, ...theme.branches.slice(0, 4)].map(
              (color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="size-4 rounded-full ring-2 ring-card"
                  style={{ backgroundColor: color }}
                />
              ),
            )}
          </span>
          <span className="flex-1 text-left">{theme.label}</span>
        </button>
      ))}
    </div>
  );
}

export function FormatPanel({
  doc,
  topics,
  primaryDepth,
  relation,
  actions,
  onClose,
}: FormatPanelProps) {
  const heading = relation
    ? "Ligação"
    : topics.length > 1
      ? `${topics.length} tópicos`
      : topics.length
        ? "Tópico"
        : "Mapa";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
        <h2 className="text-sm font-semibold">{heading}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel de formatação"
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-5">
        {relation ? (
          <RelationFormat
            key={relation.id}
            relation={relation}
            actions={actions}
          />
        ) : topics.length ? (
          <TopicFormat
            doc={doc}
            topics={topics}
            primaryDepth={primaryDepth}
            actions={actions}
          />
        ) : (
          <MapFormat doc={doc} actions={actions} />
        )}
      </div>
    </div>
  );
}
