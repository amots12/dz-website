# DialZero Website

Marketing website for [DialZero](https://dialzero.app) — agentic AI for facility services.

## Stack

- Pure static HTML/CSS/JS — no framework, no build step
- Hosted on **Cloudflare Pages** (deploys from `main`)
- **Sveltia CMS** at `/admin` for blog content management (GitHub backend, PKCE auth)
- Blog posts stored as JSON in `_posts/`, auto-discovered via GitHub Contents API

## Structure

```
index.html          Landing page
blog/
  index.html        Blog listing page
  post.html         Individual post template
_posts/             Blog post JSON files (managed by CMS)
admin/
  index.html        Sveltia CMS entry point
  config.yml        CMS configuration
assets/
  css/styles.css    Global stylesheet
  images/           Static images
  videos/           Hero video
  logos/            Logo assets
```

## Content Management

Blog posts are edited via the CMS at `/admin`. Sign in with GitHub (requires access to `amots12/dz-website`). Posts are written in Markdown and saved as JSON to `_posts/` on `main`, and appear on the blog automatically.

## Deployment

Cloudflare Pages watches `main`. Any push to `main` triggers a deploy — no build command, files are served as-is.
