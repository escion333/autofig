/**
 * Text operation handlers
 */

import type { CommandParams, TextNodeInfo } from '../../shared/types';
import { getNodeById, uniqBy, delay } from '../utils/helpers';
import { sendProgressUpdate, generateCommandId } from '../utils/progress';

/**
 * Set characters on a text node with font handling
 */
export async function setCharacters(
  node: TextNode,
  characters: string,
  options?: {
    fallbackFont?: FontName;
    smartStrategy?: 'prevail' | 'strict' | 'experimental';
  }
): Promise<boolean> {
  const fallbackFont = options?.fallbackFont || { family: 'Inter', style: 'Regular' };

  try {
    if (node.fontName === figma.mixed) {
      if (options?.smartStrategy === 'prevail' && node.characters.length > 1) {
        // Find most used font
        const fontHashTree: Record<string, number> = {};
        for (let i = 1; i < node.characters.length; i++) {
          const charFont = node.getRangeFontName(i - 1, i) as FontName;
          const key = `${charFont.family}::${charFont.style}`;
          fontHashTree[key] = fontHashTree[key] ? fontHashTree[key] + 1 : 1;
        }
        const entries = Object.entries(fontHashTree);
        if (entries.length > 0) {
          const prevailedTreeItem = entries.sort((a, b) => b[1] - a[1])[0];
          const [family, style] = prevailedTreeItem[0].split('::');
          const prevailedFont: FontName = { family, style };
          await figma.loadFontAsync(prevailedFont);
          node.fontName = prevailedFont;
        } else {
          // Fallback if no font entries found
          await figma.loadFontAsync(fallbackFont);
          node.fontName = fallbackFont;
        }
      } else if (node.characters.length > 0) {
        // Use first character's font
        const firstCharFont = node.getRangeFontName(0, 1) as FontName;
        await figma.loadFontAsync(firstCharFont);
        node.fontName = firstCharFont;
      } else {
        // Empty text node - use fallback font
        await figma.loadFontAsync(fallbackFont);
        node.fontName = fallbackFont;
      }
    } else {
      await figma.loadFontAsync(node.fontName as FontName);
    }
  } catch (err) {
    console.warn(`Failed to load font, using fallback`, err);
    await figma.loadFontAsync(fallbackFont);
    node.fontName = fallbackFont;
  }

  try {
    node.characters = characters;
    return true;
  } catch (err) {
    console.warn(`Failed to set characters`, err);
    return false;
  }
}

/**
 * Set text content on a text node
 */
export async function setTextContent(params: CommandParams['set_text_content']) {
  const { nodeId, text } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (text === undefined) {
    throw new Error('Missing text parameter');
  }

  const node = await getNodeById(nodeId);

  if (node.type !== 'TEXT') {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    const textNode = node as TextNode;
    // Handle mixed fonts - setCharacters will handle font loading
    if (textNode.fontName !== figma.mixed) {
      await figma.loadFontAsync(textNode.fontName as FontName);
    }
    await setCharacters(textNode, text);

    return {
      id: node.id,
      name: node.name,
      characters: textNode.characters,
      fontName: textNode.fontName,
    };
  } catch (error) {
    throw new Error(`Error setting text content: ${(error as Error).message}`);
  }
}

/**
 * Find text nodes recursively
 */
async function findTextNodes(
  node: SceneNode | PageNode,
  parentPath: string[] = [],
  depth: number = 0,
  textNodes: TextNodeInfo[] = []
): Promise<TextNodeInfo[]> {
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    textNodes.push({
      nodeId: textNode.id,
      nodeName: textNode.name,
      characters: textNode.characters,
      path: parentPath,
      depth,
      fontSize: typeof textNode.fontSize === 'number' ? textNode.fontSize : undefined,
      fontName: textNode.fontName !== figma.mixed ? textNode.fontName as FontName : undefined,
      hasMultipleFonts: textNode.fontName === figma.mixed,
      textStyleId: typeof textNode.textStyleId === 'string' ? textNode.textStyleId : undefined,
    });
  }

  if ('children' in node) {
    for (const child of node.children) {
      await findTextNodes(child, [...parentPath, node.name], depth + 1, textNodes);
    }
  }

  return textNodes;
}

/**
 * Scan for text nodes in a subtree
 */
export async function scanTextNodes(params: CommandParams['scan_text_nodes']) {
  const { nodeId, depth: maxDepth, filter } = params || {};
  const commandId = generateCommandId();

  let rootNode: SceneNode | PageNode;

  if (nodeId) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      sendProgressUpdate(commandId, 'scan_text_nodes', 'error', 0, 0, 0, `Node not found: ${nodeId}`, { error: `Node not found: ${nodeId}` });
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    rootNode = node as SceneNode;
  } else {
    rootNode = figma.currentPage;
  }

  sendProgressUpdate(
    commandId,
    'scan_text_nodes',
    'started',
    0,
    1,
    0,
    `Starting scan of node "${rootNode.name}"`,
    null
  );

  const textNodes: TextNodeInfo[] = [];
  await findTextNodes(rootNode, [], 0, textNodes);

  // Apply filter if provided
  let filteredNodes = textNodes;
  if (filter) {
    const filterLower = filter.toLowerCase();
    filteredNodes = textNodes.filter(
      (n) =>
        n.characters.toLowerCase().includes(filterLower) ||
        n.nodeName.toLowerCase().includes(filterLower)
    );
  }

  // Apply depth filter if provided
  if (maxDepth !== undefined) {
    filteredNodes = filteredNodes.filter((n) => n.depth <= maxDepth);
  }

  sendProgressUpdate(
    commandId,
    'scan_text_nodes',
    'completed',
    100,
    filteredNodes.length,
    filteredNodes.length,
    `Scan complete. Found ${filteredNodes.length} text nodes.`,
    { textNodes: filteredNodes }
  );

  return {
    success: true,
    message: `Scanned ${filteredNodes.length} text nodes.`,
    count: filteredNodes.length,
    textNodes: filteredNodes,
    commandId,
  };
}

/**
 * Set text content on multiple nodes
 */
export async function setMultipleTextContents(params: CommandParams['set_multiple_text_contents']) {
  const { updates } = params || {};
  const commandId = generateCommandId();

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new Error('Missing or invalid updates parameter');
  }

  sendProgressUpdate(
    commandId,
    'set_multiple_text_contents',
    'started',
    0,
    updates.length,
    0,
    `Starting to update ${updates.length} text nodes`,
    { totalNodes: updates.length }
  );

  const results: Array<{ success: boolean; nodeId: string; nodeName?: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Process in chunks of 5
  const CHUNK_SIZE = 5;
  const chunks: Array<Array<{ nodeId: string; text: string }>> = [];

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    chunks.push(updates.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'set_multiple_text_contents',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      updates.length,
      successCount + failureCount,
      `Processing chunk ${chunkIndex + 1}/${chunks.length}`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
    );

    const chunkPromises = chunk.map(async ({ nodeId, text }) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);

        if (!node) {
          return { success: false, nodeId, error: `Node not found: ${nodeId}` };
        }

        if (node.type !== 'TEXT') {
          return { success: false, nodeId, error: `Node is not a text node: ${nodeId}` };
        }

        const textNode = node as TextNode;
        // Handle mixed fonts - setCharacters will handle font loading
        if (textNode.fontName !== figma.mixed) {
          await figma.loadFontAsync(textNode.fontName as FontName);
        }
        await setCharacters(textNode, text);

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

    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'set_multiple_text_contents',
    'completed',
    100,
    updates.length,
    successCount + failureCount,
    `Text update complete: ${successCount} successful, ${failureCount} failed`,
    { results }
  );

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalNodes: updates.length,
    results,
    commandId,
  };
}

