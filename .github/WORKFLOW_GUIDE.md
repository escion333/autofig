# AutoFig Workflow Guide

## Visual Guide to the New Connection Workflow

### The Old Way (v0.3.5) 😓

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Start WebSocket Server                             │
│  Terminal: bun socket                                       │
│  Output: "WebSocket server running on port 3055"           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Open Figma                                         │
│  Launch Figma Desktop or Web                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Run Plugin                                         │
│  Figma → Plugins → Development → AutoFig                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Configure Port                                     │
│  Enter: 3055                                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Click Connect                                      │
│  Manually click the "Connect" button                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Copy Channel Name                                  │
│  Channel: "abc123de" (randomly generated)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 7: Use in Cursor... somehow?                          │
│  (Unclear what to do with the channel)                      │
└─────────────────────────────────────────────────────────────┘

Problems:
❌ Too many manual steps
❌ No feedback if server isn't running
❌ Confusing channel management
❌ No way to diagnose issues
❌ Server crashes require manual restart
```

---

### The New Way (v0.4.0) 🎉

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Start Development Server                           │
│  Terminal: bun dev                                          │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│    Starting AutoFig Development Server                     │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  📡 WebSocket Server: ws://localhost:3055                   │
│  🔌 Status: Starting...                                     │
│                                                             │
│  1️⃣  WebSocket server is starting...                        │
│  2️⃣  Open Figma and load the AutoFig plugin                 │
│  3️⃣  The plugin will auto-connect                           │
│  4️⃣  Use Cursor with AutoFig MCP tools                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Open Plugin in Figma                               │
│  Figma → Plugins → Development → AutoFig                    │
│                                                             │
│  ✨ Plugin automatically:                                    │
│     1. Checks server health                                │
│     2. Connects to server                                  │
│     3. Shows connection status                             │
│                                                             │
│  ✅ Connected! Channel: abc123de                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Use Cursor AI                                      │
│                                                             │
│  Ask anything:                                              │
│  • "What's selected in Figma?"                              │
│  • "Create a blue rectangle"                                │
│  • "Change all text to 'Welcome'"                           │
│                                                             │
│  🎨 Changes happen in real-time!                            │
└─────────────────────────────────────────────────────────────┘

Benefits:
✅ 3 simple steps (down from 7+)
✅ Auto-connection with health checks
✅ Automatic channel management
✅ Built-in diagnostics (bun connect)
✅ Auto-restart on crashes
✅ Clear, helpful feedback
```

---

## Troubleshooting Workflow

### If Something Goes Wrong

```
┌─────────────────────────────────────────────────────────────┐
│  Run Diagnostics                                            │
│  Terminal: bun connect                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  View Diagnostic Report                                     │
│                                                             │
│  1️⃣  WebSocket Server                                        │
│     ✅ Running / ❌ Not running                              │
│                                                             │
│  2️⃣  Cursor MCP                                              │
│     ✅ Configured / ❌ Not configured                         │
│                                                             │
│  3️⃣  Connection Details                                      │
│     Active channels: 2                                      │
│     Connected clients: 3                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Follow Suggested Fixes                                     │
│                                                             │
│  ❌ Server not running?                                      │
│     → bun dev                                               │
│                                                             │
│  ❌ MCP not configured?                                      │
│     → bun setup                                             │
│                                                             │
│  ❌ Plugin won't connect?                                    │
│     → Check server is running                               │
│     → Click "Connect" manually                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Your Workflow                          │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐           ┌─────────────────┐
│   Cursor IDE    │           │  Figma Desktop  │
│   (with AI)     │           │   or Web        │
└────────┬────────┘           └────────┬────────┘
         │                             │
         │ MCP Protocol                │ Plugin API
         │                             │
         ↓                             ↓
┌─────────────────────────────────────────────────┐
│          WebSocket Server (Port 3055)           │
│                                                 │
│  Features:                                      │
│  • Message routing between Cursor & Figma      │
│  • Channel management                          │
│  • Health checks (GET /health)                 │
│  • Status monitoring (GET /status)             │
│  • Auto-restart on crashes                     │
└─────────────────────────────────────────────────┘
         ↑
         │
    bun dev
```

---

## Quick Command Reference

### Daily Commands

```bash
# Start everything
bun dev              # Starts WebSocket server with auto-restart
                     # Keep this running in a terminal

# Check status
bun connect          # Diagnose connection issues
                     # Run this if something isn't working
```

### One-Time Setup

```bash
# Initial setup
bun install          # Install dependencies
bun setup            # Configure Cursor MCP
bun run build        # Build plugin (if developing)
```

### Development

```bash
# Build and test
bun run build        # Build plugin + MCP server
bun test             # Run test suite

# Watch modes (for development)
bun run dev:plugin   # Auto-rebuild plugin on changes
bun run dev:server   # Auto-rebuild MCP server on changes
```

---

## Health Endpoints

### Check Server Health

```bash
# Quick health check
curl http://localhost:3055/health

# Response:
{
  "status": "ok",
  "timestamp": "2024-12-06T..."
}
```

### Get Server Status

```bash
# Detailed status
curl http://localhost:3055/status

# Response:
{
  "status": "running",
  "port": 3055,
  "channels": 2,
  "totalClients": 3,
  "channelDetails": [
    { "name": "abc123de", "clients": 2 },
    { "name": "xyz789gh", "clients": 1 }
  ]
}
```

---

## Migration from v0.3.5

### What You Need to Know

1. **No breaking changes** - Old workflow still works
2. **New commands** - `bun dev` and `bun connect` added
3. **Auto-connection** - Plugin connects automatically now
4. **Better errors** - More helpful troubleshooting messages

### Upgrade Steps

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies
bun install

# 3. Rebuild
bun run build

# 4. Try the new workflow!
bun dev  # Instead of bun socket
```

See [MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md) for details.

---

## Tips for Success

### ✅ Do This

- Keep `bun dev` terminal open while working
- Use `bun connect` to diagnose issues
- Check server status before opening plugin
- Read error messages - they have helpful tips

### ❌ Avoid This

- Don't close the server terminal mid-session
- Don't forget to start the server first
- Don't ignore error messages
- Don't use `bun socket` for new workflows (legacy)

---

## Common Scenarios

### Scenario 1: Fresh Start (Daily)

```bash
# Morning workflow
cd autofig
bun dev              # Start server (keep open)

# In Figma
Plugins → AutoFig    # Opens and auto-connects ✨

# In Cursor
# Just start asking the AI!
```

### Scenario 2: Server Crashed

```bash
# Don't worry! It auto-restarts
# Watch the terminal:
⚠️  Server crashed with code 1. Restarting... (1/5)

# If it keeps crashing:
bun connect          # Check what's wrong
```

### Scenario 3: Plugin Won't Connect

```bash
# 1. Check server
bun connect

# 2. If server not running:
bun dev

# 3. If server running but plugin won't connect:
# Manually click "Connect" in plugin

# 4. Still not working?
# Check plugin shows port 3055
# Restart Cursor
```

### Scenario 4: Cursor Can't Find MCP

```bash
# 1. Ensure MCP is set up
bun setup

# 2. Check config file exists
cat ~/.cursor/mcp.json

# 3. Restart Cursor
# 4. Try `bun connect` to verify
```

---

## More Resources

- 📖 [Quick Start Guide](../QUICK_START.md)
- 📖 [Full README](../readme.md)
- 📖 [Migration Guide](../docs/MIGRATION_GUIDE.md)
- 📖 [Connection Improvements](../CONNECTION_IMPROVEMENTS.md)
- 📖 [Changelog](../CHANGELOG.md)

---

*Last updated: December 6, 2024 - v0.4.0*


