/**
 * Styling handlers (fill, stroke, corner radius)
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getNodeById, assertNodeCapability, provideVisualFeedback } from '../utils/helpers';

/**
 * Set fill color on a node
 */
export async function setFillColor(params: CommandParams['set_fill_color']): Promise<NodeResult> {
  const { nodeId, color } = params || {};

  if (!nodeId) {
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of nodes to modify.'
    );
  }

  if (!color) {
    throw new Error(
      'Missing color parameter\n' +
      '💡 Tip: Provide an RGBA color object, e.g., { r: 1, g: 0, b: 0, a: 1 }'
    );
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(
    node, 
    'fills', 
    `Node "${node.name}" (${node.type}) does not support fills.\n` +
    `💡 Tip: Only shapes, frames, and text nodes support fill colors.`
  );

  const paintStyle: SolidPaint = {
    type: 'SOLID',
    color: {
      r: color.r ?? 0,
      g: color.g ?? 0,
      b: color.b ?? 0,
    },
    opacity: color.a ?? 1,
  };

  (node as GeometryMixin).fills = [paintStyle];

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Updated fill color: ${node.name}`);

  return {
    id: node.id,
    name: node.name,
    fills: [paintStyle],
  };
}

/**
 * Set stroke color on a node
 */
export async function setStrokeColor(params: CommandParams['set_stroke_color']): Promise<NodeResult> {
  const { nodeId, color, weight = 1 } = params || {};

  if (!nodeId) {
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of nodes to modify.'
    );
  }

  if (!color) {
    throw new Error(
      'Missing color parameter\n' +
      '💡 Tip: Provide an RGBA color object, e.g., { r: 0, g: 0, b: 0, a: 1 }'
    );
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(
    node, 
    'strokes', 
    `Node "${node.name}" (${node.type}) does not support strokes.\n` +
    `💡 Tip: Only shapes and frames support stroke colors.`
  );

  const paintStyle: SolidPaint = {
    type: 'SOLID',
    color: {
      r: color.r ?? 0,
      g: color.g ?? 0,
      b: color.b ?? 0,
    },
    opacity: color.a ?? 1,
  };

  const strokableNode = node as GeometryMixin;
  strokableNode.strokes = [paintStyle];

  // Set stroke weight if available
  if ('strokeWeight' in node) {
    (node as GeometryMixin).strokeWeight = weight;
  }

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Updated stroke: ${node.name}`);

  return {
    id: node.id,
    name: node.name,
    strokes: strokableNode.strokes as Paint[],
    strokeWeight: 'strokeWeight' in node ? (node as GeometryMixin).strokeWeight : undefined,
  };
}

/**
 * Set corner radius on a node
 */
export async function setCornerRadius(params: CommandParams['set_corner_radius']): Promise<NodeResult> {
  const { nodeId, radius, topLeftRadius, topRightRadius, bottomLeftRadius, bottomRightRadius } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  // At least one radius must be provided
  const hasAnyRadius = radius !== undefined || 
    topLeftRadius !== undefined || 
    topRightRadius !== undefined ||
    bottomLeftRadius !== undefined ||
    bottomRightRadius !== undefined;

  if (!hasAnyRadius) {
    throw new Error('Missing radius parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'cornerRadius', `Node "${node.name}" (${node.type}) does not support corner radius: ${nodeId}`);

  const cornerNode = node as RectangleNode;

  // If individual corners are specified, use them
  if (topLeftRadius !== undefined || topRightRadius !== undefined || 
      bottomLeftRadius !== undefined || bottomRightRadius !== undefined) {
    if ('topLeftRadius' in cornerNode) {
      if (topLeftRadius !== undefined) cornerNode.topLeftRadius = topLeftRadius;
      if (topRightRadius !== undefined) cornerNode.topRightRadius = topRightRadius;
      if (bottomRightRadius !== undefined) cornerNode.bottomRightRadius = bottomRightRadius;
      if (bottomLeftRadius !== undefined) cornerNode.bottomLeftRadius = bottomLeftRadius;
    } else if ('cornerRadius' in cornerNode) {
      // Node only supports uniform corner radius - warn and use max of individual values or uniform radius
      const individualMax = Math.max(
        topLeftRadius ?? 0,
        topRightRadius ?? 0,
        bottomRightRadius ?? 0,
        bottomLeftRadius ?? 0
      );
      const finalRadius = radius ?? individualMax;
      (cornerNode as RectangleNode).cornerRadius = finalRadius;
      
      // Warn user that individual corners aren't supported
      if (individualMax > 0 && radius === undefined) {
        figma.notify(`⚠️ Node "${node.name}" doesn't support individual corners. Using max radius: ${finalRadius}`, { timeout: 3000 });
      }
    }
  } else if (radius !== undefined) {
    // Set uniform corner radius
    cornerNode.cornerRadius = radius;
  }

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Updated corner radius: ${node.name}`);

  return {
    id: node.id,
    name: node.name,
    cornerRadius: 'cornerRadius' in cornerNode ? cornerNode.cornerRadius : undefined,
    topLeftRadius: 'topLeftRadius' in cornerNode ? cornerNode.topLeftRadius : undefined,
    topRightRadius: 'topRightRadius' in cornerNode ? cornerNode.topRightRadius : undefined,
    bottomRightRadius: 'bottomRightRadius' in cornerNode ? cornerNode.bottomRightRadius : undefined,
    bottomLeftRadius: 'bottomLeftRadius' in cornerNode ? cornerNode.bottomLeftRadius : undefined,
  };
}

/**
 * Set opacity on a node
 */
export async function setOpacity(params: CommandParams['set_opacity']): Promise<NodeResult> {
  const { nodeId, opacity } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (opacity === undefined || opacity === null) {
    throw new Error('Missing opacity parameter');
  }

  // Clamp opacity to valid range
  const clampedOpacity = Math.max(0, Math.min(1, opacity));

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'opacity', `Node "${node.name}" does not support opacity: ${nodeId}`);

  (node as BlendMixin).opacity = clampedOpacity;

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Updated opacity: ${node.name} (${Math.round(clampedOpacity * 100)}%)`);

  return {
    id: node.id,
    name: node.name,
    opacity: clampedOpacity,
  };
}

