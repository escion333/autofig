/**
 * Batch style and paint handlers for reducing round-trips
 */

import type { CommandParams, RGBA } from '../../shared/types';
import { delay } from '../utils/helpers';
import { sendProgressUpdate, generateCommandId } from '../utils/progress';

/**
 * Apply a style (text, paint, effect, or grid) to multiple nodes at once.
 */
export async function applyStyleBatch(params: CommandParams['apply_style_batch']) {
  const { styleType, styleId, styleName, nodeIds, property } = params || {};
  const commandId = generateCommandId();

  if (!styleType) {
    throw new Error('Missing styleType parameter');
  }
  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    throw new Error('Missing or invalid nodeIds parameter');
  }
  if (!styleId && !styleName) {
    throw new Error('Either styleId or styleName must be provided');
  }

  sendProgressUpdate(
    commandId,
    'apply_style_batch',
    'started',
    0,
    nodeIds.length,
    0,
    `Starting to apply ${styleType} style to ${nodeIds.length} nodes`,
    { styleType, totalNodes: nodeIds.length }
  );

  // Resolve style by name if needed
  let resolvedStyleId = styleId;
  if (!resolvedStyleId && styleName) {
    resolvedStyleId = await resolveStyleByName(styleType, styleName);
    if (!resolvedStyleId) {
      throw new Error(`${styleType} style not found: "${styleName}"`);
    }
  }

  const results: Array<{ success: boolean; nodeId: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  const CHUNK_SIZE = 5;
  const chunks: string[][] = [];
  for (let i = 0; i < nodeIds.length; i += CHUNK_SIZE) {
    chunks.push(nodeIds.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'apply_style_batch',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      nodeIds.length,
      successCount + failureCount,
      `Processing chunk ${chunkIndex + 1}/${chunks.length}`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
    );

    const chunkPromises = chunk.map(async (nodeId) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node) {
          return { success: false, nodeId, error: `Node not found: ${nodeId}` };
        }

        await applyStyleToNode(node as SceneNode, styleType, resolvedStyleId!, property);
        return { success: true, nodeId };
      } catch (error) {
        return { success: false, nodeId, error: (error as Error).message };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);

    for (const result of chunkResults) {
      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'apply_style_batch',
    'completed',
    100,
    nodeIds.length,
    successCount + failureCount,
    `Style batch complete: ${successCount} successful, ${failureCount} failed`,
    { results }
  );

  const message = `✅ Applied ${styleType} style to ${successCount} nodes` + (failureCount > 0 ? ` (${failureCount} failed)` : '');
  figma.notify(message);

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalNodes: nodeIds.length,
    results,
    commandId,
  };
}

/**
 * Batch set fill/stroke colors on multiple nodes without styles.
 */
export async function setPaintBatch(params: CommandParams['set_paint_batch']) {
  const { updates } = params || {};
  const commandId = generateCommandId();

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new Error('Missing or invalid updates parameter');
  }

  sendProgressUpdate(
    commandId,
    'set_paint_batch',
    'started',
    0,
    updates.length,
    0,
    `Starting to set paint on ${updates.length} nodes`,
    { totalNodes: updates.length }
  );

  const results: Array<{ success: boolean; nodeId: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  const CHUNK_SIZE = 5;
  const chunks: Array<typeof updates> = [];
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    chunks.push(updates.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'set_paint_batch',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      updates.length,
      successCount + failureCount,
      `Processing chunk ${chunkIndex + 1}/${chunks.length}`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
    );

    const chunkPromises = chunk.map(async ({ nodeId, property, color, weight }) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node) {
          return { success: false, nodeId, error: `Node not found: ${nodeId}` };
        }

        const sceneNode = node as SceneNode;
        const paintStyle: SolidPaint = {
          type: 'SOLID',
          color: { r: color.r ?? 0, g: color.g ?? 0, b: color.b ?? 0 },
          opacity: color.a ?? 1,
        };

        const prop = property || 'fills';
        if (prop === 'fills') {
          if (!('fills' in sceneNode)) {
            return { success: false, nodeId, error: `Node does not support fills: ${nodeId}` };
          }
          (sceneNode as GeometryMixin).fills = [paintStyle];
        } else {
          if (!('strokes' in sceneNode)) {
            return { success: false, nodeId, error: `Node does not support strokes: ${nodeId}` };
          }
          (sceneNode as GeometryMixin).strokes = [paintStyle];
          if (weight !== undefined && 'strokeWeight' in sceneNode) {
            (sceneNode as GeometryMixin).strokeWeight = weight;
          }
        }

        return { success: true, nodeId };
      } catch (error) {
        return { success: false, nodeId, error: (error as Error).message };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);

    for (const result of chunkResults) {
      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'set_paint_batch',
    'completed',
    100,
    updates.length,
    successCount + failureCount,
    `Paint batch complete: ${successCount} successful, ${failureCount} failed`,
    { results }
  );

  const message = `✅ Set paint on ${successCount} nodes` + (failureCount > 0 ? ` (${failureCount} failed)` : '');
  figma.notify(message);

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalNodes: updates.length,
    results,
    commandId,
  };
}

// ============================================================================
// Internal helpers
// ============================================================================

async function resolveStyleByName(styleType: string, styleName: string): Promise<string | null> {
  let styles: BaseStyle[];
  switch (styleType) {
    case 'TEXT':
      styles = await figma.getLocalTextStylesAsync();
      break;
    case 'PAINT':
      styles = await figma.getLocalPaintStylesAsync();
      break;
    case 'EFFECT':
      styles = await figma.getLocalEffectStylesAsync();
      break;
    case 'GRID':
      styles = await figma.getLocalGridStylesAsync();
      break;
    default:
      return null;
  }
  const match = styles.find((s) => s.name === styleName);
  return match ? match.id : null;
}

async function applyStyleToNode(
  node: SceneNode,
  styleType: string,
  styleId: string,
  property?: string
): Promise<void> {
  switch (styleType) {
    case 'TEXT': {
      if (node.type !== 'TEXT') {
        throw new Error(`Node ${node.id} is not a text node`);
      }
      await (node as TextNode).setTextStyleIdAsync(styleId);
      break;
    }
    case 'PAINT': {
      const prop = property || 'fills';
      if (prop === 'fills') {
        if (!('fills' in node)) throw new Error(`Node ${node.id} does not support fills`);
        await (node as GeometryMixin & SceneNode).setFillStyleIdAsync(styleId);
      } else {
        if (!('strokes' in node)) throw new Error(`Node ${node.id} does not support strokes`);
        await (node as GeometryMixin & SceneNode).setStrokeStyleIdAsync(styleId);
      }
      break;
    }
    case 'EFFECT': {
      if (!('effects' in node)) throw new Error(`Node ${node.id} does not support effects`);
      await (node as BlendMixin & SceneNode).setEffectStyleIdAsync(styleId);
      break;
    }
    case 'GRID': {
      if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET' && node.type !== 'SECTION') {
        throw new Error(`Node ${node.id} (${node.type}) does not support grid styles`);
      }
      await (node as FrameNode).setGridStyleIdAsync(styleId);
      break;
    }
    default:
      throw new Error(`Unknown style type: ${styleType}`);
  }
}
