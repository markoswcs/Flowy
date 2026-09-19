import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section aria-labelledby="auth-title">
      <div className="text-center">
        <h1
          id="auth-title"
          className="text-balance text-2xl font-semibold tracking-tight"
        >
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-7">{children}</div>
      {footer ? (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function AuthMessage({
  status,
  children,
}: {
  status: "error" | "success";
  children: ReactNode;
}) {
  return (
    <div
      role={status === "error" ? "alert" : "status"}
      className={
        status === "error"
          ? "rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          : "rounded-md border border-success/25 bg-success/10 px-3 py-2.5 text-sm text-foreground"
      }
    >
      {children}
    </div>
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="text-xs text-destructive">
      {error}
    </p>
  );
}
