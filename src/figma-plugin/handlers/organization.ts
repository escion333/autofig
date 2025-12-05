/**
 * Node organization handlers (grouping, ungrouping)
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getNodeById } from '../utils/helpers';

/**
 * Group multiple nodes together
 */
export async function groupNodes(params: CommandParams['group_nodes']): Promise<NodeResult> {
  const { nodeIds, name = 'Group' } = params || {};

  if (!nodeIds || nodeIds.length === 0) {
    throw new Error('Missing nodeIds parameter - at least one node ID is required');
  }

  if (nodeIds.length < 2) {
    throw new Error('At least two nodes are required to create a group');
  }

  // Get all nodes
  const nodes: SceneNode[] = [];
  for (const nodeId of nodeIds) {
    const node = await getNodeById(nodeId);
    nodes.push(node);
  }

  // Verify all nodes have the same parent
  const firstParent = nodes[0].parent;
  if (!firstParent) {
    throw new Error(`Node "${nodes[0].name}" has no parent and cannot be grouped`);
  }

  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i].parent !== firstParent) {
      throw new Error(
        `All nodes must have the same parent to be grouped. ` +
        `Node "${nodes[0].name}" has parent "${firstParent.name || firstParent.id}", ` +
        `but node "${nodes[i].name}" has parent "${nodes[i].parent?.name || nodes[i].parent?.id || 'none'}"`
      );
    }
  }

  // Create the group
  const group = figma.group(nodes, firstParent as FrameNode | PageNode | GroupNode);
  group.name = name;

  return {
    id: group.id,
    name: group.name,
    type: group.type,
    x: group.x,
    y: group.y,
    width: group.width,
    height: group.height,
    childCount: group.children.length,
    parentId: group.parent?.id,
  };
}

/**
 * Ungroup a group node, moving children to the group's parent
 */
export async function ungroupNode(params: CommandParams['ungroup_node']): Promise<{ ungroupedNodes: NodeResult[] }> {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);

  if (node.type !== 'GROUP') {
    throw new Error(`Node "${node.name}" (${node.type}) is not a group and cannot be ungrouped: ${nodeId}`);
  }

  const group = node as GroupNode;
  const parent = group.parent;

  if (!parent || !('appendChild' in parent)) {
    throw new Error(`Group "${group.name}" has no valid parent to move children to`);
  }

  // Store info about children before ungrouping
  const children = [...group.children];
  const ungroupedNodes: NodeResult[] = [];

  // Get the index of the group in its parent
  const groupIndex = parent.children.indexOf(group);

  // Move each child to the parent at the group's position
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    // Insert at the group's position (this preserves visual order)
    parent.insertChild(groupIndex, child);
    
    ungroupedNodes.unshift({
      id: child.id,
      name: child.name,
      type: child.type,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
      parentId: parent.id,
    });
  }

  // The group should now be empty and automatically removed by Figma
  // but let's make sure
  if (group.children.length === 0 && group.parent) {
    group.remove();
  }

  return {
    ungroupedNodes,
  };
}

