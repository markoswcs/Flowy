import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const nextCli = fileURLToPath(
  new URL("./node_modules/next/dist/bin/next", import.meta.url),
);
const playwrightCli = fileURLToPath(
  new URL("./node_modules/@playwright/test/cli.js", import.meta.url),
);
const serverUrl = "http://127.0.0.1:3100/login";

const server = spawn(
  process.execPath,
  [nextCli, "start", "--hostname", "127.0.0.1", "--port", "3100"],
  {
    cwd: projectRoot,
    detached: process.platform !== "win32",
    stdio: "inherit",
    windowsHide: true,
  },
);

const serverExit = new Promise((resolve) => {
  server.once("exit", (code, signal) => resolve({ code, signal }));
});

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    const state = await Promise.race([
      serverExit.then((result) => ({ type: "exit", result })),
      delay(250).then(() => ({ type: "waiting" })),
    ]);

    if (state.type === "exit") {
      throw new Error(
        `O servidor E2E encerrou antes de ficar pronto (código ${String(state.result.code)}, sinal ${String(state.result.signal)}).`,
      );
    }

    try {
      const response = await fetch(serverUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_000),
      });

      if (response.status > 0) return;
    } catch {
      // O servidor ainda está iniciando.
    }
  }

  throw new Error("O servidor E2E não ficou pronto em 120 segundos.");
}

async function stopServer() {
  if (server.exitCode !== null || server.signalCode !== null) return;

  if (process.platform === "win32") {
    server.kill("SIGTERM");

    const stopped = await Promise.race([
      serverExit.then(() => true),
      delay(5_000).then(() => false),
    ]);

    if (!stopped) server.kill("SIGKILL");
    return;
  }

  process.kill(-server.pid, "SIGTERM");

  const stopped = await Promise.race([
    serverExit.then(() => true),
    delay(5_000).then(() => false),
  ]);

  if (!stopped) process.kill(-server.pid, "SIGKILL");
}

async function run() {
  let exitCode = 1;

  try {
    await waitForServer();

    const tests = spawn(
      process.execPath,
      [playwrightCli, "test", ...process.argv.slice(2)],
      {
        cwd: projectRoot,
        stdio: "inherit",
        windowsHide: true,
      },
    );

    exitCode = await new Promise((resolve) => {
      tests.once("exit", (code) => resolve(code ?? 1));
    });
  } finally {
    await stopServer();
  }

  process.exitCode = exitCode;
}

await run();
