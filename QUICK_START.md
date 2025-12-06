# AutoFig Quick Start Guide

Get AutoFig running in 3 minutes! 🚀

## Prerequisites

- [Bun](https://bun.sh) installed
- [Figma Desktop App](https://www.figma.com/downloads/) or Figma in browser
- [Cursor IDE](https://cursor.sh)

## One-Time Setup (5 minutes)

### 1. Install AutoFig

```bash
# Clone and install dependencies
git clone https://github.com/escion333/autofig.git
cd autofig
bun install
```

### 2. Configure Cursor MCP

```bash
# This adds AutoFig to your Cursor MCP configuration
bun setup
```

This creates/updates `~/.cursor/mcp.json` with:

```json
{
  "mcpServers": {
    "AutoFig": {
      "command": "bunx",
      "args": ["autofig@latest"]
    }
  }
}
```

### 3. Install Figma Plugin

1. Open Figma Desktop App
2. Go to: **Plugins → Development → Import plugin from manifest**
3. Navigate to: `autofig/src/cursor_mcp_plugin/manifest.json`
4. Click **Open**

✅ Setup complete! You only need to do this once.

---

## Daily Usage (30 seconds)

Every time you want to use AutoFig:

### Step 1: Start the WebSocket Server

Open a terminal in the `autofig` directory:

```bash
bun dev
```

You should see:

```
═══════════════════════════════════════════════════════
  Starting AutoFig Development Server
═══════════════════════════════════════════════════════

📡 WebSocket Server: ws://localhost:3055
🔌 Status: Starting...

Waiting for Figma plugin to connect...
```

**Keep this terminal open!** ⚠️

### Step 2: Connect Figma Plugin

1. Open Figma
2. Open your design file
3. Go to: **Plugins → Development → AutoFig**
4. The plugin will **auto-connect** to the server ✨

You should see:
- Green "Connected" status in the plugin
- A channel name displayed (e.g., `abc123de`)

### Step 3: Use in Cursor

1. Open Cursor IDE
2. Ask the AI to interact with your Figma design!

Example prompts:
- "What's in my current Figma selection?"
- "Create a blue rectangle at 100,100"
- "Change all text that says 'Hello' to 'Welcome'"

---

## Troubleshooting

### 🔍 Check Connection Status

Run this to diagnose issues:

```bash
bun connect
```

This shows:
- ✅ WebSocket server status
- ✅ Cursor MCP configuration
- ✅ Active connections
- 💡 What to fix if something's wrong

### Common Issues

#### ❌ "Server not running"

**Solution:** Start the server:
```bash
bun dev
```

#### ❌ "Plugin won't connect"

**Check:**
1. Is the server running? (`bun dev`)
2. Is the port correct? (should be 3055)
3. Try clicking "Connect" manually in the plugin

#### ❌ "Cursor doesn't see AutoFig tools"

**Solutions:**
1. Restart Cursor after running `bun setup`
2. Check `~/.cursor/mcp.json` exists and has AutoFig config
3. Look for MCP errors in Cursor's console

#### ❌ "No channel name showing"

**This means:** Plugin connected to server, but not joined to a channel

**Solution:** 
1. Disconnect and reconnect in the plugin
2. Check the WebSocket server terminal for errors

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `bun dev` | Start WebSocket server (required for operation) |
| `bun connect` | Check connection status and diagnose issues |
| `bun setup` | Configure Cursor MCP (one-time) |
| `bun test` | Run tests |
| `bun build` | Build plugin and MCP server |

---

## Understanding the Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Cursor    │ ◄─MCP──►│  WebSocket   │◄─WS────►│   Figma     │
│   (AI)      │         │   Server     │         │   Plugin    │
└─────────────┘         └──────────────┘         └─────────────┘
                         (bun dev)               (AutoFig)
                         Port 3055
```

1. **Cursor** uses MCP to send commands
2. **WebSocket Server** relays messages between Cursor and Figma
3. **Figma Plugin** executes commands and sends results back

All three must be running simultaneously!

---

## Development Workflow

### Option A: Quick Development (Recommended)

```bash
# Terminal 1: Start WebSocket server with auto-restart
bun dev

# Figma: Run AutoFig plugin (auto-connects)

# Cursor: Start coding!
```

### Option B: With Auto-Rebuild

```bash
# Terminal 1: WebSocket server
bun dev

# Terminal 2: Auto-rebuild plugin on changes
bun run dev:plugin

# Terminal 3: Auto-rebuild MCP server on changes
bun run dev:server
```

---

## Next Steps

- 📖 Read the full [README.md](./readme.md) for detailed documentation
- 🛠️ See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- 📋 Check [TODO.md](./TODO.md) for planned features
- 🧪 Run tests with `bun test`

---

## Getting Help

- **Documentation:** [docs/SETUP_GUIDE_FOR_AI_AGENTS.md](./docs/SETUP_GUIDE_FOR_AI_AGENTS.md)
- **Issues:** [GitHub Issues](https://github.com/escion333/autofig/issues)
- **Status Check:** `bun connect`

---

## Tips for Success

1. ✅ **Always start the server first** (`bun dev`)
2. ✅ **Keep the terminal open** while working
3. ✅ **Check auto-connection** - the plugin should connect automatically
4. ✅ **Use `bun connect`** if something feels wrong
5. ✅ **Restart Cursor** after first-time MCP setup

Happy designing! 🎨✨


