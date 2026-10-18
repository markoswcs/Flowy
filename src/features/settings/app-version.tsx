const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
const COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT ?? "";
const BUILT_AT = process.env.NEXT_PUBLIC_APP_BUILT_AT ?? "";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Which build is running: version, commit and when it was published. */
export function AppVersion() {
  if (!VERSION) return null;
  const builtAt = BUILT_AT ? new Date(BUILT_AT) : null;
  return (
    <footer className="pb-2 pt-4 text-center text-xs text-muted-foreground">
      <p>
        Flowy <span className="font-semibold text-foreground">v{VERSION}</span>
      </p>
      {COMMIT || builtAt ? (
        <p className="mt-1 tabular-nums">
          {COMMIT ? (
            <>
              commit <code className="font-mono">{COMMIT}</code>
            </>
          ) : null}
          {COMMIT && builtAt ? " · " : null}
          {builtAt && !Number.isNaN(builtAt.getTime())
            ? `publicada em ${dateFormatter.format(builtAt)}`
            : null}
        </p>
      ) : null}
    </footer>
  );
}
