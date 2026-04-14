/**
 * Loop Workout — HR Relay Server
 * Runs on your Mac. Receives heart rate from iPhone Shortcut,
 * serves it to the workout app on any device on the same WiFi.
 *
 * Usage:
 *   node server.js
 *
 * Then paste the Network URL shown below into the workout app config.
 */

const http = require('http');
const os   = require('os');

let latest = null;   // { bpm: number, ts: number }

const server = http.createServer((req, res) => {
  // CORS — allow the workout app to call from any origin
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // POST /hr  — iPhone Shortcut pushes { "bpm": 142 }
  if (req.method === 'POST' && req.url === '/hr') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        latest = { bpm: Number(data.bpm), ts: Date.now() };
        console.log(`♥  ${latest.bpm} bpm`);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'invalid json' }));
      }
    });
    return;
  }

  // GET /hr  — workout app polls for latest reading
  if (req.method === 'GET' && req.url === '/hr') {
    // Mark stale if older than 15 seconds
    const stale = latest && (Date.now() - latest.ts > 15000);
    res.writeHead(200);
    res.end(JSON.stringify(stale ? { bpm: null } : (latest || { bpm: null })));
    return;
  }

  res.writeHead(404);
  res.end('{}');
});

const PORT = 3000;
server.listen(PORT, () => {
  // Find local network IP
  let ip = 'localhost';
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
  }

  console.log('\n✅  HR relay running\n');
  console.log(`   Local (Mac browser):  http://localhost:${PORT}/hr`);
  console.log(`   Network (TV + phone): http://${ip}:${PORT}/hr`);
  console.log('\n   ── Paste the Network URL into the workout app ──');
  console.log('   ── Use the same Network URL in your iPhone Shortcut ──\n');
  console.log('   Waiting for heart rate data...\n');
});
