#!/usr/bin/env node
/**
 * DialZero — Vercel Upload & Deploy
 * Called by deploy.sh — do not run directly.
 * Deploys all files in the same folder as this script.
 */

const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const crypto = require('crypto');

const TOKEN        = process.env.VERCEL_TOKEN;
const PROJECT_NAME = 'dialzero-landing';
const API          = 'https://api.vercel.com';
const ROOT         = __dirname;
const SKIP         = new Set(['deploy.js', '.DS_Store', 'Thumbs.db']);

const ok   = (msg)       => console.log(`  ✓ ${msg}`);
const fail = (msg, data) => {
  console.error(`\n  ✗ ${msg}`);
  if (data) console.error(JSON.stringify(data, null, 2));
  process.exit(1);
};

function sha1(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

function collectFiles(dir, base) {
  if (!base) base = dir;
  const results = [];
  for (const entry of fs.readdirSync(dir)) {
    if (SKIP.has(entry) || entry.startsWith('.')) continue;
    const abs  = path.join(dir, entry);
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      results.push(...collectFiles(abs, base));
    } else {
      const buffer  = fs.readFileSync(abs);
      const relPath = path.relative(base, abs).split(path.sep).join('/');
      results.push({ relPath, buffer, sha: sha1(buffer), size: stat.size });
    }
  }
  return results;
}

function request(method, urlStr, headers, body) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const opts = {
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers:  { Authorization: `Bearer ${TOKEN}`, ...headers },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch (_) { json = { raw: text }; }
        resolve({ status: res.statusCode, ok: res.statusCode < 300, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function vGet(p)       { return request('GET',  `${API}${p}`, {}); }
function vPost(p, obj) {
  const body = JSON.stringify(obj);
  return request('POST', `${API}${p}`, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }, body);
}

async function uploadFile(file) {
  const { status, json } = await request('POST', `${API}/v2/files`, {
    'Content-Type':    'application/octet-stream',
    'x-vercel-digest': file.sha,
    'Content-Length':  file.size,
  }, file.buffer);
  if (status !== 200 && status !== 409) fail(`Upload failed: ${file.relPath} (HTTP ${status})`, json);
}

async function poll(id) {
  const start = Date.now();
  process.stdout.write('  Waiting for deployment ');
  while (Date.now() - start < 120000) {
    await new Promise(r => setTimeout(r, 3000));
    process.stdout.write('.');
    const { json } = await vGet(`/v13/deployments/${id}`);
    const state = json.readyState || json.status;
    if (state === 'READY') { process.stdout.write(' ready!\n'); return json.url; }
    if (state === 'ERROR') { process.stdout.write('\n'); fail('Deployment errored', json); }
  }
  fail('Timed out — check vercel.com/dashboard');
}

async function main() {
  if (!TOKEN) fail('VERCEL_TOKEN not set');

  // Auth
  const { ok: authOk, json: user } = await vGet('/v2/user');
  if (!authOk) fail('Invalid token', user);
  ok(`Authenticated as ${(user.user || {}).email || 'verified'}`);

  // Collect
  const files   = collectFiles(ROOT);
  const totalKB = (files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(1);
  ok(`${files.length} files · ${totalKB} KB`);

  // Upload
  for (const file of files) {
    process.stdout.write(`  ↑ ${file.relPath} `);
    await uploadFile(file);
    process.stdout.write('✓\n');
  }

  // Create deployment
  const { ok: depOk, json: dep } = await vPost('/v13/deployments', {
    name:   PROJECT_NAME,
    target: 'production',
    files:  files.map(f => ({ file: f.relPath, sha: f.sha, size: f.size })),
    projectSettings: { framework: null },
  });
  if (!depOk) fail('Failed to create deployment', dep);
  ok(`Deployment created (${dep.id})`);

  // Poll
  const liveUrl = await poll(dep.id);

  console.log('');
  console.log(`  ┌──────────────────────────────────────────┐`);
  console.log(`  │  🚀  https://${liveUrl.padEnd(28)} │`);
  console.log(`  └──────────────────────────────────────────┘`);
  console.log('');
}

main().catch(err => { console.error('\n  ✗', err.message); process.exit(1); });
