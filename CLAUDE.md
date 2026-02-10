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

## Testing

```bash
bun test        # Run all tests
bun run build   # Build plugin + server
```
