import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const forbiddenEnv = tracked.filter(file => /(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".env.example"));
const secretPatterns = [
  /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
  /"type"\s*:\s*"service_account"/,
  /"private_key"\s*:/,
];
const exposed = tracked.filter(file => {
  if (file === "scripts/check-secret-hygiene.mjs") return false;
  if (/\.(?:png|jpe?g|gif|webp|ico|woff2?|zip|lock)$/i.test(file)) return false;
  try { return secretPatterns.some(pattern => pattern.test(readFileSync(file, "utf8"))); }
  catch { return false; }
});

if (forbiddenEnv.length || exposed.length) {
  console.error(`Secret hygiene failed: ${forbiddenEnv.length} tracked environment file(s), ${exposed.length} tracked credential-bearing file(s).`);
  for (const file of [...new Set([...forbiddenEnv, ...exposed])]) console.error(`- ${file}`);
  process.exit(1);
}
console.log("Secret hygiene passed: no tracked environment or service-account credential files.");
