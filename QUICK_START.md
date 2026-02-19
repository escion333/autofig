# AutoFig Quick Start Guide

Get AutoFig running in 3 minutes! 🚀

## Prerequisites

- [Bun](https://bun.sh) installed
- [Figma Desktop App](https://www.figma.com/downloads/) or Figma in browser
- An MCP-compatible AI client (Claude Code, Cursor, Windsurf, Cline, etc.)

## One-Time Setup (5 minutes)

### 1. Install AutoFig

```bash
# Clone and install dependencies
git clone https://github.com/escion333/autofig.git
cd autofig
bun install
```

### 2. Configure Your MCP Client

Add AutoFig to your MCP client's configuration:

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

<details>
<summary>Where is my MCP config file?</summary>

| Client | Config location |
|--------|----------------|
| Claude Code | `~/.claude/mcp.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.windsurf/mcp.json` |
| VS Code (Copilot) | `.vscode/mcp.json` in your project |

</details>

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

### Step 3: Use Your AI Editor

1. Open your MCP-compatible AI client
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
- ✅ MCP client configuration
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

#### ❌ "AI client doesn't see AutoFig tools"

**Solutions:**
1. Restart your AI editor after configuring MCP
2. Verify your MCP config file has the AutoFig entry
3. Check for MCP errors in your editor's console/logs

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
| `bun setup` | Configure MCP for Cursor (one-time) |
| `bun test` | Run tests |
| `bun build` | Build plugin and MCP server |

---

## Understanding the Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  AI Editor  │ ◄─MCP──►│  WebSocket   │◄─WS────►│   Figma     │
│  (MCP)      │         │   Server     │         │   Plugin    │
└─────────────┘         └──────────────┘         └─────────────┘
                         (bun dev)               (AutoFig)
                         Port 3055
```

1. **AI Editor** uses MCP to send commands
2. **WebSocket Server** relays messages between the AI and Figma
3. **Figma Plugin** executes commands and sends results back

All three must be running simultaneously!

---

## Development Workflow

### Option A: Quick Development (Recommended)

```bash
# Terminal 1: Start WebSocket server with auto-restart
bun dev

# Figma: Run AutoFig plugin (auto-connects)

# AI Editor: Start designing!
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
- 📋 Read [PRD.md](./PRD.md) for planned features and requirements
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
5. ✅ **Restart your AI editor** after first-time MCP setup

Happy designing! 🎨✨



