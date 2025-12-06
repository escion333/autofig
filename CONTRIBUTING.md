# Contributing Guide for AI Agents

This guide provides quick-reference patterns for AI agents working on this codebase.

---

## Quick Start Checklist

Before making changes:
- [ ] Check **TODO.md** for prioritized tasks and what to work on
- [ ] Read `ANALYSIS_REPORT.md` for current state and architecture
- [ ] Run `bun test` to ensure tests pass before changes
- [ ] Understand the three-component architecture (MCP Server ↔ WebSocket ↔ Plugin)
- [ ] Reference `PRD.md` for detailed requirements if needed

---

## Architecture Overview

```
src/
├── shared/                      # Shared code between components
│   ├── types/
│   │   ├── figma.ts             # Figma-related types (RGBA, Paint, Node types)
│   │   ├── commands.ts          # Command/response types (FigmaCommand, CommandParams)
│   │   └── index.ts             # Barrel export
│   └── utils/
│       ├── color.ts             # Color conversion (rgbaToHex, hexToRgba)
│       └── node-filter.ts       # Node filtering for API responses
│
├── figma-plugin/                # TypeScript plugin source (builds to cursor_mcp_plugin/)
│   ├── code.ts                  # Entry point - UI messaging, initialization
│   ├── tsconfig.json            # Plugin-specific TypeScript config
│   ├── handlers/                # Command handlers (modular)
│   │   ├── index.ts             # Command dispatcher
│   │   ├── document.ts          # get_document_info, get_selection, etc.
│   │   ├── creation.ts          # create_rectangle, create_frame, create_text
│   │   ├── styling.ts           # set_fill_color, set_stroke_color, etc.
│   │   ├── layout.ts            # move_node, resize_node, delete_node
│   │   ├── auto-layout.ts       # set_layout_mode, set_padding, etc.
│   │   ├── components.ts        # get_local_components, create_instance
│   │   ├── text.ts              # set_text_content, scan_text_nodes
│   │   ├── annotations.ts       # get_annotations, set_annotation
│   │   ├── prototyping.ts       # get_reactions, create_connections
│   │   └── export.ts            # export_node_as_image
│   └── utils/
│       ├── progress.ts          # sendProgressUpdate, generateCommandId
│       └── helpers.ts           # getNodeById, delay, customBase64Encode
│
├── cursor_mcp_plugin/           # Build output (DO NOT EDIT DIRECTLY)
│   ├── code.js                  # Auto-generated from TypeScript
│   ├── manifest.json
│   └── ui.html
│
└── talk_to_figma_mcp/           # MCP Server
    └── server.ts                # Tool definitions, WebSocket client
```

---

## Adding a New Tool (Step-by-Step)

### 1. Add Command Type

**File:** `src/shared/types/commands.ts`

Add to the `FigmaCommand` type union:

```typescript
export type FigmaCommand =
  // ... existing commands
  | 'your_new_command';
```

Add to `CommandParams` interface:

```typescript
export interface CommandParams {
  // ... existing params
  your_new_command: {
    requiredParam: string;
    optionalParam?: number;
  };
}
```

### 2. Add MCP Tool Definition

**File:** `src/talk_to_figma_mcp/server.ts`

```typescript
server.tool(
  "your_new_command",
  "Clear description of what this tool does - be specific!",
  {
    requiredParam: z.string().describe("What this parameter is for"),
    optionalParam: z.number().optional().describe("Optional - defaults to X"),
  },
  async ({ requiredParam, optionalParam }) => {
    try {
      const result = await sendCommandToFigma("your_new_command", {
        requiredParam,
        optionalParam: optionalParam ?? defaultValue,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }],
      };
    }
  }
);
```

### 3. Add Plugin Handler

**File:** `src/figma-plugin/handlers/` (create new file or add to existing)

Example: `src/figma-plugin/handlers/your-feature.ts`

```typescript
import type { CommandParams, NodeResult } from '../../shared/types';
import { getNodeById } from '../utils/helpers';

export async function yourNewCommand(
  params: CommandParams['your_new_command']
): Promise<NodeResult> {
  const { requiredParam, optionalParam } = params || {};

  // 1. Validate required params
  if (!requiredParam) {
    throw new Error('Missing requiredParam parameter');
  }

  // 2. Get node if needed
  const node = await getNodeById(params.nodeId);

  // 3. Perform Figma API operation
  // ... your code here ...

  // 4. Return result
  return {
    id: node.id,
    name: node.name,
    // ... relevant data
  };
}
```

### 4. Register Handler in Dispatcher

**File:** `src/figma-plugin/handlers/index.ts`

Import and add to switch:

```typescript
import { yourNewCommand } from './your-feature';

// In handleCommand switch:
case 'your_new_command':
  return await yourNewCommand(params as CommandParams['your_new_command']);
```

---

## Common Patterns

### Getting a Node Safely

Use the helper from `src/figma-plugin/utils/helpers.ts`:

```typescript
import { getNodeById } from '../utils/helpers';

const node = await getNodeById(nodeId); // Throws if not found
```

Or manually:

```typescript
const node = await figma.getNodeByIdAsync(nodeId);
if (!node) {
  throw new Error(`Node not found with ID: ${nodeId}`);
}
```

### Checking Node Type

```typescript
if (node.type !== 'TEXT') {
  throw new Error(`Node is not a text node: ${nodeId} (type: ${node.type})`);
}
```

### Checking Node Capability

Use the helper:

```typescript
import { assertNodeCapability } from '../utils/helpers';

assertNodeCapability(node, 'fills', `Node does not support fills: ${nodeId}`);
```

### Loading Fonts

```typescript
// Load a font before using it
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

// Load custom font
await figma.loadFontAsync({ family: 'Roboto', style: 'Bold' });
```

### Creating Text Styles

```typescript
// Create a reusable text style
const style = figma.createTextStyle();
style.name = 'Heading/H1';
style.fontName = { family: 'Inter', style: 'Bold' };
style.fontSize = 32;
style.lineHeight = { value: 40, unit: 'PIXELS' };
style.letterSpacing = { value: -0.5, unit: 'PIXELS' };
```

### Setting Text Properties

```typescript
// Set text node properties
textNode.fontSize = 24;
textNode.lineHeight = { unit: 'AUTO' };  // or { value: 32, unit: 'PIXELS' }
textNode.letterSpacing = { value: 0.5, unit: 'PIXELS' };
textNode.textCase = 'UPPER';  // ORIGINAL, UPPER, LOWER, TITLE
textNode.textDecoration = 'UNDERLINE';  // NONE, UNDERLINE, STRIKETHROUGH
textNode.textAlignHorizontal = 'CENTER';  // LEFT, CENTER, RIGHT, JUSTIFIED
```

### Progress Updates (for long operations)

```typescript
import { sendProgressUpdate } from '../utils/progress';

sendProgressUpdate(
  commandId,
  'command_name',
  'in_progress',     // status
  50,                // progress (0-100)
  100,               // totalItems
  50,                // processedItems
  'Processing item 50 of 100'
);
```

---

## Tool Description Best Practices

### ✅ Good Descriptions

```typescript
"Create a new variable in a Figma variable collection. Variables are design tokens that can be colors, numbers, strings, or booleans."

"Set the fill color of a node. Accepts RGBA values where each component is 0-1."

"Get all local components from the document. Returns component IDs, names, and keys for use with create_component_instance."
```

### ❌ Bad Descriptions

```typescript
"Create variable"  // Too vague

"Set fill"  // Missing details about what it does

"Get components"  // Doesn't explain what's returned
```

---

## Zod Schema Patterns

### Required String
```typescript
nodeId: z.string().describe("The ID of the node to modify")
```

### Optional Number with Default
```typescript
scale: z.number().positive().optional().describe("Export scale (default: 1)")
```

### Enum
```typescript
format: z.enum(["PNG", "JPG", "SVG", "PDF"]).describe("Export format")
```

### Array
```typescript
nodeIds: z.array(z.string()).describe("Array of node IDs")
```

### Object
```typescript
color: z.object({
  r: z.number().min(0).max(1).describe("Red (0-1)"),
  g: z.number().min(0).max(1).describe("Green (0-1)"),
  b: z.number().min(0).max(1).describe("Blue (0-1)"),
  a: z.number().min(0).max(1).optional().describe("Alpha (0-1, default: 1)"),
}).describe("RGBA color")
```

---

## Key Files Reference

| File | Purpose | When to Modify |
|------|---------|----------------|
| `src/shared/types/commands.ts` | Command types & params | Adding new tool types |
| `src/shared/types/figma.ts` | Figma types (RGBA, Paint, etc.) | Adding new Figma types |
| `src/talk_to_figma_mcp/server.ts` | MCP server, tool definitions | Adding new tools |
| `src/figma-plugin/handlers/` | Plugin command handlers | Implementing tool logic |
| `src/figma-plugin/handlers/typography.ts` | Typography handlers | Font & text style tools |
| `src/figma-plugin/handlers/organization.ts` | Node organization | Group/ungroup tools |
| `src/figma-plugin/handlers/index.ts` | Command dispatcher | Registering new handlers |
| `src/cursor_mcp_plugin/code.js` | **Build output - DO NOT EDIT** | N/A |
| `src/cursor_mcp_plugin/ui.html` | Plugin UI | Rarely needed |
| `src/socket.ts` | WebSocket relay | Rarely needed |
| `PRD.md` | Requirements & specs | Reference only |

---

## Testing Your Changes

### 1. Build the project
```bash
bun run build
```

### 2. Start WebSocket server
```bash
bun socket
```

### 3. Restart Cursor to reload MCP

### 4. Open Figma, run plugin, connect

### 5. Test tool via chat:
```
Use the your_new_command tool with requiredParam="test"
```

---

## Common Figma API References

### Node Types
- `FRAME` - Container with optional auto-layout
- `TEXT` - Text content
- `RECTANGLE` - Basic shape
- `COMPONENT` - Reusable component definition
- `INSTANCE` - Instance of a component
- `GROUP` - Simple grouping

### Fill Types
```typescript
node.fills = [{
  type: 'SOLID',
  color: { r: 0.5, g: 0.5, b: 0.5 },
  opacity: 1,
}];
```

### Auto Layout
```typescript
frame.layoutMode = 'VERTICAL';  // or 'HORIZONTAL', 'NONE'
frame.primaryAxisAlignItems = 'CENTER';  // MIN, MAX, CENTER, SPACE_BETWEEN
frame.counterAxisAlignItems = 'CENTER';  // MIN, MAX, CENTER, BASELINE
frame.paddingTop = 16;
frame.itemSpacing = 8;
```

### Variables API (✅ Implemented - 9 tools)
```typescript
// MCP tools available:
// - get_local_variable_collections
// - get_local_variables
// - create_variable_collection
// - create_variable
// - set_variable_value
// - delete_variable
// - get_bound_variables
// - bind_variable
// - unbind_variable

// Example usage in handlers:
const collections = await figma.variables.getLocalVariableCollectionsAsync();

const variable = figma.variables.createVariable(
  'tokenName',
  collectionId,
  'COLOR'  // or 'FLOAT', 'STRING', 'BOOLEAN'
);

variable.setValueForMode(modeId, { r: 1, g: 0, b: 0, a: 1 });

// Bind to node
node.setBoundVariable('fills', variable);
```

---

## Commit Message Format

Follow conventional commits:

```
feat: add create_variable tool for design tokens
fix: handle missing nodeId in set_fill_color
refactor: extract color utilities to shared module
docs: update PRD with variables API specs
```

---

## Questions?

Check these resources:
1. **TODO.md** - Prioritized tasks for future work
2. `ANALYSIS_REPORT.md` - Current state and architecture
3. `PRD.md` - Full requirements and specifications
4. [Figma Plugin API Docs](https://www.figma.com/plugin-docs/api/api-reference/)
5. [MCP Specification](https://modelcontextprotocol.io/)

