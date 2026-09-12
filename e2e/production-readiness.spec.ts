import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const adminBase = (process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:3300").replace(/\/$/, "");
const studentBase = (process.env.STUDENT_BASE_URL ?? "http://127.0.0.1:3301").replace(/\/$/, "");
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const studentEmail = process.env.E2E_STUDENT_EMAIL;
const studentPassword = process.env.E2E_STUDENT_PASSWORD;

const publicPages = [
  { name: "admin login", url: `${adminBase}/login`, heading: /admin sign in/i },
  { name: "student login", url: `${studentBase}/login`, heading: /welcome back/i },
];

async function gotoWithRetry(page: import("@playwright/test").Page, url: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    } catch (error) {
      lastError = error;
      if (attempt < 3) await page.waitForTimeout(1_000 * attempt);
    }
  }
  throw lastError;
}

async function submitWithoutPersistingPassword(
  page: import("@playwright/test").Page,
  passwordInput: import("@playwright/test").Locator,
) {
  await page.getByRole("button", { name: /^sign in/i }).click();
  // The submit handler already captured React state. Clearing only the DOM
  // property prevents Playwright failure contexts from serializing a secret.
  await passwordInput.evaluate((input: HTMLInputElement) => { input.value = ""; });
}

for (const target of publicPages) {
  test(`${target.name} renders securely and meets the automated WCAG gate`, async ({ page }) => {
    const response = await page.goto(target.url, { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByRole("heading", { name: target.heading })).toBeVisible();

    const headers = response!.headers();
    expect.soft(headers["x-content-type-options"]).toBe("nosniff");
    expect.soft(headers["x-frame-options"]).toBe("DENY");
    expect.soft(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.filter(item => ["critical", "serious"].includes(item.impact ?? ""))).toEqual([]);
  });
}

test("protected APIs reject anonymous requests and disable caching", async ({ request }) => {
  const checks = [
    await request.get(`${adminBase}/api/students`),
    await request.get(`${studentBase}/api/quizzes`),
    await request.get(`${studentBase}/api/certificates`),
  ];

  for (const response of checks) {
    expect(response.status()).toBe(401);
    expect.soft(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("auth pages do not overflow representative mobile and desktop viewports", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "The responsive matrix runs once in Chromium; engines are covered by smoke tests.");
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 800 : 900 });
    for (const target of publicPages) {
      await page.goto(target.url, { waitUntil: "networkidle" });
      const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(dimensions.scroll, `${target.name} overflowed at ${width}px`).toBeLessThanOrEqual(dimensions.client);
    }
  }
});

test.describe("authenticated staging smoke", () => {
  test.skip(
    !adminEmail || !adminPassword || !studentEmail || !studentPassword,
    "Disposable staging credentials were not supplied.",
  );

  test("administrator can authenticate and access protected management routes", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Authenticated smoke runs once to avoid account throttling.");
    await gotoWithRetry(page, `${adminBase}/login`);
    await page.getByLabel("Email address").fill(adminEmail!);
    const passwordInput = page.getByLabel("Password");
    await passwordInput.fill(adminPassword!);
    await submitWithoutPersistingPassword(page, passwordInput);
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });

    for (const route of ["/overview", "/courses", "/students", "/lessons", "/assignments", "/quizzes", "/attendance", "/certificates", "/settings"]) {
      const response = await page.goto(`${adminBase}${route}`, { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `admin route ${route} did not load`).toBeTruthy();
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
    }

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.filter(item => ["critical", "serious"].includes(item.impact ?? ""))).toEqual([]);
  });

  test("student can authenticate and access protected learning routes", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Authenticated smoke runs once to avoid account throttling.");
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithRetry(page, `${studentBase}/login`);
    await page.getByLabel("Email address").fill(studentEmail!);
    const passwordInput = page.getByPlaceholder("Your password");
    await passwordInput.fill(studentPassword!);
    await submitWithoutPersistingPassword(page, passwordInput);
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 30_000 });

    for (const route of ["/", "/lessons", "/assignments", "/quizzes", "/attendance", "/certificates", "/profile"]) {
      const response = await page.goto(new URL(route, `${studentBase}/`).toString(), { waitUntil: "domcontentloaded" });
      expect(response?.ok(), `student route ${route} did not load`).toBeTruthy();
      await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
      const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(dimensions.scroll, `student route ${route} overflowed`).toBeLessThanOrEqual(dimensions.client);
    }

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.filter(item => ["critical", "serious"].includes(item.impact ?? ""))).toEqual([]);
  });

  test("student credentials are rejected by the administrator portal", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Role rejection runs once to avoid account throttling.");
    await gotoWithRetry(page, `${adminBase}/login`);
    await page.getByLabel("Email address").fill(studentEmail!);
    const passwordInput = page.getByLabel("Password");
    await passwordInput.fill(studentPassword!);
    await submitWithoutPersistingPassword(page, passwordInput);
    await expect(page.getByText(/does not have administrator access/i)).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });

  test("administrator credentials are rejected by the student portal", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Role rejection runs once to avoid account throttling.");
    await gotoWithRetry(page, `${studentBase}/login`);
    await page.getByLabel("Email address").fill(adminEmail!);
    const passwordInput = page.getByPlaceholder("Your password");
    await passwordInput.fill(adminPassword!);
    await submitWithoutPersistingPassword(page, passwordInput);
    await expect(page.getByText(/inactive or no longer available/i)).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });
});
