# Deploying `luacrypt` (scriptshield / luau.uwu)

This document explains how to deploy the app today, given the current
state of the free-hosting market in August 2026. It is intentionally
honest about the trade-offs.

## TL;DR

- The repo is wired for **Cloudflare Workers via OpenNext** (`@opennextjs/cloudflare@1.20.2`).
- The build script runs `npm run build:clyde && npx @opennextjs/cloudflare build`.
- The Cloudflare **Free** plan restricts outbound egress to ~10 GB/month
  and the previous `exceed_egress_quota` error came from that.
- The build *itself* is now fixed (the `process.hrtime` / `process.pid`
  in the compiled clyde bundle have been replaced with portable
  equivalents — see commit `26050c9`).
- You still need to set environment variables in the Cloudflare
  dashboard before the first successful deploy.

---

## Required environment variables

These are read from the code via `process.env.*`. The `NEXT_PUBLIC_*`
ones are bundled into the client; the rest must be set in the
Cloudflare Workers dashboard (or in `.dev.vars` for local dev).

| Name | Visibility | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Supabase dashboard → Project Settings → API → "Publishable key" (or legacy `anon` key) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (secret) | Supabase dashboard → Project Settings → API → `service_role`. **Never commit, never expose to client.** |
| `RESEND_API_KEY` | server only (secret) | resend.com → API Keys. Used by `/api/auth/send-code`. Optional — the OTP flow won't work without it. |
| `NEXT_PUBLIC_SITE_URL` | client + server | The public URL of the deployment (e.g. `https://project.luacrypt.workers.dev`). |
| `NEXT_PUBLIC_ADMIN_EMAIL` | client + server | Your admin email, used for the admin route guard. |

Optional dev-only toggles (do not set in production):

- `NO_SEC=1` — disables the anti-tamper / integrity check on obfuscated
  output. **Dev only.** Production builds refuse to start with this on.
- `NO_CIPHER=1` — disables the string cipher pass. Dev only.
- `DEBUG_VM=1` — emits verbose debug logging from the VM generator.
- `DUMP_RAW=1` — dumps intermediate IR during obfuscation.
- `CLYDE_PORT` — used by the standalone clyde server (not used in the
  Next.js app itself).

---

## Path A — Cloudflare Workers (current setup, what the repo is wired for)

**Cost:** $0 on the Free plan, $5/month on Workers Paid (recommended).
**Time to deploy:** ~5 minutes once the build passes.

### Steps

1. **Make sure the build passes locally first.**

   ```bash
   cd clyde && npm ci && npm run build && cd ..
   npm run build:next       # runs `next build` only, no OpenNext
   npx @opennextjs/cloudflare build
   ```

   The final command writes the deployable bundle to `.open-next/`.

2. **Connect the repo to Cloudflare.**

   - Go to https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** (not Workers) → **Connect to Git**.
   - Pick your GitHub account and the `ykvaz07-stack/luau.uwu` repo.
   - **Project name:** `luacrypt` (must match `name` in `wrangler.jsonc`).
   - **Build command:** `npm run build` (this runs `build:clyde` then `@opennextjs/cloudflare build`).
   - **Build output directory:** `.open-next` (NOT `.next` — the OpenNext adapter writes its bundle here).
   - **Root directory:** leave blank (project root).
   - **Environment variables:** add the table above in the dashboard. Mark `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` as **encrypted** secrets.
   - **Compatibility flags:** in *Settings → Functions → Compatibility flags*, set `nodejs_compat` for both production and preview.
   - **Compatibility date:** `2026-07-21` (matches `wrangler.jsonc`).

3. **If you get the `exceed_egress_quota` error again** (the one that
   blocked the previous deployment), the Free plan has run out of
   outbound Supabase traffic. Two fixes:

   - **Recommended:** upgrade to **Workers Paid** ($5/month flat via
     PayPal, no credit card required if you can fund a PayPal balance).
     Egress fees go to zero, 10M requests/month included, the cap is
     gone permanently. This is the only sustainable option for a
     Luarmor-style service.
   - **Cheap patch:** wait for the monthly reset (~1-2 weeks), then
     reduce Supabase calls (cache OTP lookups, batch project queries).
     You'll hit the cap again as users grow.

### Why Pages, not Workers?

The repo's `wrangler.jsonc` is set up for Workers (the `main` is
`.open-next/worker.js`). Cloudflare Pages runs the same bundle under
the hood, and Pages has a more generous free tier for static assets +
the same 100k req/day + 10ms CPU limits for the function side. Either
works; Pages is the more typical choice for OpenNext output.

---

## Path B — Cloudflare Workers Paid (recommended for production)

Same code, same repo, same build command. The only difference is the
Cloudflare account is on the **Paid** plan ($5/month, billed via
PayPal, no credit card required).

1. Go to https://dash.cloudflare.com → **Billing** → **Subscriptions** → **Add payment method** → **PayPal**.
2. Fund the PayPal balance (or link a bank/card — not required for free usage but needed as a backup).
3. Switch the account to the Workers Paid plan. $5/month minimum, but you get unmetered egress, 10M req/month, 30s CPU per request.
4. Deploy via the Pages → Git integration (Path A above).

The `exceed_egress_quota` error will never appear again.

---

## Path C — Other free hosts (do not recommend, listed for completeness)

I researched every free-hosting aggregator and Reddit thread in
August 2026. **No host meets all of: $0 forever + no card + no age
restriction + supports Next.js 16 + production-ready + Luarmor-tier
traffic.** Here's what exists and why each fails:

| Host | Why it doesn't work |
|---|---|
| **Vercel Hobby** | TOS explicitly prohibits commercial use. You are building a paid SaaS. |
| **Netlify** | Free tier allows commercial use, but the function execution time and build-minute limits are tight for Next.js SSR. |
| **Render Free** | Requires credit card for free web services. |
| **Koyeb** | Acquired by Mistral AI in Feb 2026; free tier closed to new signups. |
| **Fly.io** | Requires credit card preauth. |
| **Railway** | $5 one-time trial credit, then pay-as-you-go. |
| **Heroku** | Killed the free tier in Nov 2022. |
| **Oracle Cloud Always Free** | Requires credit card for ID verification; the 4 OCPU ARM tier is the best free option out there but you can't sign up at 16. |
| **AWS / GCP / Azure** | All require credit card. |
| **Alibaba Cloud** | **ToS explicitly disallows minors** (under 18). Plus card required. |
| **Leapcell** | New (Sept 2025), no long-term track record, could disappear. Only viable no-card option. |
| **Back4app Containers** | 256 MB RAM cap is too tight for the `clyde` obfuscator endpoint. |
| **SnapDeploy** | Auto-sleeps after 45 min idle, 10-30s cold starts. Not production. |
| **Glitch, Replit, Codespaces** | Sleep, not for production. |
| **VPSWala, AlaVPS, freevpshostings.com** | Sketchy. No SLA. Will boot you under real load. |

**The honest answer:** if you can fund a $5/month PayPal balance (or
ask a parent to), Cloudflare Workers Paid (Path B) is the only
reliable free-tier upgrade path. If you can't, fix the build on the
Free plan (Path A) and accept the ~10 GB egress cap as a constraint
until you can.

---

## Verifying the build locally

Before deploying, make sure the build works end-to-end on your
machine:

```bash
# 1. Install
npm ci
cd clyde && npm ci && cd ..

# 2. Build clyde (the obfuscator package)
npm run build:clyde

# 3. Build Next.js (without OpenNext wrapper)
npm run build:next

# 4. Build the OpenNext Cloudflare bundle
npx @opennextjs/cloudflare build

# 5. Inspect the output
ls -la .open-next/
# You should see: worker.js, assets/, cloudflare-node.mjs, etc.

# 6. Local dev (no Cloudflare — just Next.js)
npm run dev
```

If step 4 fails, the most common cause is the clyde bundle still
referencing Node-only APIs. Check `clyde/dist/vm/reg-vm-gen.js` for
`process.hrtime` (should be absent) and any unguarded `process.pid`
(should be wrapped in `typeof process !== "undefined" && ...`).

---

## Git state as of this commit

- Branch: `arena/019fbf1f-luau-uwu`
- HEAD on the branch matches `master` HEAD (`6b2de74`).
- The earlier arena-only commits (`ddbf300` … `26050c9`, the
  obfuscator improvements and the build fix) were merged into
  `master` via `3db0b8b` and are now on both branches.
- `26050c9` contains the actual fix for the Cloudflare build failure
  (replaces `process.hrtime` and unguarded `process.pid` in the
  clyde output with portable equivalents).
