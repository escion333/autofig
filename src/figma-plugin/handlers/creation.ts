/**
 * Element creation handlers
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getContainerNode, getFontStyleFromWeight, getNodeById, assertNodeCapability } from '../utils/helpers';
import { setCharacters } from './text';

/**
 * Create a rectangle
 */
export async function createRectangle(params: CommandParams['create_rectangle']): Promise<NodeResult> {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = 'Rectangle',
    parentId,
  } = params || {};

  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  rect.name = name;

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(rect);

  return {
    id: rect.id,
    name: rect.name,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    parentId: rect.parent?.id,
  };
}

/**
 * Create an ellipse (circle/oval)
 */
export async function createEllipse(params: CommandParams['create_ellipse']): Promise<NodeResult> {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = 'Ellipse',
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
  } = params || {};

  const ellipse = figma.createEllipse();
  ellipse.x = x;
  ellipse.y = y;
  ellipse.resize(width, height);
  ellipse.name = name;

  // Set fill color if provided
  if (fillColor) {
    ellipse.fills = [{
      type: 'SOLID',
      color: {
        r: fillColor.r ?? 0,
        g: fillColor.g ?? 0,
        b: fillColor.b ?? 0,
      },
      opacity: fillColor.a ?? 1,
    }];
  }

  // Set stroke color if provided
  if (strokeColor) {
    ellipse.strokes = [{
      type: 'SOLID',
      color: {
        r: strokeColor.r ?? 0,
        g: strokeColor.g ?? 0,
        b: strokeColor.b ?? 0,
      },
      opacity: strokeColor.a ?? 1,
    }];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    ellipse.strokeWeight = strokeWeight;
  }

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(ellipse);

  return {
    id: ellipse.id,
    name: ellipse.name,
    x: ellipse.x,
    y: ellipse.y,
    width: ellipse.width,
    height: ellipse.height,
    fills: ellipse.fills as Paint[],
    strokes: ellipse.strokes as Paint[],
    strokeWeight: ellipse.strokeWeight,
    parentId: ellipse.parent?.id,
  };
}

/**
 * Create a frame with optional auto-layout
 */
export async function createFrame(params: CommandParams['create_frame']): Promise<NodeResult> {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = 'Frame',
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
    layoutMode = 'NONE',
    layoutWrap = 'NO_WRAP',
    paddingTop = 10,
    paddingRight = 10,
    paddingBottom = 10,
    paddingLeft = 10,
    primaryAxisAlignItems = 'MIN',
    counterAxisAlignItems = 'MIN',
    layoutSizingHorizontal = 'FIXED',
    layoutSizingVertical = 'FIXED',
    itemSpacing = 0,
  } = params || {};

  const frame = figma.createFrame();
  frame.x = x;
  frame.y = y;
  frame.resize(width, height);
  frame.name = name;

  // Set layout mode if provided
  if (layoutMode !== 'NONE') {
    frame.layoutMode = layoutMode;
    frame.layoutWrap = layoutWrap;
    frame.paddingTop = paddingTop;
    frame.paddingRight = paddingRight;
    frame.paddingBottom = paddingBottom;
    frame.paddingLeft = paddingLeft;
    frame.primaryAxisAlignItems = primaryAxisAlignItems;
    frame.counterAxisAlignItems = counterAxisAlignItems;
    frame.layoutSizingHorizontal = layoutSizingHorizontal;
    frame.layoutSizingVertical = layoutSizingVertical;
    frame.itemSpacing = itemSpacing;
  }

  // Set fill color if provided
  if (fillColor) {
    frame.fills = [{
      type: 'SOLID',
      color: {
        r: fillColor.r ?? 0,
        g: fillColor.g ?? 0,
        b: fillColor.b ?? 0,
      },
      opacity: fillColor.a ?? 1,
    }];
  }

  // Set stroke color if provided
  if (strokeColor) {
    frame.strokes = [{
      type: 'SOLID',
      color: {
        r: strokeColor.r ?? 0,
        g: strokeColor.g ?? 0,
        b: strokeColor.b ?? 0,
      },
      opacity: strokeColor.a ?? 1,
    }];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    frame.strokeWeight = strokeWeight;
  }

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(frame);

  return {
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    fills: frame.fills as Paint[],
    strokes: frame.strokes as Paint[],
    strokeWeight: frame.strokeWeight,
    layoutMode: frame.layoutMode,
    layoutWrap: frame.layoutWrap,
    parentId: frame.parent?.id,
  };
}

/**
 * Create a text node
 */
export async function createText(params: CommandParams['create_text']): Promise<NodeResult> {
  const {
    x = 0,
    y = 0,
    text = 'Text',
    fontSize = 14,
    fontWeight = 400,
    fontFamily = 'Inter',
    fontStyle: customFontStyle,
    fontColor = { r: 0, g: 0, b: 0, a: 1 },
    name = '',
    parentId,
  } = params || {};

  // Use custom font style if provided, otherwise derive from weight
  const fontStyle = customFontStyle || getFontStyleFromWeight(fontWeight);

  const textNode = figma.createText();
  textNode.x = x;
  textNode.y = y;
  textNode.name = name || text;

  try {
    await figma.loadFontAsync({
      family: fontFamily,
      style: fontStyle,
    });
    textNode.fontName = { family: fontFamily, style: fontStyle };
    textNode.fontSize = fontSize;
  } catch (error) {
    // Fallback to Inter if the requested font fails to load
    console.error(`Error loading font "${fontFamily}" with style "${fontStyle}", falling back to Inter:`, error);
    try {
      const fallbackStyle = getFontStyleFromWeight(fontWeight);
      await figma.loadFontAsync({
        family: 'Inter',
        style: fallbackStyle,
      });
      textNode.fontName = { family: 'Inter', style: fallbackStyle };
      textNode.fontSize = fontSize;
    } catch (fallbackError) {
      console.error('Error loading fallback font:', fallbackError);
    }
  }

  await setCharacters(textNode, text);

  // Set text color
  textNode.fills = [{
    type: 'SOLID',
    color: {
      r: fontColor.r ?? 0,
      g: fontColor.g ?? 0,
      b: fontColor.b ?? 0,
    },
    opacity: fontColor.a ?? 1,
  }];

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(textNode);

  return {
    id: textNode.id,
    name: textNode.name,
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
    characters: textNode.characters,
    fontSize: textNode.fontSize as number,
    fontWeight: fontWeight,
    fontFamily: fontFamily,
    fontStyle: fontStyle,
    fontColor: fontColor,
    fontName: textNode.fontName,
    fills: textNode.fills as Paint[],
    parentId: textNode.parent?.id,
  };
}

/**
 * Create a polygon (regular polygon with N sides)
 */
export async function createPolygon(params: CommandParams['create_polygon']): Promise<NodeResult> {
  const {
    x = 0,
    y = 0,
    pointCount = 6,
    radius = 50,
    name = 'Polygon',
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
  } = params || {};

  const polygon = figma.createPolygon();
  polygon.x = x;
  polygon.y = y;
  polygon.resize(radius * 2, radius * 2);
  polygon.pointCount = Math.max(3, Math.min(100, pointCount));
  polygon.name = name;

  // Set fill color if provided
  if (fillColor) {
    polygon.fills = [{
      type: 'SOLID',
      color: {
        r: fillColor.r ?? 0,
        g: fillColor.g ?? 0,
        b: fillColor.b ?? 0,
      },
      opacity: fillColor.a ?? 1,
    }];
  }

  // Set stroke color if provided
  if (strokeColor) {
    polygon.strokes = [{
      type: 'SOLID',
      color: {
        r: strokeColor.r ?? 0,
        g: strokeColor.g ?? 0,
        b: strokeColor.b ?? 0,
      },
      opacity: strokeColor.a ?? 1,
    }];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    polygon.strokeWeight = strokeWeight;
  }

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(polygon);

  return {
    id: polygon.id,
    name: polygon.name,
    x: polygon.x,
    y: polygon.y,
    width: polygon.width,
    height: polygon.height,
    pointCount: polygon.pointCount,
    parentId: polygon.parent?.id,
  };
}

/**
 * Create a star
 */
export async function createStar(params: CommandParams['create_star']): Promise<NodeResult> {
  const {
    x = 0,
    y = 0,
    pointCount = 5,
    innerRadius = 25,
    outerRadius = 50,
    name = 'Star',
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
  } = params || {};

  const star = figma.createStar();
  star.x = x;
  star.y = y;
  star.resize(outerRadius * 2, outerRadius * 2);
  star.pointCount = Math.max(3, Math.min(100, pointCount));
  star.innerRadius = innerRadius / outerRadius; // Figma uses ratio 0-1
  star.name = name;

  // Set fill color if provided
  if (fillColor) {
    star.fills = [{
      type: 'SOLID',
      color: {
        r: fillColor.r ?? 0,
        g: fillColor.g ?? 0,
        b: fillColor.b ?? 0,
      },
      opacity: fillColor.a ?? 1,
    }];
  }

  // Set stroke color if provided
  if (strokeColor) {
    star.strokes = [{
      type: 'SOLID',
      color: {
        r: strokeColor.r ?? 0,
        g: strokeColor.g ?? 0,
        b: strokeColor.b ?? 0,
      },
      opacity: strokeColor.a ?? 1,
    }];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    star.strokeWeight = strokeWeight;
  }

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(star);

  return {
    id: star.id,
    name: star.name,
    x: star.x,
    y: star.y,
    width: star.width,
    height: star.height,
    pointCount: star.pointCount,
    innerRadius: star.innerRadius,
    parentId: star.parent?.id,
  };
}

/**
 * Create a line
 */
export async function createLine(params: CommandParams['create_line']): Promise<NodeResult> {
  const {
    startX = 0,
    startY = 0,
    endX = 100,
    endY = 0,
    name = 'Line',
    parentId,
    strokeColor,
    strokeWeight = 1,
  } = params || {};

  const line = figma.createLine();
  line.x = startX;
  line.y = startY;
  
  // Calculate line length and rotation
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  line.resize(length, 0);
  line.rotation = angle;
  line.name = name;

  // Set stroke color if provided (default black)
  line.strokes = [{
    type: 'SOLID',
    color: strokeColor ? {
      r: strokeColor.r ?? 0,
      g: strokeColor.g ?? 0,
      b: strokeColor.b ?? 0,
    } : { r: 0, g: 0, b: 0 },
    opacity: strokeColor?.a ?? 1,
  }];

  line.strokeWeight = strokeWeight;

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(line);

  return {
    id: line.id,
    name: line.name,
    x: line.x,
    y: line.y,
    width: line.width,
    rotation: line.rotation,
    strokeWeight: line.strokeWeight,
    parentId: line.parent?.id,
  };
}

/**
 * Create a vector from SVG path data
 */
export async function createVector(params: CommandParams['create_vector']): Promise<NodeResult> {
  const {
    x = 0,
    y = 0,
    pathData,
    name = 'Vector',
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
  } = params || {};

  if (!pathData) {
    throw new Error('Missing pathData parameter');
  }

  const vector = figma.createVector();
  vector.x = x;
  vector.y = y;
  vector.name = name;

  // Set vector paths from SVG path data
  try {
    vector.vectorPaths = [{
      windingRule: 'NONZERO',
      data: pathData,
    }];
  } catch (error) {
    throw new Error(`Invalid path data: ${(error as Error).message}`);
  }

  // Set fill color if provided
  if (fillColor) {
    vector.fills = [{
      type: 'SOLID',
      color: {
        r: fillColor.r ?? 0,
        g: fillColor.g ?? 0,
        b: fillColor.b ?? 0,
      },
      opacity: fillColor.a ?? 1,
    }];
  } else {
    // Default to no fill for vectors
    vector.fills = [];
  }

  // Set stroke color if provided
  if (strokeColor) {
    vector.strokes = [{
      type: 'SOLID',
      color: {
        r: strokeColor.r ?? 0,
        g: strokeColor.g ?? 0,
        b: strokeColor.b ?? 0,
      },
      opacity: strokeColor.a ?? 1,
    }];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    vector.strokeWeight = strokeWeight;
  }

  // Append to parent or current page
  const parent = await getContainerNode(parentId);
  parent.appendChild(vector);

  return {
    id: vector.id,
    name: vector.name,
    x: vector.x,
    y: vector.y,
    width: vector.width,
    height: vector.height,
    parentId: vector.parent?.id,
  };
}

// ============================================================================
// Boolean Operations
// ============================================================================

/**
 * Perform a boolean operation on multiple nodes
 */
export async function booleanOperation(params: CommandParams['boolean_operation']): Promise<NodeResult> {
  const { nodeIds, operation, name } = params || {};

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length < 2) {
    throw new Error('At least 2 node IDs are required for boolean operations');
  }

  if (!operation) {
    throw new Error('Missing operation parameter');
  }

  // Get all nodes
  const nodes: SceneNode[] = [];
  for (const nodeId of nodeIds) {
    const node = await getNodeById(nodeId);
    if (!('parent' in node)) {
      throw new Error(`Node ${nodeId} does not support boolean operations`);
    }
    nodes.push(node as SceneNode);
  }

  // Verify all nodes have the same parent
  const firstParent = nodes[0].parent;
  if (!firstParent) {
    throw new Error('Cannot perform boolean operation on nodes without a parent. Nodes must be inside a frame or group.');
  }

  for (const node of nodes) {
    if (node.parent !== firstParent) {
      throw new Error('All nodes must have the same parent for boolean operations');
    }
  }

  // Verify parent supports children (for adding the result)
  if (!('appendChild' in firstParent)) {
    throw new Error('Parent does not support adding children');
  }

  // Perform the boolean operation
  let resultNode: BooleanOperationNode;
  
  switch (operation) {
    case 'UNION':
      resultNode = figma.union(nodes, firstParent as FrameNode | GroupNode | PageNode);
      break;
    case 'SUBTRACT':
      resultNode = figma.subtract(nodes, firstParent as FrameNode | GroupNode | PageNode);
      break;
    case 'INTERSECT':
      resultNode = figma.intersect(nodes, firstParent as FrameNode | GroupNode | PageNode);
      break;
    case 'EXCLUDE':
      resultNode = figma.exclude(nodes, firstParent as FrameNode | GroupNode | PageNode);
      break;
    default:
      throw new Error(`Invalid boolean operation: ${operation}`);
  }

  // Set name if provided
  if (name) {
    resultNode.name = name;
  }

  return {
    id: resultNode.id,
    name: resultNode.name,
    x: resultNode.x,
    y: resultNode.y,
    width: resultNode.width,
    height: resultNode.height,
    booleanOperation: resultNode.booleanOperation,
    parentId: resultNode.parent?.id,
  };
}

/**
 * Flatten a node to a single vector path
 */
export async function flattenNode(params: CommandParams['flatten_node']): Promise<NodeResult> {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);

  // Check if node can be flattened
  if (!('flatten' in figma)) {
    throw new Error('Flatten operation is not available');
  }

  // Get the parent before flattening
  const parent = node.parent;
  if (!parent) {
    throw new Error('Cannot flatten a node without a parent');
  }

  // Flatten the node
  const flattenedNode = figma.flatten([node as SceneNode], parent as FrameNode | GroupNode | PageNode);

  return {
    id: flattenedNode.id,
    name: flattenedNode.name,
    x: flattenedNode.x,
    y: flattenedNode.y,
    width: flattenedNode.width,
    height: flattenedNode.height,
    parentId: flattenedNode.parent?.id,
  };
}

/**
 * Convert a node's stroke to a filled shape
 */
export async function outlineStroke(params: CommandParams['outline_stroke']): Promise<NodeResult> {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'outlineStroke', `Node "${node.name}" does not support outline stroke`);

  const outlinedNode = (node as GeometryMixin).outlineStroke();

  if (!outlinedNode) {
    throw new Error('Outline stroke produced no results. Make sure the node has a stroke.');
  }

  outlinedNode.name = `${node.name} (outlined)`;

  return {
    id: outlinedNode.id,
    name: outlinedNode.name,
    x: outlinedNode.x,
    y: outlinedNode.y,
    width: outlinedNode.width,
    height: outlinedNode.height,
    parentId: outlinedNode.parent?.id,
  };
}

/**
 * Set an image as the fill of a node
 */
export async function setImageFill(params: CommandParams['set_image_fill']): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  scaleMode: string;
}> {
  const { nodeId, imageData, scaleMode = 'FILL' } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!imageData) {
    throw new Error('Missing imageData parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'fills', `Node "${node.name}" does not support fills`);

  // Remove data URL prefix if present
  let cleanImageData = imageData;
  if (imageData.includes(',')) {
    cleanImageData = imageData.split(',')[1];
  }

  // Decode base64 to Uint8Array using Figma's base64Decode
  const bytes = figma.base64Decode(cleanImageData);

  // Create the image
  const image = figma.createImage(bytes);

  // Apply the image fill
  (node as GeometryMixin).fills = [{
    type: 'IMAGE',
    scaleMode: scaleMode as 'FILL' | 'FIT' | 'CROP' | 'TILE',
    imageHash: image.hash,
  }];

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    scaleMode,
  };
}
