#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { FigmaCommand } from "../shared/types";
import { rgbaToHex } from "../shared/utils/color.js";
import { filterFigmaNode, type RawFigmaNode } from "../shared/utils/node-filter.js";

// Define TypeScript interfaces for Figma responses
interface FigmaResponse {
  id: string;
  result?: unknown; // Result can be any valid JSON value from Figma plugin
  error?: string;
}

// Define interface for command progress updates
interface CommandProgressUpdate {
  type: 'command_progress';
  commandId: string;
  commandType: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  progress: number;
  totalItems: number;
  processedItems: number;
  currentChunk?: number;
  totalChunks?: number;
  chunkSize?: number;
  message: string;
  payload?: unknown; // Payload can be any valid JSON value
  timestamp: number;
}

/**
 * Note on type safety in tool handlers:
 * 
 * Handler functions use `:any` for destructured parameters because the MCP SDK
 * doesn't automatically infer types from Zod schemas. This is acceptable because:
 * 
 * 1. Runtime validation: All inputs are validated by Zod schemas before reaching handlers
 * 2. Type inference limitations: The MCP SDK's tool() method doesn't propagate schema types
 * 3. Risk/benefit tradeoff: Manual typing of 70+ handlers vs marginal TypeScript benefit
 * 
 * Future improvement: Consider using z.infer<typeof schema> if MCP SDK adds better type support.
 */

// Update the getInstanceOverridesResult interface to match the plugin implementation
interface getInstanceOverridesResult {
  success: boolean;
  message: string;
  sourceInstanceId: string;
  mainComponentId: string;
  overridesCount: number;
}

interface setInstanceOverridesResult {
  success: boolean;
  message: string;
  totalCount?: number;
  results?: Array<{
    success: boolean;
    instanceId: string;
    instanceName: string;
    appliedCount?: number;
    message?: string;
  }>;
}

// Custom logging functions that write to stderr instead of stdout to avoid being captured
const logger = {
  info: (message: string) => process.stderr.write(`[INFO] ${message}\n`),
  debug: (message: string) => process.stderr.write(`[DEBUG] ${message}\n`),
  warn: (message: string) => process.stderr.write(`[WARN] ${message}\n`),
  error: (message: string) => process.stderr.write(`[ERROR] ${message}\n`),
  log: (message: string) => process.stderr.write(`[LOG] ${message}\n`)
};

// Command-specific timeout configurations (in milliseconds)
// Commands that process large documents or perform batch operations need longer timeouts
const COMMAND_TIMEOUTS: Record<string, number> = {
  // Text operations - can be slow on large documents
  'scan_text_nodes': 120000,           // 2 minutes - scanning large documents
  'set_multiple_text_contents': 120000, // 2 minutes - batch text updates
  
  // Export operations - can be slow for complex nodes
  'export_node_as_image': 90000,       // 90 seconds - complex exports
  'export_multiple_nodes': 180000,     // 3 minutes - batch exports
  
  // Annotation operations - can be slow with many annotations
  'set_multiple_annotations': 90000,   // 90 seconds - batch annotations
  'get_annotations': 60000,            // 1 minute - reading many annotations
  
  // Variable batch operations
  'create_multiple_variables': 90000,        // 90 seconds - batch variable creation
  'set_multiple_variable_values': 90000,     // 90 seconds - batch variable value updates

  // Node scanning operations
  'scan_nodes_by_types': 90000,        // 90 seconds - scanning large subtrees

  // Variable batch binding
  'bind_multiple_variables': 300000,   // 5 minutes - batch variable binding

  // Node rename operations
  'rename_multiple_nodes': 300000,     // 5 minutes - batch node renaming

  // Batch component operations
  'create_multiple_component_instances': 300000,       // 5 minutes - batch instance creation
  'set_multiple_component_property_references': 300000, // 5 minutes - batch property reference wiring

  // Batch style operations
  'apply_style_batch': 300000,         // 5 minutes - batch style application
  'set_paint_batch': 300000,           // 5 minutes - batch paint application

  // Default timeout for all other commands
  'default': 30000                     // 30 seconds
};

/**
 * Get timeout for a specific command
 */
function getCommandTimeout(command: FigmaCommand): number {
  return COMMAND_TIMEOUTS[command as string] || COMMAND_TIMEOUTS.default;
}

// WebSocket connection and request tracking
let ws: WebSocket | null = null;
const pendingRequests = new Map<string, {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
  lastActivity: number; // Add timestamp for last activity
}>();

// Track which channel each client is in
let currentChannel: string | null = null;

// Check for channel from environment variable
const DEFAULT_CHANNEL = process.env.AUTOFIG_CHANNEL || "autofig";

// Reconnection state
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

// Stale request cleanup
const STALE_REQUEST_THRESHOLD = 300000; // 5 minutes
const CLEANUP_INTERVAL = 60000; // Run cleanup every minute

// Create MCP server
const server = new McpServer({
  name: "AutoFig",
  version: "1.0.0",
});

// Add command line argument parsing
const args = process.argv.slice(2);
const serverArg = args.find(arg => arg.startsWith('--server='));
const serverUrl = serverArg ? serverArg.split('=')[1] : 'localhost';
const WS_URL = serverUrl === 'localhost' ? `ws://${serverUrl}` : `wss://${serverUrl}`;

// ============================================================================
// Common Zod Schemas (DRY - Don't Repeat Yourself)
// ============================================================================

/**
 * RGBA color schema - used across 17+ tool definitions
 * Components: r (red), g (green), b (blue), a (alpha/opacity)
 * All values are 0-1 range for Figma compatibility
 */
const rgbaSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).optional(),
});

/**
 * Helper to create optional RGBA schema with custom description
 */
const optionalRgbaSchema = (description: string) => 
  rgbaSchema.optional().describe(description);

// ============================================================================
// Response Formatting Helpers
// ============================================================================
//
// These helpers standardize response formatting across all 101 tool definitions.
// 
// REFACTORING PATTERN (for future work):
//
// Before (15 lines):
//   try {
//     const result = await sendCommandToFigma("command_name", params);
//     return {
//       content: [{
//         type: "text",
//         text: JSON.stringify(result)
//       }]
//     };
//   } catch (error) {
//     return {
//       content: [{
//         type: "text",
//         text: `Error doing thing: ${error instanceof Error ? error.message : String(error)}`
//       }]
//     };
//   }
//
// After (3 lines):
//   try {
//     const result = await sendCommandToFigma("command_name", params);
//     return formatJsonResponse(result);
//   } catch (error) {
//     return formatErrorResponse("doing thing", error);
//   }
//
// Examples of completed refactoring: get_document_info, get_selection, read_my_design
// Remaining: 98 tools can be refactored incrementally (each is independent, low risk)
//
// ============================================================================

/**
 * Format a successful tool response with JSON data
 */
function formatJsonResponse(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data)
      }
    ]
  };
}

/**
 * Format a successful tool response with a custom message
 */
function formatTextResponse(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: message
      }
    ]
  };
}

/**
 * Format an error response
 */
function formatErrorResponse(commandName: string, error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: "text" as const,
        text: `Error ${commandName}: ${errorMessage}`
      }
    ]
  };
}

// ============================================================================
// Auto-Join Channel Helpers
// ============================================================================

interface ChannelInfo {
  name: string;
  clients: number;
}

interface StatusResponse {
  status: string;
  port: number;
  timestamp: string;
  channels: number;
  totalClients: number;
  channelDetails: ChannelInfo[];
}

/**
 * Get active channels from the WebSocket server's /status endpoint
 */
async function getActiveChannels(): Promise<ChannelInfo[]> {
  try {
    const port = serverUrl === 'localhost' ? 3055 : 443;
    const protocol = serverUrl === 'localhost' ? 'http' : 'https';
    const statusUrl = `${protocol}://${serverUrl}${serverUrl === 'localhost' ? `:${port}` : ''}/status`;
    
    const response = await fetch(statusUrl);
    if (!response.ok) {
      throw new Error(`Status endpoint returned ${response.status}`);
    }
    
    const data = await response.json() as StatusResponse;
    return data.channelDetails || [];
  } catch (error) {
    logger.warn(`Failed to fetch active channels: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Attempt to auto-join a channel if exactly one channel is available
 * Returns the channel name if successful, throws an error otherwise
 */
async function autoJoinChannel(): Promise<string> {
  const channels = await getActiveChannels();
  
  if (channels.length === 0) {
    throw new Error('No active channels found. Please start the Figma plugin first.');
  }
  
  // If environment variable is set, try to join that channel first
  if (DEFAULT_CHANNEL) {
    const envChannel = channels.find(c => c.name === DEFAULT_CHANNEL);
    if (envChannel) {
      await joinChannelInternal(DEFAULT_CHANNEL);
      logger.info(`Auto-joined channel from environment variable: ${DEFAULT_CHANNEL}`);
      return DEFAULT_CHANNEL;
    }
  }
  
  if (channels.length === 1) {
    const channelName = channels[0].name;
    await joinChannelInternal(channelName);
    logger.info(`Auto-joined channel: ${channelName}`);
    return channelName;
  }
  
  // Multiple channels available - user needs to choose
  const channelNames = channels.map(c => c.name).join(', ');
  throw new Error(`Multiple channels available: ${channelNames}. Please use join_channel tool to specify which channel to join.`);
}

/**
 * Internal function to join a channel (used by both auto-join and manual join)
 */
async function joinChannelInternal(channelName: string): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to Figma WebSocket server");
  }

  // Send join command directly without going through sendCommandToFigma
  // to avoid the channel requirement check
  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const request = {
      id,
      type: "join",
      channel: channelName,
      message: {
        id,
        command: "join",
        params: { channel: channelName },
      },
    };

    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Join channel timed out after 30 seconds`));
      }
    }, 30000);

    pendingRequests.set(id, {
      resolve: (value: unknown) => {
        currentChannel = channelName;
        resolve();
      },
      reject,
      timeout,
      lastActivity: Date.now()
    });

    logger.info(`Joining channel: ${channelName}`);
    ws!.send(JSON.stringify(request));
  });
}

// ============================================================================
// Tool Definitions
// ============================================================================

// Join Channel Tool - MUST be first to enable all other tools
server.tool(
  "join_channel",
  "Join a WebSocket channel (auto-joins 'autofig' by default).",
  {
    channel: z.string().describe("The channel name to join (default: 'autofig')").default("autofig"),
  },
  async ({ channel }: any) => {
    try {
      if (!channel) {
        // If no channel provided, try to auto-detect and show available channels
        const channels = await getActiveChannels();
        
        if (channels.length === 0) {
          return formatTextResponse(
            "No active channels found. Please:\n" +
            "1. Open Figma and run the AutoFig plugin\n" +
            "2. Copy the channel code from the plugin UI\n" +
            "3. Call join_channel with that code"
          );
        }
        
        if (channels.length === 1) {
          // Auto-join the only available channel
          await joinChannelInternal(channels[0].name);
          return formatTextResponse(`Auto-joined the only available channel: ${channels[0].name}`);
        }
        
        // Multiple channels - show the list
        const channelList = channels.map(c => `  - ${c.name} (${c.clients} client${c.clients !== 1 ? 's' : ''})`).join('\n');
        return formatTextResponse(
          `Multiple channels available:\n${channelList}\n\n` +
          "Please call join_channel with the specific channel code you want to use."
        );
      }

      await joinChannelInternal(channel);
      return formatTextResponse(`Successfully joined channel: ${channel}`);
    } catch (error) {
      return formatErrorResponse("joining channel", error);
    }
  }
);

// Document Info Tool
server.tool(
  "get_document_info",
  "Get document name, ID, and current page.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_document_info");
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting document info", error);
    }
  }
);

// Selection Tool
server.tool(
  "get_selection",
  "Get current selection node IDs, names, and types.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_selection");
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting selection", error);
    }
  }
);

// Read My Design Tool
server.tool(
  "read_my_design",
  "Get detailed properties of the current selection.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("read_my_design", {});
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting node info", error);
    }
  }
);

// Node Info Tool
server.tool(
  "get_node_info",
  "Get detailed properties of a node by ID.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("get_node_info", { nodeId });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(filterFigmaNode(result as RawFigmaNode))
          }
        ]
      };
    } catch (error) {
      return formatErrorResponse("getting node info", error);
    }
  }
);

// Nodes Info Tool
server.tool(
  "get_nodes_info",
  "Get detailed properties of multiple nodes by IDs.",
  {
    nodeIds: z.array(z.string())
  },
  async ({ nodeIds }: any) => {
    try {
      const results = await Promise.all(
        nodeIds.map(async (nodeId: any) => {
          const result = await sendCommandToFigma('get_node_info', { nodeId });
          return { nodeId, info: result };
        })
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results.map((result) => filterFigmaNode(result.info as RawFigmaNode)))
          }
        ]
      };
    } catch (error) {
      return formatErrorResponse("getting nodes info", error);
    }
  }
);


// Create Rectangle Tool
server.tool(
  "create_rectangle",
  "Create a rectangle with position, size, and optional parent.",
  {
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    name: z.string().optional(),
    parentId: z
      .string()
      .optional()
      ,
  },
  async ({ x, y, width, height, name, parentId }: any) => {
    try {
      const result = await sendCommandToFigma("create_rectangle", {
        x,
        y,
        width,
        height,
        name: name || "Rectangle",
        parentId,
      });
      return {
        content: [
          {
            type: "text",
            text: `Created rectangle "${JSON.stringify(result)}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating rectangle", error);
    }
  }
);

// Create Frame Tool
server.tool(
  "create_frame",
  "Create a frame/container with optional auto-layout.",
  {
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    name: z.string().optional(),
    parentId: z
      .string()
      .optional()
      ,
    fillColor: optionalRgbaSchema("Fill color in RGBA format"),
    strokeColor: optionalRgbaSchema("Stroke color in RGBA format"),
    strokeWeight: z.number().positive().optional(),
    layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).optional().describe("Auto-layout mode for the frame"),
    layoutWrap: z.enum(["NO_WRAP", "WRAP"]).optional().describe("Whether the auto-layout frame wraps its children"),
    paddingTop: z.number().optional().describe("Top padding for auto-layout frame"),
    paddingRight: z.number().optional().describe("Right padding for auto-layout frame"),
    paddingBottom: z.number().optional().describe("Bottom padding for auto-layout frame"),
    paddingLeft: z.number().optional().describe("Left padding for auto-layout frame"),
    primaryAxisAlignItems: z
      .enum(["MIN", "MAX", "CENTER", "SPACE_BETWEEN"])
      .optional()
      .describe("Primary axis alignment for auto-layout frame. Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced."),
    counterAxisAlignItems: z.enum(["MIN", "MAX", "CENTER", "BASELINE"]).optional().describe("Counter axis alignment for auto-layout frame"),
    layoutSizingHorizontal: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Horizontal sizing mode for auto-layout frame"),
    layoutSizingVertical: z.enum(["FIXED", "HUG", "FILL"]).optional().describe("Vertical sizing mode for auto-layout frame"),
    itemSpacing: z
      .number()
      .optional()
      .describe("Distance between children in auto-layout frame. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.")
  },
  async ({
    x,
    y,
    width,
    height,
    name,
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
    layoutMode,
    layoutWrap,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    primaryAxisAlignItems,
    counterAxisAlignItems,
    layoutSizingHorizontal,
    layoutSizingVertical,
    itemSpacing
  }: any) => {
    try {
      const result = await sendCommandToFigma("create_frame", {
        x,
        y,
        width,
        height,
        name: name || "Frame",
        parentId,
        fillColor: fillColor || { r: 1, g: 1, b: 1, a: 1 },
        strokeColor: strokeColor,
        strokeWeight: strokeWeight,
        layoutMode,
        layoutWrap,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        primaryAxisAlignItems,
        counterAxisAlignItems,
        layoutSizingHorizontal,
        layoutSizingVertical,
        itemSpacing
      });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created frame "${typedResult.name}" with ID: ${typedResult.id}. Use the ID as the parentId to appendChild inside this frame.`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating frame", error);
    }
  }
);

// Create Text Tool
server.tool(
  "create_text",
  "Create a text node with font, size, and color options.",
  {
    x: z.number(),
    y: z.number(),
    text: z.string(),
    fontSize: z.number().optional().describe("Font size (default: 14)"),
    fontWeight: z
      .number()
      .optional()
      .describe("Font weight (e.g., 400 for Regular, 700 for Bold)"),
    fontFamily: z
      .string()
      .optional()
      .describe("Font family name (default: 'Inter'). Examples: 'Roboto', 'Open Sans', 'Poppins'"),
    fontStyle: z
      .string()
      .optional()
      .describe("Font style (e.g., 'Regular', 'Bold', 'Italic', 'Medium'). If not provided, derived from fontWeight"),
    fontColor: optionalRgbaSchema("Font color in RGBA format"),
    name: z
      .string()
      .optional()
      ,
    parentId: z
      .string()
      .optional()
      ,
  },
  async ({ x, y, text, fontSize, fontWeight, fontFamily, fontStyle, fontColor, name, parentId }: any) => {
    try {
      const result = await sendCommandToFigma("create_text", {
        x,
        y,
        text,
        fontSize: fontSize || 14,
        fontWeight: fontWeight || 400,
        fontFamily: fontFamily || "Inter",
        fontStyle: fontStyle,
        fontColor: fontColor || { r: 0, g: 0, b: 0, a: 1 },
        name: name || "Text",
        parentId,
      });
      const typedResult = result as { name: string; id: string; fontFamily?: string; fontStyle?: string };
      return {
        content: [
          {
            type: "text",
            text: `Created text "${typedResult.name}" with ID: ${typedResult.id} using font: ${typedResult.fontFamily || fontFamily || 'Inter'} ${typedResult.fontStyle || ''}`.trim(),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating text", error);
    }
  }
);

// Create Ellipse Tool
server.tool(
  "create_ellipse",
  "Create an ellipse/circle with optional fill and stroke.",
  {
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    name: z.string().optional(),
    parentId: z
      .string()
      .optional()
      ,
    fillColor: optionalRgbaSchema("Fill color in RGBA format"),
    strokeColor: optionalRgbaSchema("Stroke color in RGBA format"),
    strokeWeight: z.number().positive().optional(),
  },
  async ({ x, y, width, height, name, parentId, fillColor, strokeColor, strokeWeight }: any) => {
    try {
      const result = await sendCommandToFigma("create_ellipse", {
        x,
        y,
        width,
        height,
        name: name || "Ellipse",
        parentId,
        fillColor,
        strokeColor,
        strokeWeight,
      });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Created ellipse "${typedResult.name}" with ID: ${typedResult.id}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating ellipse", error);
    }
  }
);

// Set Fill Color Tool
server.tool(
  "set_fill_color",
  "Set fill color on a node (RGBA 0-1).",
  {
    nodeId: z.string(),
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1).optional(),
  },
  async ({ nodeId, r, g, b, a }: any) => {
    try {
      const result = await sendCommandToFigma("set_fill_color", {
        nodeId,
        color: { r, g, b, a: a || 1 },
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set fill color of node "${typedResult.name
              }" to RGBA(${r}, ${g}, ${b}, ${a || 1})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting fill color", error);
    }
  }
);

// Set Stroke Color Tool
server.tool(
  "set_stroke_color",
  "Set stroke color and weight on a node.",
  {
    nodeId: z.string(),
    r: z.number().min(0).max(1),
    g: z.number().min(0).max(1),
    b: z.number().min(0).max(1),
    a: z.number().min(0).max(1).optional(),
    weight: z.number().positive().optional(),
  },
  async ({ nodeId, r, g, b, a, weight }: any) => {
    try {
      const result = await sendCommandToFigma("set_stroke_color", {
        nodeId,
        color: { r, g, b, a: a || 1 },
        weight: weight || 1,
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set stroke color of node "${typedResult.name
              }" to RGBA(${r}, ${g}, ${b}, ${a || 1}) with weight ${weight || 1}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting stroke color", error);
    }
  }
);

// Move Node Tool
server.tool(
  "move_node",
  "Move a node to new (x, y) position.",
  {
    nodeId: z.string(),
    x: z.number(),
    y: z.number(),
  },
  async ({ nodeId, x, y }: any) => {
    try {
      const result = await sendCommandToFigma("move_node", { nodeId, x, y });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved node "${typedResult.name}" to position (${x}, ${y})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("moving node", error);
    }
  }
);

// Clone Node Tool
server.tool(
  "clone_node",
  "Duplicate a node, optionally at new position.",
  {
    nodeId: z.string(),
    x: z.number().optional(),
    y: z.number().optional()
  },
  async ({ nodeId, x, y }: any) => {
    try {
      const result = await sendCommandToFigma('clone_node', { nodeId, x, y });
      const typedResult = result as { name: string, id: string };
      return {
        content: [
          {
            type: "text",
            text: `Cloned node "${typedResult.name}" with new ID: ${typedResult.id}${x !== undefined && y !== undefined ? ` at position (${x}, ${y})` : ''}`
          }
        ]
      };
    } catch (error) {
      return formatErrorResponse("cloning node", error);
    }
  }
);

// ============================================================================
// Layer Reordering Tools
// ============================================================================

// Reorder Node Tool
server.tool(
  "reorder_node",
  "Move a node to a specific z-order index.",
  {
    nodeId: z.string(),
    index: z.number().int().min(0).describe("Z-order index (0=back)"),
  },
  async ({ nodeId, index }: any) => {
    try {
      const result = await sendCommandToFigma("reorder_node", { nodeId, index });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Reordered "${typedResult.name}" to index ${index} (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("reordering node", error);
    }
  }
);

// Move to Front Tool
server.tool(
  "move_to_front",
  "Move a node to the front of its parent stack.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("move_to_front", { nodeId });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved "${typedResult.name}" to front (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("moving node to front", error);
    }
  }
);

// Move to Back Tool
server.tool(
  "move_to_back",
  "Move a node to the back of its parent stack.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("move_to_back", { nodeId });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved "${typedResult.name}" to back (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("moving node to back", error);
    }
  }
);

// Move Forward Tool
server.tool(
  "move_forward",
  "Move a node one level forward in z-order.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("move_forward", { nodeId });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved "${typedResult.name}" forward one level (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("moving node forward", error);
    }
  }
);

// Move Backward Tool
server.tool(
  "move_backward",
  "Move a node one level backward in z-order.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("move_backward", { nodeId });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Moved "${typedResult.name}" backward one level (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("moving node backward", error);
    }
  }
);

// Resize Node Tool
server.tool(
  "resize_node",
  "Resize a node to new width and height.",
  {
    nodeId: z.string(),
    width: z.number().positive(),
    height: z.number().positive(),
  },
  async ({ nodeId, width, height }: any) => {
    try {
      const result = await sendCommandToFigma("resize_node", {
        nodeId,
        width,
        height,
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Resized node "${typedResult.name}" to width ${width} and height ${height}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("resizing node", error);
    }
  }
);

// Delete Node Tool
server.tool(
  "delete_node",
  "Delete a single node permanently.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      await sendCommandToFigma("delete_node", { nodeId });
      return {
        content: [
          {
            type: "text",
            text: `Deleted node with ID: ${nodeId}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("deleting node", error);
    }
  }
);

// Delete Multiple Nodes Tool
server.tool(
  "delete_multiple_nodes",
  "Delete multiple nodes in one operation.",
  {
    nodeIds: z.array(z.string()),
  },
  async ({ nodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("delete_multiple_nodes", { nodeIds });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("deleting multiple nodes", error);
    }
  }
);

// Export Node as Image Tool
server.tool(
  "export_node_as_image",
  "Export a node as PNG, JPG, SVG, or PDF.",
  {
    nodeId: z.string(),
    format: z
      .enum(["PNG", "JPG", "SVG", "PDF"])
      .optional()
      ,
    scale: z.number().positive().optional(),
  },
  async ({ nodeId, format, scale }: any) => {
    try {
      const result = await sendCommandToFigma("export_node_as_image", {
        nodeId,
        format: format || "PNG",
        scale: scale || 1,
      });
      const typedResult = result as { imageData: string; mimeType: string };

      return {
        content: [
          {
            type: "image",
            data: typedResult.imageData,
            mimeType: typedResult.mimeType || "image/png",
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("exporting node as image", error);
    }
  }
);

// Export Multiple Nodes Tool
server.tool(
  "export_multiple_nodes",
  "Batch export nodes as images.",
  {
    nodeIds: z.array(z.string()),
    format: z
      .enum(["PNG", "JPG", "SVG", "PDF"])
      .optional()
      ,
    scale: z.number().positive().optional(),
  },
  async ({ nodeIds, format, scale }: any) => {
    try {
      const result = await sendCommandToFigma("export_multiple_nodes", {
        nodeIds,
        format: format || "PNG",
        scale: scale || 1,
      });
      const typedResult = result as {
        nodesExported: number;
        nodesFailed: number;
        totalNodes: number;
        results: Array<{ success: boolean; nodeId: string; export?: any; error?: string }>;
      };
      
      return {
        content: [
          {
            type: "text",
            text: `Batch export complete: ${typedResult.nodesExported} successful, ${typedResult.nodesFailed} failed out of ${typedResult.totalNodes} total nodes.\n\nResults:\n${typedResult.results.map((r, idx) => `${idx + 1}. ${r.nodeId}: ${r.success ? '✅ Success' : `❌ ${r.error}`}`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("exporting multiple nodes", error);
    }
  }
);

// Set Text Content Tool
server.tool(
  "set_text_content",
  "Update text content of a text node.",
  {
    nodeId: z.string(),
    text: z.string(),
  },
  async ({ nodeId, text }: any) => {
    try {
      const result = await sendCommandToFigma("set_text_content", {
        nodeId,
        text,
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Updated text content of node "${typedResult.name}" to "${text}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting text content", error);
    }
  }
);

// =============================================================================
// Variables API (Design Tokens)
// =============================================================================

// Get Local Variable Collections Tool
server.tool(
  "get_local_variable_collections",
  "Get all variable collections from the document.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_local_variable_collections");
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting variable collections", error);
    }
  }
);

// Get Local Variables Tool
server.tool(
  "get_local_variables",
  "Get variables, optionally filtered by collection.",
  {
    collectionId: z.string().optional().describe("Filter by collection ID"),
  },
  async ({ collectionId }: { collectionId?: string }) => {
    try {
      const result = await sendCommandToFigma("get_local_variables", { collectionId });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting variables", error);
    }
  }
);

// Create Variable Collection Tool
server.tool(
  "create_variable_collection",
  "Create a variable collection with optional modes.",
  {
    name: z.string().describe("Name of the collection (e.g., 'Colors', 'Spacing', 'Typography')"),
    modes: z.array(z.string()).optional().describe("Optional array of mode names (e.g., ['Light', 'Dark']). Defaults to a single 'Mode 1' if not provided."),
  },
  async ({ name, modes }: { name: string; modes?: string[] }) => {
    try {
      const result = await sendCommandToFigma("create_variable_collection", { name, modes });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("creating variable collection", error);
    }
  }
);

// Create Variable Tool
server.tool(
  "create_variable",
  "Create a variable (COLOR/FLOAT/STRING/BOOLEAN).",
  {
    collectionId: z.string().describe("The ID of the collection to add the variable to"),
    name: z.string().describe("Name of the variable (e.g., 'primary/500', 'spacing/sm')"),
    resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]).describe("Type of the variable: COLOR for colors, FLOAT for numbers, STRING for text, BOOLEAN for true/false"),
    value: z.union([
      rgbaSchema,
      z.number(),
      z.string(),
      z.boolean(),
    ]).optional().describe("Initial value for the default mode. Type must match resolvedType."),
  },
  async ({ collectionId, name, resolvedType, value }: { collectionId: string; name: string; resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"; value?: unknown }) => {
    try {
      const result = await sendCommandToFigma("create_variable", { collectionId, name, resolvedType, value });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("creating variable", error);
    }
  }
);

// Set Variable Value Tool
server.tool(
  "set_variable_value",
  "Set a variable value for a specific mode.",
  {
    variableId: z.string(),
    modeId: z.string().describe("Mode ID from collection modes"),
    value: z.union([
      rgbaSchema,
      z.number(),
      z.string(),
      z.boolean(),
    ]).describe("The value to set. Type must match the variable's resolvedType."),
  },
  async ({ variableId, modeId, value }: { variableId: string; modeId: string; value: unknown }) => {
    try {
      const result = await sendCommandToFigma("set_variable_value", { variableId, modeId, value });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("setting variable value", error);
    }
  }
);

// Create Multiple Variables Tool (batch)
server.tool(
  "create_multiple_variables",
  "Batch create variables in a collection.",
  {
    collectionId: z.string().describe("The ID of the collection to add the variables to"),
    variables: z.array(z.object({
      name: z.string().describe("Name of the variable (e.g., 'primary/500', 'spacing/sm')"),
      resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]).describe("Type of the variable"),
      value: z.union([
        rgbaSchema,
        z.number(),
        z.string(),
        z.boolean(),
      ]).optional().describe("Initial value for the default mode. Type must match resolvedType."),
    })).min(1).describe("Array of variables to create"),
  },
  async ({ collectionId, variables }: { collectionId: string; variables: Array<{ name: string; resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN"; value?: unknown }> }) => {
    try {
      const result = await sendCommandToFigma("create_multiple_variables", { collectionId, variables });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("creating multiple variables", error);
    }
  }
);

// Set Multiple Variable Values Tool (batch)
server.tool(
  "set_multiple_variable_values",
  "Batch set variable values across modes.",
  {
    updates: z.array(z.object({
      variableId: z.string(),
      modeId: z.string().describe("The mode ID to set the value for"),
      value: z.union([
        rgbaSchema,
        z.number(),
        z.string(),
        z.boolean(),
      ]).describe("The value to set. Type must match the variable's resolvedType."),
    })).min(1).describe("Array of variable value updates"),
  },
  async ({ updates }: { updates: Array<{ variableId: string; modeId: string; value: unknown }> }) => {
    try {
      const result = await sendCommandToFigma("set_multiple_variable_values", { updates });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("setting multiple variable values", error);
    }
  }
);

// Delete Variable Tool
server.tool(
  "delete_variable",
  "Delete a variable from its collection.",
  {
    variableId: z.string(),
  },
  async ({ variableId }: { variableId: string }) => {
    try {
      const result = await sendCommandToFigma("delete_variable", { variableId });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("deleting variable", error);
    }
  }
);

// Get Bound Variables Tool
server.tool(
  "get_bound_variables",
  "Get all variable bindings on a node.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: { nodeId: string }) => {
    try {
      const result = await sendCommandToFigma("get_bound_variables", { nodeId });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting bound variables", error);
    }
  }
);

// Bind Variable Tool
server.tool(
  "bind_variable",
  "Bind a variable to a node property.",
  {
    nodeId: z.string(),
    field: z.enum([
      "fills", "strokes", "strokeWeight", "cornerRadius",
      "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius",
      "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
      "itemSpacing", "counterAxisSpacing", "opacity",
      "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"
    ]).describe("The field to bind the variable to"),
    variableId: z.string(),
  },
  async ({ nodeId, field, variableId }: { nodeId: string; field: string; variableId: string }) => {
    try {
      const result = await sendCommandToFigma("bind_variable", { nodeId, field, variableId });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("binding variable", error);
    }
  }
);

// Unbind Variable Tool
server.tool(
  "unbind_variable",
  "Remove a variable binding from a node property.",
  {
    nodeId: z.string(),
    field: z.enum([
      "fills", "strokes", "strokeWeight", "cornerRadius",
      "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius",
      "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
      "itemSpacing", "counterAxisSpacing", "opacity",
      "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight"
    ]).describe("The field to unbind the variable from"),
  },
  async ({ nodeId, field }: { nodeId: string; field: string }) => {
    try {
      const result = await sendCommandToFigma("unbind_variable", { nodeId, field });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("unbinding variable", error);
    }
  }
);

// Get Styles Tool
server.tool(
  "get_styles",
  "Get all local styles (text, paint, effect, grid).",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_styles");
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting styles", error);
    }
  }
);

// Get Local Components Tool
server.tool(
  "get_local_components",
  "Get all local components and component sets.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_local_components");
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting local components", error);
    }
  }
);

// =============================================================================
// Component Creation Tools
// =============================================================================

// Create Component Tool
server.tool(
  "create_component",
  "Convert a node into a reusable component.",
  {
    nodeId: z.string().describe("The ID of the node to convert to a component (must be a FRAME, GROUP, or shape)"),
    name: z.string().optional().describe("Optional name for the component"),
  },
  async ({ nodeId, name }: { nodeId: string; name?: string }) => {
    try {
      const result = await sendCommandToFigma("create_component", { nodeId, name });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("creating component", error);
    }
  }
);

// Create Component Set Tool
server.tool(
  "create_component_set",
  "Combine components into a variant set.",
  {
    componentIds: z.array(z.string()).describe("Array of component IDs to combine into a variant set (minimum 2)"),
    name: z.string().optional().describe("Optional name for the component set"),
  },
  async ({ componentIds, name }: { componentIds: string[]; name?: string }) => {
    try {
      const result = await sendCommandToFigma("create_component_set", { componentIds, name });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("creating component set", error);
    }
  }
);

// Get Component Properties Tool
server.tool(
  "get_component_properties",
  "Get properties on a component or component set.",
  {
    componentId: z.string().describe("The ID of the component or component set"),
  },
  async ({ componentId }: { componentId: string }) => {
    try {
      const result = await sendCommandToFigma("get_component_properties", { componentId });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting component properties", error);
    }
  }
);

// Add Component Property Tool
server.tool(
  "add_component_property",
  "Add a property (BOOLEAN/TEXT/INSTANCE_SWAP/VARIANT).",
  {
    componentId: z.string().describe("The ID of the component or component set"),
    propertyName: z.string().describe("Name of the property (e.g., 'showIcon', 'label', 'iconSlot')"),
    propertyType: z.enum(["BOOLEAN", "TEXT", "INSTANCE_SWAP", "VARIANT"]).describe("Type of property: BOOLEAN for toggles, TEXT for strings, INSTANCE_SWAP for swappable components, VARIANT for variant selection"),
    defaultValue: z.union([z.string(), z.boolean()]).describe("Default value for the property (string for TEXT/INSTANCE_SWAP/VARIANT, boolean for BOOLEAN)"),
    preferredValues: z.array(z.object({
      type: z.enum(["COMPONENT", "COMPONENT_SET"]),
      key: z.string(),
    })).optional().describe("For INSTANCE_SWAP: preferred components that can be swapped in"),
    variantOptions: z.array(z.string()).optional().describe("For VARIANT type: array of variant option values"),
  },
  async ({ componentId, propertyName, propertyType, defaultValue, preferredValues, variantOptions }: {
    componentId: string;
    propertyName: string;
    propertyType: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT";
    defaultValue: string | boolean;
    preferredValues?: Array<{ type: "COMPONENT" | "COMPONENT_SET"; key: string }>;
    variantOptions?: string[];
  }) => {
    try {
      const result = await sendCommandToFigma("add_component_property", {
        componentId,
        propertyName,
        propertyType,
        defaultValue,
        preferredValues,
        variantOptions,
      });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("adding component property", error);
    }
  }
);

// Set Component Property Value Tool
server.tool(
  "set_component_property_value",
  "Set a property value on a component instance.",
  {
    instanceId: z.string().describe("The ID of the component instance"),
    propertyName: z.string().describe("Name of the property to set"),
    value: z.union([z.string(), z.boolean()]).describe("Value to set (must match property type)"),
  },
  async ({ instanceId, propertyName, value }: { instanceId: string; propertyName: string; value: string | boolean }) => {
    try {
      const result = await sendCommandToFigma("set_component_property_value", { instanceId, propertyName, value });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("setting component property value", error);
    }
  }
);

// Set Component Property References Tool
server.tool(
  "set_component_property_references",
  "Wire a nested instance to component properties.",
  {
    nodeId: z.string().describe("The ID of the instance node inside the component to bind"),
    references: z.record(z.string(), z.string()).describe("Property references map, e.g. { mainComponent: 'propertyName#hash' } for INSTANCE_SWAP binding"),
  },
  async ({ nodeId, references }: { nodeId: string; references: Record<string, string> }) => {
    try {
      const result = await sendCommandToFigma("set_component_property_references", { nodeId, references });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("setting component property references", error);
    }
  }
);

// Get Annotations Tool
server.tool(
  "get_annotations",
  "Get dev mode annotations from a node.",
  {
    nodeId: z.string().describe("node ID to get annotations for specific node"),
    includeCategories: z.boolean().optional().default(true).describe("Whether to include category information")
  },
  async ({ nodeId, includeCategories }: any) => {
    try {
      const result = await sendCommandToFigma("get_annotations", {
        nodeId,
        includeCategories
      });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("getting annotations", error);
    }
  }
);

// Set Annotation Tool
server.tool(
  "set_annotation",
  "Create or update an annotation on a node.",
  {
    nodeId: z.string(),
    annotationId: z.string().optional().describe("The ID of the annotation to update (if updating existing annotation)"),
    labelMarkdown: z.string().describe("The annotation text in markdown format"),
    categoryId: z.string().optional().describe("The ID of the annotation category"),
    properties: z.array(z.object({
      type: z.string()
    })).optional().describe("Additional properties for the annotation")
  },
  async ({ nodeId, annotationId, labelMarkdown, categoryId, properties }: any) => {
    try {
      const result = await sendCommandToFigma("set_annotation", {
        nodeId,
        annotationId,
        labelMarkdown,
        categoryId,
        properties
      });
      return formatJsonResponse(result);
    } catch (error) {
      return formatErrorResponse("setting annotation", error);
    }
  }
);

interface SetMultipleAnnotationsParams {
  nodeId: string;
  annotations: Array<{
    nodeId: string;
    labelMarkdown: string;
    categoryId?: string;
    annotationId?: string;
    properties?: Array<{ type: string }>;
  }>;
}

// Set Multiple Annotations Tool
server.tool(
  "set_multiple_annotations",
  "Batch create/update annotations.",
  {
    nodeId: z
      .string()
      ,
    annotations: z
      .array(
        z.object({
          nodeId: z.string(),
          labelMarkdown: z.string().describe("The annotation text in markdown format"),
          categoryId: z.string().optional().describe("The ID of the annotation category"),
          annotationId: z.string().optional().describe("The ID of the annotation to update (if updating existing annotation)"),
          properties: z.array(z.object({
            type: z.string()
          })).optional().describe("Additional properties for the annotation")
        })
      )
      .describe("Array of annotations to apply"),
  },
  async ({ nodeId, annotations }: any) => {
    try {
      if (!annotations || annotations.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No annotations provided",
            },
          ],
        };
      }

      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: `Starting annotation process for ${annotations.length} nodes. This will be processed in batches of 5...`,
      };

      // Track overall progress
      let totalProcessed = 0;
      const totalToProcess = annotations.length;

      // Use the plugin's set_multiple_annotations function with chunking
      const result = await sendCommandToFigma("set_multiple_annotations", {
        nodeId,
        annotations,
      });

      // Cast the result to a specific type to work with it safely
      interface AnnotationResult {
        success: boolean;
        nodeId: string;
        annotationsApplied?: number;
        annotationsFailed?: number;
        totalAnnotations?: number;
        completedInChunks?: number;
        results?: Array<{
          success: boolean;
          nodeId: string;
          error?: string;
          annotationId?: string;
        }>;
      }

      const typedResult = result as AnnotationResult;

      // Format the results for display
      const success = typedResult.annotationsApplied && typedResult.annotationsApplied > 0;
      const progressText = `
      Annotation process completed:
      - ${typedResult.annotationsApplied || 0} of ${totalToProcess} successfully applied
      - ${typedResult.annotationsFailed || 0} failed
      - Processed in ${typedResult.completedInChunks || 1} batches
      `;

      // Detailed results
      const detailedResults = typedResult.results || [];
      const failedResults = detailedResults.filter(item => !item.success);

      // Create the detailed part of the response
      let detailedResponse = "";
      if (failedResults.length > 0) {
        detailedResponse = `\n\nNodes that failed:\n${failedResults.map(item =>
          `- ${item.nodeId}: ${item.error || "Unknown error"}`
        ).join('\n')}`;
      }

      return {
        content: [
          initialStatus,
          {
            type: "text" as const,
            text: progressText + detailedResponse,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting multiple annotations", error);
    }
  }
);

// Create Component Instance Tool
server.tool(
  "create_component_instance",
  "Create an instance of a component by ID or key.",
  {
    componentKey: z.string().optional().describe("Key of the component to instantiate (for remote/library components)"),
    componentId: z.string().optional().describe("Node ID of a local component to instantiate (preferred for local components)"),
    x: z.number().optional().default(0),
    y: z.number().optional().default(0),
    parentId: z.string().optional().describe("Parent node ID to append the instance into (e.g., a frame or component variant)"),
  },
  async ({ componentKey, componentId, x, y, parentId }: any) => {
    try {
      const result = await sendCommandToFigma("create_component_instance", {
        componentKey,
        componentId,
        x,
        y,
        parentId,
      });
      const typedResult = result as getInstanceOverridesResult;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(typedResult),
          }
        ]
      }
    } catch (error) {
      return formatErrorResponse("creating component instance", error);
    }
  }
);

// Create Multiple Component Instances Tool (batch)
server.tool(
  "create_multiple_component_instances",
  "Batch create component instances with progress.",
  {
    instances: z.array(z.object({
      componentId: z.string().optional().describe("Node ID of a local component to instantiate"),
      componentKey: z.string().optional().describe("Key of the component to instantiate (for remote/library components)"),
      parentId: z.string().describe("Parent node ID to insert the instance into"),
      name: z.string().optional().describe("Name to assign to the instance"),
      insertIndex: z.number().optional().describe("Child index to insert at (0 = first child). If omitted, appends as last child."),
      visible: z.boolean().optional().describe("Whether the instance should be visible (default: true)"),
    })).describe("Array of instances to create"),
  },
  async ({ instances }: any) => {
    try {
      const result = await sendCommandToFigma("create_multiple_component_instances", { instances });
      const typedResult = result as { success: boolean; successCount: number; failureCount: number; totalInstances: number };
      return {
        content: [
          {
            type: "text" as const,
            text: `Batch instance creation complete: ${typedResult.successCount}/${typedResult.totalInstances} successful` +
              (typedResult.failureCount > 0 ? ` (${typedResult.failureCount} failed)` : ''),
          },
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating component instances", error);
    }
  }
);

// Set Multiple Component Property References Tool (batch)
server.tool(
  "set_multiple_component_property_references",
  "Batch wire instances to component properties.",
  {
    bindings: z.array(z.object({
      nodeId: z.string().describe("ID of the instance node inside the component to bind"),
      references: z.record(z.string(), z.string()).describe("Property references map, e.g. { mainComponent: 'leadingIcon#hash', visible: 'showLeadingIcon#hash' }"),
    })).describe("Array of bindings to apply"),
  },
  async ({ bindings }: any) => {
    try {
      const result = await sendCommandToFigma("set_multiple_component_property_references", { bindings });
      const typedResult = result as { success: boolean; successCount: number; failureCount: number; totalBindings: number };
      return {
        content: [
          {
            type: "text" as const,
            text: `Batch reference binding complete: ${typedResult.successCount}/${typedResult.totalBindings} successful` +
              (typedResult.failureCount > 0 ? ` (${typedResult.failureCount} failed)` : ''),
          },
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting component property references", error);
    }
  }
);

// Copy Instance Overrides Tool
server.tool(
  "get_instance_overrides",
  "Capture overrides from a component instance.",
  {
    nodeId: z.string().optional().describe("Optional ID of the component instance to get overrides from. If not provided, currently selected instance will be used."),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("get_instance_overrides", {
        instanceNodeId: nodeId || null
      });
      const typedResult = result as getInstanceOverridesResult;

      return {
        content: [
          {
            type: "text",
            text: typedResult.success
              ? `Successfully got instance overrides: ${typedResult.message}`
              : `Failed to get instance overrides: ${typedResult.message}`
          }
        ]
      };
    } catch (error) {
      return formatErrorResponse("copying instance overrides", error);
    }
  }
);

// Set Instance Overrides Tool
server.tool(
  "set_instance_overrides",
  "Apply captured overrides to target instances.",
  {
    sourceInstanceId: z.string().describe("ID of the source component instance"),
    targetNodeIds: z.array(z.string()).describe("Array of target instance IDs. Currently selected instances will be used.")
  },
  async ({ sourceInstanceId, targetNodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("set_instance_overrides", {
        sourceInstanceId: sourceInstanceId,
        targetNodeIds: targetNodeIds || []
      });
      const typedResult = result as setInstanceOverridesResult;

      if (typedResult.success) {
        const successCount = typedResult.results?.filter(r => r.success).length || 0;
        return {
          content: [
            {
              type: "text",
              text: `Successfully applied ${typedResult.totalCount || 0} overrides to ${successCount} instances.`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `Failed to set instance overrides: ${typedResult.message}`
            }
          ]
        };
      }
    } catch (error) {
      return formatErrorResponse("setting instance overrides", error);
    }
  }
);


// Set Corner Radius Tool
server.tool(
  "set_corner_radius",
  "Set corner radius, optionally per-corner.",
  {
    nodeId: z.string(),
    radius: z.number().min(0),
    corners: z
      .array(z.boolean())
      .length(4)
      .optional()
      .describe(
        "Optional array of 4 booleans to specify which corners to round [topLeft, topRight, bottomRight, bottomLeft]"
      ),
  },
  async ({ nodeId, radius, corners }: any) => {
    try {
      const result = await sendCommandToFigma("set_corner_radius", {
        nodeId,
        radius,
        corners: corners || [true, true, true, true],
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set corner radius of node "${typedResult.name}" to ${radius}px`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting corner radius", error);
    }
  }
);

// Set Opacity Tool
server.tool(
  "set_opacity",
  "Set node opacity (0=transparent, 1=opaque).",
  {
    nodeId: z.string(),
    opacity: z.number().min(0).max(1).describe("Opacity (0-1)"),
  },
  async ({ nodeId, opacity }: any) => {
    try {
      const result = await sendCommandToFigma("set_opacity", {
        nodeId,
        opacity,
      });
      const typedResult = result as { name: string; opacity: number };
      return {
        content: [
          {
            type: "text",
            text: `Set opacity of node "${typedResult.name}" to ${(typedResult.opacity * 100).toFixed(0)}%`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting opacity", error);
    }
  }
);

// Group Nodes Tool
server.tool(
  "group_nodes",
  "Group multiple nodes into a single group.",
  {
    nodeIds: z.array(z.string()).min(2),
    name: z.string().optional().describe("Group name"),
  },
  async ({ nodeIds, name }: any) => {
    try {
      const result = await sendCommandToFigma("group_nodes", {
        nodeIds,
        name: name || "Group",
      });
      const typedResult = result as { name: string; id: string; childCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Created group "${typedResult.name}" with ID: ${typedResult.id} containing ${typedResult.childCount} nodes`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("grouping nodes", error);
    }
  }
);

// Ungroup Node Tool
server.tool(
  "ungroup_node",
  "Dissolve a group, moving children to parent.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("ungroup_node", {
        nodeId,
      });
      const typedResult = result as { ungroupedNodes: Array<{ name: string; id: string }> };
      return {
        content: [
          {
            type: "text",
            text: `Ungrouped ${typedResult.ungroupedNodes.length} nodes: ${typedResult.ungroupedNodes.map(n => `"${n.name}" (${n.id})`).join(', ')}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("ungrouping node", error);
    }
  }
);

// ============================================================================
// Typography Tools
// ============================================================================

// Get Available Fonts Tool
server.tool(
  "get_available_fonts",
  "List available fonts, optionally filtered by name.",
  {
    filter: z.string().optional().describe("Filter by family name"),
  },
  async ({ filter }: any) => {
    try {
      const result = await sendCommandToFigma("get_available_fonts", { filter });
      const typedResult = result as { fonts: Array<{ family: string; styles: string[] }> };
      return {
        content: [
          {
            type: "text",
            text: `Found ${typedResult.fonts.length} font families${filter ? ` matching "${filter}"` : ''}:\n${
              typedResult.fonts.slice(0, 50).map(f => `- ${f.family}: ${f.styles.join(', ')}`).join('\n')
            }${typedResult.fonts.length > 50 ? `\n... and ${typedResult.fonts.length - 50} more` : ''}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting available fonts", error);
    }
  }
);

// Load Font Tool
server.tool(
  "load_font",
  "Load a font family+style for text operations.",
  {
    family: z.string().describe("Font family name"),
    style: z.string().optional().describe("Font style (default: Regular)"),
  },
  async ({ family, style }: any) => {
    try {
      const result = await sendCommandToFigma("load_font", {
        family,
        style: style || "Regular",
      });
      const typedResult = result as { success: boolean; family: string; style: string };
      return {
        content: [
          {
            type: "text",
            text: `Successfully loaded font: ${typedResult.family} ${typedResult.style}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("loading font", error);
    }
  }
);

// Get Text Styles Tool
server.tool(
  "get_text_styles",
  "Get all local text/typography styles.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_text_styles", {});
      const typedResult = result as { styles: Array<{ id: string; name: string; fontFamily: string; fontStyle: string; fontSize: number }> };
      return {
        content: [
          {
            type: "text",
            text: typedResult.styles.length > 0
              ? `Found ${typedResult.styles.length} text styles:\n${
                  typedResult.styles.map(s => `- "${s.name}" (ID: ${s.id}): ${s.fontFamily} ${s.fontStyle}, ${s.fontSize}px`).join('\n')
                }`
              : 'No text styles found in document. Use create_text_style to create one.',
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting text styles", error);
    }
  }
);

// Create Text Style Tool
server.tool(
  "create_text_style",
  "Create a reusable text style with font properties.",
  {
    name: z.string().describe("Name for the text style (e.g., 'Heading 1', 'Body Text')"),
    fontFamily: z.string().optional().describe("Font family (default: 'Inter')"),
    fontStyle: z.string().optional().describe("Font style (default: 'Regular')"),
    fontSize: z.number().positive().optional().describe("Font size in pixels (default: 14)"),
    letterSpacing: z.number().optional().describe("Letter spacing in pixels"),
    lineHeight: z.union([z.number().positive(), z.literal("AUTO")]).optional().describe("Line height in pixels, or 'AUTO' for automatic"),
    paragraphSpacing: z.number().min(0).optional().describe("Spacing between paragraphs in pixels"),
    textCase: z.enum(["ORIGINAL", "UPPER", "LOWER", "TITLE"]).optional().describe("Text case transformation"),
    textDecoration: z.enum(["NONE", "UNDERLINE", "STRIKETHROUGH"]).optional().describe("Text decoration"),
  },
  async ({ name, fontFamily, fontStyle, fontSize, letterSpacing, lineHeight, paragraphSpacing, textCase, textDecoration }: any) => {
    try {
      const result = await sendCommandToFigma("create_text_style", {
        name,
        fontFamily: fontFamily || "Inter",
        fontStyle: fontStyle || "Regular",
        fontSize: fontSize || 14,
        letterSpacing,
        lineHeight,
        paragraphSpacing,
        textCase,
        textDecoration,
      });
      const typedResult = result as { id: string; name: string; fontFamily: string; fontStyle: string; fontSize: number };
      return {
        content: [
          {
            type: "text",
            text: `Created text style "${typedResult.name}" (ID: ${typedResult.id}) with ${typedResult.fontFamily} ${typedResult.fontStyle}, ${typedResult.fontSize}px`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating text style", error);
    }
  }
);

// Apply Text Style Tool
server.tool(
  "apply_text_style",
  "Apply a text style to a text node by ID or name.",
  {
    nodeId: z.string(),
    styleId: z.string().optional().describe("The ID of the text style to apply"),
    styleName: z.string().optional().describe("The name of the text style to apply (alternative to styleId)"),
  },
  async ({ nodeId, styleId, styleName }: any) => {
    try {
      const result = await sendCommandToFigma("apply_text_style", {
        nodeId,
        styleId,
        styleName,
      });
      const typedResult = result as { id: string; name: string; textStyleName: string };
      return {
        content: [
          {
            type: "text",
            text: `Applied text style "${typedResult.textStyleName}" to node "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("applying text style", error);
    }
  }
);

// Set Text Properties Tool
server.tool(
  "set_text_properties",
  "Set typography properties directly on a text node.",
  {
    nodeId: z.string(),
    fontFamily: z.string().optional().describe("Font family (e.g., 'Roboto', 'Open Sans')"),
    fontStyle: z.string().optional().describe("Font style (e.g., 'Regular', 'Bold', 'Italic')"),
    fontSize: z.number().positive().optional().describe("Font size in pixels"),
    letterSpacing: z.number().optional().describe("Letter spacing in pixels"),
    lineHeight: z.union([z.number().positive(), z.literal("AUTO")]).optional().describe("Line height in pixels, or 'AUTO' for automatic"),
    paragraphSpacing: z.number().min(0).optional().describe("Spacing between paragraphs in pixels"),
    textCase: z.enum(["ORIGINAL", "UPPER", "LOWER", "TITLE"]).optional().describe("Text case transformation"),
    textDecoration: z.enum(["NONE", "UNDERLINE", "STRIKETHROUGH"]).optional().describe("Text decoration"),
    textAlignHorizontal: z.enum(["LEFT", "CENTER", "RIGHT", "JUSTIFIED"]).optional().describe("Horizontal text alignment"),
    textAlignVertical: z.enum(["TOP", "CENTER", "BOTTOM"]).optional().describe("Vertical text alignment"),
  },
  async ({ nodeId, fontFamily, fontStyle, fontSize, letterSpacing, lineHeight, paragraphSpacing, textCase, textDecoration, textAlignHorizontal, textAlignVertical }: any) => {
    try {
      const result = await sendCommandToFigma("set_text_properties", {
        nodeId,
        fontFamily,
        fontStyle,
        fontSize,
        letterSpacing,
        lineHeight,
        paragraphSpacing,
        textCase,
        textDecoration,
        textAlignHorizontal,
        textAlignVertical,
      });
      const typedResult = result as { id: string; name: string };
      return {
        content: [
          {
            type: "text",
            text: `Updated text properties for node "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting text properties", error);
    }
  }
);

// ============================================================================
// Paint Style Tools
// ============================================================================

// Get Paint Styles Tool
server.tool(
  "get_paint_styles",
  "Get all local paint/color styles.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_paint_styles");
      const typedResult = result as { count: number; styles: Array<{ id: string; name: string; type: string; color?: { r: number; g: number; b: number; a: number } }> };
      return {
        content: [
          {
            type: "text",
            text: typedResult.count > 0
              ? `Found ${typedResult.count} paint styles:\n${
                  typedResult.styles.map(s => {
                    if (s.color) {
                      const hex = `#${Math.round(s.color.r * 255).toString(16).padStart(2, '0')}${Math.round(s.color.g * 255).toString(16).padStart(2, '0')}${Math.round(s.color.b * 255).toString(16).padStart(2, '0')}`;
                      return `- "${s.name}" (ID: ${s.id}): ${hex} (${s.type})`;
                    }
                    return `- "${s.name}" (ID: ${s.id}): ${s.type}`;
                  }).join('\n')
                }`
              : 'No paint styles found in document. Use create_paint_style to create one.',
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting paint styles", error);
    }
  }
);

// Create Paint Style Tool
server.tool(
  "create_paint_style",
  "Create a reusable solid color style.",
  {
    name: z.string().describe("Name for the paint style (e.g., 'Primary/500', 'Background/Light')"),
    color: rgbaSchema.describe("RGBA color values (each component 0-1)"),
  },
  async ({ name, color }: any) => {
    try {
      const result = await sendCommandToFigma("create_paint_style", {
        name,
        color: {
          r: color.r,
          g: color.g,
          b: color.b,
          a: color.a ?? 1,
        },
      });
      const typedResult = result as { id: string; name: string; key: string; color: { r: number; g: number; b: number; a: number } };
      const hex = `#${Math.round(typedResult.color.r * 255).toString(16).padStart(2, '0')}${Math.round(typedResult.color.g * 255).toString(16).padStart(2, '0')}${Math.round(typedResult.color.b * 255).toString(16).padStart(2, '0')}`;
      return {
        content: [
          {
            type: "text",
            text: `Created paint style "${typedResult.name}" (ID: ${typedResult.id}) with color ${hex}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating paint style", error);
    }
  }
);

// Update Paint Style Tool
server.tool(
  "update_paint_style",
  "Update a paint style name or color.",
  {
    styleId: z.string().describe("The ID of the paint style to update"),
    name: z.string().optional().describe("New name for the paint style"),
    color: optionalRgbaSchema("New RGBA color values"),
  },
  async ({ styleId, name, color }: any) => {
    try {
      const result = await sendCommandToFigma("update_paint_style", {
        styleId,
        name,
        color: color ? {
          r: color.r,
          g: color.g,
          b: color.b,
          a: color.a ?? 1,
        } : undefined,
      });
      const typedResult = result as { id: string; name: string; color?: { r: number; g: number; b: number; a: number } };
      let response = `Updated paint style "${typedResult.name}" (ID: ${typedResult.id})`;
      if (typedResult.color) {
        const hex = `#${Math.round(typedResult.color.r * 255).toString(16).padStart(2, '0')}${Math.round(typedResult.color.g * 255).toString(16).padStart(2, '0')}${Math.round(typedResult.color.b * 255).toString(16).padStart(2, '0')}`;
        response += ` with color ${hex}`;
      }
      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("updating paint style", error);
    }
  }
);

// Apply Paint Style Tool
server.tool(
  "apply_paint_style",
  "Apply a paint style to fills or strokes.",
  {
    nodeId: z.string(),
    styleId: z.string().optional().describe("The ID of the paint style to apply"),
    styleName: z.string().optional().describe("The name of the paint style to apply (alternative to styleId)"),
    property: z.enum(["fills", "strokes"]).optional().describe("Which property to apply the style to (default: fills)"),
  },
  async ({ nodeId, styleId, styleName, property }: any) => {
    try {
      const result = await sendCommandToFigma("apply_paint_style", {
        nodeId,
        styleId,
        styleName,
        property: property || "fills",
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; styleName: string; property: string };
      return {
        content: [
          {
            type: "text",
            text: `Applied paint style "${typedResult.styleName}" to ${typedResult.property} of node "${typedResult.nodeName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("applying paint style", error);
    }
  }
);

// Delete Paint Style Tool
server.tool(
  "delete_paint_style",
  "Delete a paint style from the document.",
  {
    styleId: z.string().describe("The ID of the paint style to delete"),
  },
  async ({ styleId }: any) => {
    try {
      const result = await sendCommandToFigma("delete_paint_style", {
        styleId,
      });
      const typedResult = result as { success: boolean; styleId: string; styleName: string };
      return {
        content: [
          {
            type: "text",
            text: `Deleted paint style "${typedResult.styleName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("deleting paint style", error);
    }
  }
);

// Set Gradient Fill Tool
server.tool(
  "set_gradient_fill",
  "Apply a gradient fill with color stops.",
  {
    nodeId: z.string(),
    gradientType: z.enum(["LINEAR", "RADIAL", "ANGULAR", "DIAMOND"]).describe("Type of gradient"),
    stops: z.array(z.object({
      position: z.number().min(0).max(1).describe("Position of the stop (0-1)"),
      color: rgbaSchema.describe("Color at this stop"),
    })).min(2).describe("Array of gradient color stops (minimum 2 stops required)"),
    angle: z.number().optional().describe("Rotation angle in degrees for linear gradients (default: 0)"),
  },
  async ({ nodeId, gradientType, stops, angle }: any) => {
    try {
      const result = await sendCommandToFigma("set_gradient_fill", {
        nodeId,
        gradientType,
        stops,
        angle: angle ?? 0,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; gradientType: string; stopsCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Applied ${typedResult.gradientType} gradient with ${typedResult.stopsCount} stops to node "${typedResult.nodeName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting gradient fill", error);
    }
  }
);

// ============================================================================
// Effect Style Tools
// ============================================================================

// Get Effect Styles Tool
server.tool(
  "get_effect_styles",
  "Get all local effect styles (shadows, blurs).",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_effect_styles");
      const typedResult = result as { count: number; styles: Array<{ id: string; name: string; effects: Array<{ type: string; radius?: number; offset?: { x: number; y: number } }> }> };
      return {
        content: [
          {
            type: "text",
            text: typedResult.count > 0
              ? `Found ${typedResult.count} effect styles:\n${
                  typedResult.styles.map(s => {
                    const effectDesc = s.effects.map(e => {
                      if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
                        return `${e.type} (offset: ${e.offset?.x ?? 0}, ${e.offset?.y ?? 0}, blur: ${e.radius ?? 0})`;
                      }
                      return `${e.type} (radius: ${e.radius ?? 0})`;
                    }).join(', ');
                    return `- "${s.name}" (ID: ${s.id}): ${effectDesc || 'no effects'}`;
                  }).join('\n')
                }`
              : 'No effect styles found in document. Use create_effect_style to create one.',
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting effect styles", error);
    }
  }
);

// Create Effect Style Tool
server.tool(
  "create_effect_style",
  "Create a reusable effect style (shadows/blurs).",
  {
    name: z.string().describe("Name for the effect style (e.g., 'Shadow/Small', 'Blur/Background')"),
    effects: z.array(z.object({
      type: z.enum(["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]).describe("Type of effect"),
      color: optionalRgbaSchema("Color for shadow effects"),
      offsetX: z.number().optional().describe("Horizontal offset for shadows"),
      offsetY: z.number().optional().describe("Vertical offset for shadows"),
      radius: z.number().min(0).optional().describe("Blur radius"),
      spread: z.number().optional().describe("Spread for shadows"),
      visible: z.boolean().optional().describe("Whether the effect is visible (default: true)"),
    })).min(1).describe("Array of effects to include in the style"),
  },
  async ({ name, effects }: any) => {
    try {
      const result = await sendCommandToFigma("create_effect_style", {
        name,
        effects,
      });
      const typedResult = result as { id: string; name: string; key: string; effects: Array<{ type: string }> };
      return {
        content: [
          {
            type: "text",
            text: `Created effect style "${typedResult.name}" (ID: ${typedResult.id}) with ${typedResult.effects.length} effect(s)`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating effect style", error);
    }
  }
);

// Apply Effect Style Tool
server.tool(
  "apply_effect_style",
  "Apply an effect style to a node by ID or name.",
  {
    nodeId: z.string(),
    styleId: z.string().optional().describe("The ID of the effect style to apply"),
    styleName: z.string().optional().describe("The name of the effect style to apply (alternative to styleId)"),
  },
  async ({ nodeId, styleId, styleName }: any) => {
    try {
      const result = await sendCommandToFigma("apply_effect_style", {
        nodeId,
        styleId,
        styleName,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; styleName: string };
      return {
        content: [
          {
            type: "text",
            text: `Applied effect style "${typedResult.styleName}" to node "${typedResult.nodeName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("applying effect style", error);
    }
  }
);

// Delete Effect Style Tool
server.tool(
  "delete_effect_style",
  "Delete an effect style from the document.",
  {
    styleId: z.string().describe("The ID of the effect style to delete"),
  },
  async ({ styleId }: any) => {
    try {
      const result = await sendCommandToFigma("delete_effect_style", {
        styleId,
      });
      const typedResult = result as { success: boolean; styleId: string; styleName: string };
      return {
        content: [
          {
            type: "text",
            text: `Deleted effect style "${typedResult.styleName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("deleting effect style", error);
    }
  }
);

// Set Effects Tool
server.tool(
  "set_effects",
  "Replace all effects on a node with a new set.",
  {
    nodeId: z.string(),
    effects: z.array(z.object({
      type: z.enum(["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]).describe("Type of effect"),
      color: optionalRgbaSchema("Color for shadow effects"),
      offsetX: z.number().optional().describe("Horizontal offset for shadows"),
      offsetY: z.number().optional().describe("Vertical offset for shadows"),
      radius: z.number().min(0).optional().describe("Blur radius"),
      spread: z.number().optional().describe("Spread for shadows"),
      visible: z.boolean().optional().describe("Whether the effect is visible (default: true)"),
    })).describe("Array of effects to apply"),
  },
  async ({ nodeId, effects }: any) => {
    try {
      const result = await sendCommandToFigma("set_effects", {
        nodeId,
        effects,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; effectsCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Applied ${typedResult.effectsCount} effect(s) to node "${typedResult.nodeName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting effects", error);
    }
  }
);

// Add Drop Shadow Tool
server.tool(
  "add_drop_shadow",
  "Add a drop shadow without removing existing effects.",
  {
    nodeId: z.string(),
    color: rgbaSchema.describe("Shadow color"),
    offsetX: z.number().optional().describe("Horizontal offset in pixels (default: 0)"),
    offsetY: z.number().optional().describe("Vertical offset in pixels (default: 4)"),
    radius: z.number().min(0).optional().describe("Blur radius in pixels (default: 4)"),
    spread: z.number().optional().describe("Spread in pixels (default: 0)"),
    visible: z.boolean().optional().describe("Whether the shadow is visible (default: true)"),
  },
  async ({ nodeId, color, offsetX, offsetY, radius, spread, visible }: any) => {
    try {
      const result = await sendCommandToFigma("add_drop_shadow", {
        nodeId,
        color,
        offsetX,
        offsetY,
        radius,
        spread,
        visible,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; effectsCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Added drop shadow to node "${typedResult.nodeName}" (now has ${typedResult.effectsCount} effect(s))`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("adding drop shadow", error);
    }
  }
);

// Add Inner Shadow Tool
server.tool(
  "add_inner_shadow",
  "Add an inner shadow without removing existing effects.",
  {
    nodeId: z.string(),
    color: rgbaSchema.describe("Shadow color"),
    offsetX: z.number().optional().describe("Horizontal offset in pixels (default: 0)"),
    offsetY: z.number().optional().describe("Vertical offset in pixels (default: 2)"),
    radius: z.number().min(0).optional().describe("Blur radius in pixels (default: 4)"),
    spread: z.number().optional().describe("Spread in pixels (default: 0)"),
    visible: z.boolean().optional().describe("Whether the shadow is visible (default: true)"),
  },
  async ({ nodeId, color, offsetX, offsetY, radius, spread, visible }: any) => {
    try {
      const result = await sendCommandToFigma("add_inner_shadow", {
        nodeId,
        color,
        offsetX,
        offsetY,
        radius,
        spread,
        visible,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; effectsCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Added inner shadow to node "${typedResult.nodeName}" (now has ${typedResult.effectsCount} effect(s))`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("adding inner shadow", error);
    }
  }
);

// Add Layer Blur Tool
server.tool(
  "add_layer_blur",
  "Add a layer blur effect to a node.",
  {
    nodeId: z.string(),
    radius: z.number().min(0).describe("Blur radius in pixels"),
    visible: z.boolean().optional().describe("Whether the blur is visible (default: true)"),
  },
  async ({ nodeId, radius, visible }: any) => {
    try {
      const result = await sendCommandToFigma("add_layer_blur", {
        nodeId,
        radius,
        visible,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; effectsCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Added layer blur (radius: ${radius}px) to node "${typedResult.nodeName}" (now has ${typedResult.effectsCount} effect(s))`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("adding layer blur", error);
    }
  }
);

// Add Background Blur Tool
server.tool(
  "add_background_blur",
  "Add a background blur (frosted glass) to a node.",
  {
    nodeId: z.string(),
    radius: z.number().min(0).describe("Blur radius in pixels"),
    visible: z.boolean().optional().describe("Whether the blur is visible (default: true)"),
  },
  async ({ nodeId, radius, visible }: any) => {
    try {
      const result = await sendCommandToFigma("add_background_blur", {
        nodeId,
        radius,
        visible,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; effectsCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Added background blur (radius: ${radius}px) to node "${typedResult.nodeName}" (now has ${typedResult.effectsCount} effect(s))`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("adding background blur", error);
    }
  }
);

// ============================================================================
// Constraints Tools (Responsive Design)
// ============================================================================

// Get Constraints Tool
server.tool(
  "get_constraints",
  "Get responsive layout constraints of a node.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("get_constraints", { nodeId });
      const typedResult = result as { nodeId: string; nodeName: string; horizontal: string; vertical: string };
      return {
        content: [
          {
            type: "text",
            text: `Constraints for "${typedResult.nodeName}":\n- Horizontal: ${typedResult.horizontal}\n- Vertical: ${typedResult.vertical}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting constraints", error);
    }
  }
);

// Set Constraints Tool
server.tool(
  "set_constraints",
  "Set responsive constraints (MIN/CENTER/MAX/STRETCH/SCALE).",
  {
    nodeId: z.string(),
    horizontal: z.enum(["MIN", "CENTER", "MAX", "STRETCH", "SCALE"]).optional(),
    vertical: z.enum(["MIN", "CENTER", "MAX", "STRETCH", "SCALE"]).optional(),
  },
  async ({ nodeId, horizontal, vertical }: any) => {
    try {
      const result = await sendCommandToFigma("set_constraints", {
        nodeId,
        horizontal,
        vertical,
      });
      const typedResult = result as { nodeId: string; nodeName: string; horizontal: string; vertical: string };
      return {
        content: [
          {
            type: "text",
            text: `Updated constraints for "${typedResult.nodeName}":\n- Horizontal: ${typedResult.horizontal}\n- Vertical: ${typedResult.vertical}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting constraints", error);
    }
  }
);

// ============================================================================
// Grid Style Tools
// ============================================================================

// Get Grid Styles Tool
server.tool(
  "get_grid_styles",
  "Get all local grid styles from the document.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_grid_styles");
      const typedResult = result as { count: number; styles: Array<{ id: string; name: string; grids: Array<{ pattern: string; count?: number; gutterSize?: number }> }> };
      return {
        content: [
          {
            type: "text",
            text: typedResult.count > 0
              ? `Found ${typedResult.count} grid styles:\n${
                  typedResult.styles.map(s => {
                    const gridDesc = s.grids.map(g => {
                      if (g.pattern === 'GRID') return 'Grid';
                      return `${g.pattern} (${g.count ?? 'auto'} cols, ${g.gutterSize ?? 0}px gutter)`;
                    }).join(', ');
                    return `- "${s.name}" (ID: ${s.id}): ${gridDesc || 'no grids'}`;
                  }).join('\n')
                }`
              : 'No grid styles found in document. Use create_grid_style to create one.',
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting grid styles", error);
    }
  }
);

// Create Grid Style Tool
server.tool(
  "create_grid_style",
  "Create a reusable grid style (columns/rows/grid).",
  {
    name: z.string().describe("Name for the grid style (e.g., '12-Column Grid', 'Mobile Layout')"),
    grids: z.array(z.object({
      pattern: z.enum(["COLUMNS", "ROWS", "GRID"]).describe("Type of grid: COLUMNS, ROWS, or GRID (uniform)"),
      sectionSize: z.number().optional().describe("Size of each section (for GRID pattern)"),
      visible: z.boolean().optional().describe("Whether the grid is visible (default: true)"),
      color: optionalRgbaSchema("Grid color"),
      alignment: z.enum(["MIN", "MAX", "CENTER", "STRETCH"]).optional().describe("Alignment for COLUMNS/ROWS"),
      gutterSize: z.number().optional().describe("Gutter size in pixels (for COLUMNS/ROWS)"),
      count: z.number().optional().describe("Number of columns/rows"),
      offset: z.number().optional().describe("Offset in pixels"),
    })).min(1).describe("Array of grid definitions"),
  },
  async ({ name, grids }: any) => {
    try {
      const result = await sendCommandToFigma("create_grid_style", {
        name,
        grids,
      });
      const typedResult = result as { id: string; name: string; key: string; grids: Array<{ pattern: string }> };
      return {
        content: [
          {
            type: "text",
            text: `Created grid style "${typedResult.name}" (ID: ${typedResult.id}) with ${typedResult.grids.length} grid(s)`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating grid style", error);
    }
  }
);

// Apply Grid Style Tool
server.tool(
  "apply_grid_style",
  "Apply a grid style to a frame.",
  {
    nodeId: z.string(),
    styleId: z.string().optional().describe("The ID of the grid style to apply"),
    styleName: z.string().optional().describe("The name of the grid style to apply (alternative to styleId)"),
  },
  async ({ nodeId, styleId, styleName }: any) => {
    try {
      const result = await sendCommandToFigma("apply_grid_style", {
        nodeId,
        styleId,
        styleName,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; styleName: string };
      return {
        content: [
          {
            type: "text",
            text: `Applied grid style "${typedResult.styleName}" to frame "${typedResult.nodeName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("applying grid style", error);
    }
  }
);

// Delete Grid Style Tool
server.tool(
  "delete_grid_style",
  "Delete a grid style from the document.",
  {
    styleId: z.string().describe("The ID of the grid style to delete"),
  },
  async ({ styleId }: any) => {
    try {
      const result = await sendCommandToFigma("delete_grid_style", { styleId });
      const typedResult = result as { success: boolean; styleId: string; styleName: string };
      return {
        content: [
          {
            type: "text",
            text: `Deleted grid style "${typedResult.styleName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("deleting grid style", error);
    }
  }
);

// Set Layout Grids Tool
server.tool(
  "set_layout_grids",
  "Set layout grids directly on a frame.",
  {
    nodeId: z.string(),
    grids: z.array(z.object({
      pattern: z.enum(["COLUMNS", "ROWS", "GRID"]).describe("Type of grid"),
      sectionSize: z.number().optional().describe("Size of each section"),
      visible: z.boolean().optional().describe("Whether visible"),
      color: optionalRgbaSchema("Grid color"),
      alignment: z.enum(["MIN", "MAX", "CENTER", "STRETCH"]).optional(),
      gutterSize: z.number().optional(),
      count: z.number().optional(),
      offset: z.number().optional(),
    })).describe("Array of grids to apply"),
  },
  async ({ nodeId, grids }: any) => {
    try {
      const result = await sendCommandToFigma("set_layout_grids", {
        nodeId,
        grids,
      });
      const typedResult = result as { success: boolean; nodeId: string; nodeName: string; gridsCount: number };
      return {
        content: [
          {
            type: "text",
            text: `Applied ${typedResult.gridsCount} grid(s) to frame "${typedResult.nodeName}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting layout grids", error);
    }
  }
);

// Define design strategy prompt
server.prompt(
  "design_strategy",
  "Best practices for working with Figma designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `When working with Figma designs, follow these best practices:

1. Start with Document Structure:
   - First use get_document_info() to understand the current document
   - Plan your layout hierarchy before creating elements
   - Create a main container frame for each screen/section

2. Naming Conventions:
   - Use descriptive, semantic names for all elements
   - Follow a consistent naming pattern (e.g., "Login Screen", "Logo Container", "Email Input")
   - Group related elements with meaningful names

3. Layout Hierarchy:
   - Create parent frames first, then add child elements
   - For forms/login screens:
     * Start with the main screen container frame
     * Create a logo container at the top
     * Group input fields in their own containers
     * Place action buttons (login, submit) after inputs
     * Add secondary elements (forgot password, signup links) last

4. Input Fields Structure:
   - Create a container frame for each input field
   - Include a label text above or inside the input
   - Group related inputs (e.g., username/password) together

5. Element Creation:
   - Use create_frame() for containers and input fields
   - Use create_text() for labels, buttons text, and links
   - Set appropriate colors and styles:
     * Use fillColor for backgrounds
     * Use strokeColor for borders
     * Set proper fontWeight for different text elements

6. Mofifying existing elements:
  - use set_text_content() to modify text content.

7. Visual Hierarchy:
   - Position elements in logical reading order (top to bottom)
   - Maintain consistent spacing between elements
   - Use appropriate font sizes for different text types:
     * Larger for headings/welcome text
     * Medium for input labels
     * Standard for button text
     * Smaller for helper text/links

8. Best Practices:
   - Verify each creation with get_node_info()
   - Use parentId to maintain proper hierarchy
   - Group related elements together in frames
   - Keep consistent spacing and alignment

Example Login Screen Structure:
- Login Screen (main frame)
  - Logo Container (frame)
    - Logo (image/text)
  - Welcome Text (text)
  - Input Container (frame)
    - Email Input (frame)
      - Email Label (text)
      - Email Field (frame)
    - Password Input (frame)
      - Password Label (text)
      - Password Field (frame)
  - Login Button (frame)
    - Button Text (text)
  - Helper Links (frame)
    - Forgot Password (text)
    - Don't have account (text)`,
          },
        },
      ],
      description: "Best practices for working with Figma designs",
    };
  }
);

server.prompt(
  "read_design_strategy",
  "Best practices for reading Figma designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `When reading Figma designs, follow these best practices:

1. Start with selection:
   - First use read_my_design() to understand the current selection
   - If no selection ask user to select single or multiple nodes
`,
          },
        },
      ],
      description: "Best practices for reading Figma designs",
    };
  }
);

// Text Node Scanning Tool
server.tool(
  "scan_text_nodes",
  "Recursively find all text nodes in a subtree.",
  {
    nodeId: z.string().describe("ID of the node to scan"),
    maxResults: z.number().positive().optional().describe("Max nodes to return"),
  },
  async ({ nodeId, maxResults }: any) => {
    try {
      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: "Starting text node scanning. This may take a moment for large designs...",
      };

      // Use the plugin's scan_text_nodes function with chunking flag
      const result = await sendCommandToFigma("scan_text_nodes", {
        nodeId,
        maxResults,
        useChunking: true,  // Enable chunking on the plugin side
        chunkSize: 10       // Process 10 nodes at a time
      });

      // If the result indicates chunking was used, format the response accordingly
      if (result && typeof result === 'object' && 'chunks' in result) {
        const typedResult = result as {
          success: boolean,
          totalNodes: number,
          processedNodes: number,
          chunks: number,
          textNodes: Array<any>
        };

        const summaryText = `
        Scan completed:
        - Found ${typedResult.totalNodes} text nodes
        - Processed in ${typedResult.chunks} chunks
        `;

        return {
          content: [
            initialStatus,
            {
              type: "text" as const,
              text: summaryText
            },
            {
              type: "text" as const,
              text: JSON.stringify(typedResult.textNodes)
            }
          ],
        };
      }

      // If chunking wasn't used or wasn't reported in the result format, return the result as is
      return {
        content: [
          initialStatus,
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("scanning text nodes", error);
    }
  }
);

// Node Type Scanning Tool
server.tool(
  "scan_nodes_by_types",
  "Find descendant nodes matching specific types.",
  {
    nodeId: z.string().describe("ID of the node to scan"),
    types: z.array(z.string()).describe("Array of node types to find in the child nodes (e.g. ['COMPONENT', 'FRAME'])"),
    maxResults: z.number().positive().optional().describe("Max nodes to return"),
  },
  async ({ nodeId, types, maxResults }: any) => {
    try {
      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: `Starting node type scanning for types: ${types.join(', ')}...`,
      };

      // Use the plugin's scan_nodes_by_types function
      const result = await sendCommandToFigma("scan_nodes_by_types", {
        parentNodeId: nodeId,
        types,
        maxResults,
      });

      // Format the response
      if (result && typeof result === 'object' && 'matchingNodes' in result) {
        const typedResult = result as {
          success: boolean,
          count: number,
          matchingNodes: Array<{
            id: string,
            name: string,
            type: string,
            bbox: {
              x: number,
              y: number,
              width: number,
              height: number
            }
          }>,
          searchedTypes: Array<string>
        };

        const summaryText = `Scan completed: Found ${typedResult.count} nodes matching types: ${typedResult.searchedTypes.join(', ')}`;

        return {
          content: [
            initialStatus,
            {
              type: "text" as const,
              text: summaryText
            },
            {
              type: "text" as const,
              text: JSON.stringify(typedResult.matchingNodes)
            }
          ],
        };
      }

      // If the result is in an unexpected format, return it as is
      return {
        content: [
          initialStatus,
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("scanning nodes by types", error);
    }
  }
);

// Bind Multiple Variables Tool (batch)
server.tool(
  "bind_multiple_variables",
  "Batch bind variables to node properties.",
  {
    bindings: z.array(z.object({
      nodeId: z.string().describe("ID of the node to bind"),
      field: z.string().describe("Field to bind (fills, strokes, cornerRadius, opacity, etc.)"),
      variableId: z.string().describe("ID of the variable to bind"),
    })).describe("Array of bindings to apply"),
  },
  async ({ bindings }: any) => {
    try {
      const result = await sendCommandToFigma("bind_multiple_variables", { bindings });
      const typedResult = result as { success: boolean; successCount: number; failureCount: number; totalBindings: number };
      return {
        content: [
          {
            type: "text" as const,
            text: `Batch variable binding complete: ${typedResult.successCount}/${typedResult.totalBindings} successful` +
              (typedResult.failureCount > 0 ? ` (${typedResult.failureCount} failed)` : ''),
          },
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("binding variables", error);
    }
  }
);

// Rename Node Tool
server.tool(
  "rename_node",
  "Rename a single node.",
  {
    nodeId: z.string().describe("ID of the node to rename"),
    name: z.string().describe("New name for the node"),
  },
  async ({ nodeId, name }: any) => {
    try {
      const result = await sendCommandToFigma("rename_node", { nodeId, name });
      return {
        content: [
          {
            type: "text" as const,
            text: `Renamed node ${nodeId} to "${name}"`,
          },
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("renaming node", error);
    }
  }
);

// Rename Multiple Nodes Tool (batch)
server.tool(
  "rename_multiple_nodes",
  "Batch rename multiple nodes.",
  {
    renames: z.array(z.object({
      nodeId: z.string().describe("ID of the node to rename"),
      name: z.string().describe("New name for the node"),
    })).describe("Array of renames to apply"),
  },
  async ({ renames }: any) => {
    try {
      const result = await sendCommandToFigma("rename_multiple_nodes", { renames });
      const typedResult = result as { success: boolean; successCount: number; failureCount: number; totalNodes: number };
      return {
        content: [
          {
            type: "text" as const,
            text: `Batch rename complete: ${typedResult.successCount}/${typedResult.totalNodes} successful` +
              (typedResult.failureCount > 0 ? ` (${typedResult.failureCount} failed)` : ''),
          },
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("renaming nodes", error);
    }
  }
);

// Apply Style Batch Tool
server.tool(
  "apply_style_batch",
  "Batch apply a style (text/paint/effect/grid) to multiple nodes.",
  {
    styleType: z.enum(["TEXT", "PAINT", "EFFECT", "GRID"]),
    styleId: z.string().optional().describe("Style ID to apply"),
    styleName: z.string().optional().describe("Style name to apply (alternative to styleId)"),
    nodeIds: z.array(z.string()),
    property: z.enum(["fills", "strokes"]).optional().describe("For PAINT styles only"),
  },
  async ({ styleType, styleId, styleName, nodeIds, property }: any) => {
    try {
      const result = await sendCommandToFigma("apply_style_batch", {
        styleType,
        styleId,
        styleName,
        nodeIds,
        property,
      });
      const typedResult = result as { success: boolean; successCount: number; failureCount: number; totalNodes: number };
      return formatTextResponse(
        `Applied ${styleType} style to ${typedResult.successCount}/${typedResult.totalNodes} nodes` +
        (typedResult.failureCount > 0 ? ` (${typedResult.failureCount} failed)` : '')
      );
    } catch (error) {
      return formatErrorResponse("applying style batch", error);
    }
  }
);

// Set Paint Batch Tool
server.tool(
  "set_paint_batch",
  "Batch set fill/stroke colors on multiple nodes.",
  {
    updates: z.array(z.object({
      nodeId: z.string(),
      property: z.enum(["fills", "strokes"]).optional(),
      color: rgbaSchema,
      weight: z.number().optional(),
    })),
  },
  async ({ updates }: any) => {
    try {
      const result = await sendCommandToFigma("set_paint_batch", { updates });
      const typedResult = result as { success: boolean; successCount: number; failureCount: number; totalNodes: number };
      return formatTextResponse(
        `Set paint on ${typedResult.successCount}/${typedResult.totalNodes} nodes` +
        (typedResult.failureCount > 0 ? ` (${typedResult.failureCount} failed)` : '')
      );
    } catch (error) {
      return formatErrorResponse("setting paint batch", error);
    }
  }
);

// Delete Component Property Tool
server.tool(
  "delete_component_property",
  "Delete a property from a component.",
  {
    componentId: z.string().describe("ID of the component or component set"),
    propertyName: z.string().describe("Full property name to delete (including hash suffix, e.g. 'testBool#36:0')"),
  },
  async ({ componentId, propertyName }: any) => {
    try {
      const result = await sendCommandToFigma("delete_component_property", { componentId, propertyName });
      return {
        content: [
          {
            type: "text" as const,
            text: `Deleted property "${propertyName}" from component ${componentId}`,
          },
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("deleting component property", error);
    }
  }
);

// Edit Component Property Tool
server.tool(
  "edit_component_property",
  "Edit a component property in-place.",
  {
    componentId: z.string().describe("ID of the component or component set"),
    propertyName: z.string().describe("Full property name including hash suffix (e.g. 'leadingIcon#36:46')"),
    newName: z.string().optional().describe("New display name for the property (without hash suffix)"),
    defaultValue: z.union([z.string(), z.boolean()]).optional().describe("New default value for the property"),
    preferredValues: z.array(z.object({
      type: z.enum(["COMPONENT", "COMPONENT_SET"]),
      key: z.string(),
    })).optional().describe("For INSTANCE_SWAP: set the preferred components shown in the swap dropdown"),
  },
  async ({ componentId, propertyName, newName, defaultValue, preferredValues }: {
    componentId: string;
    propertyName: string;
    newName?: string;
    defaultValue?: string | boolean;
    preferredValues?: Array<{ type: "COMPONENT" | "COMPONENT_SET"; key: string }>;
  }) => {
    try {
      const result = await sendCommandToFigma("edit_component_property", {
        componentId,
        propertyName,
        newName,
        defaultValue,
        preferredValues,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("editing component property", error);
    }
  }
);

// Text Replacement Strategy Prompt
server.prompt(
  "text_replacement_strategy",
  "Systematic approach for replacing text in Figma designs",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Intelligent Text Replacement Strategy

## 1. Analyze Design & Identify Structure
- Scan text nodes to understand the overall structure of the design
- Use AI pattern recognition to identify logical groupings:
  * Tables (rows, columns, headers, cells)
  * Lists (items, headers, nested lists)
  * Card groups (similar cards with recurring text fields)
  * Forms (labels, input fields, validation text)
  * Navigation (menu items, breadcrumbs)
\`\`\`
scan_text_nodes(nodeId: "node-id")
get_node_info(nodeId: "node-id")  // optional
\`\`\`

## 2. Strategic Chunking for Complex Designs
- Divide replacement tasks into logical content chunks based on design structure
- Use one of these chunking strategies that best fits the design:
  * **Structural Chunking**: Table rows/columns, list sections, card groups
  * **Spatial Chunking**: Top-to-bottom, left-to-right in screen areas
  * **Semantic Chunking**: Content related to the same topic or functionality
  * **Component-Based Chunking**: Process similar component instances together

## 3. Progressive Replacement with Verification
- Create a safe copy of the node for text replacement
- Replace text chunk by chunk with continuous progress updates
- After each chunk is processed:
  * Export that section as a small, manageable image
  * Verify text fits properly and maintain design integrity
  * Fix issues before proceeding to the next chunk

\`\`\`
// Clone the node to create a safe copy
clone_node(nodeId: "selected-node-id", x: [new-x], y: [new-y])

// Replace text chunk by chunk
set_multiple_text_contents(
  nodeId: "parent-node-id", 
  text: [
    { nodeId: "node-id-1", text: "New text 1" },
    // More nodes in this chunk...
  ]
)

// Verify chunk with small, targeted image exports
export_node_as_image(nodeId: "chunk-node-id", format: "PNG", scale: 0.5)
\`\`\`

## 4. Intelligent Handling for Table Data
- For tabular content:
  * Process one row or column at a time
  * Maintain alignment and spacing between cells
  * Consider conditional formatting based on cell content
  * Preserve header/data relationships

## 5. Smart Text Adaptation
- Adaptively handle text based on container constraints:
  * Auto-detect space constraints and adjust text length
  * Apply line breaks at appropriate linguistic points
  * Maintain text hierarchy and emphasis
  * Consider font scaling for critical content that must fit

## 6. Progressive Feedback Loop
- Establish a continuous feedback loop during replacement:
  * Real-time progress updates (0-100%)
  * Small image exports after each chunk for verification
  * Issues identified early and resolved incrementally
  * Quick adjustments applied to subsequent chunks

## 7. Final Verification & Context-Aware QA
- After all chunks are processed:
  * Export the entire design at reduced scale for final verification
  * Check for cross-chunk consistency issues
  * Verify proper text flow between different sections
  * Ensure design harmony across the full composition

## 8. Chunk-Specific Export Scale Guidelines
- Scale exports appropriately based on chunk size:
  * Small chunks (1-5 elements): scale 1.0
  * Medium chunks (6-20 elements): scale 0.7
  * Large chunks (21-50 elements): scale 0.5
  * Very large chunks (50+ elements): scale 0.3
  * Full design verification: scale 0.2

## Sample Chunking Strategy for Common Design Types

### Tables
- Process by logical rows (5-10 rows per chunk)
- Alternative: Process by column for columnar analysis
- Tip: Always include header row in first chunk for reference

### Card Lists
- Group 3-5 similar cards per chunk
- Process entire cards to maintain internal consistency
- Verify text-to-image ratio within cards after each chunk

### Forms
- Group related fields (e.g., "Personal Information", "Payment Details")
- Process labels and input fields together
- Ensure validation messages and hints are updated with their fields

### Navigation & Menus
- Process hierarchical levels together (main menu, submenu)
- Respect information architecture relationships
- Verify menu fit and alignment after replacement

## Best Practices
- **Preserve Design Intent**: Always prioritize design integrity
- **Structural Consistency**: Maintain alignment, spacing, and hierarchy
- **Visual Feedback**: Verify each chunk visually before proceeding
- **Incremental Improvement**: Learn from each chunk to improve subsequent ones
- **Balance Automation & Control**: Let AI handle repetitive replacements but maintain oversight
- **Respect Content Relationships**: Keep related content consistent across chunks

Remember that text is never just text—it's a core design element that must work harmoniously with the overall composition. This chunk-based strategy allows you to methodically transform text while maintaining design integrity.`,
          },
        },
      ],
      description: "Systematic approach for replacing text in Figma designs",
    };
  }
);

// Set Multiple Text Contents Tool
server.tool(
  "set_multiple_text_contents",
  "Batch update text on multiple text nodes.",
  {
    nodeId: z
      .string()
      .describe("The ID of the node containing the text nodes to replace"),
    text: z
      .array(
        z.object({
          nodeId: z.string().describe("The ID of the text node"),
          text: z.string().describe("The replacement text"),
        })
      )
      .describe("Array of text node IDs and their replacement texts"),
  },
  async ({ nodeId, text }: any) => {
    try {
      if (!text || text.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No text provided",
            },
          ],
        };
      }

      // Initial response to indicate we're starting the process
      const initialStatus = {
        type: "text" as const,
        text: `Starting text replacement for ${text.length} nodes. This will be processed in batches of 5...`,
      };

      // Track overall progress
      let totalProcessed = 0;
      const totalToProcess = text.length;

      // Use the plugin's set_multiple_text_contents function with chunking
      const result = await sendCommandToFigma("set_multiple_text_contents", {
        nodeId,
        text,
      });

      // Cast the result to a specific type to work with it safely
      interface TextReplaceResult {
        success: boolean;
        nodeId: string;
        replacementsApplied?: number;
        replacementsFailed?: number;
        totalReplacements?: number;
        completedInChunks?: number;
        results?: Array<{
          success: boolean;
          nodeId: string;
          error?: string;
          originalText?: string;
          translatedText?: string;
        }>;
      }

      const typedResult = result as TextReplaceResult;

      // Format the results for display
      const success = typedResult.replacementsApplied && typedResult.replacementsApplied > 0;
      const progressText = `
      Text replacement completed:
      - ${typedResult.replacementsApplied || 0} of ${totalToProcess} successfully updated
      - ${typedResult.replacementsFailed || 0} failed
      - Processed in ${typedResult.completedInChunks || 1} batches
      `;

      // Detailed results
      const detailedResults = typedResult.results || [];
      const failedResults = detailedResults.filter(item => !item.success);

      // Create the detailed part of the response
      let detailedResponse = "";
      if (failedResults.length > 0) {
        detailedResponse = `\n\nNodes that failed:\n${failedResults.map(item =>
          `- ${item.nodeId}: ${item.error || "Unknown error"}`
        ).join('\n')}`;
      }

      return {
        content: [
          initialStatus,
          {
            type: "text" as const,
            text: progressText + detailedResponse,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting multiple text contents", error);
    }
  }
);

// Annotation Conversion Strategy Prompt
server.prompt(
  "annotation_conversion_strategy",
  "Strategy for converting manual annotations to Figma's native annotations",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Automatic Annotation Conversion
            
## Process Overview

The process of converting manual annotations (numbered/alphabetical indicators with connected descriptions) to Figma's native annotations:

1. Get selected frame/component information
2. Scan and collect all annotation text nodes
3. Scan target UI elements (components, instances, frames)
4. Match annotations to appropriate UI elements
5. Apply native Figma annotations

## Step 1: Get Selection and Initial Setup

First, get the selected frame or component that contains annotations:

\`\`\`typescript
// Get the selected frame/component
const selection = await get_selection();
const selectedNodeId = selection[0].id

// Get available annotation categories for later use
const annotationData = await get_annotations({
  nodeId: selectedNodeId,
  includeCategories: true
});
const categories = annotationData.categories;
\`\`\`

## Step 2: Scan Annotation Text Nodes

Scan all text nodes to identify annotations and their descriptions:

\`\`\`typescript
// Get all text nodes in the selection
const textNodes = await scan_text_nodes({
  nodeId: selectedNodeId
});

// Filter and group annotation markers and descriptions

// Markers typically have these characteristics:
// - Short text content (usually single digit/letter)
// - Specific font styles (often bold)
// - Located in a container with "Marker" or "Dot" in the name
// - Have a clear naming pattern (e.g., "1", "2", "3" or "A", "B", "C")


// Identify description nodes
// Usually longer text nodes near markers or with matching numbers in path
  
\`\`\`

## Step 3: Scan Target UI Elements

Get all potential target elements that annotations might refer to:

\`\`\`typescript
// Scan for all UI elements that could be annotation targets
const targetNodes = await scan_nodes_by_types({
  nodeId: selectedNodeId,
  types: [
    "COMPONENT",
    "INSTANCE",
    "FRAME"
  ]
});
\`\`\`

## Step 4: Match Annotations to Targets

Match each annotation to its target UI element using these strategies in order of priority:

1. **Path-Based Matching**:
   - Look at the marker's parent container name in the Figma layer hierarchy
   - Remove any "Marker:" or "Annotation:" prefixes from the parent name
   - Find UI elements that share the same parent name or have it in their path
   - This works well when markers are grouped with their target elements

2. **Name-Based Matching**:
   - Extract key terms from the annotation description
   - Look for UI elements whose names contain these key terms
   - Consider both exact matches and semantic similarities
   - Particularly effective for form fields, buttons, and labeled components

3. **Proximity-Based Matching** (fallback):
   - Calculate the center point of the marker
   - Find the closest UI element by measuring distances to element centers
   - Consider the marker's position relative to nearby elements
   - Use this method when other matching strategies fail

Additional Matching Considerations:
- Give higher priority to matches found through path-based matching
- Consider the type of UI element when evaluating matches
- Take into account the annotation's context and content
- Use a combination of strategies for more accurate matching

## Step 5: Apply Native Annotations

Convert matched annotations to Figma's native annotations using batch processing:

\`\`\`typescript
// Prepare annotations array for batch processing
const annotationsToApply = Object.values(annotations).map(({ marker, description }) => {
  // Find target using multiple strategies
  const target = 
    findTargetByPath(marker, targetNodes) ||
    findTargetByName(description, targetNodes) ||
    findTargetByProximity(marker, targetNodes);
  
  if (target) {
    // Determine appropriate category based on content
    const category = determineCategory(description.characters, categories);

    // Determine appropriate additional annotationProperty based on content
    const annotationProperty = determineProperties(description.characters, target.type);
    
    return {
      nodeId: target.id,
      labelMarkdown: description.characters,
      categoryId: category.id,
      properties: annotationProperty
    };
  }
  return null;
}).filter(Boolean); // Remove null entries

// Apply annotations in batches using set_multiple_annotations
if (annotationsToApply.length > 0) {
  await set_multiple_annotations({
    nodeId: selectedNodeId,
    annotations: annotationsToApply
  });
}
\`\`\`


This strategy focuses on practical implementation based on real-world usage patterns, emphasizing the importance of handling various UI elements as annotation targets, not just text nodes.`
          },
        },
      ],
      description: "Strategy for converting manual annotations to Figma's native annotations",
    };
  }
);

// Instance Slot Filling Strategy Prompt
server.prompt(
  "swap_overrides_instances",
  "Guide to swap instance overrides between instances",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Swap Component Instance and Override Strategy

## Overview
This strategy enables transferring content and property overrides from a source instance to one or more target instances in Figma, maintaining design consistency while reducing manual work.

## Step-by-Step Process

### 1. Selection Analysis
- Use \`get_selection()\` to identify the parent component or selected instances
- For parent components, scan for instances with \`scan_nodes_by_types({ nodeId: "parent-id", types: ["INSTANCE"] })\`
- Identify custom slots by name patterns (e.g. "Custom Slot*" or "Instance Slot") or by examining text content
- Determine which is the source instance (with content to copy) and which are targets (where to apply content)

### 2. Extract Source Overrides
- Use \`get_instance_overrides()\` to extract customizations from the source instance
- This captures text content, property values, and style overrides
- Command syntax: \`get_instance_overrides({ nodeId: "source-instance-id" })\`
- Look for successful response like "Got component information from [instance name]"

### 3. Apply Overrides to Targets
- Apply captured overrides using \`set_instance_overrides()\`
- Command syntax:
  \`\`\`
  set_instance_overrides({
    sourceInstanceId: "source-instance-id", 
    targetNodeIds: ["target-id-1", "target-id-2", ...]
  })
  \`\`\`

### 4. Verification
- Verify results with \`get_node_info()\` or \`read_my_design()\`
- Confirm text content and style overrides have transferred successfully

## Key Tips
- Always join the appropriate channel first with \`join_channel()\`
- When working with multiple targets, check the full selection with \`get_selection()\`
- Preserve component relationships by using instance overrides rather than direct text manipulation`,
          },
        },
      ],
      description: "Strategy for transferring overrides between component instances in Figma",
    };
  }
);

// Set Layout Mode Tool
server.tool(
  "set_layout_mode",
  "Set auto-layout mode (HORIZONTAL/VERTICAL/NONE).",
  {
    nodeId: z.string(),
    layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).describe("Layout mode for the frame"),
    layoutWrap: z.enum(["NO_WRAP", "WRAP"]).optional().describe("Whether the auto-layout frame wraps its children")
  },
  async ({ nodeId, layoutMode, layoutWrap }: any) => {
    try {
      const result = await sendCommandToFigma("set_layout_mode", {
        nodeId,
        layoutMode,
        layoutWrap: layoutWrap || "NO_WRAP"
      });
      const typedResult = result as { name: string };
      return {
        content: [
          {
            type: "text",
            text: `Set layout mode of frame "${typedResult.name}" to ${layoutMode}${layoutWrap ? ` with ${layoutWrap}` : ''}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting layout mode", error);
    }
  }
);

// Set Padding Tool
server.tool(
  "set_padding",
  "Set padding on an auto-layout frame.",
  {
    nodeId: z.string(),
    paddingTop: z.number().optional().describe("Top padding value"),
    paddingRight: z.number().optional().describe("Right padding value"),
    paddingBottom: z.number().optional().describe("Bottom padding value"),
    paddingLeft: z.number().optional().describe("Left padding value"),
  },
  async ({ nodeId, paddingTop, paddingRight, paddingBottom, paddingLeft }: any) => {
    try {
      const result = await sendCommandToFigma("set_padding", {
        nodeId,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
      });
      const typedResult = result as { name: string };

      // Create a message about which padding values were set
      const paddingMessages = [];
      if (paddingTop !== undefined) paddingMessages.push(`top: ${paddingTop}`);
      if (paddingRight !== undefined) paddingMessages.push(`right: ${paddingRight}`);
      if (paddingBottom !== undefined) paddingMessages.push(`bottom: ${paddingBottom}`);
      if (paddingLeft !== undefined) paddingMessages.push(`left: ${paddingLeft}`);

      const paddingText = paddingMessages.length > 0
        ? `padding (${paddingMessages.join(', ')})`
        : "padding";

      return {
        content: [
          {
            type: "text",
            text: `Set ${paddingText} for frame "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting padding", error);
    }
  }
);

// Set Axis Align Tool
server.tool(
  "set_axis_align",
  "Set alignment in an auto-layout frame.",
  {
    nodeId: z.string(),
    primaryAxisAlignItems: z
      .enum(["MIN", "MAX", "CENTER", "SPACE_BETWEEN"])
      .optional()
      .describe("Main direction alignment"),
    counterAxisAlignItems: z
      .enum(["MIN", "MAX", "CENTER", "BASELINE"])
      .optional()
      .describe("Cross direction alignment")
  },
  async ({ nodeId, primaryAxisAlignItems, counterAxisAlignItems }: any) => {
    try {
      const result = await sendCommandToFigma("set_axis_align", {
        nodeId,
        primaryAxisAlignItems,
        counterAxisAlignItems
      });
      const typedResult = result as { name: string };

      // Create a message about which alignments were set
      const alignMessages = [];
      if (primaryAxisAlignItems !== undefined) alignMessages.push(`primary: ${primaryAxisAlignItems}`);
      if (counterAxisAlignItems !== undefined) alignMessages.push(`counter: ${counterAxisAlignItems}`);

      const alignText = alignMessages.length > 0
        ? `axis alignment (${alignMessages.join(', ')})`
        : "axis alignment";

      return {
        content: [
          {
            type: "text",
            text: `Set ${alignText} for frame "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting axis alignment", error);
    }
  }
);

// Set Layout Sizing Tool
server.tool(
  "set_layout_sizing",
  "Set sizing behavior (FIXED/HUG/FILL).",
  {
    nodeId: z.string(),
    layoutSizingHorizontal: z
      .enum(["FIXED", "HUG", "FILL"])
      .optional()
      ,
    layoutSizingVertical: z
      .enum(["FIXED", "HUG", "FILL"])
      .optional()
      
  },
  async ({ nodeId, layoutSizingHorizontal, layoutSizingVertical }: any) => {
    try {
      const result = await sendCommandToFigma("set_layout_sizing", {
        nodeId,
        layoutSizingHorizontal,
        layoutSizingVertical
      });
      const typedResult = result as { name: string };

      // Create a message about which sizing modes were set
      const sizingMessages = [];
      if (layoutSizingHorizontal !== undefined) sizingMessages.push(`horizontal: ${layoutSizingHorizontal}`);
      if (layoutSizingVertical !== undefined) sizingMessages.push(`vertical: ${layoutSizingVertical}`);

      const sizingText = sizingMessages.length > 0
        ? `layout sizing (${sizingMessages.join(', ')})`
        : "layout sizing";

      return {
        content: [
          {
            type: "text",
            text: `Set ${sizingText} for frame "${typedResult.name}"`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting layout sizing", error);
    }
  }
);

// Set Item Spacing Tool
server.tool(
  "set_item_spacing",
  "Set spacing between children in auto-layout.",
  {
    nodeId: z.string(),
    itemSpacing: z.number().optional().describe("Gap between children"),
    counterAxisSpacing: z.number().optional().describe("Gap between wrapped lines (requires WRAP)")
  },
  async ({ nodeId, itemSpacing, counterAxisSpacing}: any) => {
    try {
      const params: any = { nodeId };
      if (itemSpacing !== undefined) params.itemSpacing = itemSpacing;
      if (counterAxisSpacing !== undefined) params.counterAxisSpacing = counterAxisSpacing;
      
      const result = await sendCommandToFigma("set_item_spacing", params);
      const typedResult = result as { name: string, itemSpacing?: number, counterAxisSpacing?: number };

      let message = `Updated spacing for frame "${typedResult.name}":`;
      if (itemSpacing !== undefined) message += ` itemSpacing=${itemSpacing}`;
      if (counterAxisSpacing !== undefined) message += ` counterAxisSpacing=${counterAxisSpacing}`;

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting spacing", error);
    }
  }
);

// A tool to get Figma Prototyping Reactions from multiple nodes
server.tool(
  "get_reactions",
  "Get prototype interactions from nodes.",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to get reactions from"),
  },
  async ({ nodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("get_reactions", { nodeIds });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result)
          },
          {
            type: "text",
            text: "IMPORTANT: You MUST now use the reaction data above and follow the `reaction_to_connector_strategy` prompt to prepare the parameters for the `create_connections` tool call. This is a required next step."
          }
        ],
        followUp: {
          type: "prompt",
          prompt: "reaction_to_connector_strategy",
        },
      };
    } catch (error) {
      return formatErrorResponse("getting reactions", error);
    }
  }
);

// Create Connectors Tool
server.tool(
  "set_default_connector",
  "Set default connector style for connections.",
  {
    connectorId: z.string().optional().describe("The ID of the connector node to set as default")
  },
  async ({ connectorId }: any) => {
    try {
      const result = await sendCommandToFigma("set_default_connector", {
        connectorId
      });

      return {
        content: [
          {
            type: "text",
            text: `Default connector set: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return formatErrorResponse("setting default connector", error);
    }
  }
);

// Connect Nodes Tool
server.tool(
  "create_connections",
  "Create visual connector lines between nodes.",
  {
    connections: z.array(z.object({
      startNodeId: z.string().describe("ID of the starting node"),
      endNodeId: z.string().describe("ID of the ending node"),
      text: z.string().optional().describe("Optional text to display on the connector")
    })).describe("Array of node connections to create")
  },
  async ({ connections }: any) => {
    try {
      if (!connections || connections.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No connections provided"
            }
          ]
        };
      }

      const mappedConnections = connections.map((c: any) => ({
        fromNodeId: c.startNodeId,
        toNodeId: c.endNodeId,
        label: c.text,
      }));

      const result = await sendCommandToFigma("create_connections", {
        connections: mappedConnections
      });

      return {
        content: [
          {
            type: "text",
            text: `Created ${connections.length} connections: ${JSON.stringify(result)}`
          }
        ]
      };
    } catch (error) {
      return formatErrorResponse("creating connections", error);
    }
  }
);

// Set Focus Tool
server.tool(
  "set_focus",
  "Select a node and scroll viewport to center it.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("set_focus", { nodeId });
      const typedResult = result as { name: string; id: string };
      return {
        content: [
          {
            type: "text",
            text: `Focused on node "${typedResult.name}" (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting focus", error);
    }
  }
);

// Set Selections Tool
server.tool(
  "set_selections",
  "Select multiple nodes and scroll to show them.",
  {
    nodeIds: z.array(z.string()),
  },
  async ({ nodeIds }: any) => {
    try {
      const result = await sendCommandToFigma("set_selections", { nodeIds });
      const typedResult = result as { selectedNodes: Array<{ name: string; id: string }>; count: number };
      return {
        content: [
          {
            type: "text",
            text: `Selected ${typedResult.count} nodes: ${typedResult.selectedNodes.map(node => `"${node.name}" (${node.id})`).join(', ')}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting selections", error);
    }
  }
);

// ============================================================================
// Page Management Tools
// ============================================================================

// Get Pages Tool
server.tool(
  "get_pages",
  "Get all pages with names, IDs, and child counts.",
  {},
  async () => {
    try {
      const result = await sendCommandToFigma("get_pages");
      const typedResult = result as Array<{ id: string; name: string; childCount: number }>;
      return {
        content: [
          {
            type: "text",
            text: `Found ${typedResult.length} page(s):\n${typedResult.map((page, idx) => `${idx + 1}. "${page.name}" (ID: ${page.id}, ${page.childCount} children)`).join('\n')}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting pages", error);
    }
  }
);

// Create Page Tool
server.tool(
  "create_page",
  "Create a new page and switch to it.",
  {
    name: z.string().describe("Name for the new page (e.g., 'Design System', 'Components', 'Prototypes')"),
  },
  async ({ name }: any) => {
    try {
      const result = await sendCommandToFigma("create_page", { name });
      const typedResult = result as { id: string; name: string; type: string };
      return {
        content: [
          {
            type: "text",
            text: `Created and switched to new page "${typedResult.name}" (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("creating page", error);
    }
  }
);

// Switch Page Tool
server.tool(
  "switch_page",
  "Switch to a different page by ID.",
  {
    pageId: z.string().describe("The ID of the page to switch to (use get_pages to find page IDs)"),
  },
  async ({ pageId }: any) => {
    try {
      const result = await sendCommandToFigma("switch_page", { pageId });
      const typedResult = result as { id: string; name: string; type: string };
      return {
        content: [
          {
            type: "text",
            text: `Switched to page "${typedResult.name}" (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("switching page", error);
    }
  }
);

// Delete Page Tool
server.tool(
  "delete_page",
  "Delete a page (cannot delete the last page).",
  {
    pageId: z.string().describe("The ID of the page to delete (use get_pages to find page IDs)"),
  },
  async ({ pageId }: any) => {
    try {
      const result = await sendCommandToFigma("delete_page", { pageId });
      const typedResult = result as { success: boolean; message: string };
      return {
        content: [
          {
            type: "text",
            text: typedResult.message,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("deleting page", error);
    }
  }
);

// Rename Page Tool
server.tool(
  "rename_page",
  "Rename a page.",
  {
    pageId: z.string().describe("The ID of the page to rename (use get_pages to find page IDs)"),
    name: z.string().describe("The new name for the page"),
  },
  async ({ pageId, name }: any) => {
    try {
      const result = await sendCommandToFigma("rename_page", { pageId, name });
      const typedResult = result as { id: string; name: string; type: string };
      return {
        content: [
          {
            type: "text",
            text: `Renamed page to "${typedResult.name}" (ID: ${typedResult.id})`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("renaming page", error);
    }
  }
);

// ============================================================================
// Plugin Data Persistence Tools
// ============================================================================

// Set Plugin Data Tool
server.tool(
  "set_plugin_data",
  "Store key-value metadata on a node.",
  {
    nodeId: z.string(),
    key: z.string().describe("Key name for the data (e.g., 'status', 'customMetadata')"),
    value: z.string().describe("Value to store (must be string - stringify objects if needed)"),
  },
  async ({ nodeId, key, value }: any) => {
    try {
      const result = await sendCommandToFigma("set_plugin_data", { nodeId, key, value });
      return {
        content: [
          {
            type: "text",
            text: `Set plugin data "${key}" on node ${nodeId}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("setting plugin data", error);
    }
  }
);

// Get Plugin Data Tool
server.tool(
  "get_plugin_data",
  "Get stored metadata from a node by key.",
  {
    nodeId: z.string(),
    key: z.string().describe("Key name of the data to retrieve"),
  },
  async ({ nodeId, key }: any) => {
    try {
      const result = await sendCommandToFigma("get_plugin_data", { nodeId, key });
      const typedResult = result as { nodeName: string; key: string; value: string };
      return {
        content: [
          {
            type: "text",
            text: `Plugin data "${typedResult.key}" on "${typedResult.nodeName}": ${typedResult.value || '(empty)'}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting plugin data", error);
    }
  }
);

// Get All Plugin Data Tool
server.tool(
  "get_all_plugin_data",
  "Get all stored metadata keys and values on a node.",
  {
    nodeId: z.string(),
  },
  async ({ nodeId }: any) => {
    try {
      const result = await sendCommandToFigma("get_all_plugin_data", { nodeId });
      const typedResult = result as { nodeName: string; data: Record<string, string> };
      const dataCount = Object.keys(typedResult.data).length;
      return {
        content: [
          {
            type: "text",
            text: `Found ${dataCount} plugin data key(s) on "${typedResult.nodeName}":\n${JSON.stringify(typedResult.data)}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("getting all plugin data", error);
    }
  }
);

// Delete Plugin Data Tool
server.tool(
  "delete_plugin_data",
  "Delete stored metadata from a node by key.",
  {
    nodeId: z.string(),
    key: z.string().describe("Key name of the data to delete"),
  },
  async ({ nodeId, key }: any) => {
    try {
      const result = await sendCommandToFigma("delete_plugin_data", { nodeId, key });
      return {
        content: [
          {
            type: "text",
            text: `Deleted plugin data "${key}" from node ${nodeId}`,
          },
        ],
      };
    } catch (error) {
      return formatErrorResponse("deleting plugin data", error);
    }
  }
);

// Strategy for converting Figma prototype reactions to connector lines
server.prompt(
  "reaction_to_connector_strategy",
  "Strategy for converting Figma prototype reactions to connector lines using the output of 'get_reactions'",
  (extra) => {
    return {
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `# Strategy: Convert Figma Prototype Reactions to Connector Lines

## Goal
Process the JSON output from the \`get_reactions\` tool to generate an array of connection objects suitable for the \`create_connections\` tool. This visually represents prototype flows as connector lines on the Figma canvas.

## Input Data
You will receive JSON data from the \`get_reactions\` tool. This data contains an array of nodes, each with potential reactions. A typical reaction object looks like this:
\`\`\`json
{
  "trigger": { "type": "ON_CLICK" },
  "action": {
    "type": "NAVIGATE",
    "destinationId": "destination-node-id",
    "navigationTransition": { ... },
    "preserveScrollPosition": false
  }
}
\`\`\`

## Step-by-Step Process

### 1. Preparation & Context Gathering
   - **Action:** Call \`read_my_design\` on the relevant node(s) to get context about the nodes involved (names, types, etc.). This helps in generating meaningful connector labels later.
   - **Action:** Call \`set_default_connector\` **without** the \`connectorId\` parameter.
   - **Check Result:** Analyze the response from \`set_default_connector\`.
     - If it confirms a default connector is already set (e.g., "Default connector is already set"), proceed to Step 2.
     - If it indicates no default connector is set (e.g., "No default connector set..."), you **cannot** proceed with \`create_connections\` yet. Inform the user they need to manually copy a connector from FigJam, paste it onto the current page, select it, and then you can run \`set_default_connector({ connectorId: "SELECTED_NODE_ID" })\` before attempting \`create_connections\`. **Do not proceed to Step 2 until a default connector is confirmed.**

### 2. Filter and Transform Reactions from \`get_reactions\` Output
   - **Iterate:** Go through the JSON array provided by \`get_reactions\`. For each node in the array:
     - Iterate through its \`reactions\` array.
   - **Filter:** Keep only reactions where the \`action\` meets these criteria:
     - Has a \`type\` that implies a connection (e.g., \`NAVIGATE\`, \`OPEN_OVERLAY\`, \`SWAP_OVERLAY\`). **Ignore** types like \`CHANGE_TO\`, \`CLOSE_OVERLAY\`, etc.
     - Has a valid \`destinationId\` property.
   - **Extract:** For each valid reaction, extract the following information:
     - \`sourceNodeId\`: The ID of the node the reaction belongs to (from the outer loop).
     - \`destinationNodeId\`: The value of \`action.destinationId\`.
     - \`actionType\`: The value of \`action.type\`.
     - \`triggerType\`: The value of \`trigger.type\`.

### 3. Generate Connector Text Labels
   - **For each extracted connection:** Create a concise, descriptive text label string.
   - **Combine Information:** Use the \`actionType\`, \`triggerType\`, and potentially the names of the source/destination nodes (obtained from Step 1's \`read_my_design\` or by calling \`get_node_info\` if necessary) to generate the label.
   - **Example Labels:**
     - If \`triggerType\` is "ON\_CLICK" and \`actionType\` is "NAVIGATE": "On click, navigate to [Destination Node Name]"
     - If \`triggerType\` is "ON\_DRAG" and \`actionType\` is "OPEN\_OVERLAY": "On drag, open [Destination Node Name] overlay"
   - **Keep it brief and informative.** Let this generated string be \`generatedText\`.

### 4. Prepare the \`connections\` Array for \`create_connections\`
   - **Structure:** Create a JSON array where each element is an object representing a connection.
   - **Format:** Each object in the array must have the following structure:
     \`\`\`json
     {
       "startNodeId": "sourceNodeId_from_step_2",
       "endNodeId": "destinationNodeId_from_step_2",
       "text": "generatedText_from_step_3"
     }
     \`\`\`
   - **Result:** This final array is the value you will pass to the \`connections\` parameter when calling the \`create_connections\` tool.

### 5. Execute Connection Creation
   - **Action:** Call the \`create_connections\` tool, passing the array generated in Step 4 as the \`connections\` argument.
   - **Verify:** Check the response from \`create_connections\` to confirm success or failure.

This detailed process ensures you correctly interpret the reaction data, prepare the necessary information, and use the appropriate tools to create the connector lines.`
          },
        },
      ],
      description: "Strategy for converting Figma prototype reactions to connector lines using the output of 'get_reactions'",
    };
  }
);

// Helper function to process Figma node responses
function processFigmaNodeResponse(result: unknown): any {
  if (!result || typeof result !== "object") {
    return result;
  }

  // Check if this looks like a node response
  const resultObj = result as Record<string, unknown>;
  if ("id" in resultObj && typeof resultObj.id === "string") {
    // It appears to be a node response, log the details
    console.info(
      `Processed Figma node: ${resultObj.name || "Unknown"} (ID: ${resultObj.id
      })`
    );

    if ("x" in resultObj && "y" in resultObj) {
      console.debug(`Node position: (${resultObj.x}, ${resultObj.y})`);
    }

    if ("width" in resultObj && "height" in resultObj) {
      console.debug(`Node dimensions: ${resultObj.width}×${resultObj.height}`);
    }
  }

  return result;
}

// Update the connectToFigma function
function connectToFigma(port: number = 3055) {
  // If already connected, do nothing
  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.info('Already connected to Figma');
    return;
  }

  // Clear any pending reconnection attempts
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const wsUrl = serverUrl === 'localhost' ? `${WS_URL}:${port}` : WS_URL;
  logger.info(`Connecting to Figma socket server at ${wsUrl}... (Attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
  ws = new WebSocket(wsUrl);

  ws.on('open', async () => {
    logger.info('Connected to Figma socket server');
    // Reset reconnection state on successful connection
    reconnectAttempts = 0;
    // Reset channel on new connection
    currentChannel = null;
    
    // Auto-join channel from environment variable if set
    if (DEFAULT_CHANNEL) {
      try {
        await joinChannelInternal(DEFAULT_CHANNEL);
        logger.info(`Auto-joined channel from environment variable: ${DEFAULT_CHANNEL}`);
      } catch (error) {
        logger.warn(`Failed to auto-join channel from environment variable: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  ws.on("message", (data: any) => {
    try {
      // Define a more specific type with an index signature to allow any property access
      interface ProgressMessage {
        message: FigmaResponse | any;
        type?: string;
        id?: string;
        [key: string]: any; // Allow any other properties
      }

      const json = JSON.parse(data) as ProgressMessage;

      // Handle progress updates
      if (json.type === 'progress_update') {
        const progressData = json.message.data as CommandProgressUpdate;
        const requestId = json.id || '';

        if (requestId && pendingRequests.has(requestId)) {
          const request = pendingRequests.get(requestId)!;

          // Update last activity timestamp
          request.lastActivity = Date.now();

          // Reset the timeout to prevent timeouts during long-running operations
          clearTimeout(request.timeout);

          // Create a new timeout
          request.timeout = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              logger.error(`Request ${requestId} timed out after extended period of inactivity`);
              pendingRequests.delete(requestId);
              request.reject(new Error('Request to Figma timed out'));
            }
          }, 60000); // 60 second timeout for inactivity

          // Log progress
          logger.info(`Progress update for ${progressData.commandType}: ${progressData.progress}% - ${progressData.message}`);

          // For completed updates, we could resolve the request early if desired
          if (progressData.status === 'completed' && progressData.progress === 100) {
            // Optionally resolve early with partial data
            // request.resolve(progressData.payload);
            // pendingRequests.delete(requestId);

            // Instead, just log the completion, wait for final result from Figma
            logger.info(`Operation ${progressData.commandType} completed, waiting for final result`);
          }
        }
        return;
      }

      // Handle regular responses
      const myResponse = json.message;
      logger.debug(`Received message: ${JSON.stringify(myResponse)}`);
      logger.log('myResponse' + JSON.stringify(myResponse));

      // Handle response to a request
      if (
        myResponse.id &&
        pendingRequests.has(myResponse.id) &&
        myResponse.result
      ) {
        const request = pendingRequests.get(myResponse.id)!;
        clearTimeout(request.timeout);

        if (myResponse.error) {
          logger.error(`Error from Figma: ${myResponse.error}`);
          request.reject(new Error(myResponse.error));
        } else {
          if (myResponse.result) {
            request.resolve(myResponse.result);
          }
        }

        pendingRequests.delete(myResponse.id);
      } else {
        // Handle broadcast messages or events
        logger.info(`Received broadcast message: ${JSON.stringify(myResponse)}`);
      }
    } catch (error) {
      logger.error(`Error parsing message: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ws.on('error', (error) => {
    logger.error(`Socket error: ${error}`);
  });

  ws.on('close', () => {
    logger.info('Disconnected from Figma socket server');
    ws = null;

    // Reject all pending requests
    for (const [id, request] of pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error("Connection closed"));
      pendingRequests.delete(id);
    }

    // Attempt to reconnect with exponential backoff
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      // Calculate exponential backoff delay: min(BASE_DELAY * 2^attempts, MAX_DELAY)
      const delay = Math.min(
        BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
        MAX_RECONNECT_DELAY
      );
      
      logger.info(`Attempting to reconnect in ${delay / 1000} seconds... (Attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      reconnectAttempts++;
      
      reconnectTimeout = setTimeout(() => {
        connectToFigma(port);
      }, delay);
    } else {
      logger.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Please restart the server.`);
    }
  });
}

/**
 * Cleanup stale pending requests
 * Removes requests that haven't had any activity for STALE_REQUEST_THRESHOLD milliseconds
 */
function cleanupStaleRequests() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [id, request] of pendingRequests.entries()) {
    const timeSinceActivity = now - request.lastActivity;
    
    if (timeSinceActivity > STALE_REQUEST_THRESHOLD) {
      logger.warn(`Cleaning up stale request ${id} (inactive for ${timeSinceActivity / 1000}s)`);
      clearTimeout(request.timeout);
      request.reject(new Error(`Request abandoned - no activity for ${timeSinceActivity / 1000} seconds`));
      pendingRequests.delete(id);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} stale request(s)`);
  }
}

// Start periodic cleanup of stale requests
setInterval(cleanupStaleRequests, CLEANUP_INTERVAL);

// Function to join a channel (wrapper for joinChannelInternal)
async function joinChannel(channelName: string): Promise<void> {
  return joinChannelInternal(channelName);
}

// Function to send commands to Figma with auto-join support
function sendCommandToFigma(
  command: FigmaCommand,
  params: unknown = {},
  timeoutMs?: number
): Promise<unknown> {
  return new Promise(async (resolve, reject) => {
    // If not connected, try to connect first
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectToFigma();
      reject(new Error("Not connected to Figma. Attempting to connect..."));
      return;
    }

    // Check if we need a channel for this command
    const requiresChannel = command !== "join";
    if (requiresChannel && !currentChannel) {
      // First, try environment variable if set
      if (DEFAULT_CHANNEL) {
        try {
          await joinChannelInternal(DEFAULT_CHANNEL);
          logger.info(`Auto-joined channel from environment variable: ${DEFAULT_CHANNEL}`);
        } catch (envJoinError) {
          logger.warn(`Failed to join channel from environment variable: ${envJoinError instanceof Error ? envJoinError.message : String(envJoinError)}`);
          // Fall through to auto-join logic
        }
      }
      
      // If still no channel, try to auto-join if only one channel is available
      if (!currentChannel) {
        try {
          logger.info("No channel joined. Attempting auto-join...");
          await autoJoinChannel();
          logger.info(`Auto-join successful. Proceeding with command: ${command}`);
        } catch (autoJoinError) {
          const channels = await getActiveChannels();
          let errorMessage = "Must join a channel before sending commands. ";
          
          if (channels.length === 0) {
            errorMessage += "No active channels found. Please start the Figma plugin.";
          } else if (channels.length > 1) {
            const channelNames = channels.map(c => c.name).join(', ');
            errorMessage += `Multiple channels available: ${channelNames}. Use join_channel to specify which one, or set AUTOFIG_CHANNEL environment variable.`;
          } else {
            errorMessage += autoJoinError instanceof Error ? autoJoinError.message : String(autoJoinError);
          }
          
          reject(new Error(errorMessage));
          return;
        }
      }
    }

    // Use command-specific timeout if not explicitly provided
    const actualTimeout = timeoutMs ?? getCommandTimeout(command);

    const id = uuidv4();
    const request = {
      id,
      type: command === "join" ? "join" : "message",
      ...(command === "join"
        ? { channel: (params as Record<string, unknown>).channel }
        : { channel: currentChannel }),
      message: {
        id,
        command,
        params: {
          ...(params as Record<string, unknown>),
          commandId: id, // Include the command ID in params
        },
      },
    };

    // Set timeout for request (using command-specific timeout)
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        logger.error(`Request ${id} (${command}) timed out after ${actualTimeout / 1000} seconds`);
        reject(new Error(`Request to Figma timed out after ${actualTimeout / 1000} seconds`));
      }
    }, actualTimeout);

    // Store the promise callbacks to resolve/reject later
    pendingRequests.set(id, {
      resolve,
      reject,
      timeout,
      lastActivity: Date.now()
    });

    // Send the request
    logger.info(`Sending command to Figma: ${command} (timeout: ${actualTimeout / 1000}s)`);
    logger.debug(`Request details: ${JSON.stringify(request)}`);
    ws.send(JSON.stringify(request));
  });
}

// Start the server
async function main() {
  try {
    // Try to connect to Figma socket server
    connectToFigma();
  } catch (error) {
    logger.warn(`Could not connect to Figma initially: ${error instanceof Error ? error.message : String(error)}`);
    logger.warn('Will try to connect when the first command is sent');
  }

  // Start the MCP server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('FigmaMCP server running on stdio');
}

// Run the server
main().catch(error => {
  logger.error(`Error starting FigmaMCP server: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});



