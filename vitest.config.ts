import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    clearMocks: true,
    pool: "threads",
    maxWorkers: 1,
    isolate: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
