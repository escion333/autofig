# Changelog

All notable changes to AutoFig will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Multi-Agent Broker** (`src/socket.ts`)
  - Directed message routing: agents include `replyTo` in commands; plugin sends responses directly to the requesting agent's private channel via `type:"directed"`
  - Agent registry: `agent:register` / `agent:disconnected` lifecycle messages broadcast on `figma-bridge` channel; `/status` endpoint reports active agents
  - Write-lock coordination: `lock:acquire` / `lock:release` / `lock:denied` messages for both node-level (`lockType:"node"`) and document-level (`lockType:"doc"`) locks
  - Lock expiry sweep every 5 s with per-lock TTL
  - `PORT` env var support (`Number(process.env.PORT) || 3055`) for running isolated test brokers

- **Integration Test Suite** (`src/test/multi-agent-integration.test.ts`, `bun:test`)
  - 6 tests: directed routing, legacy single-agent compat, lock acquire/deny/release cycle, doc lock blocking node locks, disconnect releases locks, agent registry in `/status`
  - Spawns a real broker subprocess on port 13055; run with `bun run test:integration`

- **New MCP Tools** (120 total, up from 101)
  - `update_node` — patch any node property via JSON merge object
  - `rename_variable`, `set_variable_description`
  - `create_multiple_variables`, `set_multiple_variable_values`, `bind_multiple_variables`
  - `rename_node`, `rename_multiple_nodes`
  - `scan_nodes_by_types`
  - `create_component_set`, `create_multiple_component_instances`
  - `get_component_properties`, `add_component_property`, `edit_component_property`, `delete_component_property`
  - `set_component_property_references`, `set_multiple_component_property_references`, `set_component_property_value`
  - `VARIABLE_ALIAS` value type in `set_variable_value` and `set_multiple_variable_values`

- **MCP server auto-restart** on file changes during development
- **WebSocket keepalive** — `ws.ping()` every 30 s to prevent silent TCP connection drops

### Fixed

- `move_to_front` / `move_forward` off-by-one: Figma's `insertChild(i)` inserts *before* index `i`; corrected to `insertChild(length)` and `insertChild(currentIndex + 2)` respectively
- `apply_text_style`, `get_text_styles`, `apply_effect_style`, `apply_grid_style`, `delete_effect_style`, `delete_grid_style` — all migrated to async Figma style APIs
- `set_layout_sizing` — now works on TEXT children of auto-layout frames
- `resize_node`, `set_corner_radius` — no longer fail on nodes inside component variants (`provideVisualFeedback` now accepts `{ skipSelection: true }`)
- `bind_variable` on `fills` / `strokes` — uses `figma.variables.setBoundVariableForPaint()` at the paint level; auto-creates a default solid fill on VECTOR nodes with empty paints array
- `scan_nodes_by_types` — fixed param name mismatch (`nodeId` → `parentNodeId`)
- Broker disconnect handler now releases locks held by agents that used `lock:acquire` without `agent:register`
- `lineHeight` Zod schema in `create_text_style` and `set_text_properties` — uses `z.preprocess()` to handle string-encoded numbers from MCP transport

---

## [0.4.0] - 2024-12-06

### 🎉 Major Connection Improvements

This release completely redesigns the connection workflow to make AutoFig simpler, faster, and more reliable.

### Added

- **Unified Development Server** (`bun dev`)
  - Auto-restart on crashes (up to 5 attempts with exponential backoff)
  - Colored, formatted output with clear instructions
  - Better error handling and process management
  - Graceful shutdown on SIGINT/SIGTERM

- **Health Check Endpoints**
  - `GET /health` - Simple health check returning `{"status": "ok"}`
  - `GET /status` - Detailed server status including active channels and clients

- **Auto-Connection**
  - Plugin now automatically connects to server on startup
  - Health check before connection attempt
  - Helpful error messages if server isn't available

- **Connection Diagnostics** (`bun connect`)
  - Comprehensive diagnostic tool to check:
    - WebSocket server status
    - Cursor MCP configuration
    - Active channels and clients
  - Actionable fixes for common issues

- **Documentation**
  - `QUICK_START.md` - Complete walkthrough for new users
  - `docs/MIGRATION_GUIDE.md` - Upgrade guide for existing users
  - `docs/SETUP_GUIDE_FOR_AI_AGENTS.md` - Detailed technical documentation

### Changed

- **Simplified Workflow**
  - Reduced from 7+ manual steps to 3 simple steps
  - Connection time reduced from ~2 minutes to ~30 seconds
  - No more manual channel management

- **Package Scripts**
  - `bun dev` - New recommended way to start the development server
  - `bun connect` - New diagnostic tool
  - `bun socket` - Still available for legacy/minimal setup
  - Renamed `dev` → `dev:server` and `build:watch` for clarity

- **Plugin UI**
  - Auto-connects on startup if server is available
  - Shows specific error messages with solutions
  - Better visual feedback during connection process

- **README.md**
  - Simplified "Get Started" section
  - Added link to `QUICK_START.md`
  - Clearer daily usage instructions

### Fixed

- Server crashes no longer require manual restart
- Connection failures now provide helpful error messages
- Plugin shows clear status when server isn't running

### Technical Details

**New Files:**
- `scripts/dev.mjs` - Unified development server wrapper
- `scripts/connect.mjs` - Connection diagnostics tool
- `QUICK_START.md` - User-friendly quick start guide
- `docs/MIGRATION_GUIDE.md` - Migration instructions
- `docs/SETUP_GUIDE_FOR_AI_AGENTS.md` - Technical documentation

**Modified Files:**
- `src/socket.ts` - Added `/health` and `/status` endpoints
- `src/cursor_mcp_plugin/ui.html` - Added auto-connection logic
- `package.json` - Version bump to 0.4.0, new scripts
- `readme.md` - Simplified get started section

**Backward Compatibility:**
- ✅ All old commands still work
- ✅ Manual connection still supported
- ✅ No breaking changes to the API

### Metrics

- **Setup steps:** 7+ → 3 (-57%)
- **Connection time:** ~2 min → ~30 sec (-75%)
- **Commands to remember:** 3+ → 1 (-66%)

---

## [0.3.5] - 2024-12-06

### Completed

- ✅ **Priority 1: Stability & Reliability** (100% complete)
  - Command-specific timeout configurations
  - Exponential backoff reconnection (server + UI)
  - Stale request cleanup
  - Enhanced error messages

- ✅ **Priority 2: UX Improvements** (100% complete)
  - Visual feedback in all handlers
  - Plugin UI enhancements (history, activity indicator)
  - Enhanced tool descriptions (86/86 tools)

- ✅ **Priority 3: Feature Additions** (100% complete)
  - Page management tools (5 tools)
  - Layer reordering tools (5 tools)
  - Plugin data persistence (4 tools)
  - Batch export with progress tracking (1 tool)

- ✅ **Priority 4: Code Quality** (100% complete)
  - Removed duplicate utilities
  - Improved type safety
  - Resolved TODOs
  - Expanded test coverage (50 → 123 tests, +146%)

### Added

- **New MCP Tools** (15 total)
  - `get_pages`, `create_page`, `switch_page`, `delete_page`, `rename_page`
  - `reorder_node`, `move_to_front`, `move_to_back`, `move_forward`, `move_backward`
  - `set_plugin_data`, `get_plugin_data`, `get_all_plugin_data`, `delete_plugin_data`
  - `export_multiple_nodes`

- **Test Coverage**
  - Added 73 new tests for text, styling, and layout handlers
  - Total test count: 123 (was 50)

### Changed

- Tool count: 86 → 101 (+17% growth)
- All tool descriptions enhanced with examples and related tools
- Improved error messages with contextual tips

---

## [0.3.0] - 2024-12

### Added

- Variables API (9 tools)
- Component creation & properties (10 tools)
- Typography system (6 tools)
- Paint styles (6 tools)
- Effect styles (9 tools)
- Grid styles (5 tools)
- Constraints (2 tools)
- TypeScript migration of plugin
- Test suite for Variables & Components (50 tests)

---

## Earlier Versions

See commit history for changes before v0.3.0.

---

## Upgrade Instructions

### From 0.3.5 to 0.4.0

No breaking changes! Simply:

```bash
git pull
bun install
bun run build
```

Then start using the new workflow:

```bash
bun dev  # Instead of bun socket
```

See [MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) for details.

---

## Links

- [GitHub Repository](https://github.com/escion333/autofig)
- [Quick Start Guide](./QUICK_START.md)
- [Migration Guide](./docs/MIGRATION_GUIDE.md)
- [Contributing Guide](./CONTRIBUTING.md)



