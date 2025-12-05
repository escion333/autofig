/**
 * Prototyping handlers (reactions, connectors)
 */

import type { CommandParams } from '../../shared/types';
import { sendProgressUpdate, generateCommandId } from '../utils/progress';

/**
 * Get reactions (prototype interactions) from nodes
 */
export async function getReactions(params: CommandParams['get_reactions']) {
  const { nodeIds } = params || {};
  const commandId = generateCommandId();

  let nodesToCheck: SceneNode[] = [];

  if (nodeIds && nodeIds.length > 0) {
    // Get specific nodes
    for (const id of nodeIds) {
      const node = await figma.getNodeByIdAsync(id);
      if (node) {
        nodesToCheck.push(node as SceneNode);
      }
    }
  } else {
    // Use current selection
    nodesToCheck = [...figma.currentPage.selection];
  }

  if (nodesToCheck.length === 0) {
    throw new Error('No nodes to check for reactions');
  }

  sendProgressUpdate(
    commandId,
    'get_reactions',
    'started',
    0,
    nodesToCheck.length,
    0,
    `Scanning ${nodesToCheck.length} nodes for reactions`,
    null
  );

  const results: Array<{
    nodeId: string;
    nodeName: string;
    reactions: Array<{ trigger: unknown; action: unknown }>;
  }> = [];

  async function collectReactions(node: SceneNode): Promise<void> {
    if ('reactions' in node && Array.isArray(node.reactions) && node.reactions.length > 0) {
      results.push({
        nodeId: node.id,
        nodeName: node.name,
        reactions: node.reactions.map((r: Reaction) => ({
          trigger: r.trigger,
          action: r.action,
        })),
      });
    }

    // Check children
    if ('children' in node) {
      for (const child of (node as FrameNode).children) {
        await collectReactions(child);
      }
    }
  }

  for (let i = 0; i < nodesToCheck.length; i++) {
    await collectReactions(nodesToCheck[i]);
    sendProgressUpdate(
      commandId,
      'get_reactions',
      'in_progress',
      Math.round(((i + 1) / nodesToCheck.length) * 100),
      nodesToCheck.length,
      i + 1,
      `Checked ${i + 1}/${nodesToCheck.length} nodes`,
      null
    );
  }

  sendProgressUpdate(
    commandId,
    'get_reactions',
    'completed',
    100,
    nodesToCheck.length,
    nodesToCheck.length,
    `Found ${results.length} nodes with reactions`,
    { results }
  );

  return {
    nodesCount: nodesToCheck.length,
    nodesWithReactions: results.length,
    nodes: results,
    commandId,
  };
}

/**
 * Set default connector for FigJam
 */
export async function setDefaultConnector(params: CommandParams['set_default_connector']) {
  const { connectorType, strokeColor, strokeWeight } = params || {};

  // Find existing connector or create settings
  const connectorId = await figma.clientStorage.getAsync('defaultConnectorId') as string | undefined;

  if (connectorId) {
    const existingConnector = await figma.getNodeByIdAsync(connectorId);
    if (existingConnector && existingConnector.type === 'CONNECTOR') {
      return {
        success: true,
        message: `Default connector already set: ${connectorId}`,
        connectorId,
        exists: true,
      };
    }
  }

  // Search for a connector in the current page
  const connectors = figma.currentPage.findAllWithCriteria({ types: ['CONNECTOR'] });

  if (connectors.length > 0) {
    const foundConnector = connectors[0];
    await figma.clientStorage.setAsync('defaultConnectorId', foundConnector.id);

    return {
      success: true,
      message: `Automatically set default connector: ${foundConnector.id}`,
      connectorId: foundConnector.id,
      autoSelected: true,
    };
  }

  throw new Error('No connector found in the current page. Please create a connector first.');
}

/**
 * Create connections between nodes (FigJam)
 */
export async function createConnections(params: CommandParams['create_connections']) {
  const { connections } = params || {};
  const commandId = generateCommandId();

  if (!connections || !Array.isArray(connections) || connections.length === 0) {
    throw new Error('Missing or invalid connections parameter');
  }

  // Get default connector settings
  const defaultConnectorId = await figma.clientStorage.getAsync('defaultConnectorId') as string | undefined;
  let templateConnector: ConnectorNode | null = null;

  if (defaultConnectorId) {
    const node = await figma.getNodeByIdAsync(defaultConnectorId);
    if (node && node.type === 'CONNECTOR') {
      templateConnector = node as ConnectorNode;
    }
  }

  sendProgressUpdate(
    commandId,
    'create_connections',
    'started',
    0,
    connections.length,
    0,
    `Creating ${connections.length} connections`,
    null
  );

  const results: Array<{
    success: boolean;
    fromNodeId: string;
    toNodeId: string;
    connectorId?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < connections.length; i++) {
    const { fromNodeId, toNodeId, label } = connections[i];

    try {
      const fromNode = await figma.getNodeByIdAsync(fromNodeId);
      const toNode = await figma.getNodeByIdAsync(toNodeId);

      if (!fromNode) {
        results.push({ success: false, fromNodeId, toNodeId, error: `From node not found: ${fromNodeId}` });
        continue;
      }

      if (!toNode) {
        results.push({ success: false, fromNodeId, toNodeId, error: `To node not found: ${toNodeId}` });
        continue;
      }

      // Create connector
      const connector = figma.createConnector();
      
      // Set endpoints
      connector.connectorStart = {
        endpointNodeId: fromNodeId,
        magnet: 'AUTO',
      };
      connector.connectorEnd = {
        endpointNodeId: toNodeId,
        magnet: 'AUTO',
      };

      // Copy style from template if available
      if (templateConnector) {
        connector.connectorLineType = templateConnector.connectorLineType;
        connector.strokes = templateConnector.strokes;
        connector.strokeWeight = templateConnector.strokeWeight;
      }

      // Add to page
      figma.currentPage.appendChild(connector);

      results.push({
        success: true,
        fromNodeId,
        toNodeId,
        connectorId: connector.id,
      });
    } catch (error) {
      results.push({
        success: false,
        fromNodeId,
        toNodeId,
        error: (error as Error).message,
      });
    }

    sendProgressUpdate(
      commandId,
      'create_connections',
      'in_progress',
      Math.round(((i + 1) / connections.length) * 100),
      connections.length,
      i + 1,
      `Created ${i + 1}/${connections.length} connections`,
      null
    );
  }

  const successCount = results.filter((r) => r.success).length;

  sendProgressUpdate(
    commandId,
    'create_connections',
    'completed',
    100,
    connections.length,
    connections.length,
    `Created ${successCount}/${connections.length} connections`,
    { results }
  );

  return {
    success: successCount > 0,
    successCount,
    failureCount: connections.length - successCount,
    totalConnections: connections.length,
    results,
    commandId,
  };
}

