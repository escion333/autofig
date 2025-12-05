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
    fontColor = { r: 0, g: 0, b: 0, a: 1 },
    name = '',
    parentId,
  } = params || {};

  const fontStyle = getFontStyleFromWeight(fontWeight);

  const textNode = figma.createText();
  textNode.x = x;
  textNode.y = y;
  textNode.name = name || text;

  try {
    await figma.loadFontAsync({
      family: 'Inter',
      style: fontStyle,
    });
    textNode.fontName = { family: 'Inter', style: fontStyle };
    textNode.fontSize = fontSize;
  } catch (error) {
    console.error('Error setting font size', error);
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
    fontColor: fontColor,
    fontName: textNode.fontName,
    fills: textNode.fills as Paint[],
    parentId: textNode.parent?.id,
  };
}

