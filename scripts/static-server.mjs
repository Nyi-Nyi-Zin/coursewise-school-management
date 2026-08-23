import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const root = resolve(process.cwd(), "dist/public");
const port = Number(process.env.PORT ?? 3000);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function sendFile(response, file) {
  response.writeHead(200, { "Content-Type": contentTypes[extname(file)] ?? "application/octet-stream", "Cache-Control": file.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable" });
  createReadStream(file).pipe(response);
}

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  const normalized = pathname === "/" ? "/index.html" : pathname.replace(/\/$/, "");
  const candidates = [normalized, `${normalized}.html`];
  for (const candidate of candidates) {
    const file = resolve(root, `.${candidate}`);
    if (file.startsWith(`${root}/`) && existsSync(file) && statSync(file).isFile()) {
      sendFile(response, file);
      return;
    }
  }
  const fallback = resolve(root, "index.html");
  if (existsSync(fallback)) {
    sendFile(response, fallback);
    return;
  }
  response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Static website output is unavailable.");
}).listen(port, () => console.log(`Static root server listening on ${port}`));
