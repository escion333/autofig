/**
 * Document and selection handlers
 */

import { filterFigmaNode } from '../../shared/utils/node-filter';
import type { CommandParams, DocumentInfoResult, SelectionResult } from '../../shared/types';

/**
 * Get information about the current Figma document
 */
export async function getDocumentInfo(): Promise<DocumentInfoResult> {
  await figma.currentPage.loadAsync();
  const page = figma.currentPage;
  
  return {
    name: page.name,
    id: page.id,
    type: page.type,
    children: page.children.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
    currentPage: {
      id: page.id,
      name: page.name,
      childCount: page.children.length,
    },
    pages: [
      {
        id: page.id,
        name: page.name,
        childCount: page.children.length,
      },
    ],
  };
}

/**
 * Get the current selection
 */
export async function getSelection(): Promise<SelectionResult> {
  return {
    selectionCount: figma.currentPage.selection.length,
    selection: figma.currentPage.selection.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
    })),
  };
}

/**
 * Read detailed design info from current selection
 */
export async function readMyDesign(): Promise<Array<{ nodeId: string; document: ReturnType<typeof filterFigmaNode> }>> {
  try {
    // Load all selected nodes in parallel
    const nodes = await Promise.all(
      figma.currentPage.selection.map((node) => figma.getNodeByIdAsync(node.id))
    );

    // Filter out any null values (nodes that weren't found)
    const validNodes = nodes.filter((node): node is SceneNode => node !== null);

    // Export all valid nodes in parallel
    const responses = await Promise.all(
      validNodes.map(async (node) => {
        const response = await (node as any).exportAsync({
          format: 'JSON_REST_V1',
        });
        return {
          nodeId: node.id,
          document: filterFigmaNode(response.document),
        };
      })
    );

    return responses;
  } catch (error) {
    throw new Error(`Error getting nodes info: ${(error as Error).message}`);
  }
}

/**
 * Get detailed info for a single node
 */
export async function getNodeInfo(params: CommandParams['get_node_info']) {
  const { nodeId } = params;
  
  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  const response = await (node as any).exportAsync({
    format: 'JSON_REST_V1',
  });

  return filterFigmaNode(response.document);
}

/**
 * Get detailed info for multiple nodes
 */
export async function getNodesInfo(params: CommandParams['get_nodes_info']) {
  const { nodeIds } = params;
  
  if (!nodeIds || !Array.isArray(nodeIds)) {
    throw new Error('Missing or invalid nodeIds parameter');
  }

  try {
    // Load all nodes in parallel
    const nodes = await Promise.all(
      nodeIds.map((id) => figma.getNodeByIdAsync(id))
    );

    // Filter out any null values (nodes that weren't found)
    const validNodes = nodes.filter((node): node is SceneNode => node !== null);

    // Export all valid nodes in parallel
    const responses = await Promise.all(
      validNodes.map(async (node) => {
        const response = await (node as any).exportAsync({
          format: 'JSON_REST_V1',
        });
        return {
          nodeId: node.id,
          document: filterFigmaNode(response.document),
        };
      })
    );

    return responses;
  } catch (error) {
    throw new Error(`Error getting nodes info: ${(error as Error).message}`);
  }
}

/**
 * Focus on a specific node (zoom to it and select it)
 */
export async function setFocus(params: CommandParams['set_focus']) {
  const { nodeId } = params;
  
  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Set selection to this node
  figma.currentPage.selection = [node as SceneNode];
  
  // Zoom to fit the node
  figma.viewport.scrollAndZoomIntoView([node as SceneNode]);

  return {
    id: node.id,
    name: node.name,
    type: node.type,
  };
}

/**
 * Set selection to multiple nodes
 */
export async function setSelections(params: CommandParams['set_selections']) {
  const { nodeIds } = params;
  
  if (!nodeIds || !Array.isArray(nodeIds)) {
    throw new Error('Missing or invalid nodeIds parameter');
  }

  // Load all nodes in parallel
  const nodes = await Promise.all(
    nodeIds.map((id) => figma.getNodeByIdAsync(id))
  );

  // Filter out any null values
  const validNodes = nodes.filter((node): node is SceneNode => node !== null);

  if (validNodes.length === 0) {
    throw new Error('No valid nodes found');
  }

  // Set selection
  figma.currentPage.selection = validNodes;

  return {
    selectionCount: validNodes.length,
    selection: validNodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
  };
}

