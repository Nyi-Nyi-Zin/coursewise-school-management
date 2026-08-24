import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const documentTemplate = readFileSync(resolve(root, "client/index.html"), "utf8");
const homePage = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const robots = readFileSync(resolve(root, "client/public/robots.txt"), "utf8");
const sitemap = readFileSync(resolve(root, "client/public/sitemap.xml"), "utf8");
const studentLayout = readFileSync(resolve(root, "student-website/src/app/layout.tsx"), "utf8");
const adminLayout = readFileSync(resolve(root, "admin-dashboard/src/app/layout.tsx"), "utf8");

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

    const h2 = "A secure portal for learning, teaching, and course management";
    expect(homePage).toContain(h2);
    expect(h2.length).toBeLessThanOrEqual(80);
  });

  it("keeps the root public and protects private portal surfaces from indexing", () => {
    expect(documentTemplate).toContain('name="robots" content="index, follow"');
    expect(documentTemplate).toContain('rel="canonical" href="https://schoolcms-luralw9t.manus.space/"');
    expect(documentTemplate).toContain('property="og:site_name" content="Teza Tech Lab"');
    expect(documentTemplate).toContain('application/ld+json');
    expect(documentTemplate).toContain('"@type": "Organization"');
    expect(documentTemplate).toContain('"@type": "WebSite"');
    expect(documentTemplate).toContain("<noscript>");
    expect(documentTemplate).toContain("<h1>Student learning and course management, all in one place.</h1>");
    expect(documentTemplate).toContain("<h2>A secure portal for learning, teaching, and course management</h2>");
    expect(robots).toContain("Disallow: /admin/");
    expect(robots).toContain("Disallow: /student/");
    expect(sitemap).toContain("https://schoolcms-luralw9t.manus.space/");
    expect(homePage).toContain('meta.setAttribute("content", "noindex, nofollow")');
    expect(studentLayout).toContain("index: false");
    expect(adminLayout).toContain("index: false");
  });
});
