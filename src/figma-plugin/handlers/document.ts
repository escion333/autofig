/**
 * Document and selection handlers
 */

import { filterFigmaNode } from '../../shared/utils/node-filter';
import type { CommandParams, DocumentInfoResult, SelectionResult, NodeResult } from '../../shared/types';
import { provideVisualFeedback } from '../utils/helpers';

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

/**
 * Get all pages in the document
 */
export async function getPages(): Promise<Array<{ id: string; name: string; childCount: number }>> {
  const pages = figma.root.children;
  
  return pages.map((page) => ({
    id: page.id,
    name: page.name,
    childCount: page.children.length,
  }));
}

/**
 * Create a new page in the document
 */
export async function createPage(params: CommandParams['create_page']): Promise<NodeResult> {
  const { name } = params;
  
  if (!name) {
    throw new Error(
      'Missing name parameter\n' +
      '💡 Tip: Provide a name for the new page, e.g., "Design System"'
    );
  }

  const newPage = figma.createPage();
  newPage.name = name;

  // Switch to the new page
  figma.currentPage = newPage;

  figma.notify(`✅ Created page "${name}"`);

  return {
    id: newPage.id,
    name: newPage.name,
    type: newPage.type,
  };
}

/**
 * Switch to a different page
 */
export async function switchPage(params: CommandParams['switch_page']): Promise<NodeResult> {
  const { pageId } = params;
  
  if (!pageId) {
    throw new Error(
      'Missing pageId parameter\n' +
      '💡 Tip: Use get_pages to get IDs of available pages.'
    );
  }

  const page = await figma.getNodeByIdAsync(pageId);
  if (!page) {
    throw new Error(
      `Page not found: ${pageId}\n` +
      `The page may have been deleted or the ID is invalid.\n` +
      `💡 Tip: Use get_pages to get valid page IDs.`
    );
  }

  if (page.type !== 'PAGE') {
    throw new Error(
      `Node is not a page: ${pageId} (type: ${page.type})\n` +
      `💡 Tip: Use get_pages to get valid page IDs.`
    );
  }

  figma.currentPage = page as PageNode;
  figma.notify(`✅ Switched to page "${page.name}"`);

  return {
    id: page.id,
    name: page.name,
    type: page.type,
  };
}

/**
 * Delete a page from the document
 */
export async function deletePage(params: CommandParams['delete_page']): Promise<{ success: boolean; message: string }> {
  const { pageId } = params;
  
  if (!pageId) {
    throw new Error(
      'Missing pageId parameter\n' +
      '💡 Tip: Use get_pages to get IDs of available pages.'
    );
  }

  const page = await figma.getNodeByIdAsync(pageId);
  if (!page) {
    throw new Error(
      `Page not found: ${pageId}\n` +
      `The page may have been deleted or the ID is invalid.\n` +
      `💡 Tip: Use get_pages to get valid page IDs.`
    );
  }

  if (page.type !== 'PAGE') {
    throw new Error(
      `Node is not a page: ${pageId} (type: ${page.type})\n` +
      `💡 Tip: Use get_pages to get valid page IDs.`
    );
  }

  // Check if this is the last page
  if (figma.root.children.length === 1) {
    throw new Error(
      'Cannot delete the last page in the document.\n' +
      '💡 Tip: Create a new page before deleting this one.'
    );
  }

  const pageName = page.name;
  
  // If deleting current page, switch to another one first
  if (figma.currentPage.id === pageId) {
    const otherPage = figma.root.children.find((p) => p.id !== pageId);
    if (otherPage) {
      figma.currentPage = otherPage as PageNode;
    }
  }

  page.remove();
  figma.notify(`✅ Deleted page "${pageName}"`);

  return {
    success: true,
    message: `Page "${pageName}" deleted successfully`,
  };
}

/**
 * Rename a page
 */
export async function renamePage(params: CommandParams['rename_page']): Promise<NodeResult> {
  const { pageId, name } = params;
  
  if (!pageId) {
    throw new Error(
      'Missing pageId parameter\n' +
      '💡 Tip: Use get_pages to get IDs of available pages.'
    );
  }

  if (!name) {
    throw new Error(
      'Missing name parameter\n' +
      '💡 Tip: Provide a new name for the page.'
    );
  }

  const page = await figma.getNodeByIdAsync(pageId);
  if (!page) {
    throw new Error(
      `Page not found: ${pageId}\n` +
      `The page may have been deleted or the ID is invalid.\n` +
      `💡 Tip: Use get_pages to get valid page IDs.`
    );
  }

  if (page.type !== 'PAGE') {
    throw new Error(
      `Node is not a page: ${pageId} (type: ${page.type})\n` +
      `💡 Tip: Use get_pages to get valid page IDs.`
    );
  }

  const oldName = page.name;
  page.name = name;
  figma.notify(`✅ Renamed page "${oldName}" to "${name}"`);

  return {
    id: page.id,
    name: page.name,
    type: page.type,
  };
}

/**
 * Set plugin data on a node
 */
export async function setPluginData(params: CommandParams['set_plugin_data']): Promise<{ success: boolean; nodeId: string; key: string }> {
  const { nodeId, key, value } = params;

  if (!nodeId) {
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of nodes.'
    );
  }

  if (!key) {
    throw new Error(
      'Missing key parameter\n' +
      '💡 Tip: Provide a key name for the data (e.g., "customMetadata")'
    );
  }

  if (!value) {
    throw new Error(
      'Missing value parameter\n' +
      '💡 Tip: Provide a string value to store (JSON stringify objects if needed)'
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

  // setPluginData is available on all node types
  node.setPluginData(key, value);
  figma.notify(`✅ Set plugin data "${key}" on ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    key,
  };
}

/**
 * Get plugin data from a node
 */
export async function getPluginData(params: CommandParams['get_plugin_data']): Promise<{ nodeId: string; nodeName: string; key: string; value: string }> {
  const { nodeId, key } = params;

  if (!nodeId) {
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of nodes.'
    );
  }

  if (!key) {
    throw new Error(
      'Missing key parameter\n' +
      '💡 Tip: Provide a key name to retrieve (e.g., "customMetadata")'
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

  const value = node.getPluginData(key);

  return {
    nodeId: node.id,
    nodeName: node.name,
    key,
    value,
  };
}

/**
 * Get all plugin data keys from a node
 */
export async function getAllPluginData(params: CommandParams['get_all_plugin_data']): Promise<{ nodeId: string; nodeName: string; data: Record<string, string> }> {
  const { nodeId } = params;

  if (!nodeId) {
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of nodes.'
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

  // Get all plugin data keys
  const keys = node.getPluginDataKeys();
  const data: Record<string, string> = {};

  for (const key of keys) {
    data[key] = node.getPluginData(key);
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    data,
  };
}

/**
 * Delete plugin data from a node
 */
export async function deletePluginData(params: CommandParams['delete_plugin_data']): Promise<{ success: boolean; nodeId: string; key: string }> {
  const { nodeId, key } = params;

  if (!nodeId) {
    throw new Error(
      'Missing nodeId parameter\n' +
      '💡 Tip: Use get_selection to get IDs of nodes.'
    );
  }

  if (!key) {
    throw new Error(
      'Missing key parameter\n' +
      '💡 Tip: Provide a key name to delete (e.g., "customMetadata")'
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

  // Delete the plugin data by setting it to an empty string
  node.setPluginData(key, '');
  figma.notify(`✅ Deleted plugin data "${key}" from ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    key,
  };
}

