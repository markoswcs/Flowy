"use client";

import {
  Bold,
  ExternalLink,
  ImagePlus,
  Italic,
  ListChecks,
  StickyNote,
  Strikethrough,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { THEMES } from "@/features/mindmap/themes";
import type {
  BranchStyle,
  LayoutKind,
  MapDoc,
  Relation,
  ThemeId,
  Topic,
  TopicImage,
  TopicProgress,
  TopicStyle,
} from "@/features/mindmap/types";
import {
  BRANCH_STYLE_OPTIONS,
  FONT_SIZE_OPTIONS,
  isSafeUrl,
  layoutOptionsFor,
  SHAPE_OPTIONS,
  TOPIC_ICONS,
  TOPIC_IMAGE_MAX,
} from "@/features/mindmap/components/constants";
import { optimizeImage } from "@/lib/image-optimizer";
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
  setBranchStyle: (style: BranchStyle) => void;
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

function ToggleButton({
  icon: Icon,
  label,
  pressed,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        pressed && "border-primary bg-primary/15 text-primary",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-border px-3 text-sm hover:bg-accent"
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <span
        className={cn(
          "relative h-6 w-10 rounded-full bg-muted transition-colors",
          checked && "bg-primary",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

function LabelsField({
  labels,
  onChange,
}: {
  labels: string[];
  onChange: (labels: string[] | undefined) => void;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const next = draft
      .split(",")
      .map((label) => label.trim())
      .filter((label) => label && !labels.includes(label));
    setDraft("");
    if (next.length) onChange([...labels, ...next].slice(0, 12));
  }
  return (
    <div className="space-y-2">
      {labels.length ? (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary"
            >
              {label}
              <button
                type="button"
                onClick={() => {
                  const next = labels.filter((item) => item !== label);
                  onChange(next.length ? next : undefined);
                }}
                aria-label={`Remover etiqueta ${label}`}
                className="grid size-5 place-items-center rounded-full hover:bg-primary/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <input
        value={draft}
        placeholder="Nova etiqueta e Enter (vírgula separa)"
        aria-label="Adicionar etiqueta"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        className={fieldClass}
      />
    </div>
  );
}

async function readTopicImage(file: File): Promise<TopicImage> {
  const optimized = await optimizeImage(
    file,
    TOPIC_IMAGE_MAX * 2,
    TOPIC_IMAGE_MAX * 2,
    0.78,
  );
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(optimized);
  });
  const image = new Image();
  image.src = src;
  await image.decode();
  const ratio = Math.min(
    1,
    TOPIC_IMAGE_MAX / Math.max(image.naturalWidth, image.naturalHeight),
  );
  return {
    src,
    width: Math.max(16, Math.round(image.naturalWidth * ratio)),
    height: Math.max(16, Math.round(image.naturalHeight * ratio)),
  };
}

function ImageField({
  topic,
  onChange,
}: {
  topic: Topic;
  onChange: (image: TopicImage | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm hover:bg-accent disabled:opacity-50"
        >
          <ImagePlus className="size-4" />
          {topic.image ? "Trocar imagem" : "Adicionar imagem"}
        </button>
        {topic.image ? (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Remover imagem"
            className="grid size-11 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            const image = await readTopicImage(file);
            if (image.src.length > 400_000)
              throw new Error("Imagem grande demais.");
            onChange(image);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : "Não foi possível usar essa imagem.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function BoundaryField({
  topic,
  onChange,
}: {
  topic: Topic;
  onChange: (boundary: Topic["boundary"]) => void;
}) {
  const [label, setLabel] = useState(topic.boundary?.label ?? "");
  const boundary = topic.boundary;
  return (
    <div className="space-y-2">
      <SwitchRow
        label="Moldura em volta do ramo"
        checked={Boolean(boundary)}
        onChange={(on) => onChange(on ? {} : undefined)}
      />
      {boundary ? (
        <>
          <input
            value={label}
            placeholder="Título do limite (opcional)"
            aria-label="Título do limite"
            onChange={(event) => setLabel(event.target.value)}
            onBlur={() =>
              label.trim() !== (boundary.label ?? "") &&
              onChange({ ...boundary, label: label.trim() || undefined })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className={fieldClass}
          />
          <Swatches
            label="Cor do limite"
            value={boundary.color}
            onChange={(color) => onChange({ ...boundary, color })}
          />
        </>
      ) : null}
    </div>
  );
}

type TopicPart = "style" | "content";

function TopicFormat({
  topics,
  primaryDepth,
  doc,
  actions,
  part,
}: Omit<FormatPanelProps, "relation" | "onClose"> & { part: TopicPart }) {
  const topic = topics[0];
  if (!topic) return null;
  const style = topic.style ?? {};
  if (part === "style")
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
        <PanelSection title="Borda">
          <Swatches
            label="Cor da borda"
            value={style.border}
            withNeutrals
            onChange={(border) => actions.patchStyle({ border })}
          />
          <SwitchRow
            label="Borda tracejada"
            checked={Boolean(style.dashed)}
            onChange={(dashed) => actions.patchStyle({ dashed })}
          />
        </PanelSection>
        <PanelSection title="Texto">
          <div className="flex items-center gap-1.5">
            <ToggleButton
              icon={Bold}
              label="Negrito (Ctrl+B)"
              pressed={Boolean(style.bold)}
              onClick={() => actions.patchStyle({ bold: !style.bold })}
            />
            <ToggleButton
              icon={Italic}
              label="Itálico (Ctrl+I)"
              pressed={Boolean(style.italic)}
              onClick={() => actions.patchStyle({ italic: !style.italic })}
            />
            <ToggleButton
              icon={Strikethrough}
              label="Riscado"
              pressed={Boolean(style.strike)}
              onClick={() => actions.patchStyle({ strike: !style.strike })}
            />
          </div>
          <Segmented
            label="Tamanho do texto"
            value={style.size ?? "md"}
            options={FONT_SIZE_OPTIONS.map((size) => ({
              value: size.id,
              label: size.label,
              content: size.short,
            }))}
            onChange={(size) =>
              actions.patchStyle({ size: size === "md" ? undefined : size })
            }
          />
          <span className="block text-xs text-muted-foreground">
            Cor do texto
          </span>
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
      </>
    );
  return (
    <>
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
        <Segmented
          label="Progresso"
          value={topic.progress ?? -1}
          columns={6}
          options={[-1, 0, 25, 50, 75, 100].map((value) => ({
            value,
            label: value < 0 ? "Sem progresso" : `Progresso ${value}%`,
            content: value < 0 ? "—" : value === 100 ? "✓" : `${value}`,
          }))}
          onChange={(value) =>
            actions.patchTopics({
              progress: value < 0 ? undefined : (value as TopicProgress),
            })
          }
        />
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm">
          <span className="flex-1">Prazo</span>
          <input
            type="date"
            value={topic.due ?? ""}
            onChange={(event) =>
              actions.patchTopics({ due: event.target.value || undefined })
            }
            className="bg-transparent text-sm outline-none"
            aria-label="Prazo do tópico"
          />
        </label>
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
      <PanelSection title="Etiquetas">
        <LabelsField
          key={topic.id}
          labels={topic.labels ?? []}
          onChange={(labels) => actions.patchTopics({ labels })}
        />
      </PanelSection>
      <PanelSection title="Limite">
        <BoundaryField
          key={topic.id}
          topic={topic}
          onChange={(boundary) => actions.patchTopics({ boundary })}
        />
      </PanelSection>
      {topics.length === 1 ? (
        <>
          <PanelSection title="Imagem">
            <ImageField
              topic={topic}
              onChange={(image) => actions.patchTopics({ image })}
            />
          </PanelSection>
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
      <PanelSection title="Cor">
        <Swatches
          label="Cor da ligação"
          value={relation.color}
          withNeutrals
          onChange={(color) => actions.updateRelation({ color })}
        />
      </PanelSection>
      <PanelSection title="Setas">
        <Segmented
          label="Setas da ligação"
          value={relation.arrows ?? "end"}
          options={[
            { value: "end", label: "Seta no fim", content: "→" },
            { value: "both", label: "Setas nas duas pontas", content: "↔" },
            { value: "none", label: "Sem setas", content: "—" },
          ]}
          onChange={(arrows) =>
            actions.updateRelation({
              arrows: arrows === "end" ? undefined : arrows,
            })
          }
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
          {layoutOptionsFor(doc.layout).map((option) => (
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
      <PanelSection title="Linhas dos ramos">
        <Segmented
          label="Linhas dos ramos"
          value={doc.branchStyle ?? "curve"}
          options={BRANCH_STYLE_OPTIONS.map((option) => ({
            value: option.id,
            label: option.label,
            content: option.label,
          }))}
          onChange={actions.setBranchStyle}
        />
      </PanelSection>
      <PanelSection title="Tema">
        <ThemeList value={doc.theme} onChange={actions.setTheme} />
      </PanelSection>
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

type Tab = TopicPart | "map";

const TABS: { id: Tab; label: string }[] = [
  { id: "style", label: "Estilo" },
  { id: "content", label: "Conteúdo" },
  { id: "map", label: "Mapa" },
];

export function FormatPanel({
  doc,
  topics,
  primaryDepth,
  relation,
  actions,
  onClose,
}: FormatPanelProps) {
  const [tab, setTab] = useState<Tab>("style");
  const hasTopics = topics.length > 0 && !relation;
  const active: Tab = hasTopics ? tab : "map";
  const heading = relation
    ? "Ligação"
    : topics.length > 1
      ? `${topics.length} tópicos`
      : topics.length
        ? topics[0]?.text.trim() || "Tópico"
        : "Mapa";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
        <h2 className="min-w-0 truncate text-sm font-semibold">{heading}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel de formatação"
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>
      {hasTopics ? (
        <div
          role="tablist"
          aria-label="Seções de formatação"
          className="mx-4 mb-3 grid grid-cols-3 gap-1 rounded-2xl bg-muted/50 p-1"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "h-9 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                active === item.id && "bg-card text-foreground shadow-sm",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <div
        role={hasTopics ? "tabpanel" : undefined}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-5"
      >
        {relation ? (
          <RelationFormat
            key={relation.id}
            relation={relation}
            actions={actions}
          />
        ) : hasTopics && active !== "map" ? (
          <TopicFormat
            doc={doc}
            topics={topics}
            primaryDepth={primaryDepth}
            actions={actions}
            part={active}
          />
        ) : (
          <>
            <MapFormat doc={doc} actions={actions} />
            {!hasTopics ? (
              <p className="rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
                Toque num tópico para mudar a forma, as cores e o texto dele, ou
                para adicionar ícone, prazo, etiquetas, imagem, link e nota.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
