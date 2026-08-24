import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const documentTemplate = readFileSync(resolve(root, "client/index.html"), "utf8");
const homePage = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

describe("root page SEO metadata", () => {
  it("keeps focused keyword count, H2, and runtime title within the strict limits", () => {
    const keywords = documentTemplate.match(/<meta name="keywords" content="([^"]+)"/i)?.[1] ?? "";
    const keywordList = keywords.split(",").map(keyword => keyword.trim()).filter(Boolean);
    expect(keywordList.length).toBeGreaterThanOrEqual(3);
    expect(keywordList.length).toBeLessThanOrEqual(8);

    const runtimeTitle = homePage.match(/const ROOT_DOCUMENT_TITLE = "([^"]+)"/)?.[1] ?? "";
    expect(homePage).toContain("document.title = ROOT_DOCUMENT_TITLE");
    expect(runtimeTitle.length).toBeGreaterThanOrEqual(30);
    expect(runtimeTitle.length).toBeLessThanOrEqual(60);

    const h2 = "Student learning and course management platform";
    expect(homePage).toContain(h2);
    expect(h2.length).toBeLessThanOrEqual(80);
  });
});
