/**
 * General helper utilities for the Figma plugin
 */

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get unique items from array by predicate
 */
export function uniqBy<T>(
  arr: T[],
  predicate: ((item: T) => unknown) | keyof T
): T[] {
  const cb = typeof predicate === 'function' 
    ? predicate 
    : (o: T) => o[predicate as keyof T];
  
  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);
        map.has(key) || map.set(key, item);
        return map;
      }, new Map<unknown, T>())
      .values(),
  ];
}

/**
 * Custom base64 encoder for Uint8Array (Figma plugin environment doesn't have btoa)
 */
export function customBase64Encode(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';

  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  let a: number, b: number, c: number, d: number;
  let chunk: number;

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18;
    b = (chunk & 258048) >> 12;
    c = (chunk & 4032) >> 6;
    d = chunk & 63;

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += chars[a] + chars[b] + chars[c] + chars[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2;
    b = (chunk & 3) << 4;
    base64 += chars[a] + chars[b] + '==';
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    a = (chunk & 64512) >> 10;
    b = (chunk & 1008) >> 4;
    c = (chunk & 15) << 2;
    base64 += chars[a] + chars[b] + chars[c] + '=';
  }

  return base64;
}

/**
 * Map font weight number to Figma font style name
 */
export function getFontStyleFromWeight(weight: number): string {
  switch (weight) {
    case 100: return 'Thin';
    case 200: return 'Extra Light';
    case 300: return 'Light';
    case 400: return 'Regular';
    case 500: return 'Medium';
    case 600: return 'Semi Bold';
    case 700: return 'Bold';
    case 800: return 'Extra Bold';
    case 900: return 'Black';
    default: return 'Regular';
  }
}

/**
 * Get a node by ID with proper error handling
 */
export async function getNodeById(nodeId: string): Promise<SceneNode> {
  if (!nodeId) {
    throw new Error('Node ID is required');
  }
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(
      `Node not found: ${nodeId}\n` +
      `The node may have been deleted or the ID is invalid.\n` +
      `💡 Tip: Use get_selection or get_document_info to get valid node IDs.`
    );
  }
  return node as SceneNode;
}

/**
 * Get a parent node that can contain children
 */
export async function getContainerNode(parentId?: string): Promise<BaseNode & ChildrenMixin> {
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(
        `Parent node not found: ${parentId}\n` +
        `The node may have been deleted or the ID is invalid.\n` +
        `💡 Tip: Use get_selection to get valid node IDs for containers.`
      );
    }
    if (!('appendChild' in parentNode)) {
      throw new Error(
        `Parent node "${(parentNode as SceneNode).name}" (${parentNode.type}) cannot contain children.\n` +
        `💡 Tip: Use FRAME, GROUP, or PAGE nodes as parents.`
      );
    }
    return parentNode as BaseNode & ChildrenMixin;
  }
  return figma.currentPage;
}

/**
 * Validate that a node has a specific capability
 */
export function assertNodeCapability<T extends string>(
  node: SceneNode,
  capability: T,
  errorMessage?: string
): asserts node is SceneNode & Record<T, unknown> {
  if (!(capability in node)) {
    throw new Error(errorMessage || `Node does not support ${capability}: ${node.id}`);
  }
}

/**
 * Provide visual feedback in Figma: select node, scroll to it, and notify user
 */
export function provideVisualFeedback(
  node: SceneNode | SceneNode[],
  message: string,
  options?: {
    skipSelection?: boolean;
    skipScroll?: boolean;
    skipNotify?: boolean;
  }
): void {
  const nodes = Array.isArray(node) ? node : [node];
  
  // Select the node(s)
  if (!options?.skipSelection) {
    figma.currentPage.selection = nodes;
  }
  
  // Scroll viewport to show the node(s)
  if (!options?.skipScroll) {
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
  
  // Show notification
  if (!options?.skipNotify) {
    figma.notify(message);
  }
}

/**
 * Create an informative error message with context and suggestions
 */
export function createErrorMessage(
  operation: string,
  error: string,
  suggestions?: string[]
): string {
  let message = `Failed to ${operation}: ${error}`;
  
  if (suggestions && suggestions.length > 0) {
    message += '\n\n💡 Suggestions:\n';
    suggestions.forEach((suggestion, index) => {
      message += `  ${index + 1}. ${suggestion}\n`;
    });
  }
  
  return message;
}

