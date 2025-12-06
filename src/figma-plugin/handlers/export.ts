/**
 * Export handlers
 */

import type { CommandParams, ExportResult, ExportFormat } from '../../shared/types';
import { getNodeById, assertNodeCapability, customBase64Encode, provideVisualFeedback } from '../utils/helpers';

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

