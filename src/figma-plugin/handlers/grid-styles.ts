/**
 * Grid style handlers (layout grids, grid styles)
 */

import type { CommandParams, GridStyleInfo, LayoutGridInput, RGBA } from '../../shared/types';
import { getNodeById, assertNodeCapability, provideVisualFeedback } from '../utils/helpers';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert LayoutGridInput to Figma LayoutGrid
 */
function layoutGridInputToFigma(input: LayoutGridInput): LayoutGrid {
  const baseGrid = {
    visible: input.visible ?? true,
    color: input.color ? {
      r: input.color.r ?? 1,
      g: input.color.g ?? 0,
      b: input.color.b ?? 0,
      a: input.color.a ?? 0.1,
    } : { r: 1, g: 0, b: 0, a: 0.1 },
  };

  if (input.pattern === 'GRID') {
    return {
      ...baseGrid,
      pattern: 'GRID',
      sectionSize: input.sectionSize ?? 10,
    } as LayoutGrid;
  }

  // COLUMNS or ROWS
  return {
    ...baseGrid,
    pattern: input.pattern,
    alignment: input.alignment ?? 'STRETCH',
    gutterSize: input.gutterSize ?? 20,
    count: input.count ?? 12,
    sectionSize: input.sectionSize ?? 1,
    offset: input.offset ?? 0,
  } as LayoutGrid;
}

/**
 * Convert Figma LayoutGrid to serializable format
 */
function figmaLayoutGridToOutput(grid: LayoutGrid): GridStyleInfo['grids'][0] {
  const result: GridStyleInfo['grids'][0] = {
    pattern: grid.pattern,
    visible: grid.visible,
    color: grid.color ? {
      r: grid.color.r,
      g: grid.color.g,
      b: grid.color.b,
      a: grid.color.a,
    } : undefined,
  };

  if (grid.pattern === 'GRID') {
    result.sectionSize = grid.sectionSize;
  } else {
    // COLUMNS or ROWS
    result.alignment = grid.alignment;
    result.gutterSize = grid.gutterSize;
    result.count = grid.count;
    result.sectionSize = grid.sectionSize;
    result.offset = grid.offset;
  }

  return result;
}

// ============================================================================
// Grid Style CRUD Operations
// ============================================================================

/**
 * Get all local grid styles
 */
export async function getGridStyles(): Promise<{
  count: number;
  styles: GridStyleInfo[];
}> {
  const gridStyles = await figma.getLocalGridStylesAsync();

  const styles: GridStyleInfo[] = gridStyles.map((style) => ({
    id: style.id,
    name: style.name,
    key: style.key,
    grids: style.layoutGrids.map(figmaLayoutGridToOutput),
  }));

  return {
    count: styles.length,
    styles,
  };
}

/**
 * Create a new grid style
 */
export async function createGridStyle(
  params: CommandParams['create_grid_style']
): Promise<GridStyleInfo> {
  const { name, grids } = params;

  if (!name) {
    throw new Error('Missing name parameter');
  }

  if (!grids || grids.length === 0) {
    throw new Error('Missing grids parameter - at least one grid is required');
  }

  // Create the grid style
  const style = figma.createGridStyle();
  style.name = name;

  // Convert and set grids
  style.layoutGrids = grids.map(layoutGridInputToFigma);

  // Provide visual feedback
  figma.notify(`✅ Created grid style: ${name}`);

  return {
    id: style.id,
    name: style.name,
    key: style.key,
    grids: style.layoutGrids.map(figmaLayoutGridToOutput),
  };
}

/**
 * Apply a grid style to a frame
 */
export async function applyGridStyle(
  params: CommandParams['apply_grid_style']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  styleId: string;
  styleName: string;
}> {
  const { nodeId, styleId, styleName } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!styleId && !styleName) {
    throw new Error('Either styleId or styleName must be provided');
  }

  // Find the style
  let style: GridStyle | null = null;

  if (styleId) {
    const foundStyle = figma.getStyleById(styleId);
    if (foundStyle && foundStyle.type === 'GRID') {
      style = foundStyle as GridStyle;
    }
  } else if (styleName) {
    const gridStyles = await figma.getLocalGridStylesAsync();
    style = gridStyles.find((s) => s.name === styleName) || null;
  }

  if (!style) {
    throw new Error(`Grid style not found: ${styleId || styleName}`);
  }

  // Get the node
  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'gridStyleId', `Node "${node.name}" does not support grid styles (must be a frame)`);

  // Apply the style
  (node as FrameNode).gridStyleId = style.id;

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Applied grid style "${style.name}" to ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    styleId: style.id,
    styleName: style.name,
  };
}

/**
 * Delete a grid style
 */
export async function deleteGridStyle(
  params: CommandParams['delete_grid_style']
): Promise<{
  success: boolean;
  styleId: string;
  styleName: string;
}> {
  const { styleId } = params;

  if (!styleId) {
    throw new Error('Missing styleId parameter');
  }

  // Get the style
  const style = figma.getStyleById(styleId) as GridStyle | null;

  if (!style) {
    throw new Error(`Grid style not found: ${styleId}`);
  }

  if (style.type !== 'GRID') {
    throw new Error(`Style is not a grid style: ${styleId} (type: ${style.type})`);
  }

  const styleName = style.name;

  // Remove the style
  style.remove();

  // Provide visual feedback
  figma.notify(`✅ Deleted grid style: ${styleName}`);

  return {
    success: true,
    styleId,
    styleName,
  };
}

// ============================================================================
// Direct Grid Operations on Nodes
// ============================================================================

/**
 * Set layout grids on a frame
 */
export async function setLayoutGrids(
  params: CommandParams['set_layout_grids']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  gridsCount: number;
}> {
  const { nodeId, grids } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!grids) {
    throw new Error('Missing grids parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'layoutGrids', `Node "${node.name}" does not support layout grids (must be a frame)`);

  // Convert and set grids
  (node as FrameNode).layoutGrids = grids.map(layoutGridInputToFigma);

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Set ${grids.length} layout grid(s) on ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    gridsCount: grids.length,
  };
}

