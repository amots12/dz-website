#!/usr/bin/env node
/**
 * Migrate Webflow blog posts CSV → _posts/*.json
 * Usage: node migrate-posts.js posts.csv
 */

const fs   = require('fs');
const path = require('path');

// ── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (inQ) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') { inQ = false; }
      else { field += c; }
    } else {
      if      (c === '"')                      { inQ = true; }
      else if (c === ',')                      { row.push(field); field = ''; }
      else if (c === '\n' || (c === '\r' && n === '\n')) {
        if (c === '\r') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else { field += c; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ── Encoding fix (Webflow CSV mojibake) ──────────────────────────────────────
const ENCODING = [
  // Longest/most specific patterns first
  [/Ã¢â¬â¢/g,   '’'], // '  RIGHT SINGLE QUOTATION MARK
  [/Ã¢â¬Å/g,    '“'], // "  LEFT DOUBLE QUOTATION MARK
  [/Ã¢â¬Â/g,    '”'], // "  RIGHT DOUBLE QUOTATION MARK
  [/Ã¢â¬â/g,    '—'], // —  EM DASH
  [/Ã¢â¬"/g,    '–'], // –  EN DASH
  [/Ã¢Åâ¦/g,    '✦'],
  [/Ã°Å¸âÂ /g,  '📍'],
  [/Ã°Å¸ÂÂ¡/g,  '🌟'],
  [/Ã°Å¸ÂÂ¨/g,  '🏨'],
  [/Ã°Å¸ââ°/g,  '🕐'],
  [/Ã°Å¸â/g,    ''],       // remaining emoji prefix → strip
  [/ÃÂ /g,      ' '], // NBSP
  [/ÃÂ/g,       ''],
  [/Â /g,  ' '],
  [/Â/g,        ''],
  [/Ã\s/g,      ' '],
  [/Ã/g,        ''],
];

function fixEncoding(str) {
  let s = str;
  for (const [re, rep] of ENCODING) s = s.replace(re, rep);
  return s;
}

// ── HTML cleanup ─────────────────────────────────────────────────────────────
function cleanHtml(html) {
  return html
    .replace(/ id=""/g, '')                      // strip Webflow id="" attrs
    .replace(/<(p|h[1-6]|li|blockquote)>\s*<\/\1>/g, '')  // remove empty block elements
    .replace(/<p>”<\/p>/g, '')              // remove lone closing-quote paragraphs
    .replace(/ /g, ' ')                     // NBSP → regular space
    .replace(/<strong>\s*<\/strong>/g, '')
    .replace(/<em>\s*<\/em>/g, '')
    .trim();
}

// ── Date helper ──────────────────────────────────────────────────────────────
function toDate(str) {
  if (!str) return new Date().toISOString().slice(0, 10);
  const d = new Date(str);
  return isNaN(d) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

// ── Author map ───────────────────────────────────────────────────────────────
const AUTHORS = {
  'amots-yanai':   'Amots Yanai',
  'jonathan-bush': 'Jonathan Bush',
  'idan-benishu':  'Idan Benishu',
};

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const csvArg = process.argv[2] || 'posts.csv';
  const csvPath = path.resolve(csvArg);

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: CSV file not found at ${csvPath}`);
    console.error('Usage: node migrate-posts.js posts.csv');
    process.exit(1);
  }

  const outDir = path.join(__dirname, '_posts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const headers = rows[0].map(h => h.trim());
  const col = (row, name) => (row[headers.indexOf(name)] ?? '').trim();

  let created = 0, skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5) continue;

    if (col(row, 'Archived') === 'true' || col(row, 'Draft') === 'true') {
      skipped++;
      continue;
    }

    const slug = col(row, 'Slug');
    if (!slug) continue;

    const date = toDate(col(row, 'Published On') || col(row, 'Created On'));
    const authorSlug = col(row, 'Author');

    const post = {
      title:       fixEncoding(col(row, 'Name')),
      date,
      author:      AUTHORS[authorSlug] || authorSlug || 'DialZero',
      cover_image: col(row, 'Main Image') || col(row, 'Thumbnail image') || undefined,
      excerpt:     fixEncoding(col(row, 'Post Summary')),
      body:        cleanHtml(fixEncoding(col(row, 'Post Body'))),
    };

    // Remove undefined fields
    if (!post.cover_image) delete post.cover_image;

    const filename = `${date}-${slug}.json`;
    fs.writeFileSync(path.join(outDir, filename), JSON.stringify(post, null, 2));
    console.log('✓', filename);
    created++;
  }

  console.log(`\nDone: ${created} posts created, ${skipped} drafts/archived skipped.`);
}

main();
