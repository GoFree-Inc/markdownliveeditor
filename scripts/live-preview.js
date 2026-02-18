#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { convertMarkdownToPdf } = require("./markdown-to-pdf");

const inputArg = process.argv[2] || "sample.md";
const outputArg = process.argv[3] || "output/pdf/sample.pdf";
const portArg = Number(process.argv[4] || "4173");

const inputPath = path.resolve(process.cwd(), inputArg);
const outputPath = path.resolve(process.cwd(), outputArg);
const watchDir = path.dirname(inputPath);
const watchFile = path.basename(inputPath);
const clients = new Set();

let buildError = null;
let buildCount = 0;
let buildTimer = null;

function pushEvent(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    client.write(data);
  }
}

function buildPdf() {
  try {
    convertMarkdownToPdf(inputPath, outputPath);
    buildError = null;
    buildCount += 1;
    pushEvent({
      type: "built",
      buildCount,
      outputPath,
      timestamp: new Date().toISOString()
    });
    console.log(`[build] ${new Date().toLocaleTimeString()} -> ${outputPath}`);
  } catch (error) {
    buildError = error;
    pushEvent({
      type: "error",
      message: error.message
    });
    console.error(`[build:error] ${error.message}`);
  }
}

function scheduleBuild() {
  clearTimeout(buildTimer);
  buildTimer = setTimeout(buildPdf, 120);
}

function readPreviewHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Markdown PDF Live Preview</title>
  <style>
    :root {
      --bg: #f7f4ef;
      --panel: #fffdf8;
      --ink: #1f1b17;
      --muted: #6a6259;
      --accent: #1565c0;
      --error: #b00020;
      --line: #d6cec3;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 85% 12%, #f8dfbf 0%, rgba(248,223,191,0) 42%),
        radial-gradient(circle at 8% 85%, #d4e8ff 0%, rgba(212,232,255,0) 44%),
        var(--bg);
      display: grid;
      grid-template-rows: auto 1fr;
    }
    header {
      background: rgba(255, 253, 248, 0.88);
      backdrop-filter: blur(6px);
      border-bottom: 1px solid var(--line);
      padding: 0.9rem 1.1rem;
      display: grid;
      gap: 0.25rem;
    }
    .title {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      margin: 0;
    }
    .meta {
      margin: 0;
      color: var(--muted);
      font-size: 0.88rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .status.error { color: var(--error); font-weight: 700; }
    .status.ok { color: var(--accent); font-weight: 700; }
    main {
      padding: 1rem;
      display: flex;
      justify-content: center;
      align-items: stretch;
      min-height: 0;
    }
    .frame-wrap {
      width: min(1100px, 100%);
      height: 100%;
      min-height: 72vh;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel);
      box-shadow: 0 18px 45px rgba(45, 37, 25, 0.13);
      overflow: hidden;
    }
    iframe {
      border: 0;
      width: 100%;
      height: 100%;
      min-height: 72vh;
      background: white;
    }
  </style>
</head>
<body>
  <header>
    <h1 class="title">Markdown to PDF Live Preview</h1>
    <p class="meta">
      <span>Input: <code>${inputPath}</code></span>
      <span>Output: <code>${outputPath}</code></span>
      <span id="status" class="status ok">Connected</span>
    </p>
  </header>
  <main>
    <div class="frame-wrap">
      <iframe id="preview" src="/pdf?t=${Date.now()}"></iframe>
    </div>
  </main>
  <script>
    const preview = document.getElementById("preview");
    const status = document.getElementById("status");
    const events = new EventSource("/events");

    function reloadPdf() {
      preview.src = "/pdf?t=" + Date.now();
    }

    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "built") {
          status.className = "status ok";
          status.textContent = "Built " + new Date(payload.timestamp).toLocaleTimeString();
          reloadPdf();
          return;
        }
        if (payload.type === "error") {
          status.className = "status error";
          status.textContent = "Build error: " + payload.message;
          return;
        }
      } catch (error) {
        status.className = "status error";
        status.textContent = "Preview event parse failed";
      }
    };

    events.onerror = () => {
      status.className = "status error";
      status.textContent = "Disconnected from preview server";
    };
  </script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Missing URL");
    return;
  }

  const pathname = req.url.split("?")[0];

  if (pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    res.write("\n");
    clients.add(res);

    const initial = buildError
      ? { type: "error", message: buildError.message }
      : { type: "built", buildCount, outputPath, timestamp: new Date().toISOString() };
    res.write(`data: ${JSON.stringify(initial)}\n\n`);

    req.on("close", () => {
      clients.delete(res);
    });
    return;
  }

  if (pathname === "/pdf") {
    if (!fs.existsSync(outputPath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("PDF output not found yet.");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store, max-age=0"
    });
    fs.createReadStream(outputPath).pipe(res);
    return;
  }

  if (pathname === "/health") {
    const payload = {
      ok: !buildError,
      buildCount,
      inputPath,
      outputPath,
      error: buildError ? buildError.message : null
    };
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(readPreviewHtml());
});

if (!fs.existsSync(inputPath)) {
  console.error(`Input Markdown file not found: ${inputPath}`);
  process.exit(1);
}

buildPdf();

try {
  fs.watch(watchDir, (event, filename) => {
    if (!filename) return;
    if (filename === watchFile) {
      scheduleBuild();
    }
  });
} catch (error) {
  console.error(`Could not watch ${watchDir}: ${error.message}`);
}

server.on("error", (error) => {
  if (error && (error.code === "EPERM" || error.code === "EACCES")) {
    console.error(`Cannot open preview server on port ${portArg} in this environment.`);
    console.error("Run the same command locally to use live preview.");
    process.exit(1);
  }

  console.error(`Preview server error: ${error.message}`);
  process.exit(1);
});

server.listen(portArg, "127.0.0.1", () => {
  console.log(`Live preview: http://localhost:${portArg}`);
  console.log(`Watching: ${inputPath}`);
});
