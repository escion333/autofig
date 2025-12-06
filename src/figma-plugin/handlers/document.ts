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
  if (figma.currentPage.selection.length === 0) {
    throw new Error(
      'No nodes selected in Figma.\n' +
      '💡 Tip: Select one or more nodes in Figma before using this command.'
    );
  }

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
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of selected nodes.'
    );
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(
      `Node not found: ${nodeId}\n` +
      `The node may have been deleted or the ID is invalid.\n` +
      `💡 Tip: Use get_selection or get_document_info to get valid node IDs.`
    );
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
    throw new Error(
      'Missing or invalid nodeIds parameter\n' +
      '💡 Tip: Provide an array of node IDs, e.g., ["123:456", "789:012"]'
    );
  }

  if (nodeIds.length === 0) {
    throw new Error(
      'Empty nodeIds array provided\n' +
      '💡 Tip: Provide at least one node ID.'
    );
  }

  try {
    // Load all nodes in parallel
    const nodes = await Promise.all(
      nodeIds.map((id) => figma.getNodeByIdAsync(id))
    );

    // Filter out any null values (nodes that weren't found)
    const validNodes = nodes.filter((node): node is SceneNode => node !== null);

    if (validNodes.length === 0) {
      throw new Error(
        `None of the provided node IDs were found.\n` +
        `💡 Tip: Use get_selection or get_document_info to get valid node IDs.`
      );
    }

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
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of nodes to focus on.'
    );
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(
      `Node not found: ${nodeId}\n` +
      `The node may have been deleted or the ID is invalid.\n` +
      `💡 Tip: Use get_selection or get_document_info to get valid node IDs.`
    );
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
    throw new Error(
      'Missing or invalid nodeIds parameter\n' +
      '💡 Tip: Provide an array of node IDs, e.g., ["123:456", "789:012"]'
    );
  }

  if (nodeIds.length === 0) {
    throw new Error(
      'Empty nodeIds array provided\n' +
      '💡 Tip: Provide at least one node ID to select.'
    );
  }

  // Load all nodes in parallel
  const nodes = await Promise.all(
    nodeIds.map((id) => figma.getNodeByIdAsync(id))
  );

  // Filter out any null values
  const validNodes = nodes.filter((node): node is SceneNode => node !== null);

  if (validNodes.length === 0) {
    throw new Error(
      `None of the provided node IDs were found (${nodeIds.length} IDs checked).\n` +
      `💡 Tip: Use get_selection or get_document_info to get valid node IDs.`
    );
  }

  // Set selection
  figma.currentPage.selection = validNodes;
  
  // Zoom to show selected nodes
  figma.viewport.scrollAndZoomIntoView(validNodes);

  return {
    selectionCount: validNodes.length,
    selection: validNodes.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
  };
}

