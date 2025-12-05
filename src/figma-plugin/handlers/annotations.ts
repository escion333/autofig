/**
 * Annotation handlers
 */

import type { CommandParams, AnnotationInfo, NodeType } from '../../shared/types';
import { getNodeById, delay } from '../utils/helpers';
import { sendProgressUpdate, generateCommandId } from '../utils/progress';

/**
 * Get annotations from nodes
 */
export async function getAnnotations(params: CommandParams['get_annotations']) {
  const { nodeId } = params || {};
  const commandId = generateCommandId();

  let rootNode: SceneNode | PageNode;

  if (nodeId) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    rootNode = node as SceneNode;
  } else {
    rootNode = figma.currentPage;
  }

  const annotations: AnnotationInfo[] = [];

  async function collectAnnotations(node: SceneNode | PageNode): Promise<void> {
    if ('annotations' in node && Array.isArray(node.annotations)) {
      for (const annotation of node.annotations) {
        if (annotation.label) {
          annotations.push({
            nodeId: node.id,
            nodeName: node.name,
            label: annotation.label,
            labelText: annotation.label,
          });
        }
      }
    }

    if ('children' in node) {
      for (const child of node.children) {
        await collectAnnotations(child);
      }
    }
  }

  await collectAnnotations(rootNode);

  return {
    success: true,
    count: annotations.length,
    annotations,
    commandId,
  };
}

/**
 * Set annotation on a node
 */
export async function setAnnotation(params: CommandParams['set_annotation']) {
  const { nodeId, label } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!label) {
    throw new Error('Missing label parameter');
  }

  const node = await getNodeById(nodeId);

  if (!('annotations' in node)) {
    throw new Error(`Node does not support annotations: ${nodeId}`);
  }

  // Set the annotation
  const annotationNode = node as SceneNode & { annotations: Array<{ label: string }> };
  annotationNode.annotations = [{ label }];

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    label,
  };
}

/**
 * Set annotations on multiple nodes
 */
export async function setMultipleAnnotations(params: CommandParams['set_multiple_annotations']) {
  const { annotations } = params || {};
  const commandId = generateCommandId();

  if (!annotations || !Array.isArray(annotations) || annotations.length === 0) {
    throw new Error('Missing or invalid annotations parameter');
  }

  sendProgressUpdate(
    commandId,
    'set_multiple_annotations',
    'started',
    0,
    annotations.length,
    0,
    `Starting to set ${annotations.length} annotations`,
    { totalNodes: annotations.length }
  );

  const results: Array<{ success: boolean; nodeId: string; nodeName?: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Process in chunks
  const CHUNK_SIZE = 5;
  const chunks: Array<Array<{ nodeId: string; label: string }>> = [];

  for (let i = 0; i < annotations.length; i += CHUNK_SIZE) {
    chunks.push(annotations.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    const chunkPromises = chunk.map(async ({ nodeId, label }) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);

        if (!node) {
          return { success: false, nodeId, error: `Node not found: ${nodeId}` };
        }

        if (!('annotations' in node)) {
          return { success: false, nodeId, error: `Node does not support annotations: ${nodeId}` };
        }

        const annotationNode = node as SceneNode & { annotations: Array<{ label: string }> };
        annotationNode.annotations = [{ label }];

        return { success: true, nodeId, nodeName: node.name };
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

    sendProgressUpdate(
      commandId,
      'set_multiple_annotations',
      'in_progress',
      Math.round(((chunkIndex + 1) / chunks.length) * 100),
      annotations.length,
      successCount + failureCount,
      `Processed ${successCount + failureCount}/${annotations.length} annotations`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
    );

    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'set_multiple_annotations',
    'completed',
    100,
    annotations.length,
    successCount + failureCount,
    `Annotation update complete: ${successCount} successful, ${failureCount} failed`,
    { results }
  );

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalNodes: annotations.length,
    results,
    commandId,
  };
}

/**
 * Scan for nodes by type
 */
export async function scanNodesByTypes(params: CommandParams['scan_nodes_by_types']) {
  const { types, parentNodeId, depth: maxDepth } = params || {};
  const commandId = generateCommandId();

  if (!types || !Array.isArray(types) || types.length === 0) {
    throw new Error('Missing or invalid types parameter');
  }

  let rootNode: SceneNode | PageNode;

  if (parentNodeId) {
    const node = await figma.getNodeByIdAsync(parentNodeId);
    if (!node) {
      throw new Error(`Node not found: ${parentNodeId}`);
    }
    rootNode = node as SceneNode;
  } else {
    rootNode = figma.currentPage;
  }

  const matchingNodes: Array<{ id: string; name: string; type: string; depth: number; path: string[] }> = [];

  async function findNodes(
    node: SceneNode | PageNode,
    path: string[] = [],
    currentDepth: number = 0
  ): Promise<void> {
    // Check depth limit
    if (maxDepth !== undefined && currentDepth > maxDepth) {
      return;
    }

    // Check if node matches any of the specified types
    if (types.includes(node.type as NodeType)) {
      matchingNodes.push({
        id: node.id,
        name: node.name,
        type: node.type,
        depth: currentDepth,
        path,
      });
    }

    // Recurse into children
    if ('children' in node) {
      for (const child of node.children) {
        await findNodes(child, [...path, node.name], currentDepth + 1);
      }
    }
  }

  sendProgressUpdate(
    commandId,
    'scan_nodes_by_types',
    'started',
    0,
    1,
    0,
    `Scanning for nodes of types: ${types.join(', ')}`,
    { types }
  );

  await findNodes(rootNode);

  sendProgressUpdate(
    commandId,
    'scan_nodes_by_types',
    'completed',
    100,
    matchingNodes.length,
    matchingNodes.length,
    `Found ${matchingNodes.length} nodes matching types: ${types.join(', ')}`,
    { nodes: matchingNodes }
  );

  return {
    success: true,
    count: matchingNodes.length,
    nodes: matchingNodes,
    types,
    commandId,
  };
}

