# luau.uwu Discord Bot

A Discord bot for managing luau.uwu keys, whitelisting users, and delivering scripts — all from your Discord server.

## Features

- **Key redemption** — Users can redeem their license keys
- **HWID management** — Reset HWID with cooldown protection
- **Script delivery** — View and load protected scripts
- **Whitelisting** — Grant/revoke access to users
- **Mass operations** — Whitelist entire Discord roles
- **Compensation** — Add days to keys for downtime
- **Control panel** — Interactive button-based UI

## Setup

1. Copy `.env.example` to `.env`
2. Fill in your Discord bot token, client ID, and guild ID
3. Run `npm install`
4. Run `npm start`

## Commands

### User Commands
- `/redeem <key>` — Redeem a license key
- `/resethwid` — Reset your HWID
- `/myscripts` — View your scripts
- `/status` — Check key status
- `/panel` — Open control panel

### Admin Commands
- `/whitelist <user> <project>` — Whitelist a user
- `/unwhitelist <user>` — Remove whitelist
- `/blacklist <user>` — Blacklist a user
- `/mass-whitelist <role> <project>` — Whitelist a role
- `/force-resethwid <user>` — Force reset HWID
- `/compensate <days> <project>` — Add days to keys
- `/givekey <user> <project>` — Grant a free key
- `/revokekey <user>` — Revoke a key

### Setup Commands
- `/login <api_key>` — Authenticate the bot
- `/logout` — Disconnect the bot
- `/setpanel` — Set up control panel
- `/setlogs <channel>` — Set log channel
