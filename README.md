# Codex Status Dashboard

Uptime status dashboard for the Codex API, hosted on Cloudflare Pages.

**Live:** https://codex-status.pages.dev

## Setup

### 1. KV namespace (already created)

KV namespace `CODEX_STATUS` exists with ID `1de1e08067c9419880e57dc1af01b28a`. It is bound in `wrangler.toml`.

### 2. Pages secrets (required)

Set these in production via wrangler:

```bash
cd codex-status
wrangler pages secret put ADMIN_API_KEY --project-name=codex-status
wrangler pages secret put MONITOR_API_KEY --project-name=codex-status
```

You will be prompted to enter each value. Generate strong random strings (e.g. `openssl rand -hex 32`).

### 3. GitHub Actions secrets

Add these to your repository (Settings > Secrets and variables > Actions):

| Secret | Value |
|--------|-------|
| `MONITOR_API_URL` | `https://codex-status.pages.dev` (or your custom domain) |
| `MONITOR_API_KEY` | Same value you set for `MONITOR_API_KEY` in Pages |

### 4. Custom domain (optional)

In Cloudflare dashboard: Workers & Pages > codex-status > Custom domains > Add custom domain > `status.codexeditor.app`

### 5. Redeploy after adding secrets

```bash
npm run build
wrangler pages deploy .svelte-kit/cloudflare --project-name=codex-status --commit-dirty=true
```

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your ADMIN_API_KEY and MONITOR_API_KEY
npm run build
wrangler pages dev .svelte-kit/cloudflare --project-name=codex-status
```

## Admin panel

Visit `/admin` to create and update incidents. Enter your `ADMIN_API_KEY` to authenticate.
