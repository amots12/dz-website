# DialZero Website

Marketing website for [DialZero](https://dialzero.app): agentic AI for facility services.

## Stack

- Static HTML/CSS/JS. No framework and no build step.
- Hosted on **Cloudflare Pages**, which deploys from `main`.
- **Sveltia CMS** at `/admin` manages blog content. It uses the GitHub backend, and editors log in through a GitHub OAuth proxy Worker (see below).
- Blog posts are JSON files in `_posts/`. A generated manifest, `_posts/index.json`, lists them for the blog pages.

## Structure

```
index.html                  Landing page (shows the 3 latest posts)
blog/
  index.html                Blog listing page
  post.html                 Single post page (?slug=<post-file-name>)
_posts/
  YYYY-MM-DD-<slug>.json    One file per post (managed by the CMS)
  index.json                Generated manifest. Do not edit by hand.
admin/
  index.html                Sveltia CMS entry point
  config.yml                CMS configuration
assets/
  css/styles.css            Global stylesheet
  js/nav.js                 Mobile hamburger nav
  images/                   Team photos; blog uploads go in images/blog/
  videos/hero.mp4           Hero video
  logos/                    Logo assets
scripts/build-index.js      Regenerates _posts/index.json
migrate-posts.js            One-time Webflow CSV-to-JSON import (already run)
_headers                    Cloudflare security and cache headers
```

## Content management

1. Go to `https://dialzero.app/admin` and log in with GitHub. You need write access to `amots12/dz-website`.
2. Create or edit a post. With the editorial workflow, drafts are kept on a branch until you publish.
3. Publishing merges the post into `main`. A GitHub Action rebuilds `_posts/index.json`, and Cloudflare redeploys. The post goes live within a minute or two.

Post fields: `title`, `date`, `author`, `cover_image`, `excerpt`, `body` (Markdown or HTML).

## Blog index

The homepage and the blog listing read `_posts/index.json`. It holds each post's slug, title, date, author, cover image and excerpt, newest first. The GitHub Action in `.github/workflows/build-index.yml` regenerates it whenever a post changes on `main`. To rebuild it locally:

```
node scripts/build-index.js
```

## CMS login (OAuth proxy)

GitHub OAuth needs a server-side secret, so CMS login goes through a small Cloudflare Worker, `dz-oauth-worker` at `https://dz-oauth-worker.amotsy.workers.dev`. Its URL is set as `base_url` in `admin/config.yml`. The Worker holds the GitHub OAuth app's `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` as secrets. These are stored in Cloudflare only and are never committed to any repo.

- **Source code:** [`amots12/dz-oauth-worker`](https://github.com/amots12/dz-oauth-worker), a private repo. Its README covers deploying, setting or rotating secrets, and troubleshooting.
- **If CMS login breaks:** check the Worker and the GitHub OAuth app first. See "If CMS login breaks" in the worker repo's README.

## Deployment

Cloudflare Pages watches `main`. Every push to `main` triggers a deploy. There is no build command, so files are served as they are.
