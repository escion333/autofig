/**
 * Paint style handlers (color styles, gradients)
 */

import type { CommandParams, PaintStyleInfo } from '../../shared/types';
import { getNodeById, assertNodeCapability, provideVisualFeedback } from '../utils/helpers';

// ============================================================================
// Paint Style CRUD Operations
// ============================================================================

/**
 * Get all local paint styles
 */
export async function getPaintStyles(): Promise<{
  count: number;
  styles: PaintStyleInfo[];
}> {
  const paintStyles = await figma.getLocalPaintStylesAsync();

  const styles: PaintStyleInfo[] = paintStyles.map((style) => {
    const paint = style.paints[0];
    const result: PaintStyleInfo = {
      id: style.id,
      name: style.name,
      key: style.key,
      type: paint?.type === 'SOLID' ? 'SOLID' : (paint?.type as PaintStyleInfo['type']) || 'SOLID',
    };

    if (paint?.type === 'SOLID') {
      result.color = {
        r: paint.color.r,
        g: paint.color.g,
        b: paint.color.b,
        a: paint.opacity ?? 1,
      };
    } else if (paint?.type?.startsWith('GRADIENT_')) {
      result.gradientStops = (paint as GradientPaint).gradientStops.map((stop) => ({
        position: stop.position,
        color: {
          r: stop.color.r,
          g: stop.color.g,
          b: stop.color.b,
          a: stop.color.a ?? 1,
        },
      }));
    }

    return result;
  });

  return {
    count: styles.length,
    styles,
  };
}

/**
 * Create a new paint style with a solid color
 */
export async function createPaintStyle(
  params: CommandParams['create_paint_style']
): Promise<PaintStyleInfo> {
  const { name, color } = params;

  if (!name) {
    throw new Error('Missing name parameter');
  }

  if (!color) {
    throw new Error('Missing color parameter');
  }

  // Create the paint style
  const style = figma.createPaintStyle();
  style.name = name;

  // Set the solid paint
  const paint: SolidPaint = {
    type: 'SOLID',
    color: {
      r: color.r ?? 0,
      g: color.g ?? 0,
      b: color.b ?? 0,
    },
    opacity: color.a ?? 1,
  };

  style.paints = [paint];

  // Provide visual feedback
  figma.notify(`✅ Created paint style: ${name}`);

  return {
    id: style.id,
    name: style.name,
    key: style.key,
    type: 'SOLID',
    color: {
      r: paint.color.r,
      g: paint.color.g,
      b: paint.color.b,
      a: paint.opacity ?? 1,
    },
  };
}

/**
 * Update an existing paint style
 */
export async function updatePaintStyle(
  params: CommandParams['update_paint_style']
): Promise<PaintStyleInfo> {
  const { styleId, name, color } = params;

  if (!styleId) {
    throw new Error('Missing styleId parameter');
  }

  // Get the existing style
  const style = figma.getStyleById(styleId) as PaintStyle | null;

  if (!style) {
    throw new Error(`Paint style not found: ${styleId}`);
  }

  if (style.type !== 'PAINT') {
    throw new Error(`Style is not a paint style: ${styleId} (type: ${style.type})`);
  }

  // Update name if provided
  if (name !== undefined) {
    style.name = name;
  }

  // Update color if provided
  if (color !== undefined) {
    const paint: SolidPaint = {
      type: 'SOLID',
      color: {
        r: color.r ?? 0,
        g: color.g ?? 0,
        b: color.b ?? 0,
      },
      opacity: color.a ?? 1,
    };

    style.paints = [paint];
  }

  // Get the current paint for response
  const currentPaint = style.paints[0];
  const result: PaintStyleInfo = {
    id: style.id,
    name: style.name,
    key: style.key,
    type: currentPaint?.type === 'SOLID' ? 'SOLID' : (currentPaint?.type as PaintStyleInfo['type']) || 'SOLID',
  };

  if (currentPaint?.type === 'SOLID') {
    result.color = {
      r: currentPaint.color.r,
      g: currentPaint.color.g,
      b: currentPaint.color.b,
      a: currentPaint.opacity ?? 1,
    };
  }

  // Provide visual feedback
  figma.notify(`✅ Updated paint style: ${style.name}`);

  return result;
}

/**
 * Apply a paint style to a node's fills or strokes
 */
export async function applyPaintStyle(
  params: CommandParams['apply_paint_style']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  styleId: string;
  styleName: string;
  property: 'fills' | 'strokes';
}> {
  const { nodeId, styleId, styleName, property = 'fills' } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!styleId && !styleName) {
    throw new Error('Either styleId or styleName must be provided');
  }

  // Find the style
  let style: PaintStyle | null = null;

  if (styleId) {
    const foundStyle = figma.getStyleById(styleId);
    if (foundStyle && foundStyle.type === 'PAINT') {
      style = foundStyle as PaintStyle;
    }
  } else if (styleName) {
    const paintStyles = await figma.getLocalPaintStylesAsync();
    style = paintStyles.find((s) => s.name === styleName) || null;
  }

  if (!style) {
    throw new Error(`Paint style not found: ${styleId || styleName}`);
  }

  // Get the node
  const node = await getNodeById(nodeId);

  // Verify the node supports the property
  if (property === 'fills') {
    assertNodeCapability(node, 'fillStyleId', `Node "${node.name}" does not support fill styles`);
    (node as GeometryMixin).fillStyleId = style.id;
  } else {
    assertNodeCapability(node, 'strokeStyleId', `Node "${node.name}" does not support stroke styles`);
    (node as GeometryMixin).strokeStyleId = style.id;
  }

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Applied paint style "${style.name}" to ${node.name} (${property})`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    styleId: style.id,
    styleName: style.name,
    property,
  };
}

/**
 * Delete a paint style
 */
export async function deletePaintStyle(
  params: CommandParams['delete_paint_style']
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
  const style = figma.getStyleById(styleId) as PaintStyle | null;

  if (!style) {
    throw new Error(`Paint style not found: ${styleId}`);
  }

  if (style.type !== 'PAINT') {
    throw new Error(`Style is not a paint style: ${styleId} (type: ${style.type})`);
  }

  const styleName = style.name;

  // Remove the style
  style.remove();

  // Provide visual feedback
  figma.notify(`✅ Deleted paint style: ${styleName}`);

  return {
    success: true,
    styleId,
    styleName,
  };
}

// ============================================================================
// Gradient Operations
// ============================================================================

/**
 * Set a gradient fill on a node
 */
export async function setGradientFill(
  params: CommandParams['set_gradient_fill']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  gradientType: string;
  stopsCount: number;
}> {
  const { nodeId, gradientType, stops, angle = 0 } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!gradientType) {
    throw new Error('Missing gradientType parameter');
  }

  if (!stops || stops.length < 2) {
    throw new Error('At least 2 gradient stops are required');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'fills', `Node "${node.name}" does not support fills`);

  // Map gradient type to Figma type
  const figmaGradientType = `GRADIENT_${gradientType}` as
    | 'GRADIENT_LINEAR'
    | 'GRADIENT_RADIAL'
    | 'GRADIENT_ANGULAR'
    | 'GRADIENT_DIAMOND';

  // Convert angle to transform matrix
  // Figma uses a 2x3 transformation matrix [[a, c, tx], [b, d, ty]]
  // For linear gradients, we rotate around the center
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // Create the gradient transform (rotation matrix centered at 0.5, 0.5)
  const gradientTransform: Transform = [
    [cos, sin, 0.5 - 0.5 * cos - 0.5 * sin],
    [-sin, cos, 0.5 + 0.5 * sin - 0.5 * cos],
  ];

  // Create the gradient paint
  const gradientPaint: GradientPaint = {
    type: figmaGradientType,
    gradientStops: stops.map((stop) => ({
      position: Math.max(0, Math.min(1, stop.position)),
      color: {
        r: stop.color.r ?? 0,
        g: stop.color.g ?? 0,
        b: stop.color.b ?? 0,
        a: stop.color.a ?? 1,
      },
    })),
    gradientTransform: gradientType === 'LINEAR' ? gradientTransform : [[1, 0, 0], [0, 1, 0]],
  };

  (node as GeometryMixin).fills = [gradientPaint];

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Set ${gradientType.toLowerCase()} gradient on ${node.name} (${stops.length} stops)`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    gradientType: figmaGradientType,
    stopsCount: stops.length,
  };
}

