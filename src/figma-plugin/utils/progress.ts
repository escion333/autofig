/**
 * Progress update utilities for long-running operations
 */

import type { ProgressStatus, ProgressUpdate } from '../../shared/types';

/**
 * Send a progress update to the UI
 */
export function sendProgressUpdate(
  commandId: string,
  commandType: string,
  status: ProgressStatus,
  progress: number,
  totalItems: number,
  processedItems: number,
  message: string,
  payload: Record<string, unknown> | null = null
): ProgressUpdate {
  const update: ProgressUpdate = {
    type: 'command_progress',
    commandId,
    commandType,
    status,
    progress,
    totalItems,
    processedItems,
    message,
    timestamp: Date.now(),
  };

  // Add optional chunk information if present
  if (payload) {
    if (
      payload.currentChunk !== undefined &&
      payload.totalChunks !== undefined
    ) {
      update.currentChunk = payload.currentChunk as number;
      update.totalChunks = payload.totalChunks as number;
      update.chunkSize = payload.chunkSize as number | undefined;
    }
    update.payload = payload;
  }

  // Send to UI
  figma.ui.postMessage(update);
  console.log(`Progress update: ${status} - ${progress}% - ${message}`);

  return update;
}

/**
 * Generate a unique command ID
 */
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

