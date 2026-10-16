import { localDateKey } from "@/features/tasks/date-utils";

interface PhraseTask {
  title: string;
  status: string;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
}

function short(title: string, max = 34) {
  const clean = title.trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * A short line under the greeting built from the person's own tasks: what is
 * late, what comes next today and how much is already done.
 */
export function buildDailyPhrase(tasks: PhraseTask[], now = new Date()): string {
  const today = localDateKey(now);
  const hour = now.getHours();
  const nowTime = `${String(hour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const open = tasks.filter((task) => task.status !== "completed");
  const overdue = open.filter((task) => task.due_date && task.due_date < today);
  const dueToday = open.filter((task) => task.due_date === today);
  const doneToday = tasks.filter(
    (task) => task.status === "completed" && task.completed_at && localDateKey(new Date(task.completed_at)) === today,
  ).length;
  const next = dueToday
    .filter((task) => task.due_time && task.due_time.slice(0, 5) >= nowTime)
    .sort((a, b) => a.due_time!.localeCompare(b.due_time!))[0];
  const lateNight = hour >= 22 || hour < 5;

  if (overdue.length) {
    const oldest = [...overdue].sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0]!;
    return overdue.length === 1
      ? `“${short(oldest.title)}” ficou para trás. Que tal resolver agora?`
      : `${plural(overdue.length, "tarefa atrasada", "tarefas atrasadas")}. Comece por “${short(oldest.title)}”.`;
  }

  if (next) {
    const time = next.due_time!.slice(0, 5);
    const rest = dueToday.length - 1;
    return rest > 0
      ? `Próxima: “${short(next.title)}” às ${time}. Depois, mais ${rest} para hoje.`
      : `Próxima: “${short(next.title)}” às ${time}.`;
  }

  if (dueToday.length) {
    if (lateNight) {
      return `Ainda ${dueToday.length === 1 ? "falta 1 tarefa" : `faltam ${dueToday.length} tarefas`} de hoje. Descansar também é produtivo.`;
    }
    return doneToday
      ? `${plural(doneToday, "tarefa feita", "tarefas feitas")}, ${dueToday.length === 1 ? "falta 1" : `faltam ${dueToday.length}`}. Você está no ritmo!`
      : `${plural(dueToday.length, "tarefa", "tarefas")} para hoje. Comece por “${short(dueToday[0]!.title)}”.`;
  }

  if (doneToday) {
    return `Tudo de hoje concluído: ${plural(doneToday, "tarefa feita", "tarefas feitas")}. Mandou bem!`;
  }

  if (open.length) {
    const upcoming = open
      .filter((task) => task.due_date && task.due_date > today)
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
    if (upcoming) return `Dia livre por aqui. A próxima é “${short(upcoming.title)}”.`;
    return `${plural(open.length, "tarefa sem data", "tarefas sem data")} esperando. Que tal escolher uma para hoje?`;
  }

  if (lateNight) return "Lista vazia. Hora de descansar e recarregar.";
  if (hour < 12) return "Lista em branco. Qual é a primeira coisa do seu dia?";
  return "Nada pendente por aqui. Que tal planejar o amanhã?";
}
