import { mkdir, writeFile } from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const execFileAsync = promisify(execFile);
const packageRunner = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const externalAdminBase = process.env.ADMIN_BASE_URL?.replace(/\/$/, "");
const externalStudentBase = process.env.STUDENT_BASE_URL?.replace(/\/$/, "");
const useExternalServers = Boolean(externalAdminBase && externalStudentBase);
const targets = [
  { name: "admin-login", url: `${externalAdminBase ?? "http://127.0.0.1:3400"}/login` },
  { name: "student-login", url: `${externalStudentBase ?? "http://127.0.0.1:3401"}/login` },
];
const servers = [];

function startServer(filter, port) {
  const command = ["--filter", filter, "exec", "next", "start", "--port", String(port)];
  const executable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : packageRunner;
  const args = process.platform === "win32" ? ["/d", "/s", "/c", packageRunner, ...command] : command;
  const child = spawn(executable, args, {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  servers.push(child);
  return child;
}

async function waitFor(url, child) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) throw new Error(`Server exited before ${url} became ready.`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function stopServer(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/pid", String(child.pid), "/T", "/F"]).catch(() => undefined);
  } else {
    child.kill("SIGTERM");
  }
}

function assertBudget(name, result) {
  if (result.lhr.runtimeError) {
    throw new Error(`${name} Lighthouse runtime error: ${result.lhr.runtimeError.code}`);
  }
  const audits = result.lhr.audits;
  const categories = result.lhr.categories;
  const failures = [];
  if ((categories.performance.score ?? 0) < 0.8) failures.push(`performance score ${categories.performance.score}`);
  if ((categories.accessibility.score ?? 0) < 0.9) failures.push(`accessibility score ${categories.accessibility.score}`);
  if ((categories["best-practices"].score ?? 0) < 0.9) failures.push(`best-practices score ${categories["best-practices"].score}`);
  if ((audits["largest-contentful-paint"].numericValue ?? Infinity) > 2500) failures.push(`LCP ${audits["largest-contentful-paint"].displayValue}`);
  if ((audits["cumulative-layout-shift"].numericValue ?? Infinity) > 0.1) failures.push(`CLS ${audits["cumulative-layout-shift"].displayValue}`);
  // Lighthouse cannot measure field INP from a single navigation. Keep TBT as
  // a conservative lab guard and verify the INP <= 200 ms release target with
  // staging telemetry once representative traffic is available.
  if ((audits["total-blocking-time"].numericValue ?? Infinity) > 600) failures.push(`TBT ${audits["total-blocking-time"].displayValue}`);
  if (failures.length) throw new Error(`${name} missed budgets: ${failures.join(", ")}`);
}

async function runLighthouse(target, port) {
  const validResults = [];
  for (let attempt = 1; attempt <= 5 && validResults.length < 3; attempt += 1) {
    const result = await lighthouse(target.url, {
      port,
      logLevel: "error",
      output: "json",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    if (result && !result.lhr.runtimeError) validResults.push(result);
    if (validResults.length < 3) await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  if (!validResults.length) return undefined;
  // A median of three reduces false release failures caused by local CPU and
  // process-scheduling variance while preserving Lighthouse's mobile profile.
  validResults.sort(
    (left, right) =>
      (left.lhr.categories.performance.score ?? 0) -
      (right.lhr.categories.performance.score ?? 0)
  );
  return validResults[Math.floor(validResults.length / 2)];
}

try {
  if (useExternalServers) {
    await Promise.all(targets.map(target => waitFor(target.url)));
  } else {
    const admin = startServer("admin-dashboard", 3400);
    const student = startServer("student-website", 3401);
    await Promise.all([waitFor(targets[0].url, admin), waitFor(targets[1].url, student)]);
  }
  await mkdir("artifacts/lighthouse", { recursive: true });
  for (const target of targets) {
    // Isolate targets so repeated traces and garbage collection from the first
    // portal cannot distort the second portal's main-thread timings.
    const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
    try {
      const result = await runLighthouse(target, chrome.port);
      if (!result) throw new Error(`Lighthouse produced no result for ${target.name}.`);
      await writeFile(`artifacts/lighthouse/${target.name}.json`, result.report);
      assertBudget(target.name, result);
      console.log(`${target.name}: performance=${result.lhr.categories.performance.score}, accessibility=${result.lhr.categories.accessibility.score}, best-practices=${result.lhr.categories["best-practices"].score}`);
    } finally {
      try {
        await chrome.kill();
      } catch (error) {
        if (error?.code !== "EPERM") throw error;
      }
    }
  }
} finally {
  await Promise.all(servers.map(stopServer));
}
