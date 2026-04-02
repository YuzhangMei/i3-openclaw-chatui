# OpenClaw ChatUI

A custom, responsive chat interface for [OpenClaw](https://github.com/openclaw/openclaw) gateway instances deployed on intelligence3.io. Built with Lit 3 + Vite 6, designed for both desktop and mobile.

## Features

- Real-time chat via WebSocket connection to the OpenClaw gateway
- Session management with sidebar (create, switch, delete sessions)
- Overview and Logs views for monitoring
- i3 purple theme, mobile-optimized responsive layout

## Project Structure

```
src/
  main.ts             # Entry point, registers <openclaw-app>
  app.ts              # Main app component (routing, session sidebar, tab navigation)
  app-styles.css      # All styles (responsive layout, theme, components)
  gateway-client.ts   # WebSocket client for OpenClaw gateway (auth, chat, sessions)
  types.ts            # Shared TypeScript types
  uuid.ts             # UUID generation utility
  views/
    chat-view.ts      # Chat tab (messages, input, markdown rendering)
    overview-view.ts  # Overview tab (system/session info)
    logs-view.ts      # Logs tab (gateway event log)
index.html            # SPA entry point
vite.config.ts        # Vite config (base path: /chatui/)
tsconfig.json         # TypeScript config (ES2022, strict, Lit decorators)
```

## Local Development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Dev server runs at `http://localhost:5173/chatui/`. Connect by appending gateway URL and token:

```
http://localhost:5173/chatui/?gateway=wss://<host>#token=<token>
```

## Deploy to VM

SSH into the VM and run the following:

### 1. Clone and build

```bash
cd /opt/openclaw
sudo git clone https://github.com/Heycoming/i3-openclaw-chatui.git chatui
cd chatui
sudo npm install
sudo npm run build
sudo mkdir -p /opt/openclaw/chatui-dist
sudo cp -r dist/* /opt/openclaw/chatui-dist/
```

### 2. Add Caddy route

Edit the Caddyfile:

```bash
sudo nano /etc/caddy/Caddyfile
```

Insert the following block **before** the catch-all `handle {` block:

```
  handle /chatui* {
    root * /opt/openclaw/chatui-dist
    uri strip_prefix /chatui
    file_server
    try_files {path} /index.html
  }
```

### 3. Reload Caddy

```bash
sudo systemctl reload caddy
```

### 4. Access

Open in browser (replace dots in IP with dashes):

```
https://<ip-with-dashes>.nip.io/chatui/?gateway=wss://<ip-with-dashes>.nip.io#token=<your-token>
```

The gateway token can be found in `/etc/openclaw.env` on the VM (`OPENCLAW_GATEWAY_TOKEN`).

## Tech Stack

- [Lit](https://lit.dev/) 3.3 — Web Components
- [Vite](https://vitejs.dev/) 6 — Build tool
- [Marked](https://marked.js.org/) — Markdown rendering
- [DOMPurify](https://github.com/cure53/DOMPurify) — HTML sanitization
- TypeScript (strict mode, ES2022)
