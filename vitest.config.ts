import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "student-website/**/*.test.ts", "admin-dashboard/**/*.test.ts", "admin-dashboard/**/*.test.tsx", "firebase/**/*.test.ts"],
    environmentMatchGlobs: [["admin-dashboard/src/lib/use-admin-records.hook.test.ts", "jsdom"]],
  },
});
