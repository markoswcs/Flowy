export interface AuthActionState {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

export const initialAuthState: AuthActionState = { status: "idle" };
