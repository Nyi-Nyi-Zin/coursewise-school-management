import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  root: import.meta.dirname,
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
