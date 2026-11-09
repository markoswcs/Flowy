export type WorkoutGoal = "lose_weight" | "gain_muscle" | "conditioning" | "health";
export type WorkoutLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutPlace = "home" | "gym" | "outdoor";
export type Limitation = "knee" | "back" | "shoulder" | "wrist";
export type Feeling = "easy" | "ok" | "hard";

export interface WorkoutProfile {
  user_id: string;
  goal: WorkoutGoal;
  level: WorkoutLevel;
  /** Weekdays (0 = Sunday) the person trains on. */
  days: number[];
  minutes: number;
  place: WorkoutPlace;
  limitations: Limitation[];
  /** -2 … 4: moved by "fácil" / "difícil" after each workout. */
  intensity: number;
  /** Exercises the person swapped: exercise id → replacement id. */
  swaps: Record<string, string>;
  /** Workouts the person edited by hand: session key → its exercises, in order. */
  custom_sessions: Record<string, CustomExercise[]>;
  created_at: string;
  updated_at: string;
}

/** One exercise of a workout edited by hand. */
export interface CustomExercise {
  id: string;
  sets: number;
  /** Repetitions, seconds or minutes, as the exercise's unit says. */
  amount: number;
  /** Rest between sets, in seconds. */
  rest: number;
}

export type WorkoutProfileInput = Pick<
  WorkoutProfile,
  "goal" | "level" | "days" | "minutes" | "place" | "limitations"
>;

export interface WorkoutLog {
  id: string;
  user_id: string;
  /** yyyy-mm-dd */
  day: string;
  /** Key of the session the plan had for that day. */
  session: string;
  status: "done" | "skipped";
  feeling: Feeling | null;
  created_at: string;
}

export const GOAL_LABELS: Record<WorkoutGoal, string> = {
  lose_weight: "Emagrecer",
  gain_muscle: "Ganhar massa",
  conditioning: "Condicionamento",
  health: "Saúde e disposição",
};

export const LEVEL_LABELS: Record<WorkoutLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export const PLACE_LABELS: Record<WorkoutPlace, string> = {
  home: "Em casa",
  gym: "Academia",
  outdoor: "Ao ar livre",
};

export const LIMITATION_LABELS: Record<Limitation, string> = {
  knee: "Joelho",
  back: "Coluna / lombar",
  shoulder: "Ombro",
  wrist: "Punho",
};

export const FEELING_LABELS: Record<Feeling, string> = {
  easy: "Fácil",
  ok: "Na medida",
  hard: "Difícil",
};
