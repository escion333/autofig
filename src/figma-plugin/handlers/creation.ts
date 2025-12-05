/**
 * Element creation handlers
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getContainerNode, getFontStyleFromWeight } from '../utils/helpers';
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
