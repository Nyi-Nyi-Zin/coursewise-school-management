import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  plugins: [{
    name: "workspace-app-alias",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.startsWith("@/")) return null;
      const normalizedImporter = importer.replaceAll("\\", "/");
      const relativePath = source.slice(2);
      if (normalizedImporter.includes("/student-website/")) return path.resolve(templateRoot, "student-website", "src", relativePath);
      if (normalizedImporter.includes("/admin-dashboard/")) return path.resolve(templateRoot, "admin-dashboard", "src", relativePath);
      return null;
    },
  }],
  resolve: {
    alias: {
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "student-website/**/*.test.ts", "student-website/**/*.test.tsx", "admin-dashboard/**/*.test.ts", "admin-dashboard/**/*.test.tsx", "firebase/**/*.test.ts"],
    environmentMatchGlobs: [["admin-dashboard/src/lib/use-admin-records.hook.test.ts", "jsdom"]],
  },
});
