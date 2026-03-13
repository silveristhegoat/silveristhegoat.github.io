const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const RECORDS_FILE = path.join(ROOT_DIR, "leaderboard.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function ensureRecordsFile() {
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, "[]", "utf-8");
  }
}

function readRecords() {
  ensureRecordsFile();
  const raw = fs.readFileSync(RECORDS_FILE, "utf-8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function writeRecords(records) {
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveStaticFile(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const fullPath = path.normalize(path.join(ROOT_DIR, safePath));

  if (!fullPath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/records" && req.method === "GET") {
    try {
      const records = readRecords().sort((a, b) => a.elapsedMs - b.elapsedMs);
      sendJson(res, 200, records);
    } catch (error) {
      sendJson(res, 500, { error: "Could not load records" });
    }
    return;
  }

  if (url.pathname === "/api/records" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.socket.destroy();
      }
    });

    req.on("end", () => {
      try {
        const incoming = JSON.parse(body || "{}");
        const elapsedMs = Number(incoming.elapsedMs);
        const difficulty = Number(incoming.difficulty);
        const shape = String(incoming.shape || "square");

        if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
          sendJson(res, 400, { error: "Invalid elapsedMs" });
          return;
        }

        const record = {
          elapsedMs: Math.round(elapsedMs),
          difficulty: Number.isFinite(difficulty) ? difficulty : 0,
          shape,
          recordedAt: incoming.recordedAt || new Date().toISOString()
        };

        const records = readRecords();
        records.push(record);
        records.sort((a, b) => a.elapsedMs - b.elapsedMs);
        writeRecords(records);

        sendJson(res, 200, records);
      } catch (error) {
        sendJson(res, 400, { error: "Invalid JSON payload" });
      }
    });
    return;
  }

  if (req.method === "GET") {
    serveStaticFile(url.pathname, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Pixel Puzzle server running at http://localhost:${PORT}`);
});
