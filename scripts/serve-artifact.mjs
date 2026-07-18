import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const options = {
    host: "127.0.0.1",
    port: Number(process.env.PORT || 4173),
    root: rootDir
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--host" && argv[index + 1]) {
      options.host = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--port" && argv[index + 1]) {
      options.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--root" && argv[index + 1]) {
      options.root = path.resolve(rootDir, argv[index + 1]);
      index += 1;
    }
  }

  if (!Number.isInteger(options.port) || options.port <= 0) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  if (!fs.existsSync(options.root) || !fs.statSync(options.root).isDirectory()) {
    throw new Error(`Invalid root directory: ${options.root}`);
  }

  return options;
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".wasm":
      return "application/wasm";
    case ".png":
      return "image/png";
    case ".db":
    case ".sqlite":
    case ".sqlite3":
      return "application/octet-stream";
    default:
      return "application/octet-stream";
  }
}

function resolveRequestPath(root, requestUrl = "/") {
  const normalizedUrl = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(normalizedUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(root)) return null;

  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()) {
    const nestedIndex = path.join(absolutePath, "index.html");
    return fs.existsSync(nestedIndex) ? nestedIndex : null;
  }

  return absolutePath;
}

const options = parseArgs(process.argv.slice(2));

const server = http.createServer((request, response) => {
  const filePath = resolveRequestPath(options.root, request.url || "/");
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": getContentType(filePath),
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(options.port, options.host, () => {
  process.stdout.write(
    `Artifact server ready at http://${options.host}:${options.port}/ (root: ${path.relative(rootDir, options.root) || "."})\n`
  );
});

function shutdown(signal) {
  server.close(() => {
    process.stdout.write(`Artifact server stopped after ${signal}.\n`);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
