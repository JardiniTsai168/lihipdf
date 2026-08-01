import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, "../static");
const port = Number(process.env.PORT || 3000);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8"
};

function safeJoin(urlPath) {
  const normalized = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(staticRoot, normalized);
}

async function resolveFile(urlPath) {
  const pathname = urlPath === "/" ? "/index.html" : urlPath;
  const directPath = safeJoin(pathname);

  try {
    const directStat = await stat(directPath);
    if (directStat.isFile()) return directPath;
  } catch {}

  if (!path.extname(pathname)) {
    const htmlPath = safeJoin(`${pathname}.html`);
    try {
      const htmlStat = await stat(htmlPath);
      if (htmlStat.isFile()) return htmlPath;
    } catch {}
  }

  return safeJoin("/404.html");
}

createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const filePath = await resolveFile(requestUrl.pathname);

    await access(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const statusCode = filePath.endsWith("404.html") ? 404 : 200;

    res.writeHead(statusCode, {
      "cache-control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      "content-type": contentType
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  } catch (error) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Server error: ${error instanceof Error ? error.message : "unknown"}`);
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`lihiPDF static server listening on ${port}`);
});
