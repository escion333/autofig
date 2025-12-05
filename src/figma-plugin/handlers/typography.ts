/**
 * Typography handlers (fonts, text styles, text properties)
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getNodeById } from '../utils/helpers';

/**
 * Font info for available fonts
 */
interface FontInfo {
  family: string;
  styles: string[];
}

/**
 * Get available fonts in the document
 */
export async function getAvailableFonts(params: CommandParams['get_available_fonts']): Promise<{ fonts: FontInfo[] }> {
  const { filter } = params || {};

  const fonts = await figma.listAvailableFontsAsync();

  // Group fonts by family
  const fontMap = new Map<string, Set<string>>();

  for (const font of fonts) {
    const family = font.fontName.family;
    const style = font.fontName.style;

    // Apply filter if provided
    if (filter) {
      const filterLower = filter.toLowerCase();
      if (!family.toLowerCase().includes(filterLower)) {
        continue;
      }
    }

    if (!fontMap.has(family)) {
      fontMap.set(family, new Set());
    }
    fontMap.get(family)!.add(style);
  }

  // Convert to array format
  const result: FontInfo[] = [];
  for (const [family, styles] of fontMap.entries()) {
    result.push({
      family,
      styles: Array.from(styles).sort(),
    });
  }

  // Sort by family name
  result.sort((a, b) => a.family.localeCompare(b.family));

  return {
    fonts: result,
  };
}

/**
 * Load a font for use
 */
export async function loadFont(params: CommandParams['load_font']): Promise<{ success: boolean; family: string; style: string }> {
  const { family, style = 'Regular' } = params || {};

  if (!family) {
    throw new Error('Missing family parameter');
  }

  try {
    await figma.loadFontAsync({ family, style });
    return {
      success: true,
      family,
      style,
    };
  } catch (error) {
    throw new Error(`Failed to load font "${family}" with style "${style}": ${(error as Error).message}`);
  }
}

/**
 * Get all local text styles
 */
export async function getTextStyles(): Promise<{ styles: Array<{ id: string; name: string; fontFamily: string; fontStyle: string; fontSize: number }> }> {
  const styles = figma.getLocalTextStyles();

  return {
    styles: styles.map((style) => ({
      id: style.id,
      name: style.name,
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize,
    })),
  };
}

/**
 * Create a new text style
 */
export async function createTextStyle(params: CommandParams['create_text_style']): Promise<{
  id: string;
  name: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
}> {
  const {
    name,
    fontFamily = 'Inter',
    fontStyle = 'Regular',
    fontSize = 14,
    letterSpacing,
    lineHeight,
    paragraphSpacing,
    textCase,
    textDecoration,
  } = params || {};

  if (!name) {
    throw new Error('Missing name parameter');
  }

  // Load the font first
  try {
    await figma.loadFontAsync({ family: fontFamily, style: fontStyle });
  } catch (error) {
    throw new Error(`Failed to load font "${fontFamily}" with style "${fontStyle}": ${(error as Error).message}`);
  }

  // Create the text style
  const style = figma.createTextStyle();
  style.name = name;
  style.fontName = { family: fontFamily, style: fontStyle };
  style.fontSize = fontSize;

  // Set optional properties
  if (letterSpacing !== undefined) {
    style.letterSpacing = { value: letterSpacing, unit: 'PIXELS' };
  }

  if (lineHeight !== undefined) {
    if (lineHeight === 'AUTO') {
      style.lineHeight = { unit: 'AUTO' };
    } else {
      style.lineHeight = { value: lineHeight, unit: 'PIXELS' };
    }
  }

  if (paragraphSpacing !== undefined) {
    style.paragraphSpacing = paragraphSpacing;
  }

  if (textCase !== undefined) {
    style.textCase = textCase;
  }

  if (textDecoration !== undefined) {
    style.textDecoration = textDecoration;
  }

  return {
    id: style.id,
    name: style.name,
    fontFamily: style.fontName.family,
    fontStyle: style.fontName.style,
    fontSize: style.fontSize,
  };
}

/**
 * Apply a text style to a node
 */
export async function applyTextStyle(params: CommandParams['apply_text_style']): Promise<NodeResult> {
  const { nodeId, styleId, styleName } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!styleId && !styleName) {
    throw new Error('Either styleId or styleName must be provided');
  }

  const node = await getNodeById(nodeId);

  if (node.type !== 'TEXT') {
    throw new Error(`Node "${node.name}" (${node.type}) is not a text node: ${nodeId}`);
  }

  const textNode = node as TextNode;

  // Find the style
  let style: TextStyle | undefined;

  if (styleId) {
    style = figma.getStyleById(styleId) as TextStyle;
    if (!style || style.type !== 'TEXT') {
      throw new Error(`Text style not found with ID: ${styleId}`);
    }
  } else if (styleName) {
    const styles = figma.getLocalTextStyles();
    style = styles.find((s) => s.name === styleName);
    if (!style) {
      throw new Error(`Text style not found with name: "${styleName}"`);
    }
  }

  // Load the font used by the style
  await figma.loadFontAsync(style!.fontName);

  // Apply the style
  textNode.textStyleId = style!.id;

  return {
    id: textNode.id,
    name: textNode.name,
    textStyleId: textNode.textStyleId as string,
    textStyleName: style!.name,
  };
}

/**
 * Set text properties on a text node
 */
export async function setTextProperties(params: CommandParams['set_text_properties']): Promise<NodeResult> {
  const {
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
  } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);

  if (node.type !== 'TEXT') {
    throw new Error(`Node "${node.name}" (${node.type}) is not a text node: ${nodeId}`);
  }

  const textNode = node as TextNode;

  // If changing font, load it first
  if (fontFamily || fontStyle) {
    const currentFont = textNode.fontName === figma.mixed
      ? { family: 'Inter', style: 'Regular' }
      : textNode.fontName as FontName;

    const newFont: FontName = {
      family: fontFamily || currentFont.family,
      style: fontStyle || currentFont.style,
    };

    try {
      await figma.loadFontAsync(newFont);
      textNode.fontName = newFont;
    } catch (error) {
      throw new Error(`Failed to load font "${newFont.family}" with style "${newFont.style}": ${(error as Error).message}`);
    }
  } else {
    // Load current font to allow editing other properties
    if (textNode.fontName !== figma.mixed) {
      await figma.loadFontAsync(textNode.fontName as FontName);
    } else {
      // For mixed fonts, load Inter as a fallback
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    }
  }

  // Set font size
  if (fontSize !== undefined) {
    textNode.fontSize = fontSize;
  }

  // Set letter spacing
  if (letterSpacing !== undefined) {
    textNode.letterSpacing = { value: letterSpacing, unit: 'PIXELS' };
  }

  // Set line height
  if (lineHeight !== undefined) {
    if (lineHeight === 'AUTO') {
      textNode.lineHeight = { unit: 'AUTO' };
    } else {
      textNode.lineHeight = { value: lineHeight, unit: 'PIXELS' };
    }
  }

  // Set paragraph spacing
  if (paragraphSpacing !== undefined) {
    textNode.paragraphSpacing = paragraphSpacing;
  }

  // Set text case
  if (textCase !== undefined) {
    textNode.textCase = textCase;
  }

  // Set text decoration
  if (textDecoration !== undefined) {
    textNode.textDecoration = textDecoration;
  }

  // Set horizontal alignment
  if (textAlignHorizontal !== undefined) {
    textNode.textAlignHorizontal = textAlignHorizontal;
  }

  // Set vertical alignment
  if (textAlignVertical !== undefined) {
    textNode.textAlignVertical = textAlignVertical;
  }

  return {
    id: textNode.id,
    name: textNode.name,
    fontName: textNode.fontName !== figma.mixed ? textNode.fontName : 'mixed',
    fontSize: textNode.fontSize !== figma.mixed ? textNode.fontSize : 'mixed',
    letterSpacing: textNode.letterSpacing,
    lineHeight: textNode.lineHeight,
    paragraphSpacing: textNode.paragraphSpacing,
    textCase: textNode.textCase !== figma.mixed ? textNode.textCase : 'mixed',
    textDecoration: textNode.textDecoration !== figma.mixed ? textNode.textDecoration : 'mixed',
    textAlignHorizontal: textNode.textAlignHorizontal,
    textAlignVertical: textNode.textAlignVertical,
  };
}

