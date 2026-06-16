# DialZero CMS — Admin Guide

## Publishing a blog post

1. Go to `dialzero.app/admin`
2. Complete Cloudflare Access gate (email OTP)
3. Log in with GitHub OAuth
4. Click **Blog Posts** in the left sidebar
5. Click **New Blog Post**
6. Fill in all fields:
   - **Title** — headline of the post
   - **Date** — publication date
   - **Author** — defaults to Omri Halak
   - **Cover Image** — upload via the media browser (stored in `assets/images/blog/`)
   - **Excerpt** — 1–2 sentences shown on the blog index; keep it tight
   - **Body** — full post content in Markdown
7. Click **Save** → then **Publish**

Publishing creates a **draft Pull Request** in GitHub — it does **not** go live immediately.

## Approving a post

1. Open the PR in GitHub (`github.com/amots12/dz-website/pulls`)
2. Review the content
3. Approve and merge
4. Cloudflare Pages auto-deploys within ~60 seconds
5. The post appears at `dialzero.app/blog`

## Updating the post manifest

After merging a new post, update `_posts/index.json` to include the new slug:

```json
["2026-06-15-my-new-post", "2026-05-01-earlier-post"]
```

Slugs are in **reverse chronological order** (newest first). The blog index page reads this file to know which posts to show.

You can update `_posts/index.json` in the same PR as the new post, or in a follow-up PR.

## Setup checklist (one-time, for admins)

- [ ] Deploy OAuth Worker (`~/dz-oauth-worker/`) — see instructions below
- [ ] Create GitHub OAuth App at github.com/settings/developers
- [ ] Set `base_url` in `admin/config.yml` to the deployed Worker URL
- [ ] Enable Cloudflare Access on `dialzero.app/admin` (Zero Trust → Access)
- [ ] Enable branch protection on `main` (require PR + 1 approval)

## Deploying the OAuth Worker

The worker lives at `~/dz-oauth-worker/` — **outside this repo**.

```bash
cd ~/dz-oauth-worker
npm install -g wrangler   # if not already installed
wrangler login

# Set secrets (never hardcode these):
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET

wrangler deploy
```

The worker deploys to `https://dz-oauth.<your-account>.workers.dev`.

After deploying:
1. Update the GitHub OAuth App callback URL to `https://dz-oauth.<your-account>.workers.dev/callback`
2. Replace `https://YOUR-OAUTH-PROXY-DOMAIN` in `admin/config.yml` with the Worker URL
3. Commit and push `admin/config.yml`

## Media uploads

Cover images are uploaded through the CMS and committed to `assets/images/blog/`. They are public once merged.
