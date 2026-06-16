DialZero — Project State Summary (for future agents)
What this is
DialZero is a B2B SaaS landing page for an agentic AI platform targeting facility services (hotels, stadiums, retail). Static HTML — no framework, no build step.

Live infrastructure
Layer	Details
Live site	Vercel — deployed via Vercel REST API
GitHub repo	amots12/dz-website, main branch
Cloudflare Pages	Also connected to the GitHub repo — auto-builds on every push to any branch. This is what caused errors on the (now deleted) CMS branch.
Local build dir	/Users/amotsyanai/Downloads/dialzero-build
Deploy pipeline
The command deploy-dialzero in ~/.zshrc does the following in one shot:

Requires a Google Stitch ZIP at ~/Downloads/dialzero-landing-page.zip
Archives the previous ZIP with a timestamp
Extracts code.html from the ZIP → writes as index.html
Replaces Google CDN image URLs (positions 1–3) with local paths: assets/images/omri.jpg, alex.jpg, amots.jpg
Copies those three team photos from the previous archive ZIP
Copies deploy.js from ~/.dialzero-deploy.js
Runs node deploy.js which uploads all files to Vercel via REST API
Critical: deploy-dialzero does rm -rf on the build dir and rebuilds it from scratch each time. Any files not sourced from the ZIP (like CMS files) will be wiped on the next deploy unless the pipeline is updated to preserve or re-inject them.

GitHub is pushed separately and manually — deploy-dialzero does not run git push.

Current state of main
Clean landing page only. Two commits:

57566f8 — eyebrow label fix ("The Invisible Cost")
276fd14 — initial deployment
Files in repo:


index.html          ← full landing page HTML (~362 lines), hardcoded content
deploy.js           ← Vercel deploy script (do not run directly)
_headers            ← Cloudflare Pages header config (no effect on Vercel)
.gitignore          ← .DS_Store, Thumbs.db
hero.mp4            ← hero background video
assets/images/
  omri.jpg, alex.jpg, amots.jpg   ← team headshots
  cms/              ← empty folder (created for CMS, not yet used)
No admin/ folder. No _data/ folder. No hydration script. No CMS anything.

What was built and abandoned (Decap CMS)
A feature/decap-cms branch was created, tested locally, then deleted (both local and remote) because:

OAuth proxy not ready — Decap CMS requires a server-side OAuth proxy to authenticate against GitHub. The base_url in admin/config.yml was a placeholder (https://YOUR-OAUTH-PROXY-DOMAIN) — never filled in.
Cloudflare Pages build errors — the branch triggered Cloudflare auto-builds which were failing.
The branch is gone. Nothing from it reached main.

What was designed (to be rebuilt when ready)
Three new files were to be added to the repo on a feature branch:

admin/index.html — Decap CMS CDN loader:


<!doctype html><html>
<head>
  <meta charset="utf-8" />
  <meta name="robots" content="noindex, nofollow" />
  <title>DialZero CMS</title>
  <link href="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.css" rel="stylesheet" />
</head>
<body>
  <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
</body>
</html>
admin/config.yml — full content model targeting _data/content.json, with publish_mode: editorial_workflow (saves create draft PRs, nothing reaches main without approval). See content model below.

_data/content.json — runtime content file. All editable copy lives here. Page loads it via fetch() at runtime and hydrates the DOM via inline JS (XSS-safe textContent, with a tn() helper that converts \n → <br> for the h1). Falls back silently to hardcoded HTML if fetch fails.

Hydration script — added inline before </body> in index.html. Fetches /_data/content.json and maps each field to a DOM selector.

Three security layers (designed, not yet implemented)
Layer	What it does	Status
Cloudflare Zero Trust	Wraps /admin — email OTP challenge before page loads	Not configured
GitHub OAuth	Decap login gate — only GitHub repo collaborators can log in	Blocked: OAuth proxy not deployed
Branch protection on main	Saves create draft PRs; require 1 approval to merge	Not configured
What's needed to resume CMS work
Deploy an OAuth proxy — open-source options:

Cloudflare Worker: decap-proxy — wrangler deploy, then set OAUTH_CLIENT_ID + OAUTH_CLIENT_SECRET secrets
Node service on Railway/Render: netlify-cms-github-oauth-provider
Create a GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps):

Homepage URL: https://yourdomain.com
Callback URL: https://YOUR-PROXY-DOMAIN/callback
Update admin/config.yml — replace base_url: https://YOUR-OAUTH-PROXY-DOMAIN with the real proxy URL

Set GitHub branch protection on main — require PR + 1 approval, no bypass

Configure Cloudflare Zero Trust on yourdomain.com/admin — email OTP, free ≤50 users

Update deploy-dialzero — the function does rm -rf on the build dir on each run. When the CMS files (admin/, _data/) are added, the pipeline needs to be updated to preserve or re-inject them after extraction, otherwise they get wiped on the next Stitch ZIP deploy.

Content model (what the CMS would edit)
_data/content.json structure:

meta — site name, meta description
hero — eyebrow, h1 (multiline → <br>), subheadline, two CTA button labels
problem — eyebrow, h2, body, 3 stat cards (number + description)
platform — eyebrow, h2, subtitle, 3 agent cards (title, body, link label)
investor — eyebrow, h2, body, 3 stats (number, title, description)
team — eyebrow, h2, 3 members (name, title, bio, photo via image widget)
cta — h2, button label, support text, email address
footer — company description, copyright line
Team photo uploads go to assets/images/cms/ (separate from the hardcoded omri.jpg, alex.jpg, amots.jpg).