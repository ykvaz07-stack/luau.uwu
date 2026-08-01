# Self-hosting `luacrypt` from your own machine via Cloudflare Tunnel

This is the **$0/month, no credit card, no age limit** deployment path.
It uses Cloudflare Tunnel (named) to expose your locally-running
Next.js app to the internet with a real domain and SSL. **You already
have a Cloudflare account** (the one that hosts your broken Workers
deployment), so no new signup is needed.

## What this actually does

```
Roblox executor  →  your public URL (e.g. luacrypt.com)
                 →  Cloudflare edge (free SSL, DDoS protection)
                 →  encrypted tunnel to your home PC
                 →  your PC running: next start (port 3000) + cloudflared
                 →  Supabase (auth, keys, scripts)
```

**Cost:** $0
**Card required:** no
**Age restriction:** none
**Egress quota:** none (the Workers Free quota is a Workers product
limitation, not a Cloudflare-account-wide one — Tunnels are unmetered)
**Uptime:** as good as your home internet + your PC being on

## Requirements

1. **A free Cloudflare account** (you have this).
2. **A domain added to that account's DNS** (e.g. `luacrypt.com`,
   `luacrypt.dev`, or a cheap `.xyz` from Cloudflare Registrar for
   ~$10/yr — but if you don't own one yet, see "No domain?" below).
3. **A PC or server that's on 24/7** (or close to it). Laptop works
   if you rarely close the lid. A Raspberry Pi ($35) is ideal.
4. **Your home network's outbound TCP 7844 open** (Cloudflare's tunnel
   port — almost every home router allows this by default).
5. **Node.js 20+** on the host machine.

## Setup (one-time, ~30 minutes)

### 1. Install `cloudflared` on the host

```bash
# macOS
brew install cloudflared

# Ubuntu/Debian
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# Windows
winget install --id Cloudflare.cloudflared
```

Verify: `cloudflared --version`

### 2. Log in to your Cloudflare account

```bash
cloudflared tunnel login
```

This opens a browser window. Pick the domain you want to use (e.g.
`luacrypt.com`). The browser grants `cloudflared` permission to
create DNS records on that domain.

### 3. Create the tunnel

```bash
cloudflared tunnel create luacrypt
```

This outputs a `TUNNEL_ID` and saves a credentials JSON file to
`~/.cloudflared/<TUNNEL_ID>.json`. **Keep this file safe — it's
the auth token for your tunnel.**

### 4. Route your domain to the tunnel

```bash
# Add a CNAME pointing your domain to the tunnel
cloudflared tunnel route dns luacrypt luacrypt.com
# Add a wildcard (so api.luacrypt.com, dashboard.luacrypt.com, etc. all work)
cloudflared tunnel route dns luacrypt "*.luacrypt.com"
```

### 5. Write the tunnel config

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/YOUR_USER/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: luacrypt.com
    service: http://localhost:3000
  - hostname: "*.luacrypt.com"
    service: http://localhost:3000
  - service: http_status:404
```

(Windows: replace `/home/YOUR_USER/.cloudflared/` with
`C:\Users\YOUR_USER\.cloudflared\`)

### 6. Build and run the Next.js app

```bash
# In your project directory
npm ci
cd clyde && npm ci && npm run build && cd ..

# Production build
npm run build:next
npm run start
```

This runs Next.js on `localhost:3000`. The clyde obfuscator is
already built into `.next/standalone/`.

**Required env vars** (set in your shell, a `.env` file, or systemd
unit — see env table in `DEPLOY.md`):

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."
export NEXT_PUBLIC_SITE_URL="https://luacrypt.com"
export RESEND_API_KEY="re_..."  # optional, for OTP emails
export NODE_ENV="production"
```

### 7. Start the tunnel

In a separate terminal (or as a background service — see below):

```bash
cloudflared tunnel run luacrypt
```

You should see logs like:
```
INF Connection established connIndex=0 ...
INF Connection established connIndex=1 ...
INF Connection established connIndex=2 ...
INF Connection established connIndex=3 ...
```

That's it. Visit `https://luacrypt.com` in your browser. It hits
Cloudflare's edge → tunnel → your `localhost:3000`.

## Run as a background service (so it survives reboots)

### Linux (systemd)

```bash
# Copy cloudflared binary
sudo cp $(which cloudflared) /usr/local/bin/cloudflared

# Install as a systemd service (cloudflared has a built-in installer)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Check status
sudo systemctl status cloudflared
```

Then make your Next.js app auto-start too. Create
`/etc/systemd/system/luacrypt.service`:

```ini
[Unit]
Description=LuaCrypt Next.js
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/path/to/luau.uwu
EnvironmentFile=/path/to/luau.uwu/.env.production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable luacrypt
sudo systemctl start luacrypt
```

Now your site is up whenever the machine is on.

### macOS (launchd)

```bash
# Install cloudflared as a service
sudo cloudflared service install

# For Next.js, use a LaunchAgent in ~/Library/LaunchAgents/com.luacrypt.app.plist
# (or just run npm run start in a tmux session)
```

### Windows (Task Scheduler)

Use `cloudflared service install` and create a Task Scheduler entry
for `npm run start`.

## "No domain?" — the $0 workaround

If you don't own a domain, you have two options:

1. **Buy a cheap `.xyz` from Cloudflare Registrar.** They run
   promotions where `.xyz` is $1 for the first year. Total cost: $1.
2. **Use `luacrypt.workers.dev` as a Workers route + tunnel to your
   PC.** Cloudflare Workers can be set up to proxy traffic through a
   tunnel to your home machine. More setup, no domain needed.

For a real production Luarmor-clone, owning a domain is worth the
$1-10/year. Use option 1.

## What about the `exceed_egress_quota` error?

That error was from the **Cloudflare Workers** product on the Free
plan. Cloudflare Tunnels are a different product — they have no
egress cap, no request limit, no CPU limit. The `exceed_egress_quota`
restriction does not apply to traffic flowing through your tunnel.

## What about the `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` on
`luacrypt.pages.dev`?

That URL was a Pages project that was never successfully deployed
(Cloudflare's edge never finished provisioning SSL for it because the
build never completed). It's dead — ignore it. With the tunnel
setup, your real URL is your own domain (e.g. `luacrypt.com`).

## Comparison to the Workers path

| | Cloudflare Tunnel (this doc) | Cloudflare Workers (DEPLOY.md Path A/B) |
|---|---|---|
| Cost | $0 (no card) | $0 Free / $5/mo Paid |
| Egress quota | None | 10 GB/mo Free, unmetered Paid |
| Cold starts | No | No |
| Always-on | Only if your PC is on | Yes (Cloudflare's edge) |
| Uptime SLA | None (best-effort) | 99.99% on Paid plan |
| Setup time | 30 min | 5 min once build works |
| Requires | A free Cloudflare account + a domain + your PC | A Cloudflare account with payment method |
| Production-ready? | Yes (used by homelabbers running 24/7 services) | Yes |
| Best for | "$0 forever, I have a PC that stays on" | "$5/mo is fine, I want set-and-forget" |

## When to switch from tunnel to Workers Paid

Switch when **any** of these is true:

- Your home internet goes down a lot, or your PC sleeps often
- You start getting enough traffic that your home upload bandwidth
  can't keep up (most home connections are 5-50 Mbps upload)
- You want a real uptime SLA
- You turn 18 and can sign up for Oracle Cloud Always Free

Until then, this is the cheapest, simplest, working-today option.
