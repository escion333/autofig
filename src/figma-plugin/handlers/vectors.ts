/**
 * Vector operations handlers (boolean operations, flatten, outline stroke, images)
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getNodeById, assertNodeCapability } from '../utils/helpers';

// ============================================================================
// Boolean Operations
// ============================================================================

type BooleanOperationType = 'UNION' | 'SUBTRACT' | 'INTERSECT' | 'EXCLUDE';

/**
 * Perform a boolean operation on multiple nodes
 */
export async function booleanOperation(
  params: CommandParams['boolean_operation']
): Promise<NodeResult> {
  const { nodeIds, operation, name } = params;

  if (!nodeIds || nodeIds.length < 2) {
    throw new Error('At least 2 nodes are required for boolean operations');
  }

  if (!operation) {
    throw new Error('Missing operation parameter');
  }

  // Get all nodes
  const nodes: SceneNode[] = [];
  for (const nodeId of nodeIds) {
    const node = await getNodeById(nodeId);
    if (!('type' in node)) {
      throw new Error(`Node ${nodeId} is not a valid scene node`);
    }
    nodes.push(node as SceneNode);
  }

  // Verify all nodes have the same parent
  const parent = nodes[0].parent;
  for (const node of nodes) {
    if (node.parent !== parent) {
      throw new Error('All nodes must have the same parent for boolean operations');
    }
  }

  // Create the boolean operation
  let booleanResult: BooleanOperationNode;

  switch (operation) {
    case 'UNION':
      booleanResult = figma.union(nodes, parent as BaseNode & ChildrenMixin);
      break;
    case 'SUBTRACT':
      booleanResult = figma.subtract(nodes, parent as BaseNode & ChildrenMixin);
      break;
    case 'INTERSECT':
      booleanResult = figma.intersect(nodes, parent as BaseNode & ChildrenMixin);
      break;
    case 'EXCLUDE':
      booleanResult = figma.exclude(nodes, parent as BaseNode & ChildrenMixin);
      break;
    default:
      throw new Error(`Unknown boolean operation: ${operation}`);
  }

  // Set name if provided
  if (name) {
    booleanResult.name = name;
  } else {
    booleanResult.name = `${operation} Result`;
  }

  return {
    id: booleanResult.id,
    name: booleanResult.name,
    type: booleanResult.type,
    x: booleanResult.x,
    y: booleanResult.y,
    width: booleanResult.width,
    height: booleanResult.height,
    booleanOperation: booleanResult.booleanOperation,
    parentId: booleanResult.parent?.id,
  };
}

/**
 * Flatten a node (convert to a single vector path)
 */
export async function flattenNode(
  params: CommandParams['flatten_node']
): Promise<NodeResult> {
  const { nodeId } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);

  // Check if node supports flatten
  if (!('type' in node)) {
    throw new Error(`Node ${nodeId} cannot be flattened`);
  }

  const sceneNode = node as SceneNode;

  // Figma's flatten creates a new vector node
  const flattenedNodes = figma.flatten([sceneNode]);

  return {
    id: flattenedNodes.id,
    name: flattenedNodes.name,
    type: flattenedNodes.type,
    x: flattenedNodes.x,
    y: flattenedNodes.y,
    width: flattenedNodes.width,
    height: flattenedNodes.height,
    parentId: flattenedNodes.parent?.id,
  };
}

/**
 * Outline stroke (convert stroke to fill)
 */
export async function outlineStroke(
  params: CommandParams['outline_stroke']
): Promise<NodeResult> {
  const { nodeId } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'outlineStroke', `Node "${node.name}" does not support outline stroke`);

  // Create outlined stroke
  const outlinedNode = (node as VectorNode).outlineStroke();

  if (!outlinedNode) {
    throw new Error('Failed to outline stroke - node may not have a stroke');
  }

  return {
    id: outlinedNode.id,
    name: outlinedNode.name,
    type: outlinedNode.type,
    x: outlinedNode.x,
    y: outlinedNode.y,
    width: outlinedNode.width,
    height: outlinedNode.height,
    parentId: outlinedNode.parent?.id,
  };
}

// ============================================================================
// Image Operations
// ============================================================================

/**
 * Set an image fill on a node from base64 data
 */
export async function setImageFill(
  params: CommandParams['set_image_fill']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  scaleMode: string;
}> {
  const { nodeId, imageData, scaleMode = 'FILL' } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!imageData) {
    throw new Error('Missing imageData parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'fills', `Node "${node.name}" does not support fills`);

  // Decode base64 to Uint8Array
  let imageBytes: Uint8Array;
  try {
    // Handle data URL format (e.g., "data:image/png;base64,...")
    let base64Data = imageData;
    if (imageData.includes(',')) {
      base64Data = imageData.split(',')[1];
    }
    
    // Decode base64
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    imageBytes = bytes;
  } catch (error) {
    throw new Error(`Invalid base64 image data: ${(error as Error).message}`);
  }

  // Create image hash
  const imageHash = figma.createImage(imageBytes).hash;

  // Create image paint
  const imagePaint: ImagePaint = {
    type: 'IMAGE',
    scaleMode: scaleMode,
    imageHash: imageHash,
  };

  // Apply the image fill
  (node as GeometryMixin).fills = [imagePaint];

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    scaleMode: scaleMode,
  };
}

