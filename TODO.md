# AutoFig - Development Roadmap & TODO

> **For AI Agents**: This file contains prioritized improvement tasks from the December 2024 codebase audit. Work through items by priority. Check off completed items and update status notes.

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| **MCP Tools** | 70+ |
| **Handler Modules** | 17 |
| **Test Coverage** | Variables (31), Components (19) |
| **Version** | 0.3.5 |

---

## 🔴 Priority 1: Stability & Reliability

### 1.1 WebSocket Timeout Handling

**File:** `src/talk_to_figma_mcp/server.ts`

- [ ] Implement per-command timeout configurations
- [ ] Add timeout extension for long-running operations

**Current Problem:** Hardcoded 30-second timeout causes failures for `scan_text_nodes`, `set_multiple_text_contents`, and `export_node_as_image` on large documents.

**Implementation:**
```typescript
const COMMAND_TIMEOUTS: Record<string, number> = {
  'scan_text_nodes': 120000,
  'set_multiple_text_contents': 120000,
  'export_node_as_image': 60000,
  'set_multiple_annotations': 60000,
  default: 30000,
};
```

---

### 1.2 WebSocket Reconnection Logic

**Files:** `src/talk_to_figma_mcp/server.ts`, `src/cursor_mcp_plugin/ui.html`

- [ ] Add automatic reconnection with exponential backoff (MCP server)
- [ ] Add automatic reconnection in plugin UI
- [ ] Show reconnection status to user

**Implementation:**
```typescript
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function attemptReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = Math.pow(2, reconnectAttempts) * 1000;
    setTimeout(connect, delay);
    reconnectAttempts++;
  }
}
```

---

### 1.3 Stale Request Cleanup

**File:** `src/talk_to_figma_mcp/server.ts`

- [ ] Implement periodic cleanup of stale pending requests
- [ ] Use the existing `lastActivity` field (currently unused)

**Note:** The `lastActivity` timestamp is declared in `pendingRequests` Map but never utilized.

---

### 1.4 Improve Error Messages

**Files:** All handler files in `src/figma-plugin/handlers/`

- [ ] Add context to "Node not found" errors
- [ ] Include suggestions for common issues
- [ ] Add node names to error messages when available

**Example improvement:**
```typescript
// Before
throw new Error(`Node not found: ${nodeId}`);

// After
throw new Error(
  `Node not found: ${nodeId}. ` +
  `The node may have been deleted or the ID is invalid. ` +
  `Use get_selection to get valid node IDs.`
);
```

---

## 🟡 Priority 2: UX Improvements

### 2.1 Visual Feedback in Figma

**File:** `src/figma-plugin/handlers/` (all creation/modification handlers)

- [ ] Add `figma.notify()` calls after successful operations
- [ ] Auto-select created/modified nodes
- [ ] Scroll viewport to affected nodes

**Implementation pattern:**
```typescript
// At end of create/modify operations
figma.currentPage.selection = [node];
figma.viewport.scrollAndZoomIntoView([node]);
figma.notify(`✅ ${operationType}: ${node.name}`);
```

---

### 2.2 Plugin UI Enhancements

**File:** `src/cursor_mcp_plugin/ui.html`

- [ ] Add command history panel (last 10 commands)
- [ ] Add copy channel name button
- [ ] Fix version number (currently shows 1.0.0, should be 0.3.5)
- [ ] Add live activity indicator (pulsing when receiving commands)
- [ ] Show last command executed with timestamp

---

### 2.3 Improve Tool Descriptions

**File:** `src/talk_to_figma_mcp/server.ts`

- [ ] Add usage examples to tool descriptions
- [ ] Document return value structure
- [ ] Mention related tools

**Example:**
```typescript
// Before
"Get detailed information about a specific node in Figma"

// After
"Get detailed information about a node including fills, strokes, text content, auto-layout settings, and children. Returns filtered JSON. Use after create operations to verify results. Related: get_nodes_info for multiple nodes."
```

---

## 🟢 Priority 3: Feature Additions

### 3.1 Page Management Tools

**Files:** `src/talk_to_figma_mcp/server.ts`, `src/figma-plugin/handlers/` (new file)

- [ ] `create_page(name: string)`
- [ ] `switch_page(pageId: string)`
- [ ] `delete_page(pageId: string)`
- [ ] `rename_page(pageId: string, name: string)`
- [ ] `get_pages()`

---

### 3.2 Layer Reordering Tools

**File:** `src/figma-plugin/handlers/layout.ts`

- [ ] `reorder_node(nodeId: string, index: number)`
- [ ] `move_to_front(nodeId: string)`
- [ ] `move_to_back(nodeId: string)`
- [ ] `move_forward(nodeId: string)` - move up one level
- [ ] `move_backward(nodeId: string)` - move down one level

---

### 3.3 Plugin Data Persistence

**Files:** `src/talk_to_figma_mcp/server.ts`, `src/figma-plugin/handlers/` (new file)

- [ ] `set_plugin_data(nodeId: string, key: string, value: string)`
- [ ] `get_plugin_data(nodeId: string, key: string)`
- [ ] `get_all_plugin_data(nodeId: string)`
- [ ] `delete_plugin_data(nodeId: string, key: string)`

---

### 3.4 Batch Export

**File:** `src/figma-plugin/handlers/export.ts`

- [ ] `export_multiple_nodes(nodeIds: string[], format: ExportFormat, scale?: number)`
- [ ] Return array of results with base64 data or errors

---

### 3.5 Undo Transaction Grouping

**Research needed:** Figma Plugin API doesn't have native undo support. Consider:
- [ ] Investigate `figma.commitUndo()` behavior
- [ ] Document limitations for users

---

## 🔧 Priority 4: Code Quality

### 4.1 Remove Duplicate Utilities

**Files:** `src/talk_to_figma_mcp/server.ts`, `src/shared/utils/color.ts`

- [ ] Remove `rgbaToHex` from server.ts
- [ ] Import from `src/shared/utils/color.ts` instead
- [ ] Consolidate `filterFigmaNode` to shared utils

---

### 4.2 Type Safety in MCP Server

**File:** `src/talk_to_figma_mcp/server.ts`

- [ ] Replace `: any` with proper types from Zod schemas
- [ ] Generate TypeScript types from Zod schemas

---

### 4.3 Complete TODO in Code

**File:** `src/figma-plugin/handlers/components.ts` line 513

```typescript
// TODO: Implement direct override application
```

- [ ] Implement or remove this TODO

---

### 4.4 Expand Test Coverage

**Files:** `tests/` directory

- [ ] Add tests for text.ts handlers
- [ ] Add tests for styling.ts handlers
- [ ] Add tests for effects.ts handlers
- [ ] Add tests for paint-styles.ts handlers
- [ ] Add tests for document.ts handlers
- [ ] Target: 80% coverage

---

## 📋 Nice-to-Have (Future)

### Team Library Access
- [ ] Access team library components (requires different API approach)

### Advanced Vector Operations
- [ ] Path editing tools
- [ ] Bezier curve manipulation

### Design Token Import/Export
- [ ] Export variables to JSON
- [ ] Export variables to CSS variables format
- [ ] Import from design token files

### Real-time Collaboration Features
- [ ] Multi-user awareness
- [ ] Conflict resolution

---

## ✅ Recently Completed

- [x] Variables API (9 tools) - December 2024
- [x] Component creation & properties (10 tools) - December 2024
- [x] Typography system (6 tools) - December 2024
- [x] Paint styles (6 tools) - December 2024
- [x] Effect styles (9 tools) - December 2024
- [x] Grid styles (5 tools) - December 2024
- [x] Constraints (2 tools) - December 2024
- [x] TypeScript migration of plugin - December 2024
- [x] Test suite for Variables & Components (50 tests) - December 2024

---

## 📝 Notes for AI Agents

1. **Before starting work:**
   - Run `bun test` to ensure tests pass
   - Run `bun run build` to verify build works
   - Read relevant handler files before making changes

2. **When adding new tools:**
   - Follow pattern in CONTRIBUTING.md
   - Add types to `src/shared/types/commands.ts`
   - Add MCP tool definition in `server.ts`
   - Add handler in appropriate `handlers/*.ts` file
   - Register in `handlers/index.ts`
   - Add tests in `tests/`

3. **Commit message format:**
   ```
   feat: add layer reordering tools
   fix: improve error messages in text handlers
   refactor: consolidate color utilities
   test: add paint-styles handler tests
   docs: update TODO with completed items
   ```

4. **Testing changes:**
   ```bash
   bun test           # Run all tests
   bun run build      # Build plugin and server
   bun socket         # Start WebSocket server (for manual testing)
   ```

---

*Last updated: December 2024*
*Next review: After completing Priority 1 items*

