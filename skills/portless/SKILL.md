---
name: trulocal
description: Set up and use trulocal for named local dev server URLs (e.g. http://myapp.localhost instead of http://localhost:3000). Use when integrating trulocal into a project, configuring dev server names, setting up the local proxy, working with .localhost domains, or troubleshooting port/proxy issues.
---

# trulocal

Replace port numbers with stable, named .localhost URLs. For humans and agents.

## Why trulocal

- **Port conflicts** -- `EADDRINUSE` when two projects default to the same port
- **Memorizing ports** -- which app is on 3001 vs 8080?
- **Refreshing shows the wrong app** -- stop one server, start another on the same port, stale tab shows wrong content
- **Monorepo multiplier** -- every problem scales with each service in the repo
- **Agents test the wrong port** -- AI agents guess or hardcode the wrong port
- **Cookie/storage clashes** -- cookies on `localhost` bleed across apps; localStorage lost when ports shift
- **Hardcoded ports in config** -- CORS allowlists, OAuth redirects, `.env` files break when ports change
- **Sharing URLs with teammates** -- "what port is that on?" becomes a Slack question
- **Browser history is useless** -- `localhost:3000` history is a mix of unrelated projects

## Installation

trulocal is a global CLI tool. Do NOT add it as a project dependency (no `npm install trulocal` or `pnpm add trulocal` in a project). Do NOT use `npx`.

Install globally:

```bash
npm install -g trulocal
```

## Quick Start

```bash
# Install globally
npm install -g trulocal

# Start the proxy (once, no sudo needed)
trulocal proxy start

# Run your app (auto-starts the proxy if needed)
trulocal myapp next dev
# -> Windows: http://myapp.localhost
# -> macOS/Linux: http://myapp.localhost:1355
```

The proxy auto-starts when you run an app. You can also start it explicitly with `trulocal proxy start`.

## Integration Patterns

### package.json scripts

```json
{
  "scripts": {
    "dev": "trulocal myapp next dev"
  }
}
```

The proxy auto-starts when you run an app. Or start it explicitly: `trulocal proxy start`.

### Multi-app setups with subdomains

```bash
trulocal myapp next dev          # Windows: http://myapp.localhost | macOS/Linux: http://myapp.localhost:1355
trulocal api.myapp pnpm start    # Windows: http://api.myapp.localhost
trulocal docs.myapp next dev     # macOS/Linux: http://docs.myapp.localhost:1355
```

### Monorepos

For monorepos, you can generate a local script that ensures `trulocal` is used consistently across all apps:

```bash
trulocal init
```

This creates `scripts/trulocal.js`. You can then use it in your `package.json` scripts:

```json
{
  "scripts": {
    "dev:web:trulocal": "node scripts/trulocal.js myapp bun run dev:web"
  }
}
```

### Bypassing trulocal

Set `TRUELOCAL=0` or `TRUELOCAL=skip` to run the command directly without the proxy (legacy `PORTLESS=...` also works):

```bash
TRUELOCAL=0 pnpm dev   # Bypasses proxy, uses default port
```

## How It Works

1. `trulocal proxy start` starts an HTTP reverse proxy as a background daemon (default: port 80 on Windows, port 1355 on macOS/Linux; with `--https` on Windows, defaults to 443; configurable with `-p` / `--port` or `TRUELOCAL_PORT`). The proxy also auto-starts when you run an app.
2. `trulocal <name> <cmd>` assigns a random free port (4000-4999) via the `PORT` env var and registers the app with the proxy
3. The browser hits `http://<name>.localhost` on Windows (default 80) or `http://<name>.localhost:1355` on macOS/Linux; the proxy forwards to the app's assigned port

`.localhost` domains resolve to `127.0.0.1` natively on macOS, Linux, and Windows 10/11 -- no `/etc/hosts` editing needed.

Most frameworks (Next.js, Vite, Express, etc.) respect the `PORT` env var automatically.

### State directory

trulocal stores its state (routes, PID file, port file) in a directory that depends on the proxy port:

- **Unix (macOS/Linux), Port < 1024** (sudo required): `/tmp/trulocal`
- **Unix (macOS/Linux), Port >= 1024** (no sudo): `~/.trulocal`
- **Windows**: `%TEMP%\trulocal` or `%USERPROFILE%\.trulocal` (same logic applies)

Override with `TRUELOCAL_STATE_DIR` (or legacy `PORTLESS_STATE_DIR`).

### Environment variables

| Variable              | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| `TRUELOCAL_PORT`      | Override the default proxy port (default: 80 on Windows, 1355 on macOS/Linux) |
| `TRUELOCAL_HTTPS`     | Set to `1` to always enable HTTPS/HTTP/2                                      |
| `TRUELOCAL_STATE_DIR` | Override the state directory                                                  |
| `TRUELOCAL=0\|skip`   | Bypass the proxy, run the command directly                                    |
| `PORTLESS_*`          | Legacy env vars still supported                                               |

### HTTP/2 + HTTPS

Use `--https` for HTTP/2 multiplexing (faster page loads for dev servers with many files):

```bash
trulocal proxy start --https                  # Auto-generate certs and trust CA
trulocal proxy start --cert ./c.pem --key ./k.pem  # Use custom certs
sudo trulocal trust                           # Add CA to trust store later
```

First run generates a local CA and prompts for sudo to add it to the system trust store. After that, no prompts and no browser warnings. Set `TRUELOCAL_HTTPS=1` in `.bashrc`/`.zshrc` to make it permanent.

## CLI Reference

| Command                             | Description                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `trulocal <name> <cmd> [args...]`   | Run app at `http://<name>.localhost` (Windows default) or `:1355` on macOS/Linux |
| `trulocal list`                     | Show active routes                                                               |
| `trulocal trust`                    | Add local CA to system trust store (for HTTPS)                                   |
| `trulocal init`                     | Create a local script for monorepos                                              |
| `trulocal proxy start`              | Start the proxy as a daemon (Windows HTTP:80/HTTPS:443, macOS/Linux: 1355)       |
| `trulocal proxy start --https`      | Start with HTTP/2 + TLS (auto-generates certs)                                   |
| `trulocal proxy start -p <number>`  | Start the proxy on a custom port                                                 |
| `trulocal proxy start --foreground` | Start the proxy in foreground (for debugging)                                    |
| `trulocal proxy stop`               | Stop the proxy                                                                   |
| `trulocal --help` / `-h`            | Show help                                                                        |
| `trulocal --version` / `-v`         | Show version                                                                     |

## Troubleshooting

### Proxy not running

The proxy auto-starts when you run an app with `trulocal <name> <cmd>`. If it doesn't start (e.g. port conflict), start it manually:

```bash
trulocal proxy start
```

### Port already in use

Another process is bound to the proxy port. Either stop it first, or use a different port:

```bash
trulocal proxy start -p 8080
```

### Framework not respecting PORT

Some frameworks need explicit configuration to use the `PORT` env var. Examples:

- **Webpack Dev Server**: use `--port $PORT`
- **Custom servers**: read `process.env.PORT` and listen on it

### Permission errors

**On Unix (macOS/Linux)**: Ports below 1024 require `sudo`. The default port (1355) does not need sudo. If you want to use port 80:

```bash
sudo trulocal proxy start -p 80       # Port 80, requires sudo
trulocal proxy start                   # Port 1355, no sudo needed
trulocal proxy stop                    # Stop (use sudo if started with sudo)
```

**On Windows**: Privileged port restrictions don't apply the same way. Port 80 can typically be used without Administrator privileges.

### Browser shows certificate warning with --https

The local CA may not be trusted yet. Run:

**On Unix (macOS/Linux)**:

```bash
sudo trulocal trust
```

**On Windows**:

```bash
trulocal trust  # May prompt for Administrator access
```

This adds the trulocal local CA to your system trust store. After that, restart the browser.

### One hostname works over HTTPS but another fails

Symptom example: `https://api.myapp.localhost` works, but `https://myapp.localhost` shows "Not private".

Likely causes:

- Hostname SAN mismatch on the served certificate
- Stale proxy/cert state
- CA trust state not refreshed in browser/OS

Recommended sequence:

```bash
trulocal proxy stop
trulocal proxy start --https
openssl s_client -connect 127.0.0.1:443 -servername myapp.localhost 2>/dev/null | openssl x509 -noout -subject -ext subjectAltName
trulocal trust
```

Pass condition: SAN includes the exact failing hostname (for example `DNS:myapp.localhost`).

Implementation note: trulocal uses per-host SNI cert generation for all non-`localhost` hostnames, so this behavior/fix is general and not app-specific.

### Finding what's using a port

**On Unix (macOS/Linux)**:

```bash
lsof -ti tcp:1355
```

**On Windows**:

```bash
netstat -ano | findstr :1355
```

### Killing a process by PID

**On Unix (macOS/Linux)**:

```bash
kill <pid>
# or with sudo if needed
sudo kill <pid>
```

**On Windows**:

```bash
taskkill /PID <pid> /F
```

### Requirements

- Node.js 20+
- macOS, Linux, or Windows 10/11
- `openssl` (for `--https` cert generation; ships with macOS, most Linux distributions, and Git for Windows)
