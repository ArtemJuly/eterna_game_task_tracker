// Local sync server: a single shared store on this computer so every browser
// (Chrome, Safari, ...) sees the same Eterna data, instead of each browser
// keeping its own isolated localStorage. Pure Node http, no dependencies —
// a key/value JSON blob persisted to disk, mirroring the app's existing
// localStorage keys one-to-one. Swapping this file-backed store for a real
// database later doesn't require changing the frontend's API contract.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT) || 4310;
const MAX_BODY_BYTES = 20 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });

let data = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    data = {};
  }
}

let writeQueued = false;
function persist() {
  if (writeQueued) return;
  writeQueued = true;
  setImmediate(() => {
    writeQueued = false;
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
    fs.renameSync(tmpFile, DATA_FILE);
  });
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/store') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  const keyMatch = url.pathname.match(/^\/api\/store\/([^/]+)$/);
  if (req.method === 'PUT' && keyMatch) {
    const key = decodeURIComponent(keyMatch[1]);
    let body = '';
    let tooLarge = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      try {
        data[key] = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid JSON body' }));
        return;
      }
      persist();
      res.writeHead(204);
      res.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`Eterna local sync server listening on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
