/**
 * Layout handlers (move, resize, delete, clone)
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getNodeById, assertNodeCapability, delay } from '../utils/helpers';
import { sendProgressUpdate, generateCommandId } from '../utils/progress';

/**
 * Move a node to a new position
 */
export async function moveNode(params: CommandParams['move_node']): Promise<NodeResult> {
  const { nodeId, x, y } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (x === undefined || y === undefined) {
    throw new Error('Missing x or y parameters');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'x', `Node does not support position: ${nodeId}`);

  (node as SceneNode & { x: number; y: number }).x = x;
  (node as SceneNode & { x: number; y: number }).y = y;

  return {
    id: node.id,
    name: node.name,
    x: (node as SceneNode & { x: number }).x,
    y: (node as SceneNode & { y: number }).y,
  };
}

/**
 * Resize a node
 */
export async function resizeNode(params: CommandParams['resize_node']): Promise<NodeResult> {
  const { nodeId, width, height } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (width === undefined || height === undefined) {
    throw new Error('Missing width or height parameters');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'resize', `Node does not support resizing: ${nodeId}`);

  (node as SceneNode & { resize: (w: number, h: number) => void }).resize(width, height);

  return {
    id: node.id,
    name: node.name,
    width: (node as SceneNode & { width: number }).width,
    height: (node as SceneNode & { height: number }).height,
  };
}

/**
 * Delete a single node
 */
export async function deleteNode(params: CommandParams['delete_node']): Promise<NodeResult> {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);

  // Save node info before deleting
  const nodeInfo: NodeResult = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  node.remove();

  return nodeInfo;
}

/**
 * Delete multiple nodes with progress tracking
 */
export async function deleteMultipleNodes(params: CommandParams['delete_multiple_nodes']) {
  const { nodeIds } = params || {};
  const commandId = generateCommandId();

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    const errorMsg = 'Missing or invalid nodeIds parameter';
    sendProgressUpdate(commandId, 'delete_multiple_nodes', 'error', 0, 0, 0, errorMsg, { error: errorMsg });
    throw new Error(errorMsg);
  }

  // Send started progress update
  sendProgressUpdate(
    commandId,
    'delete_multiple_nodes',
    'started',
    0,
    nodeIds.length,
    0,
    `Starting deletion of ${nodeIds.length} nodes`,
    { totalNodes: nodeIds.length }
  );

  const results: Array<{ success: boolean; nodeId: string; nodeInfo?: NodeResult; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Process nodes in chunks of 5
  const CHUNK_SIZE = 5;
  const chunks: string[][] = [];

  for (let i = 0; i < nodeIds.length; i += CHUNK_SIZE) {
    chunks.push(nodeIds.slice(i, i + CHUNK_SIZE));
  }

  // Process each chunk sequentially
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'delete_multiple_nodes',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      nodeIds.length,
      successCount + failureCount,
      `Processing deletion chunk ${chunkIndex + 1}/${chunks.length}`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length, successCount, failureCount }
    );

    // Process deletions within a chunk in parallel
    const chunkPromises = chunk.map(async (nodeId) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);

        if (!node) {
          return { success: false, nodeId, error: `Node not found: ${nodeId}` };
        }

        const nodeInfo: NodeResult = {
          id: node.id,
          name: node.name,
          type: node.type,
        };

        node.remove();

        return { success: true, nodeId, nodeInfo };
      } catch (error) {
        return { success: false, nodeId, error: (error as Error).message };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);

    chunkResults.forEach((result) => {
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
      results.push(result);
    });

    // Add a small delay between chunks
    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'delete_multiple_nodes',
    'completed',
    100,
    nodeIds.length,
    successCount + failureCount,
    `Node deletion complete: ${successCount} successful, ${failureCount} failed`,
    { totalNodes: nodeIds.length, nodesDeleted: successCount, nodesFailed: failureCount, results }
  );

  return {
    success: successCount > 0,
    nodesDeleted: successCount,
    nodesFailed: failureCount,
    totalNodes: nodeIds.length,
    results,
    completedInChunks: chunks.length,
    commandId,
  };
}

/**
 * Clone a node
 */
export async function cloneNode(params: CommandParams['clone_node']): Promise<NodeResult> {
  const { nodeId, x, y } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);

  // Clone the node
  const clone = node.clone();

  // If x and y are provided, move the clone to that position
  if (x !== undefined && y !== undefined) {
    if (!('x' in clone) || !('y' in clone)) {
      throw new Error(`Cloned node does not support position: ${nodeId}`);
    }
    (clone as SceneNode & { x: number; y: number }).x = x;
    (clone as SceneNode & { x: number; y: number }).y = y;
  }

  // Add the clone to the same parent as the original node
  if (node.parent && 'appendChild' in node.parent) {
    (node.parent as BaseNode & ChildrenMixin).appendChild(clone);
  } else {
    figma.currentPage.appendChild(clone);
  }

  return {
    id: clone.id,
    name: clone.name,
    x: 'x' in clone ? clone.x : undefined,
    y: 'y' in clone ? clone.y : undefined,
    width: 'width' in clone ? clone.width : undefined,
    height: 'height' in clone ? clone.height : undefined,
  };
}

