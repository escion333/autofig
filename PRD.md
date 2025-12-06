# Product Requirements Document (PRD)
## AutoFig - Enhanced Edition

**Version:** 2.0.0  
**Last Updated:** December 2024  
**Status:** Active Development  
**Owner:** @escion333

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Vision & Goals](#2-vision--goals)
3. [Current State](#3-current-state)
4. [Target Users](#4-target-users)
5. [Feature Requirements](#5-feature-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [API Reference](#7-api-reference)
8. [Implementation Guidelines](#8-implementation-guidelines)
9. [Testing Requirements](#9-testing-requirements)
10. [Success Metrics](#10-success-metrics)
11. [Glossary](#11-glossary)

---

## 1. Executive Summary

### 1.1 What Is This Project?

**AutoFig** is a Model Context Protocol (MCP) server that enables AI agents in Cursor IDE to read, create, and modify Figma designs programmatically. It bridges the gap between AI-assisted coding and visual design, allowing developers to leverage AI for design system creation and maintenance.

### 1.2 The Problem

Designers and developers face challenges when:
- Manually translating designs to code or vice versa
- Maintaining consistency across design systems
- Creating repetitive design variations
- Keeping design tokens synchronized with code

### 1.3 The Solution

An intelligent bridge that allows AI agents to:
- Read and understand Figma designs
- Create complete design systems with proper tokens
- Generate and modify UI components
- Maintain design-code consistency

### 1.4 Key Differentiator

Unlike simple Figma plugins, this project enables **agentic workflows** where AI can autonomously:
- Analyze existing designs
- Make informed design decisions
- Execute multi-step design tasks
- Build complete design systems from specifications

---

## 2. Vision & Goals

### 2.1 Product Vision

> Enable AI agents to be first-class citizens in the design process, capable of creating, understanding, and evolving design systems with the same proficiency as skilled designers.

### 2.2 Primary Goals

| Goal | Description | Success Criteria |
|------|-------------|------------------|
| **G1: Complete API Coverage** | Support all major Figma features | 80%+ of Figma Plugin API implemented |
| **G2: Design System Creation** | Enable full design system workflows | AI can create tokens, components, variants |
| **G3: Production Quality** | Reliable, secure, performant | <100ms response time, 99.9% success rate |
| **G4: Developer Experience** | Easy to use and extend | New tools addable in <30 min |

### 2.3 Non-Goals

- **Not a Figma replacement** - Enhances Figma, doesn't replace it
- **Not a design generator** - AI provides logic, not aesthetic judgment
- **Not a real-time collaboration tool** - Batch operations, not live sync
- **Not for production asset delivery** - Development/design workflow tool

---

## 3. Current State

### 3.1 Implemented Features (v0.3.5)

```
✅ Document & Selection (7 tools)
✅ Element Creation (3 tools) - rectangle, frame, text
✅ Styling (4 tools) - fill, stroke, corner radius
✅ Layout (5 tools) - move, resize, delete, clone
✅ Auto Layout (5 tools) - full auto-layout support
✅ Components (5 tools) - read & instantiate only
✅ Text Operations (3 tools) - set, scan, batch update
✅ Annotations (4 tools) - full annotation support
✅ Prototyping (3 tools) - reactions, connectors
✅ Export (1 tool) - image export
```

### 3.2 Critical Gaps (Updated December 2024)

```
✅ Variables API - COMPLETE (9 tools)
✅ Component Creation - COMPLETE (10 tools)
✅ Style Management - COMPLETE (paint, text, effect, grid styles)
✅ Typography - COMPLETE (custom fonts, text styles)
✅ Effects - COMPLETE (shadows, blurs, effect styles)
✅ Constraints - COMPLETE (2 tools)
⚠️ Images - Basic support (base64 import)
⚠️ Vectors - Basic support (path data)
```

**Remaining Gaps:**
```
❌ Page Management - Cannot create/switch pages
❌ Layer Reordering - Cannot change z-order
❌ Plugin Data - Cannot persist custom metadata
❌ Batch Export - Single node export only
```

### 3.3 Technical Debt (Updated December 2024)

| Issue | Impact | Priority | Status |
|-------|--------|----------|--------|
| ~~Monolithic `code.js`~~ | ~~Hard to maintain~~ | ~~High~~ | ✅ RESOLVED - Modular handlers |
| ~~No TypeScript in plugin~~ | ~~Type errors~~ | ~~High~~ | ✅ RESOLVED - Full TypeScript |
| ~~Hardcoded Inter font~~ | ~~Limited typography~~ | ~~Medium~~ | ✅ RESOLVED - Custom fonts |
| ~~No automated tests~~ | ~~Regressions~~ | ~~Medium~~ | ⚠️ PARTIAL - 50 tests |
| Duplicated utilities | Inconsistency | Medium | 🔶 TODO |
| Hardcoded 30s timeout | Failures on large docs | High | 🔶 TODO |
| No reconnection logic | Connection drops | High | 🔶 TODO |

**See TODO.md for detailed improvement tasks.**

---

## 4. Target Users

### 4.1 Primary Users

**AI Agents (via MCP)**
- Cursor AI agents using tools
- Custom AI workflows
- Automated design pipelines

### 4.2 Secondary Users

**Developers**
- Setting up and configuring the system
- Extending with custom tools
- Debugging and maintenance

**Designers**
- Reviewing AI-generated designs
- Approving design system changes
- Providing feedback on outputs

### 4.3 User Stories

```gherkin
# Core Workflow
As an AI agent
I want to create a complete design system
So that developers have consistent UI components

# Design Tokens
As an AI agent  
I want to create and manage Figma variables
So that design tokens are centralized and reusable

# Component Library
As an AI agent
I want to create components with variants
So that the design system is flexible and maintainable

# Typography
As an AI agent
I want to create text styles with any font
So that typography is consistent across designs

# Responsive Design
As an AI agent
I want to set constraints on elements
So that designs adapt to different screen sizes
```

---

## 5. Feature Requirements

### 5.1 Priority Levels

| Priority | Label | Timeline | Description |
|----------|-------|----------|-------------|
| P0 | Critical | Phase 1 | Must have for core functionality |
| P1 | High | Phase 2 | Important for design systems |
| P2 | Medium | Phase 3 | Enhances capability |
| P3 | Low | Phase 4 | Nice to have |

### 5.2 P0 - Critical Features (Phase 1)

#### 5.2.1 Variables API

**Goal:** Enable design token management

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_variable_collections` | List all variable collections | none |
| `create_variable_collection` | Create new collection | `name`, `modes[]` |
| `get_variables` | Get variables in collection | `collectionId?` |
| `create_variable` | Create a variable | `collectionId`, `name`, `type`, `valuesByMode` |
| `set_variable_value` | Update variable value | `variableId`, `modeId`, `value` |
| `delete_variable` | Remove variable | `variableId` |
| `bind_variable` | Bind variable to node property | `nodeId`, `property`, `variableId` |
| `unbind_variable` | Remove variable binding | `nodeId`, `property` |

**Variable Types:**
- `COLOR` - RGBA color values
- `FLOAT` - Numbers (spacing, sizing, opacity)
- `STRING` - Text values
- `BOOLEAN` - True/false flags

**Example Usage:**
```typescript
// Create a color token
create_variable({
  collectionId: "collection-id",
  name: "primary/500",
  type: "COLOR",
  valuesByMode: {
    "light": { r: 0.2, g: 0.4, b: 1, a: 1 },
    "dark": { r: 0.4, g: 0.6, b: 1, a: 1 }
  }
})
```

#### 5.2.2 Component Creation

**Goal:** Enable building component libraries

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_component` | Convert node to component | `nodeId`, `name?` |
| `create_component_set` | Create variant group | `componentIds[]`, `name` |
| `add_component_property` | Add property to component | `componentId`, `name`, `type`, `defaultValue` |
| `get_component_properties` | Read component properties | `componentId` |
| `set_component_property_value` | Set property value | `instanceId`, `propertyName`, `value` |

**Property Types:**
- `BOOLEAN` - Toggle states (disabled, loading)
- `TEXT` - String content
- `INSTANCE_SWAP` - Slot for child components
- `VARIANT` - Variant selection

#### 5.2.3 Typography System

**Goal:** Full font and text style support

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_available_fonts` | List loaded fonts | none |
| `load_font` | Load font for use | `family`, `style` |
| `set_font` | Apply font to text node | `nodeId`, `family`, `style` |
| `create_text_style` | Create reusable text style | `name`, `properties` |
| `apply_text_style` | Apply style to node | `nodeId`, `styleId` |
| `set_text_properties` | Set text formatting | `nodeId`, `properties` |

**Text Properties:**
```typescript
interface TextProperties {
  fontFamily?: string;
  fontStyle?: string;        // Regular, Bold, etc.
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: { value: number; unit: 'PIXELS' | 'PERCENT' };
  lineHeight?: { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  paragraphSpacing?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT';
}
```

#### 5.2.4 Style Management

**Goal:** Create and manage reusable styles

| Tool | Description | Parameters |
|------|-------------|------------|
| `create_paint_style` | Create color/fill style | `name`, `paints[]` |
| `update_paint_style` | Modify existing style | `styleId`, `paints[]` |
| `apply_paint_style` | Apply to node | `nodeId`, `styleId`, `property` |
| `delete_style` | Remove style | `styleId` |

### 5.3 P1 - High Priority Features (Phase 2)

#### 5.3.1 Effects System

| Tool | Description |
|------|-------------|
| `create_effect_style` | Create shadow/blur style |
| `set_effects` | Apply effects to node |
| `add_drop_shadow` | Add drop shadow |
| `add_inner_shadow` | Add inner shadow |
| `add_layer_blur` | Add layer blur |
| `add_background_blur` | Add background blur |

#### 5.3.2 Constraints & Responsive

| Tool | Description |
|------|-------------|
| `set_constraints` | Set horizontal/vertical constraints |
| `get_constraints` | Read current constraints |

#### 5.3.3 Images

| Tool | Description |
|------|-------------|
| `set_image_fill` | Set image as fill from URL |
| `set_image_from_base64` | Set image from base64 data |
| `get_image_data` | Export image data |

#### 5.3.4 Gradients

| Tool | Description |
|------|-------------|
| `set_gradient_fill` | Apply gradient fill |
| `set_gradient_stroke` | Apply gradient stroke |

### 5.4 P2 - Medium Priority Features (Phase 3)

#### 5.4.1 Vector Operations

| Tool | Description |
|------|-------------|
| `create_vector` | Create vector from path data |
| `boolean_operation` | Union, subtract, intersect, exclude |
| `flatten_node` | Flatten to single path |
| `outline_stroke` | Convert stroke to fill |

#### 5.4.2 Additional Shapes

| Tool | Description |
|------|-------------|
| `create_ellipse` | Create circle/ellipse |
| `create_polygon` | Create polygon |
| `create_star` | Create star shape |
| `create_line` | Create line |

#### 5.4.3 Node Organization

| Tool | Description |
|------|-------------|
| `group_nodes` | Group selection |
| `ungroup_node` | Ungroup |
| `reorder_node` | Change z-order |
| `set_blend_mode` | Set blend mode |
| `set_opacity` | Set opacity |

### 5.5 P3 - Lower Priority Features (Phase 4)

| Feature | Tools |
|---------|-------|
| Grid Styles | `create_grid_style`, `set_layout_grids` |
| Plugin Data | `set_plugin_data`, `get_plugin_data` |
| Export Presets | `add_export_settings`, `export_batch` |
| Sections | `create_section` |
| Dev Mode | `get_dev_resources`, `set_dev_status` |

---

## 6. Technical Architecture

### 6.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cursor IDE                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      AI Agent                              │  │
│  │  - Receives user requests                                  │  │
│  │  - Plans multi-step workflows                              │  │
│  │  - Calls MCP tools                                         │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │ MCP Protocol (stdio)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MCP Server                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  src/talk_to_figma_mcp/server.ts                          │  │
│  │  - Tool definitions with Zod schemas                       │  │
│  │  - WebSocket client                                        │  │
│  │  - Request/response handling                               │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │ WebSocket (ws://localhost:3055)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WebSocket Server                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  src/socket.ts                                             │  │
│  │  - Channel-based routing                                   │  │
│  │  - Message relay                                           │  │
│  │  - Connection management                                   │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │ WebSocket (ws://localhost:3055)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Figma Desktop                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Figma Plugin (src/cursor_mcp_plugin/)                     │  │
│  │  - UI for connection management                            │  │
│  │  - Command handlers                                        │  │
│  │  - Figma API interactions                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Target Directory Structure

```
src/
├── shared/                          # Shared code between components
│   ├── types/
│   │   ├── figma.ts                 # Figma-related types
│   │   ├── commands.ts              # Command/response types
│   │   └── index.ts
│   ├── constants.ts                 # Shared constants
│   └── utils/
│       ├── color.ts                 # Color conversion
│       ├── validation.ts            # Input validation
│       └── node-filter.ts           # Node filtering
│
├── mcp-server/                      # MCP Server
│   ├── server.ts                    # Main server entry
│   ├── connection.ts                # WebSocket connection handling
│   ├── tools/                       # Tool implementations
│   │   ├── index.ts                 # Tool registry
│   │   ├── document.ts              # Document & selection tools
│   │   ├── creation.ts              # Element creation tools
│   │   ├── styling.ts               # Fill, stroke, effects
│   │   ├── layout.ts                # Position, size, auto-layout
│   │   ├── components.ts            # Component tools
│   │   ├── variables.ts             # Variables API tools
│   │   ├── typography.ts            # Text & font tools
│   │   ├── styles.ts                # Style management tools
│   │   └── export.ts                # Export tools
│   └── prompts/                     # Strategy prompts
│       ├── index.ts
│       ├── design-system.ts
│       ├── component-creation.ts
│       └── text-replacement.ts
│
├── websocket/                       # WebSocket Server
│   ├── server.ts
│   └── channel.ts
│
└── figma-plugin/                    # Figma Plugin
    ├── code.ts                      # Main plugin code (TypeScript)
    ├── ui.tsx                       # React UI
    ├── handlers/                    # Command handlers
    │   ├── index.ts
    │   ├── document.ts
    │   ├── creation.ts
    │   ├── styling.ts
    │   ├── layout.ts
    │   ├── components.ts
    │   ├── variables.ts
    │   ├── typography.ts
    │   └── styles.ts
    └── utils/
        ├── font-loader.ts
        └── progress.ts
```

### 6.3 Message Protocol

#### Request Format
```typescript
interface MCPRequest {
  id: string;                    // Unique request ID (UUID)
  type: 'message' | 'join';      // Message type
  channel: string;               // Channel name
  message: {
    id: string;                  // Same as outer id
    command: string;             // Tool name
    params: Record<string, any>; // Tool parameters
  };
}
```

#### Response Format
```typescript
interface MCPResponse {
  id: string;                    // Matches request ID
  type: 'message';
  channel: string;
  message: {
    id: string;
    result?: any;                // Success result
    error?: string;              // Error message
  };
}
```

#### Progress Update Format
```typescript
interface ProgressUpdate {
  type: 'command_progress';
  commandId: string;
  commandType: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  progress: number;              // 0-100
  totalItems: number;
  processedItems: number;
  message: string;
  payload?: any;
}
```

---

## 7. API Reference

### 7.1 Tool Definition Pattern

All tools follow this pattern:

```typescript
server.tool(
  "tool_name",                           // Unique tool identifier
  "Description of what the tool does",   // Shown to AI agent
  {
    // Zod schema for parameters
    paramName: z.string().describe("Parameter description"),
    optionalParam: z.number().optional().describe("Optional parameter"),
  },
  async ({ paramName, optionalParam }) => {
    try {
      const result = await sendCommandToFigma("tool_name", {
        paramName,
        optionalParam,
      });
      return {
        content: [{
          type: "text",
          text: `Success: ${JSON.stringify(result)}`,
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: "text", 
          text: `Error: ${error.message}`,
        }],
      };
    }
  }
);
```

### 7.2 Plugin Handler Pattern

All plugin handlers follow this pattern:

```typescript
async function handleToolName(params: ToolParams): Promise<ToolResult> {
  // 1. Validate parameters
  if (!params.requiredParam) {
    throw new Error("Missing requiredParam parameter");
  }

  // 2. Get/validate nodes
  const node = await figma.getNodeByIdAsync(params.nodeId);
  if (!node) {
    throw new Error(`Node not found: ${params.nodeId}`);
  }

  // 3. Perform operation
  // ... Figma API calls ...

  // 4. Return result
  return {
    id: node.id,
    name: node.name,
    // ... relevant properties
  };
}
```

### 7.3 Error Handling

```typescript
// Standard error types
type ErrorType = 
  | 'VALIDATION_ERROR'      // Invalid parameters
  | 'NOT_FOUND'             // Node/resource not found
  | 'UNSUPPORTED'           // Feature not supported on node type
  | 'PERMISSION_ERROR'      // Cannot modify read-only resource
  | 'CONNECTION_ERROR'      // WebSocket/Figma connection issue
  | 'TIMEOUT_ERROR'         // Operation timed out
  | 'UNKNOWN_ERROR';        // Unexpected error

// Error response format
interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    nodeId?: string;
    details?: any;
  };
}
```

---

## 8. Implementation Guidelines

### 8.1 Adding a New Tool

#### Step 1: Define types in `shared/types/commands.ts`
```typescript
export interface CreateVariableParams {
  collectionId: string;
  name: string;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, any>;
}

export interface CreateVariableResult {
  id: string;
  name: string;
  type: string;
  collectionId: string;
}
```

#### Step 2: Add tool in MCP server
```typescript
// src/mcp-server/tools/variables.ts
export function registerVariableTools(server: McpServer) {
  server.tool(
    "create_variable",
    "Create a new variable in a collection",
    {
      collectionId: z.string().describe("ID of the variable collection"),
      name: z.string().describe("Variable name (e.g., 'primary/500')"),
      type: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']).describe("Variable type"),
      valuesByMode: z.record(z.any()).describe("Values for each mode"),
    },
    async (params) => {
      const result = await sendCommandToFigma("create_variable", params);
      return formatResponse(result);
    }
  );
}
```

#### Step 3: Add handler in plugin
```typescript
// src/figma-plugin/handlers/variables.ts
export async function createVariable(params: CreateVariableParams) {
  const collection = figma.variables.getVariableCollectionById(params.collectionId);
  if (!collection) {
    throw new Error(`Collection not found: ${params.collectionId}`);
  }

  const variable = figma.variables.createVariable(
    params.name,
    params.collectionId,
    params.type
  );

  // Set values for each mode
  for (const [modeId, value] of Object.entries(params.valuesByMode)) {
    variable.setValueForMode(modeId, value);
  }

  return {
    id: variable.id,
    name: variable.name,
    type: variable.resolvedType,
    collectionId: params.collectionId,
  };
}
```

#### Step 4: Register handler in command switch
```typescript
// src/figma-plugin/code.ts
case "create_variable":
  return await createVariable(params);
```

#### Step 5: Add command type
```typescript
// Update FigmaCommand type union
type FigmaCommand = 
  | "create_variable"
  // ... existing commands
```

### 8.2 Code Style Guidelines

```typescript
// ✅ DO: Use descriptive variable names
const variableCollection = figma.variables.getVariableCollectionById(collectionId);

// ❌ DON'T: Use abbreviations
const vc = figma.variables.getVariableCollectionById(cid);

// ✅ DO: Validate all inputs
if (!nodeId) {
  throw new Error("Missing nodeId parameter");
}

// ❌ DON'T: Assume inputs are valid
const node = await figma.getNodeByIdAsync(nodeId); // Might crash if nodeId is undefined

// ✅ DO: Return consistent response shapes
return {
  success: true,
  id: node.id,
  name: node.name,
};

// ❌ DON'T: Return inconsistent shapes
return node; // Sometimes object, sometimes string

// ✅ DO: Use async/await consistently
const node = await figma.getNodeByIdAsync(nodeId);
const result = await node.exportAsync(settings);

// ❌ DON'T: Mix promises and callbacks
figma.getNodeByIdAsync(nodeId).then(node => {
  node.exportAsync(settings, (result) => { ... });
});
```

### 8.3 Testing Requirements

```typescript
// Each tool should have tests for:
describe("create_variable", () => {
  // 1. Happy path
  it("should create a variable with valid params", async () => {});
  
  // 2. Missing required params
  it("should throw error when collectionId is missing", async () => {});
  
  // 3. Invalid param types
  it("should throw error when type is invalid", async () => {});
  
  // 4. Resource not found
  it("should throw error when collection does not exist", async () => {});
  
  // 5. Edge cases
  it("should handle special characters in variable name", async () => {});
});
```

---

## 9. Testing Requirements

### 9.1 Test Categories

| Category | Coverage Target | Description |
|----------|-----------------|-------------|
| Unit Tests | 80% | Individual function testing |
| Integration Tests | 60% | Tool end-to-end testing |
| E2E Tests | 40% | Full workflow testing |

### 9.2 Test Environment

```typescript
// Mock Figma globals for testing
const mockFigma = {
  getNodeByIdAsync: jest.fn(),
  currentPage: {
    selection: [],
    appendChild: jest.fn(),
  },
  variables: {
    createVariable: jest.fn(),
    getVariableCollectionById: jest.fn(),
  },
  // ... etc
};

global.figma = mockFigma;
```

### 9.3 Test Scenarios

#### Design System Creation Flow
```gherkin
Scenario: Create a complete color system
  Given a connected Figma document
  When I create a variable collection named "Colors"
  And I create color variables for "primary", "secondary", "neutral"
  And I create light and dark modes
  Then all variables should be accessible
  And variables should have correct values per mode
```

#### Component Creation Flow
```gherkin
Scenario: Create a button component with variants
  Given a connected Figma document
  When I create a frame with text for a button
  And I convert it to a component
  And I add size and state variants
  Then the component set should have all variants
  And instances should be creatable with variant props
```

---

## 10. Success Metrics

### 10.1 Functionality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Coverage | 80% | % of Figma Plugin API implemented |
| Tool Success Rate | 99% | % of tool calls that succeed |
| Response Time | <100ms | P95 latency for tool responses |

### 10.2 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | 80% | % of code covered by tests |
| Type Coverage | 100% | % of code with TypeScript types |
| Error Clarity | 90% | % of errors with actionable messages |

### 10.3 Usage Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Design System Creation | <10 min | Time to create basic design system |
| Component Library Setup | <30 min | Time to create 10 component library |
| Token Sync Accuracy | 100% | Variables match intended values |

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol - Standard for AI tool integration |
| **Tool** | An MCP function that an AI agent can call |
| **Variable** | Figma's design token system (colors, numbers, strings, booleans) |
| **Collection** | A group of related variables with shared modes |
| **Mode** | A variable configuration (e.g., light/dark theme) |
| **Component** | A reusable design element in Figma |
| **Component Set** | A group of component variants |
| **Variant** | A specific configuration of a component |
| **Instance** | A copy of a component that can have overrides |
| **Override** | A modification to an instance that differs from the component |
| **Style** | A reusable design property (color, text, effect, grid) |
| **Auto Layout** | Figma's flexbox-like layout system |
| **Constraint** | Rules for how elements resize with their parent |

---

## Appendix A: Quick Reference

### Common Node Types
```
FRAME, GROUP, COMPONENT, COMPONENT_SET, INSTANCE,
TEXT, RECTANGLE, ELLIPSE, POLYGON, STAR, LINE, VECTOR,
BOOLEAN_OPERATION, SLICE, SECTION
```

### Common Properties
```typescript
// Position & Size
x, y, width, height, rotation

// Appearance
fills, strokes, effects, opacity, blendMode

// Auto Layout
layoutMode, primaryAxisAlignItems, counterAxisAlignItems,
paddingTop/Right/Bottom/Left, itemSpacing, layoutSizingHorizontal/Vertical

// Text
characters, fontSize, fontName, textAlignHorizontal/Vertical,
letterSpacing, lineHeight, paragraphSpacing

// Components
mainComponent, componentProperties, overrides
```

### Variable Types & Values
```typescript
// COLOR
{ r: 0-1, g: 0-1, b: 0-1, a: 0-1 }

// FLOAT
number

// STRING
string

// BOOLEAN
true | false
```

---

## Appendix B: Related Documentation

- [Figma Plugin API](https://www.figma.com/plugin-docs/api/api-reference/)
- [Figma Variables API](https://www.figma.com/plugin-docs/api/figma-variables/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Cursor MCP Documentation](https://docs.cursor.com/context/model-context-protocol)

---

*This PRD is a living document. Update it as the project evolves.*

