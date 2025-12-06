/**
 * Export handlers
 */

import type { CommandParams, ExportResult, ExportFormat } from '../../shared/types';
import { getNodeById, assertNodeCapability, customBase64Encode, provideVisualFeedback, delay } from '../utils/helpers';
import { sendProgressUpdate, generateCommandId } from '../utils/progress';

/**
 * Export a node as an image
 */
export async function exportNodeAsImage(params: CommandParams['export_node_as_image']): Promise<ExportResult> {
  const { nodeId, format = 'PNG', scale = 1 } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'exportAsync', `Node does not support exporting: ${nodeId}`);

  try {
    const exportNode = node as SceneNode & { exportAsync: (settings: ExportSettings) => Promise<Uint8Array> };

    const settings: ExportSettings = {
      format: format as 'PNG' | 'JPG' | 'SVG' | 'PDF',
      constraint: { type: 'SCALE', value: scale },
    };

    const bytes = await exportNode.exportAsync(settings);

    // Get MIME type
    let mimeType: string;
    switch (format) {
      case 'PNG':
        mimeType = 'image/png';
        break;
      case 'JPG':
        mimeType = 'image/jpeg';
        break;
      case 'SVG':
        mimeType = 'image/svg+xml';
        break;
      case 'PDF':
        mimeType = 'application/pdf';
        break;
      default:
        mimeType = 'application/octet-stream';
    }

    // Convert to base64
    const base64 = customBase64Encode(bytes);

    // Provide visual feedback
    const width = 'width' in node ? (node as SceneNode & { width: number }).width : 0;
    const height = 'height' in node ? (node as SceneNode & { height: number }).height : 0;
    const sizeKB = Math.round(bytes.length / 1024);
    provideVisualFeedback(node, `✅ Exported ${node.name} as ${format} (${width}×${height}, ${sizeKB}KB)`);

    return {
      nodeId,
      format,
      data: base64,
      size: { width, height },
    };
  } catch (error) {
    throw new Error(`Error exporting node as image: ${(error as Error).message}`);
  }
}

/**
 * Export multiple nodes as images with progress tracking
 */
export async function exportMultipleNodes(params: CommandParams['export_multiple_nodes']) {
  const { nodeIds, format = 'PNG', scale = 1 } = params || {};
  const commandId = generateCommandId();

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
    const errorMsg = 'Missing or invalid nodeIds parameter';
    sendProgressUpdate(commandId, 'export_multiple_nodes', 'error', 0, 0, 0, errorMsg, { error: errorMsg });
    throw new Error(
      'Missing or invalid nodeIds parameter\n' +
      '💡 Tip: Provide an array of node IDs, e.g., ["123:456", "789:012"]'
    );
  }

  // Send started progress update
  sendProgressUpdate(
    commandId,
    'export_multiple_nodes',
    'started',
    0,
    nodeIds.length,
    0,
    `Starting export of ${nodeIds.length} node(s) as ${format}`,
    { totalNodes: nodeIds.length, format, scale }
  );

  const results: Array<{ success: boolean; nodeId: string; export?: ExportResult; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Process nodes in chunks of 3 (exports can be slow)
  const CHUNK_SIZE = 3;
  const chunks: string[][] = [];

  for (let i = 0; i < nodeIds.length; i += CHUNK_SIZE) {
    chunks.push(nodeIds.slice(i, i + CHUNK_SIZE));
  }

  // Process each chunk sequentially
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'export_multiple_nodes',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      nodeIds.length,
      successCount + failureCount,
      `Exporting chunk ${chunkIndex + 1}/${chunks.length} (${successCount} successful, ${failureCount} failed)`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length, successCount, failureCount }
    );

    // Process exports within a chunk in parallel
    const chunkPromises = chunk.map(async (nodeId) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);

        if (!node) {
          return { success: false, nodeId, error: `Node not found: ${nodeId}` };
        }

        if (!('exportAsync' in node)) {
          return { success: false, nodeId, error: `Node does not support exporting: ${nodeId}` };
        }

        const exportNode = node as SceneNode & { exportAsync: (settings: ExportSettings) => Promise<Uint8Array> };

        const settings: ExportSettings = {
          format: format as 'PNG' | 'JPG' | 'SVG' | 'PDF',
          constraint: { type: 'SCALE', value: scale },
        };

        const bytes = await exportNode.exportAsync(settings);

        // Get MIME type
        let mimeType: string;
        switch (format) {
          case 'PNG':
            mimeType = 'image/png';
            break;
          case 'JPG':
            mimeType = 'image/jpeg';
            break;
          case 'SVG':
            mimeType = 'image/svg+xml';
            break;
          case 'PDF':
            mimeType = 'application/pdf';
            break;
          default:
            mimeType = 'application/octet-stream';
        }

        // Convert to base64
        const base64 = customBase64Encode(bytes);

        const width = 'width' in node ? (node as SceneNode & { width: number }).width : 0;
        const height = 'height' in node ? (node as SceneNode & { height: number }).height : 0;

        const exportResult: ExportResult = {
          nodeId,
          format,
          data: base64,
          size: { width, height },
        };

        return { success: true, nodeId, export: exportResult };
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

    // Add a delay between chunks to prevent overwhelming Figma
    if (chunkIndex < chunks.length - 1) {
      await delay(200);
    }
  }

  const message = `Export complete: ${successCount} successful, ${failureCount} failed`;
  figma.notify(`✅ ${message}`);

  sendProgressUpdate(
    commandId,
    'export_multiple_nodes',
    'completed',
    100,
    nodeIds.length,
    successCount + failureCount,
    message,
    { totalNodes: nodeIds.length, nodesExported: successCount, nodesFailed: failureCount, results }
  );

  return {
    success: successCount > 0,
    nodesExported: successCount,
    nodesFailed: failureCount,
    totalNodes: nodeIds.length,
    results,
    completedInChunks: chunks.length,
    commandId,
  };
}

