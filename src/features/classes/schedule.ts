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
  created_at: string;
}

export type ClassSlotInput = Pick<ClassSlot, "name" | "room" | "weekday" | "starts_at" | "ends_at">;

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
  const ongoing = today.find((slot) => minutes(slot.starts_at) <= current && current < minutes(slot.ends_at)) ?? null;
  const next = today.find((slot) => minutes(slot.starts_at) > current) ?? null;
  return { ongoing, next, minutesToNext: next ? minutes(next.starts_at) - current : null, today };
}

/** "em 25 min", "em 1h10". */
export function inTime(total: number) {
  if (total < 60) return `em ${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return `em ${hours}h${rest ? String(rest).padStart(2, "0") : ""}`;
}

export const hhmm = (time: string) => time.slice(0, 5);

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
