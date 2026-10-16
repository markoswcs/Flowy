/**
 * Suggests a folder and labels for a task from its title, using (in order of
 * strength) explicit markers, the names the person already uses, a small
 * Portuguese keyword vocabulary and what was organized before.
 *
 * Markers: `#etiqueta` picks a label and `/pasta` picks a folder; both are
 * removed from the title.
 */

interface Named {
  id: string;
  name: string;
}

interface PastTask {
  title: string;
  folder_id: string | null;
  categories?: { id: string }[];
}

export interface SmartSuggestion {
  title: string;
  folderId: string | null;
  categoryIds: string[];
  /** Whether each pick was typed explicitly (true) or inferred (false). */
  explicitFolder: boolean;
  explicitCategoryIds: string[];
}

const STOP_WORDS = new Set(
  "a o as os de da do das dos e em no na nos nas um uma para pra por com sem que se ao aos sobre ate".split(" "),
);

// Words that hint at a common kind of folder or label, keyed by the normalized
// name the person is likely to have created.
const VOCABULARY: Record<string, string[]> = {
  trabalho: ["reuniao", "cliente", "proposta", "relatorio", "email", "projeto", "apresentacao", "contrato", "orcamento", "briefing", "entrega", "call", "deploy", "banner", "campanha", "post", "planilha"],
  pessoal: ["academia", "medico", "consulta", "mercado", "casa", "aniversario", "familia", "viagem", "dentista", "treino", "lavar", "comprar"],
  estudos: ["estudar", "prova", "aula", "curso", "livro", "faculdade", "trabalho de", "ler", "revisar materia", "exercicio"],
  financas: ["pagar", "boleto", "fatura", "conta", "imposto", "pix", "transferir", "cobrar", "nota fiscal", "salario"],
  saude: ["medico", "remedio", "exame", "academia", "treino", "dentista", "terapia"],
  urgente: ["urgente", "asap", "sem falta", "agora", "imediato", "prioridade"],
  ideias: ["ideia", "pensar", "brainstorm", "talvez", "explorar"],
  compras: ["comprar", "mercado", "loja", "pedido", "encomendar"],
};

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function tokens(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function findByName<T extends Named>(items: T[], query: string) {
  const wanted = normalize(query);
  if (!wanted) return undefined;
  return (
    items.find((item) => normalize(item.name) === wanted) ??
    items.find((item) => normalize(item.name).startsWith(wanted)) ??
    items.find((item) => normalize(item.name).replace(/\s+/g, "") === wanted)
  );
}

function containsWord(haystack: string, needle: string) {
  if (needle.length < 3) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function scoreByName<T extends Named>(items: T[], text: string) {
  const scores = new Map<string, number>();
  const plain = tokens(text).join(" ");
  items.forEach((item) => {
    const name = tokens(item.name).join(" ");
    if (name && containsWord(plain, name)) scores.set(item.id, 5);
    const hints = VOCABULARY[normalize(item.name)] ?? [];
    const matches = hints.filter((hint) => containsWord(plain, normalize(hint))).length;
    if (matches) scores.set(item.id, (scores.get(item.id) ?? 0) + 2 * matches);
  });
  return scores;
}

function scoreByHistory(history: PastTask[], text: string, pick: (task: PastTask) => string[]) {
  const words = new Set(tokens(text));
  const scores = new Map<string, number>();
  if (!words.size) return scores;
  history.forEach((task) => {
    const shared = tokens(task.title).filter((word) => words.has(word)).length;
    if (!shared) return;
    pick(task).forEach((id) => scores.set(id, (scores.get(id) ?? 0) + shared));
  });
  return scores;
}

function merge(...maps: Map<string, number>[]) {
  const total = new Map<string, number>();
  maps.forEach((map) => map.forEach((value, key) => total.set(key, (total.get(key) ?? 0) + value)));
  return total;
}

export function suggestOrganization(
  input: string,
  {
    folders,
    categories,
    history = [],
  }: { folders: Named[]; categories: Named[]; history?: PastTask[] },
): SmartSuggestion {
  let title = ` ${input} `;
  let folderId: string | null = null;
  const explicitCategoryIds: string[] = [];

  title = title.replace(/\s\/([\p{L}\p{N}_-]+)/gu, (match, name: string) => {
    const folder = findByName(folders, name.replace(/[-_]/g, " "));
    if (!folder) return match;
    folderId = folder.id;
    return " ";
  });
  title = title.replace(/\s#([\p{L}\p{N}_-]+)/gu, (match, name: string) => {
    const category = findByName(categories, name.replace(/[-_]/g, " "));
    if (!category) return match;
    if (!explicitCategoryIds.includes(category.id)) explicitCategoryIds.push(category.id);
    return " ";
  });
  title = title.replace(/\s+/g, " ").trim();

  const explicitFolder = folderId !== null;
  if (!folderId && title) {
    const folderScores = merge(
      scoreByName(folders, title),
      scoreByHistory(history, title, (task) => (task.folder_id ? [task.folder_id] : [])),
    );
    const [best] = [...folderScores.entries()].sort((a, b) => b[1] - a[1]);
    if (best && best[1] >= 2) folderId = best[0];
  }

  const categoryIds = [...explicitCategoryIds];
  if (title) {
    const categoryScores = merge(
      scoreByName(categories, title),
      scoreByHistory(history, title, (task) => task.categories?.map((category) => category.id) ?? []),
    );
    [...categoryScores.entries()]
      .filter(([, score]) => score >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .forEach(([id]) => {
        if (!categoryIds.includes(id)) categoryIds.push(id);
      });
  }

  return { title, folderId, categoryIds, explicitFolder, explicitCategoryIds };
}
