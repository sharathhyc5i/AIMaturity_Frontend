// Serves the built frontend (./dist) on Azure App Service (Linux, Node).
// No npm dependencies, so nothing has to be installed on the server.
// Unknown paths fall back to index.html so React Router (BrowserRouter) deep links work.
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
const PORT = process.env.PORT || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function fileAt(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const full = normalize(join(ROOT, decoded));
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null; // block ../ escapes
  try {
    const st = statSync(full);
    if (st.isFile()) return full;
    if (st.isDirectory()) {
      const index = join(full, "index.html");
      if (statSync(index).isFile()) return index;
    }
  } catch {}
  return null;
}

createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let file;
  try {
    file = fileAt(req.url || "/");
  } catch {
    res.writeHead(400).end();
    return;
  }

  // A missing file with an extension (e.g. /assets/old.js) is a real 404, not a page route
  if (!file && extname(req.url.split("?")[0])) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
    return;
  }
  file ??= join(ROOT, "index.html");

  const ext = extname(file).toLowerCase();
  // Vite puts content-hashed files in /assets, so they can be cached forever; index.html never
  const cache = file.includes(`${sep}assets${sep}`)
    ? "public, max-age=31536000, immutable"
    : "no-cache";

  res.writeHead(200, {
    "Content-Type": TYPES[ext] || "application/octet-stream",
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Frontend listening on port ${PORT}, serving ${ROOT}`));
