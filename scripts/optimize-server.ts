#!/usr/bin/env bun
/**
 * Tier 1 optimization: Trim descriptions, remove self-evident .describe(), remove pretty-printing
 * Run: bun scripts/optimize-server.ts
 */

import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/talk_to_figma_mcp/server.ts';
let code = readFileSync(filePath, 'utf-8');

const before = code.length;

// ============================================================================
// Tier 1A: Trim tool descriptions to ~60 chars each
// ============================================================================

const toolDescriptions: Record<string, string> = {
  // Channel management
  "join_channel": "Join a WebSocket channel (auto-joins 'autofig' by default).",
  // Document & Selection
  "get_document_info": "Get document name, ID, and current page.",
  "get_selection": "Get current selection node IDs, names, and types.",
  "read_my_design": "Get detailed properties of the current selection.",
  "get_node_info": "Get detailed properties of a node by ID.",
  "get_nodes_info": "Get detailed properties of multiple nodes by IDs.",
  "set_focus": "Select a node and scroll viewport to center it.",
  "set_selections": "Select multiple nodes and scroll to show them.",
  // Pages
  "get_pages": "Get all pages with names, IDs, and child counts.",
  "create_page": "Create a new page and switch to it.",
  "switch_page": "Switch to a different page by ID.",
  "delete_page": "Delete a page (cannot delete the last page).",
  "rename_page": "Rename a page.",
  // Plugin Data
  "set_plugin_data": "Store key-value metadata on a node.",
  "get_plugin_data": "Get stored metadata from a node by key.",
  "get_all_plugin_data": "Get all stored metadata keys and values on a node.",
  "delete_plugin_data": "Delete stored metadata from a node by key.",
  // Element Creation
  "create_rectangle": "Create a rectangle with position, size, and optional parent.",
  "create_frame": "Create a frame/container with optional auto-layout.",
  "create_text": "Create a text node with font, size, and color options.",
  "create_ellipse": "Create an ellipse/circle with optional fill and stroke.",
  // Styling
  "set_fill_color": "Set fill color on a node (RGBA 0-1).",
  "set_stroke_color": "Set stroke color and weight on a node.",
  "set_corner_radius": "Set corner radius, optionally per-corner.",
  "set_opacity": "Set node opacity (0=transparent, 1=opaque).",
  // Organization
  "group_nodes": "Group multiple nodes into a single group.",
  "ungroup_node": "Dissolve a group, moving children to parent.",
  // Variables
  "get_local_variable_collections": "Get all variable collections from the document.",
  "get_local_variables": "Get variables, optionally filtered by collection.",
  "create_variable_collection": "Create a variable collection with optional modes.",
  "create_variable": "Create a variable (COLOR/FLOAT/STRING/BOOLEAN).",
  "set_variable_value": "Set a variable value for a specific mode.",
  "create_multiple_variables": "Batch create variables in a collection.",
  "set_multiple_variable_values": "Batch set variable values across modes.",
  "delete_variable": "Delete a variable from its collection.",
  "get_bound_variables": "Get all variable bindings on a node.",
  "bind_variable": "Bind a variable to a node property.",
  "bind_multiple_variables": "Batch bind variables to node properties.",
  "unbind_variable": "Remove a variable binding from a node property.",
  // Typography
  "get_available_fonts": "List available fonts, optionally filtered by name.",
  "load_font": "Load a font family+style for text operations.",
  "get_text_styles": "Get all local text/typography styles.",
  "create_text_style": "Create a reusable text style with font properties.",
  "apply_text_style": "Apply a text style to a text node by ID or name.",
  "set_text_properties": "Set typography properties directly on a text node.",
  // Paint Styles
  "get_paint_styles": "Get all local paint/color styles.",
  "create_paint_style": "Create a reusable solid color style.",
  "update_paint_style": "Update a paint style name or color.",
  "apply_paint_style": "Apply a paint style to fills or strokes.",
  "delete_paint_style": "Delete a paint style from the document.",
  "set_gradient_fill": "Apply a gradient fill with color stops.",
  // Effect Styles
  "get_effect_styles": "Get all local effect styles (shadows, blurs).",
  "create_effect_style": "Create a reusable effect style (shadows/blurs).",
  "apply_effect_style": "Apply an effect style to a node by ID or name.",
  "delete_effect_style": "Delete an effect style from the document.",
  "set_effects": "Replace all effects on a node with a new set.",
  "add_drop_shadow": "Add a drop shadow without removing existing effects.",
  "add_inner_shadow": "Add an inner shadow without removing existing effects.",
  "add_layer_blur": "Add a layer blur effect to a node.",
  "add_background_blur": "Add a background blur (frosted glass) to a node.",
  // Constraints
  "get_constraints": "Get responsive layout constraints of a node.",
  "set_constraints": "Set responsive constraints (MIN/CENTER/MAX/STRETCH/SCALE).",
  // Grid Styles
  "get_grid_styles": "Get all local grid styles from the document.",
  "create_grid_style": "Create a reusable grid style (columns/rows/grid).",
  "apply_grid_style": "Apply a grid style to a frame.",
  "delete_grid_style": "Delete a grid style from the document.",
  "set_layout_grids": "Set layout grids directly on a frame.",
  // Layout
  "move_node": "Move a node to new (x, y) position.",
  "resize_node": "Resize a node to new width and height.",
  "rename_node": "Rename a single node.",
  "rename_multiple_nodes": "Batch rename multiple nodes.",
  "delete_node": "Delete a single node permanently.",
  "delete_multiple_nodes": "Delete multiple nodes in one operation.",
  "clone_node": "Duplicate a node, optionally at new position.",
  // Layer Reordering
  "reorder_node": "Move a node to a specific z-order index.",
  "move_to_front": "Move a node to the front of its parent stack.",
  "move_to_back": "Move a node to the back of its parent stack.",
  "move_forward": "Move a node one level forward in z-order.",
  "move_backward": "Move a node one level backward in z-order.",
  // Auto Layout
  "set_layout_mode": "Set auto-layout mode (HORIZONTAL/VERTICAL/NONE).",
  "set_padding": "Set padding on an auto-layout frame.",
  "set_axis_align": "Set alignment in an auto-layout frame.",
  "set_layout_sizing": "Set sizing behavior (FIXED/HUG/FILL).",
  "set_item_spacing": "Set spacing between children in auto-layout.",
  // Components
  "get_styles": "Get all local styles (text, paint, effect, grid).",
  "get_local_components": "Get all local components and component sets.",
  "create_component": "Convert a node into a reusable component.",
  "create_component_set": "Combine components into a variant set.",
  "create_component_instance": "Create an instance of a component by ID or key.",
  "get_component_properties": "Get properties on a component or component set.",
  "add_component_property": "Add a property (BOOLEAN/TEXT/INSTANCE_SWAP/VARIANT).",
  "delete_component_property": "Delete a property from a component.",
  "edit_component_property": "Edit a component property in-place.",
  "set_component_property_value": "Set a property value on a component instance.",
  "set_component_property_references": "Wire a nested instance to component properties.",
  "create_multiple_component_instances": "Batch create component instances with progress.",
  "set_multiple_component_property_references": "Batch wire instances to component properties.",
  "get_instance_overrides": "Capture overrides from a component instance.",
  "set_instance_overrides": "Apply captured overrides to target instances.",
  // Text
  "set_text_content": "Update text content of a text node.",
  "scan_text_nodes": "Recursively find all text nodes in a subtree.",
  "set_multiple_text_contents": "Batch update text on multiple text nodes.",
  // Annotations
  "get_annotations": "Get dev mode annotations from a node.",
  "set_annotation": "Create or update an annotation on a node.",
  "set_multiple_annotations": "Batch create/update annotations.",
  "scan_nodes_by_types": "Find descendant nodes matching specific types.",
  // Prototyping
  "get_reactions": "Get prototype interactions from nodes.",
  "set_default_connector": "Set default connector style for connections.",
  "create_connections": "Create visual connector lines between nodes.",
  // Export
  "export_node_as_image": "Export a node as PNG, JPG, SVG, or PDF.",
  "export_multiple_nodes": "Batch export nodes as images.",
};

let descReplaced = 0;
for (const [toolName, newDesc] of Object.entries(toolDescriptions)) {
  const escapedName = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(server\\.tool\\(\\s*"${escapedName}",\\s*)"([^"]+)"`,
  );
  const match = code.match(pattern);
  if (match) {
    code = code.replace(pattern, `$1"${newDesc}"`);
    descReplaced++;
  } else {
    console.warn(`⚠ Could not find tool: "${toolName}"`);
  }
}
console.log(`✓ Tier 1A: Replaced ${descReplaced}/${Object.keys(toolDescriptions).length} tool descriptions`);

// ============================================================================
// Tier 1B: Remove self-evident .describe() calls
// ============================================================================

let descRemoved = 0;
function removeDescribe(target: string): void {
  const count = code.split(target).length - 1;
  if (count > 0) {
    code = code.replaceAll(target, '');
    descRemoved += count;
  }
}

// RGBA component describes (rgbaSchema + inline)
removeDescribe('.describe("Red component (0-1)")');
removeDescribe('.describe("Green component (0-1)")');
removeDescribe('.describe("Blue component (0-1)")');
removeDescribe('.describe("Alpha component (0-1, default: 1)")');
removeDescribe('.describe("Alpha component (0-1)")');

// Position/dimension describes
removeDescribe('.describe("X position")');
removeDescribe('.describe("Y position")');
removeDescribe('.describe("New X position")');
removeDescribe('.describe("New Y position")');
removeDescribe('.describe("New X position for the clone")');
removeDescribe('.describe("New Y position for the clone")');
removeDescribe('.describe("Width of the rectangle")');
removeDescribe('.describe("Height of the rectangle")');
removeDescribe('.describe("Width of the frame")');
removeDescribe('.describe("Height of the frame")');
removeDescribe('.describe("Width of the ellipse")');
removeDescribe('.describe("Height of the ellipse (same as width for a circle)")');
removeDescribe('.describe("New width")');
removeDescribe('.describe("New height")');
removeDescribe('.describe("Stroke weight")');
removeDescribe('.describe("Text content")');
removeDescribe('.describe("New text content")');
removeDescribe('.describe("Export format")');
removeDescribe('.describe("Export scale")');
removeDescribe('.describe("Export format (default: PNG)")');
removeDescribe('.describe("Export scale (default: 1)")');

// NodeId describes (truly self-evident on z.string() nodeId params)
removeDescribe('.describe("The ID of the node to get information about")');
removeDescribe('.describe("Array of node IDs to get information about")');
removeDescribe('.describe("The ID of the node to modify")');
removeDescribe('.describe("The ID of the node to move")');
removeDescribe('.describe("The ID of the node to resize")');
removeDescribe('.describe("The ID of the node to clone")');
removeDescribe('.describe("The ID of the node to delete")');
removeDescribe('.describe("Array of node IDs to delete")');
removeDescribe('.describe("The ID of the node to focus on")');
removeDescribe('.describe("Array of node IDs to select")');
removeDescribe('.describe("The ID of the node to move to front")');
removeDescribe('.describe("The ID of the node to move to back")');
removeDescribe('.describe("The ID of the node to move forward")');
removeDescribe('.describe("The ID of the node to move backward")');
removeDescribe('.describe("The ID of the node to reorder")');
removeDescribe('.describe("The ID of the text node to modify")');
removeDescribe('.describe("The ID of the text node to style")');
removeDescribe('.describe("The ID of the node to add the shadow to")');
removeDescribe('.describe("The ID of the node to add the inner shadow to")');
removeDescribe('.describe("The ID of the node to add the blur to")');
removeDescribe('.describe("The ID of the node to add the background blur to")');
removeDescribe('.describe("The ID of the node to apply effects to")');
removeDescribe('.describe("The ID of the node to apply the gradient to")');
removeDescribe('.describe("The ID of the node to apply the effect style to")');
removeDescribe('.describe("The ID of the node to check for bound variables")');
removeDescribe('.describe("The ID of the node to bind the variable to")');
removeDescribe('.describe("The ID of the node to unbind the variable from")');
removeDescribe('.describe("The ID of the node to style")');
removeDescribe('.describe("The ID of the node to set constraints on")');
removeDescribe('.describe("The ID of the node to get constraints for")');
removeDescribe('.describe("The ID of the node to annotate")');
removeDescribe('.describe("The ID of the node containing the elements to annotate")');
removeDescribe('.describe("The ID of the frame to modify")');
removeDescribe('.describe("The ID of the frame to apply the grid style to")');
removeDescribe('.describe("The ID of the frame to set grids on")');
removeDescribe('.describe("The ID of the node to store data on")');
removeDescribe('.describe("The ID of the node to read data from")');
removeDescribe('.describe("The ID of the node to read all data from")');
removeDescribe('.describe("The ID of the node to delete data from")');
removeDescribe('.describe("The ID of the group node to ungroup")');
removeDescribe('.describe("The ID of the variable to update")');
removeDescribe('.describe("The ID of the variable to delete")');
removeDescribe('.describe("The ID of the variable to bind")');
removeDescribe('.describe("The ID of the node to export")');
removeDescribe('.describe("Array of node IDs to export")');
removeDescribe('.describe("Array of node IDs to group together (minimum 2 nodes)")');

// Optional name/parent describes
removeDescribe('.describe("Optional name for the rectangle")');
removeDescribe('.describe("Optional name for the ellipse")');
removeDescribe('.describe("Optional parent node ID to append the rectangle to")');
removeDescribe('.describe("Optional parent node ID to append the frame to")');
removeDescribe('.describe("Optional parent node ID to append the text to")');
removeDescribe('.describe("Optional parent node ID to append the ellipse to")');

// Shorten verbose but not self-evident ones (replace rather than remove)
function shortenDescribe(old: string, replacement: string): void {
  const count = code.split(old).length - 1;
  if (count > 0) {
    code = code.replaceAll(old, replacement);
    descRemoved += count;
  }
}

shortenDescribe(
  '.describe("Optional name for the frame")',
  ''
);
shortenDescribe(
  '.describe("Semantic layer name for the text node")',
  ''
);
shortenDescribe(
  '.describe("Optional name for the group (default: \'Group\')")',
  '.describe("Group name")'
);
shortenDescribe(
  '.describe("Target index position (0 = back/bottom, higher = front/top)")',
  '.describe("Z-order index (0=back)")'
);
shortenDescribe(
  '.describe("Opacity value (0-1, where 0 is fully transparent and 1 is fully opaque)")',
  '.describe("Opacity (0-1)")'
);
shortenDescribe(
  '.describe("Corner radius value")',
  ''
);
shortenDescribe(
  '.describe("The mode ID to set the value for (get from collection\'s modes array)")',
  '.describe("Mode ID from collection modes")'
);
shortenDescribe(
  '.describe("Optional collection ID to filter variables by a specific collection")',
  '.describe("Filter by collection ID")'
);
shortenDescribe(
  '.describe("Optional filter to search fonts by family name (case-insensitive)")',
  '.describe("Filter by family name")'
);
shortenDescribe(
  '.describe("The font family name (e.g., \'Roboto\', \'Open Sans\')")',
  '.describe("Font family name")'
);
shortenDescribe(
  '.describe("The font style (e.g., \'Regular\', \'Bold\', \'Italic\'). Default: \'Regular\'")',
  '.describe("Font style (default: Regular)")'
);
shortenDescribe(
  '.describe("Primary axis alignment (MIN/MAX = left/right in horizontal, top/bottom in vertical). Note: When set to SPACE_BETWEEN, itemSpacing will be ignored as children will be evenly spaced.")',
  '.describe("Main direction alignment")'
);
shortenDescribe(
  '.describe("Counter axis alignment (MIN/MAX = top/bottom in horizontal, left/right in vertical)")',
  '.describe("Cross direction alignment")'
);
shortenDescribe(
  '.describe("Distance between children. Note: This value will be ignored if primaryAxisAlignItems is set to SPACE_BETWEEN.")',
  '.describe("Gap between children")'
);
shortenDescribe(
  '.describe("Distance between wrapped rows/columns. Only works when layoutWrap is set to WRAP.")',
  '.describe("Gap between wrapped lines (requires WRAP)")'
);
shortenDescribe(
  '.describe("Horizontal sizing mode (HUG for frames/text only, FILL for auto-layout children only)")',
  ''
);
shortenDescribe(
  '.describe("Vertical sizing mode (HUG for frames/text only, FILL for auto-layout children only)")',
  ''
);
shortenDescribe(
  '.describe("Horizontal constraint: MIN (left), CENTER, MAX (right), STRETCH, or SCALE")',
  ''
);
shortenDescribe(
  '.describe("Vertical constraint: MIN (top), CENTER, MAX (bottom), STRETCH, or SCALE")',
  ''
);

console.log(`✓ Tier 1B: Removed/shortened ${descRemoved} .describe() calls`);

// ============================================================================
// Tier 1C: Replace inline RGBA schemas with shared rgbaSchema
// ============================================================================

// The inline RGBA object in set_variable_value and batch variants
// Pattern: z.object({ r: z.number().min(0).max(1), g:..., b:..., a:... })
// After 1B removes describes, these become plain z.number().min(0).max(1) calls
let inlineReplaced = 0;
const inlineRgbaPattern = /z\.object\(\{\s*r: z\.number\(\)\.min\(0\)\.max\(1\),\s*g: z\.number\(\)\.min\(0\)\.max\(1\),\s*b: z\.number\(\)\.min\(0\)\.max\(1\),\s*a: z\.number\(\)\.min\(0\)\.max\(1\)\.optional\(\),?\s*\}\)/g;

// Count matches first
const inlineMatches = code.match(inlineRgbaPattern);
if (inlineMatches) {
  // The first match is the rgbaSchema definition itself - skip it
  // Replace all EXCEPT the one in the rgbaSchema definition
  let matchIndex = 0;
  code = code.replace(inlineRgbaPattern, (match) => {
    matchIndex++;
    if (matchIndex === 1) {
      // This is the rgbaSchema definition - keep it
      return match;
    }
    inlineReplaced++;
    return 'rgbaSchema';
  });
}
console.log(`✓ Tier 1C: Replaced ${inlineReplaced} inline RGBA schemas`);

// ============================================================================
// Tier 1D: Remove JSON pretty-printing from responses
// ============================================================================

let prettyPrintRemoved = 0;
function removePrettyPrint(old: string, replacement: string): void {
  const count = code.split(old).length - 1;
  if (count > 0) {
    code = code.replaceAll(old, replacement);
    prettyPrintRemoved += count;
  }
}

removePrettyPrint('JSON.stringify(result, null, 2)', 'JSON.stringify(result)');
removePrettyPrint('JSON.stringify(typedResult.matchingNodes, null, 2)', 'JSON.stringify(typedResult.matchingNodes)');
removePrettyPrint('JSON.stringify(typedResult.textNodes, null, 2)', 'JSON.stringify(typedResult.textNodes)');
removePrettyPrint('JSON.stringify(typedResult.data, null, 2)', 'JSON.stringify(typedResult.data)');
console.log(`✓ Tier 1D: Removed ${prettyPrintRemoved} pretty-print calls`);

// ============================================================================
// Tier 1E: Migrate simple inline responses to formatJsonResponse
// ============================================================================

let responseMigrated = 0;

// Pattern: return { content: [{ type: "text", text: JSON.stringify(result) }] };
// → return formatJsonResponse(result);
const simpleJsonPattern = /return \{\s*content: \[\s*\{\s*type: "text",?\s*text: JSON\.stringify\(result\)\s*\}\s*\]\s*\};/g;
const simpleJsonMatches = code.match(simpleJsonPattern);
if (simpleJsonMatches) {
  code = code.replace(simpleJsonPattern, 'return formatJsonResponse(result);');
  responseMigrated += simpleJsonMatches.length;
}

// Pattern for error responses:
// return { content: [{ type: "text", text: `Error CONTEXT: ${error instanceof Error ? error.message : String(error)}` }] };
// → return formatErrorResponse("CONTEXT", error);
const errorPattern = /return \{\s*content: \[\s*\{\s*type: "text",?\s*text: `Error ([^:]+): \$\{error instanceof Error \? error\.message : String\(error\)\s*\}`?,?\s*\},?\s*\],?\s*\};/g;
const errorMatches = code.match(errorPattern);
if (errorMatches) {
  code = code.replace(errorPattern, (match, context) => {
    responseMigrated++;
    return `return formatErrorResponse("${context.trim()}", error);`;
  });
}

console.log(`✓ Tier 1E: Migrated ${responseMigrated} inline responses to helpers`);

// ============================================================================
// Summary
// ============================================================================

writeFileSync(filePath, code);
const after = code.length;
const saved = before - after;
const toolCount = (code.match(/server\.tool\(/g) || []).length;

console.log(`\n=== Summary ===`);
console.log(`File: ${filePath}`);
console.log(`Before: ${before.toLocaleString()} chars`);
console.log(`After: ${after.toLocaleString()} chars`);
console.log(`Saved: ${saved.toLocaleString()} chars (${((saved/before)*100).toFixed(1)}%)`);
console.log(`Tool definitions found: ${toolCount}`);
