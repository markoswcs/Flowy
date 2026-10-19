/**
 * Turns a request written (or spoken) in plain Brazilian Portuguese into a
 * structured task: title, description, schedule, priority, folder/client and
 * labels. Runs locally and deterministically; it never invents data — what it
 * cannot place stays in the title or description, and doubts are reported as
 * `ambiguities` so the interface can ask before creating.
 *
 * Every task-creation flow (quick bar, composer, voice, onboarding) goes
 * through `interpretTask` so they all understand the same things.
 */

import { parseQuickTask } from "@/features/tasks/quick-task";
import {
  normalize,
  suggestOrganization,
} from "@/features/tasks/smart-organize";
import { localDateKey } from "@/features/tasks/date-utils";
import type { TaskPriority, TaskRecurrence } from "@/types/productivity";

interface Named {
  id: string;
  name: string;
}

interface PastTask {
  title: string;
  folder_id: string | null;
  status?: string;
  deleted_at?: string | null;
  categories?: { id: string }[];
}

export interface SmartTask {
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  recurrence: TaskRecurrence | null;
  priority: TaskPriority;
  folderId: string | null;
  categoryIds: string[];
  /** Whether the folder / each label was named explicitly (vs. inferred). */
  explicitFolder: boolean;
  explicitCategoryIds: string[];
  /** A client named in the text that matches no folder. */
  unknownClient: string | null;
  /** Doubts worth confirming before creating; empty when it is safe to create. */
  ambiguities: string[];
}

// Openers that only say "make a task" and carry no meaning of their own.
const PREAMBLES = [
  String.raw`(?:por favor,?\s+)?(?:cri[ae]r?|adicion[ae]r?|anot[ae]r?|coloc[ae]r?|agend[ae]r?|registr[ae]r?|faz(?:er)?|fa[cç]a)\s+(?:uma?\s+)?(?:nova\s+)?(?:tarefa|lembrete|task)(?:\s+(?:para|pra|de|que))?`,
  String.raw`(?:uma?\s+)?(?:nova\s+)?tarefa(?:\s+(?:para|pra|de))?:?`,
  String.raw`(?:me\s+)?lembr(?:e|ar|a)(?:-me)?(?:\s+me)?\s+de`,
  String.raw`(?:um\s+)?lembrete(?:\s+(?:de|para|pra))?`,
  String.raw`anot[ae](?:\s+a[ií])?(?:\s+(?:que|para|pra|a[ií]))?`,
  String.raw`(?:eu\s+)?(?:preciso|precisamos|tenho|temos|devo|devemos|quero|vou)(?:\s+(?:de|que))?`,
  String.raw`n[aã]o\s+(?:posso\s+)?esquecer\s+de`,
  String.raw`(?:é|e)\s+(?:preciso|necess[aá]rio)`,
];

const PRIORITY_RULES: { priority: TaskPriority; pattern: RegExp }[] = [
  {
    priority: "high",
    pattern:
      /[,;]?\s*(?:com\s+)?(?:prioridade\s+(?:alta|m[aá]xima|urgente)|alta\s+prioridade|urgent(?:e|emente)|com\s+urg[eê]ncia|o\s+quanto\s+antes|o\s+mais\s+r[aá]pido\s+poss[ií]vel|imediatamente|asap|sem\s+falta|muito\s+importante)(?=[\s,.;!?]|$)/i,
  },
  {
    priority: "low",
    pattern:
      /[,;]?\s*(?:com\s+)?(?:prioridade\s+baixa|baixa\s+prioridade|sem\s+pressa|quando\s+(?:der|puder|sobrar\s+tempo))(?=[\s,.;!?]|$)/i,
  },
  {
    priority: "normal",
    pattern:
      /[,;]?\s*(?:com\s+)?prioridade\s+(?:normal|m[eé]dia)(?=[\s,.;!?]|$)/i,
  },
];

const RECURRENCE_RULES: { recurrence: TaskRecurrence; pattern: RegExp }[] = [
  {
    recurrence: "daily",
    pattern:
      /[,;]?\s*(?:todos\s+os\s+dias|todo\s+dia|diariamente)(?=[\s,.;!?]|$)/i,
  },
  {
    recurrence: "weekly",
    pattern:
      /[,;]?\s*(?:toda\s+semana|todas\s+as\s+semanas|semanalmente|tod[ao]s?\s+(?:as?\s+)?(?=(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)))(?=[\s,.;!?]|$|\S)/i,
  },
  {
    recurrence: "monthly",
    pattern:
      /[,;]?\s*(?:todo\s+m[eê]s|todos\s+os\s+meses|mensalmente)(?=[\s,.;!?]|$)/i,
  },
];

// Clauses that start the "details" part of a request.
const DETAIL_SPLIT =
  /,\s*(?=(?:incluindo|considerando|lembrando|sendo|com\s+foco|focando|detalhes?|obs(?:erva[cç][aã]o)?|para\s+que|porque|pois|j[aá]\s+que)\b)|\s+[-–—]\s+|:\s+/i;

// Speech has no punctuation: these words start the "details" part of what was
// said ("revisar a proposta porque o cliente pediu…", "ligar para o contador
// para conferir as notas…"). The title keeps what comes before.
const SPOKEN_SPLIT =
  /\s(?=(?:porque|pois|j[aá]\s+que|para\s+que|pra\s+que|lembrando\s+que|sendo\s+que|s[oó]\s+que|mas|incluindo|considerando|com\s+foco|a\s+ideia\s+[eé]|o\s+objetivo\s+[eé]|e\s+(?:preciso|tenho|devo|vou|quero)|(?:eu\s+)?preciso|tenho\s+que|n[aã]o\s+(?:posso\s+)?esquecer|(?:para|pra)\s+(?:conferir|checar|ver|verificar|garantir|alinhar|definir|decidir|mostrar|apresentar|entender|confirmar|validar|aprovar|revisar|pegar|levar|enviar|mandar))\b)/gi;

// Connectors that open a detail clause and add nothing once it stands alone.
const DETAIL_LEAD =
  /^(?:porque|pois|j[aá]\s+que|para\s+que|pra\s+que|lembrando\s+que|sendo\s+que|s[oó]\s+que|mas|e|para|pra)\s+/i;

// Dictated explicitly: "título reunião de equipe descrição levar os números".
const LABELED =
  /^(?:.*?\s)?t[ií]tulo[:\s]+(.+?)\s+(?:descri[cç][aã]o|detalhes?|observa[cç][aã]o)[:\s]+(.+)$/i;

// Spoken filler that is not part of the task.
const FILLER_START =
  /^(?:n[eé]|ent[aã]o|a[ií]|tipo(?:\s+assim)?|bom|olha|ok(?:ay)?|beleza|hum+|ahn|eh|t[aá]|ah|oi|ei)[,\s]+/i;
const FILLER_END =
  /[,\s]+(?:n[eé]|sabe|t[aá]|ok|obrigad[oa]|valeu|por\s+favor|beleza)[.!?]?$/i;
const FILLER_ANYWHERE = /\s(?:n[eé]|tipo\s+assim|hum+|ahn)(?=[\s,.!?])/gi;

function stripFillers(text: string) {
  let current = ` ${text} `.replace(FILLER_ANYWHERE, " ").trim();
  for (let round = 0; round < 3; round += 1) {
    const before = current;
    current = current.replace(FILLER_START, "").replace(FILLER_END, "");
    if (current === before) break;
  }
  return current;
}

/** Splits an unpunctuated (spoken) clause into title and details. */
function splitSpoken(text: string): [string, string | null] {
  for (const match of text.matchAll(SPOKEN_SPLIT)) {
    const index = match.index ?? 0;
    // The title needs at least two words ("Ligar contador").
    if (text.slice(0, index).trim().split(/\s+/).length < 2) continue;
    return [text.slice(0, index), text.slice(index + 1)];
  }
  return [text, null];
}

function detailSentence(text: string) {
  return sentence(
    gerundToInfinitive(stripPreambles(text.trim().replace(DETAIL_LEAD, ""))),
  );
}

const NAME_WORD = String.raw`[\p{Lu}][\p{L}'-]*`;
const CLIENT_PATTERN = new RegExp(
  String.raw`\s(?:(?:d[oa]|para\s+[oa]|pr[oa]|com\s+[oa]|ao|à)\s+)?(?:cliente|empresa|conta)\s+(${NAME_WORD}(?:\s+(?:d[aeo]s?\s+)?${NAME_WORD}){0,2})`,
  "u",
);
const FOLDER_PATTERN =
  /\s(?:(?:n[ao]|para\s+a|pra)\s+)?pasta\s+(?:d[aeo]s?\s+)?([\p{L}\p{N}][\p{L}\p{N}_-]*(?:\s+[\p{L}\p{N}][\p{L}\p{N}_-]*){0,2})/u;
const LABEL_PATTERN =
  /\s(?:com\s+)?(?:(?:a|na)\s+)?(?:etiqueta|tag)\s+([\p{L}\p{N}][\p{L}\p{N}_-]*(?:\s+[\p{L}\p{N}][\p{L}\p{N}_-]*)?)/u;

function cut(text: string, match: RegExpMatchArray) {
  const index = match.index ?? 0;
  return `${text.slice(0, index)} ${text.slice(index + match[0].length)}`;
}

function tidy(text: string) {
  return text
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,;])(?:\s*[,;])+/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:–—-]+|[\s,;:–—-]+$/g, "")
    .trim();
}

function capitalize(text: string) {
  return text
    ? text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1)
    : text;
}

function stripPreambles(text: string) {
  let current = text.trim();
  for (let round = 0; round < 3; round += 1) {
    const before = current;
    for (const preamble of PREAMBLES) {
      current = current.replace(
        new RegExp(String.raw`^${preamble}\s+`, "i"),
        "",
      );
    }
    if (current === before) break;
  }
  return current;
}

// "incluindo X" → "Incluir X": a detail clause reads as an instruction.
function gerundToInfinitive(text: string) {
  return text.replace(
    /^(\p{L}+?)(ando|endo|indo)\b/iu,
    (_, stem: string, ending: string) => {
      const vowel = ending[0] === "a" ? "ar" : ending[0] === "e" ? "er" : "ir";
      return `${stem}${vowel}`;
    },
  );
}

function sentence(text: string) {
  const clean = capitalize(tidy(text));
  return clean && !/[.!?]$/.test(clean) ? `${clean}.` : clean;
}

function findByName<T extends Named>(items: T[], query: string) {
  const wanted = normalize(query);
  if (!wanted) return undefined;
  return (
    items.find((item) => normalize(item.name) === wanted) ??
    items.find((item) => wanted.startsWith(`${normalize(item.name)} `)) ??
    items.find(
      (item) => normalize(item.name).startsWith(wanted) && wanted.length >= 3,
    )
  );
}

export function interpretTask(
  input: string,
  {
    folders,
    categories,
    history = [],
  }: { folders: Named[]; categories: Named[]; history?: PastTask[] },
  now = new Date(),
): SmartTask {
  const ambiguities: string[] = [];
  const raw = stripFillers(
    input
      .replace(/\s+/g, " ")
      .replace(/(?:(?<=^|\s)(?:ao|à|a|as|às)\s+)?\bmeio[- ]dia\b/gi, "às 12h")
      .replace(/(?:(?<=^|\s)(?:à|a|as|às)\s+)?\bmeia[- ]noite\b/gi, "às 0h")
      .trim(),
  );

  // 1. Split the request into its main sentence and the details after it.
  const labeled = raw.match(LABELED);
  const sentences = labeled
    ? [labeled[1]!, labeled[2]!]
    : (raw
        .match(/[^.!?]+[.!?]*/g)
        ?.map((part) => part.trim())
        .filter(Boolean) ?? []);
  let head = sentences[0] ?? "";
  const details = sentences
    .slice(1)
    .map((part) => sentence(stripPreambles(stripFillers(part))));

  // 2. Priority and recurrence can be said anywhere.
  let priority: TaskPriority = "normal";
  let recurrence: TaskRecurrence | null = null;
  const takeFlags = (text: string) => {
    let result = ` ${text} `;
    for (const rule of PRIORITY_RULES) {
      const match = result.match(rule.pattern);
      if (match) {
        if (priority === "normal") priority = rule.priority;
        result = cut(result, match);
      }
    }
    for (const rule of RECURRENCE_RULES) {
      const match = result.match(rule.pattern);
      if (match) {
        recurrence ??= rule.recurrence;
        result = cut(result, match);
      }
    }
    return tidy(result);
  };
  head = takeFlags(head);
  const cleanDetails = details
    .map((part) => sentence(takeFlags(part)))
    .filter((part) => part.length > 1);

  // 3. "Preciso finalizar X, incluindo Y" → title X, description "Incluir Y".
  head = stripPreambles(head);
  const split = labeled ? null : head.match(DETAIL_SPLIT);
  if (split && (split.index ?? 0) > 3) {
    const extra = head.slice((split.index ?? 0) + split[0].length);
    head = head.slice(0, split.index);
    if (extra.trim())
      cleanDetails.unshift(sentence(gerundToInfinitive(extra.trim())));
  } else if (!labeled) {
    const [main, extra] = splitSpoken(head);
    head = main;
    if (extra?.trim()) cleanDetails.unshift(detailSentence(extra));
  }

  // 4. Explicit markers (#etiqueta, /pasta) plus "pasta X", "etiqueta X".
  let explicitFolderId: string | null = null;
  const explicitLabels: string[] = [];
  let text = ` ${head} `;
  const folderMatch = text.match(FOLDER_PATTERN);
  if (folderMatch) {
    const folder = findByName(folders, folderMatch[1]!);
    if (folder) {
      explicitFolderId = folder.id;
      text = cut(text, folderMatch);
    }
  }
  const labelMatch = text.match(LABEL_PATTERN);
  if (labelMatch) {
    const label = findByName(categories, labelMatch[1]!);
    if (label) {
      explicitLabels.push(label.id);
      text = cut(text, labelMatch);
    }
  }

  // 5. Dates and times; said after the details ("…porque ele pediu, até
  // sexta") they are taken from there.
  const schedule = parseQuickTask(tidy(text), now);
  text = ` ${schedule.title} `.replace(/^\s*(?:de|para|pra|que|e)\s+/i, " ");
  if (!schedule.due_date) {
    for (let index = 0; index < cleanDetails.length; index += 1) {
      const found = parseQuickTask(cleanDetails[index]!, now);
      if (!found.due_date) continue;
      schedule.due_date = found.due_date;
      schedule.due_time = found.due_time;
      cleanDetails[index] = sentence(found.title.replace(/[.!?]+$/, ""));
      break;
    }
  }

  // 6. Client: "do cliente Roberto" → the folder named Roberto, when it exists.
  let unknownClient: string | null = null;
  const clientMatch = text.match(CLIENT_PATTERN);
  if (clientMatch) {
    const name = clientMatch[1]!;
    const folder = findByName(folders, name);
    if (folder) {
      explicitFolderId ??= folder.id;
      text = cut(text, clientMatch);
    } else {
      unknownClient = name;
    }
  } else {
    // Dictation may not capitalize names: "do cliente roberto".
    for (const words of [2, 1]) {
      const spoken = text.match(
        new RegExp(
          String.raw`\s(?:(?:d[oa]|para\s+[oa]|pr[oa]|com\s+[oa]|ao)\s+)?cliente\s+(\p{L}+${words === 2 ? String.raw`\s+\p{L}+` : ""})(?=\s)`,
          "u",
        ),
      );
      // Two words must be the folder's exact name; one word may abbreviate it.
      const folder = !spoken
        ? undefined
        : words === 2
          ? folders.find(
              (item) => normalize(item.name) === normalize(spoken[1]!),
            )
          : findByName(folders, spoken[1]!);
      if (spoken && folder) {
        explicitFolderId ??= folder.id;
        text = cut(text, spoken);
        break;
      }
    }
  }

  // 7. Folder and labels: explicit picks, then names and history.
  const organized = suggestOrganization(tidy(text), {
    folders,
    categories,
    history,
  });
  const contextText = [organized.title, ...cleanDetails].join(" ");
  const inferred = cleanDetails.length
    ? suggestOrganization(contextText, { folders, categories, history })
    : organized;
  const folderId =
    explicitFolderId ??
    (organized.explicitFolder
      ? organized.folderId
      : (inferred.folderId ?? organized.folderId));
  const explicitCategoryIds = [
    ...new Set([...explicitLabels, ...organized.explicitCategoryIds]),
  ];
  const categoryIds = [
    ...new Set([
      ...explicitCategoryIds,
      ...organized.categoryIds,
      ...inferred.categoryIds,
    ]),
  ].slice(0, Math.max(3, explicitCategoryIds.length));

  let title = capitalize(tidy(organized.title).replace(/[.!?]+$/, ""));
  if (!title) title = capitalize(tidy(raw).replace(/[.!?]+$/, ""));

  // A long spoken run with no detail words: keep the action short and move
  // the rest ("…de vendas e enviar para a diretoria com…") to the details.
  if (title.split(/\s+/).length > 8) {
    const boundary = [...title.matchAll(/\s(?:e|com|sobre|contendo)\s/gi)].find(
      (match) => title.slice(0, match.index).split(/\s+/).length >= 4,
    );
    if (boundary?.index !== undefined) {
      cleanDetails.unshift(detailSentence(title.slice(boundary.index + 1)));
      title = title.slice(0, boundary.index);
    }
  }

  // A recurring task needs a first date to start from.
  let dueDate = schedule.due_date;
  if (recurrence && !dueDate) dueDate = localDateKey(now);

  if (unknownClient)
    ambiguities.push(`Cliente “${unknownClient}” não tem pasta cadastrada.`);
  const wanted = normalize(title);
  const duplicate = history.find(
    (task) =>
      !task.deleted_at &&
      task.status !== "completed" &&
      normalize(task.title) === wanted,
  );
  if (duplicate)
    ambiguities.push("Já existe uma tarefa aberta com este título.");

  return {
    title,
    description: cleanDetails.length ? cleanDetails.join(" ") : null,
    due_date: dueDate,
    due_time: schedule.due_time,
    recurrence,
    priority,
    folderId,
    categoryIds,
    explicitFolder: explicitFolderId !== null || organized.explicitFolder,
    explicitCategoryIds,
    unknownClient,
    ambiguities,
  };
}
