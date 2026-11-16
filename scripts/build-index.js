#!/usr/bin/env node
/**
 * Build _posts/index.json — the blog manifest read by index.html and blog/index.html.
 * Lists every post (newest first) with the fields the blog cards need, so the
 * pages make one request instead of calling the GitHub API + one fetch per post.
 *
 * Usage: node scripts/build-index.js
 * Runs automatically via .github/workflows/build-index.yml on pushes to main.
 */

const fs   = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '_posts');
const OUT = path.join(DIR, 'index.json');

const posts = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.json') && f !== 'index.json')
  .map(f => {
    const slug = f.replace(/\.json$/, '');
    try {
      const p = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      return {
        slug,
        title:       p.title || slug,
        date:        p.date || slug.slice(0, 10),
        author:      p.author || '',
        cover_image: p.cover_image || '',
        excerpt:     p.excerpt || '',
      };
    } catch (e) {
      console.warn(`  ! skipping ${f}: ${e.message}`);
      return null;
    }
  })
  .filter(Boolean)
  .sort((a, b) => (b.date + b.slug).localeCompare(a.date + a.slug));

fs.writeFileSync(OUT, JSON.stringify(posts, null, 2) + '\n');
console.log(`  ✓ wrote ${posts.length} posts to _posts/index.json`);
