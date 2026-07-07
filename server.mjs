// Servidor estatico minimo para servir el build de Astro (dist/) en Railway.
// Sin dependencias: usa solo el runtime de Node. Sirve el sitio estatico
// escuchando en process.env.PORT, sin chequeo de host.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("./dist/", import.meta.url));
const PORT = Number(process.env.PORT) || 4321;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

async function resolveFile(pathname) {
  // Evita traversal fuera de dist.
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(DIST, safe);

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    // Si no existe tal cual, prueba como directorio con index.html (rutas Astro).
    filePath = join(DIST, safe, "index.html");
  }
  return filePath;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    const filePath = await resolveFile(url.pathname);
    const body = await readFile(filePath);
    const type = MIME[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": type.startsWith("text/html")
        ? "no-cache"
        : "public, max-age=31536000, immutable",
    });
    res.end(body);
  } catch {
    try {
      const notFound = await readFile(join(DIST, "404.html"));
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(notFound);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
    }
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Human Touch Books sirviendo dist/ en el puerto ${PORT}`);
});
