/**
 * Figma Plugin Entry Point
 * 
 * This is the main TypeScript entry point for the Figma plugin.
 * It handles UI communication and dispatches commands to handlers.
 */

import { handleCommand } from './handlers';
import type { FigmaCommand, CommandParams } from '../shared/types';

// ============================================================================
// Plugin State
// ============================================================================

interface PluginState {
  serverPort: number;
}

const state: PluginState = {
  serverPort: 3055,
};

// ============================================================================
// UI Setup
// ============================================================================

figma.showUI(__html__, { width: 350, height: 450 });

// ============================================================================
// Message Handlers
// ============================================================================

figma.ui.onmessage = async (msg: {
  type: string;
  command?: FigmaCommand;
  params?: unknown;
  id?: string;
  message?: string;
  text?: string;
  serverPort?: number;
}) => {
  switch (msg.type) {
    case 'update-settings':
      updateSettings(msg);
      break;

    case 'notify':
      if (msg.message) {
        figma.notify(msg.message);
      }
      break;

    case 'close-plugin':
      figma.closePlugin();
      break;

    case 'execute-command':
      // Execute commands received from UI (which gets them from WebSocket)
      if (msg.command && msg.id) {
        try {
          const result = await handleCommand(msg.command, msg.params as CommandParams[typeof msg.command]);
          // Send result back to UI
          figma.ui.postMessage({
            type: 'command-result',
            id: msg.id,
            command: msg.command,
            result,
          });
        } catch (error) {
          figma.ui.postMessage({
            type: 'command-error',
            id: msg.id,
            command: msg.command,
            error: error instanceof Error ? error.message : 'Error executing command',
          });
        }
      }
      break;

    case 'copy-to-clipboard':
      // Copy text to clipboard using Figma's notify (workaround since direct clipboard access isn't available)
      if (msg.text) {
        figma.notify(`Channel copied: ${msg.text}`);
      }
      break;
  }
};

// ============================================================================
// Plugin Commands (Menu)
// ============================================================================

figma.on('run', ({ command }) => {
  figma.ui.postMessage({ type: 'auto-connect' });
});

// ============================================================================
// Settings Management
// ============================================================================

function updateSettings(settings: { serverPort?: number }): void {
  if (settings.serverPort) {
    state.serverPort = settings.serverPort;
  }

  figma.clientStorage.setAsync('settings', {
    serverPort: state.serverPort,
  });
}

// ============================================================================
// Initialization
// ============================================================================

async function initializePlugin(): Promise<void> {
  try {
    const savedSettings = await figma.clientStorage.getAsync('settings') as { serverPort?: number } | undefined;
    
    if (savedSettings) {
      if (savedSettings.serverPort) {
        state.serverPort = savedSettings.serverPort;
      }
    }

    // Send initial settings to UI
    figma.ui.postMessage({
      type: 'init-settings',
      settings: {
        serverPort: state.serverPort,
      },
    });
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Run initialization
initializePlugin();

