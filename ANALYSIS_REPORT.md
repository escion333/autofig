# AutoFig - Current State Analysis

> **Last Updated:** December 2024  
> **Version:** 0.3.5

---

## Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐      ┌─────────┐
│  Cursor AI  │◄────►│  MCP Server  │◄────►│  WebSocket    │◄────►│  Figma  │
│   Agent     │      │  (stdio)     │      │  Server       │      │ Plugin  │
└─────────────┘      └──────────────┘      └───────────────┘      └─────────┘
```

| Component | Location | Purpose |
|-----------|----------|---------|
| MCP Server | `src/talk_to_figma_mcp/server.ts` | Exposes 70+ tools to AI agents |
| WebSocket Server | `src/socket.ts` | Relay between MCP server and Figma plugin |
| Figma Plugin | `src/figma-plugin/` | TypeScript plugin with modular handlers |
| Shared Types | `src/shared/` | Common types and utilities |

---

## Feature Coverage

### ✅ Fully Implemented (70+ tools)

| Category | Tools | Status |
|----------|-------|--------|
| Document & Selection | 7 | ✅ Complete |
| Element Creation | 8 | ✅ Complete (rectangle, frame, text, ellipse, polygon, star, line, vector) |
| Styling | 4 | ✅ Complete (fill, stroke, corner radius, opacity) |
| Layout & Organization | 9 | ✅ Complete (move, resize, delete, clone, group, ungroup, constraints) |
| Auto Layout | 5 | ✅ Complete |
| Variables API | 9 | ✅ Complete (design tokens) |
| Components | 10 | ✅ Complete (create, variants, properties, instances) |
| Typography | 6 | ✅ Complete (fonts, text styles, properties) |
| Paint Styles | 6 | ✅ Complete (create, apply, gradients) |
| Effect Styles | 9 | ✅ Complete (shadows, blurs, styles) |
| Grid Styles | 5 | ✅ Complete |
| Text Operations | 3 | ✅ Complete (set, scan, batch) |
| Annotations | 4 | ✅ Complete |
| Prototyping | 3 | ✅ Complete (reactions, connectors) |
| Export | 1 | ✅ Basic (single node) |

### 🔶 Partially Implemented

| Feature | Current State | Gap |
|---------|--------------|-----|
| Export | Single node only | Batch export needed |
| Images | Base64 import only | URL import, better handling |

### ❌ Not Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| Page Management | Medium | create, switch, delete pages |
| Layer Reordering | Medium | z-order control |
| Plugin Data | Low | Persistent metadata on nodes |
| Team Libraries | Low | Requires different API approach |

---

## Code Quality

### Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| Variables | 31 | ✅ Passing |
| Components | 19 | ✅ Passing |
| Text | 0 | ⚠️ Needs tests |
| Styling | 0 | ⚠️ Needs tests |
| Effects | 0 | ⚠️ Needs tests |

**Run tests:** `bun test`

### Technical Debt

| Issue | Location | Severity |
|-------|----------|----------|
| Hardcoded 30s timeout | server.ts | High |
| No reconnection logic | server.ts, ui.html | High |
| Unused `lastActivity` field | server.ts L66-72 | Low |
| Duplicate `rgbaToHex` | server.ts vs shared/utils | Low |
| `any` types in server | server.ts | Medium |
| TODO comment | components.ts L513 | Low |

---

## Handler Module Reference

```
src/figma-plugin/handlers/
├── index.ts          # Command dispatcher (365 lines)
├── document.ts       # Document info, selection, focus
├── creation.ts       # Create elements (shapes, frames, text)
├── styling.ts        # Fill, stroke, radius, opacity
├── layout.ts         # Move, resize, delete, clone, constraints
├── organization.ts   # Group, ungroup
├── auto-layout.ts    # Layout mode, padding, spacing
├── variables.ts      # Design tokens (9 tools)
├── components.ts     # Components & instances
├── typography.ts     # Fonts, text styles
├── paint-styles.ts   # Color styles, gradients
├── effects.ts        # Shadows, blurs, effect styles
├── grid-styles.ts    # Grid/layout styles
├── text.ts           # Text content operations
├── annotations.ts    # Figma annotations
├── prototyping.ts    # Reactions, connectors
└── export.ts         # Image export
```

---

## Quick Commands

```bash
# Development
bun install          # Install dependencies
bun run build        # Build plugin and server
bun test             # Run tests
bun socket           # Start WebSocket server

# Build outputs
dist/server.js       # MCP server (npm package)
src/cursor_mcp_plugin/code.js  # Figma plugin
```

---

## Next Steps

See **TODO.md** for prioritized improvement tasks.

**Immediate priorities:**
1. Fix WebSocket timeout handling for long operations
2. Add reconnection logic
3. Improve error messages
4. Add visual feedback (`figma.notify()`) after operations

---

*For detailed requirements, see PRD.md*  
*For contribution guidelines, see CONTRIBUTING.md*
