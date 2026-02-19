# AutoFig — Project Instructions

## Personal Work Directory

All project-specific outputs (audits, reports, notes, design system documentation, inventories, etc.) MUST be saved to the `personal/` folder in the repo root. This folder is gitignored and will never be committed.

**Examples of files that go in `personal/`:**
- Design audits and assessments
- Screen inventories
- Component gap analyses
- Figma file documentation
- Session notes or working documents
- Any file generated from reading/analyzing a specific Figma file

**Never create these files in the repo root or any tracked directory.**

## Architecture

- `src/talk_to_figma_mcp/` — MCP server (TypeScript)
- `src/figma-plugin/` — Figma plugin source (TypeScript, builds to `src/cursor_mcp_plugin/`)
- `src/cursor_mcp_plugin/` — Plugin build output (legacy directory name — do not edit directly)
- `src/shared/` — Shared types and utilities
- `src/socket.ts` — WebSocket server

## Adding Tools

Follow the pattern in CONTRIBUTING.md:
1. Add command type to `src/shared/types/commands.ts`
2. Add MCP tool definition in `src/talk_to_figma_mcp/server.ts`
3. Add handler in `src/figma-plugin/handlers/`
4. Register handler in `src/figma-plugin/handlers/index.ts`

## Model Usage

Use **Sonnet** for all Figma design work (component building, variable binding, cloning, styling, documentation frames, etc.). Opus should only be used in rare cases — complex architectural planning, tricky debugging, or multi-step code refactors that require deep reasoning.

## Testing

```bash
bun test        # Run all tests
bun run build   # Build plugin + server
```

## Figma Design Work — Core Principles

- **Read before you write.** Always call `get_node_info` on the target node(s) before making any modifications. Never assume current state.
- **Modify in-place. Never rebuild.** Do not delete and recreate nodes to make changes. Use `update_node`, `set_fill_color`, `bind_variable`, `set_text_content`, etc. to surgically edit existing nodes. Rebuilding destroys variable bindings, component property references, and downstream instance IDs.
- **Never delete without explicit authorization.** Components, variables, effect styles, and text styles must not be deleted unless the user explicitly asks. "I need to fix this" is not authorization to delete.
- **After any code change, rebuild.** Run `bun run build` before testing — plugin and server changes don't take effect until built.

## Critical Tool Bugs & Workarounds

| Tool | Issue | Workaround |
|------|-------|------------|
| `create_component_instance` | Fails: "Cannot call with documentAccess: dynamic-page" | Use `create_multiple_component_instances` (batch version works) |
| `set_multiple_text_contents` | Param mismatch — sends `text` but handler expects `updates` | Use individual `set_text_content` calls |
| `set_layout_mode` → `NONE` | Fails: "Required value missing" | Create frames without auto-layout initially if NONE is needed |
| `set_fill_color` `a` param | Alpha is silently ignored — always opaque | Bind to a variable with alpha baked in, or use `bind_variable` |
| `bind_variable` on fills/strokes | `node.setBoundVariable('fills',...)` doesn't work | Already fixed in `variables.ts` — uses `figma.variables.setBoundVariableForPaint()` |
