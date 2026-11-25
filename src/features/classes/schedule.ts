export interface ClassSlot {
  id: string;
  user_id: string;
  name: string;
  room: string | null;
  /** 0 = Sunday. */
  weekday: number;
  /** "08:00:00" */
  starts_at: string;
  ends_at: string;
  /** What it is (after the routine migration; older rows are classes). */
  kind?: RoutineKind;
  created_at: string;
}

export type RoutineKind =
  "aula" | "trabalho" | "treino" | "compromisso" | "outro";

export type ClassSlotInput = Pick<
  ClassSlot,
  "name" | "room" | "weekday" | "starts_at" | "ends_at" | "kind"
>;

/**
 * Places items of one day side by side when their times overlap: each gets a
 * lane and how many lanes its group of overlapping items uses.
 */
export function layoutLanes<T extends Pick<ClassSlot, "starts_at" | "ends_at">>(
  items: T[],
) {
  const toMin = (time: string) =>
    Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const sorted = [...items].sort(
    (a, b) =>
      toMin(a.starts_at) - toMin(b.starts_at) ||
      toMin(b.ends_at) - toMin(a.ends_at),
  );
  const placed: { item: T; lane: number; lanes: number }[] = [];
  let group: { item: T; lane: number; lanes: number }[] = [];
  let groupEnd = -1;
  const closeGroup = () => {
    const lanes = Math.max(1, ...group.map((entry) => entry.lane + 1));
    group.forEach((entry) => (entry.lanes = lanes));
    placed.push(...group);
    group = [];
  };
  for (const item of sorted) {
    const start = toMin(item.starts_at);
    if (group.length && start >= groupEnd) closeGroup();
    // First lane whose last item already ended.
    const used = group
      .filter((entry) => toMin(entry.item.ends_at) > start)
      .map((entry) => entry.lane);
    let lane = 0;
    while (used.includes(lane)) lane += 1;
    group.push({ item, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, toMin(item.ends_at));
  }
  if (group.length) closeGroup();
  return placed;
}

const minutes = (time: string) => {
  const [hours, mins] = time.split(":").map(Number);
  return hours! * 60 + mins!;
};

/** The class happening now and the next one today, from the person's clock. */
export function classNow(slots: ClassSlot[], now: Date) {
  const current = now.getHours() * 60 + now.getMinutes();
  const today = slots
    .filter((slot) => slot.weekday === now.getDay())
    .sort((a, b) => minutes(a.starts_at) - minutes(b.starts_at));
  const ongoing =
    today.find(
      (slot) =>
        minutes(slot.starts_at) <= current && current < minutes(slot.ends_at),
    ) ?? null;
  const next = today.find((slot) => minutes(slot.starts_at) > current) ?? null;
  return {
    ongoing,
    next,
    minutesToNext: next ? minutes(next.starts_at) - current : null,
    today,
  };
}

/** "em 25 min", "em 1h10". */
export function inTime(total: number) {
  if (total < 60) return `em ${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return `em ${hours}h${rest ? String(rest).padStart(2, "0") : ""}`;
}

export const hhmm = (time: string) => time.slice(0, 5);

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
