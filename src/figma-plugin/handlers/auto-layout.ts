/**
 * Auto-layout handlers
 */

import type { CommandParams, NodeResult } from '../../shared/types';
import { getNodeById } from '../utils/helpers';

type AutoLayoutNode = FrameNode | ComponentNode | ComponentSetNode | InstanceNode;

/**
 * Check if a node supports auto-layout
 */
function assertAutoLayoutSupport(node: SceneNode): asserts node is AutoLayoutNode {
  const supportedTypes = ['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'];
  if (!supportedTypes.includes(node.type)) {
    throw new Error(`Node type ${node.type} does not support auto-layout`);
  }
}

/**
 * Check if auto-layout is enabled on a node
 */
function assertAutoLayoutEnabled(node: AutoLayoutNode): void {
  if (node.layoutMode === 'NONE') {
    throw new Error('This operation requires auto-layout to be enabled (layoutMode must not be NONE)');
  }
}

/**
 * Set layout mode on a frame
 */
export async function setLayoutMode(params: CommandParams['set_layout_mode']): Promise<NodeResult> {
  const { nodeId, mode, layoutWrap = 'NO_WRAP', itemSpacing } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);
  assertAutoLayoutSupport(node);

  node.layoutMode = mode;

  if (mode !== 'NONE') {
    node.layoutWrap = layoutWrap;
    if (itemSpacing !== undefined) {
      node.itemSpacing = itemSpacing;
    }
  }

  return {
    id: node.id,
    name: node.name,
    layoutMode: node.layoutMode,
    layoutWrap: node.layoutWrap,
    itemSpacing: node.itemSpacing,
  };
}

/**
 * Set padding on an auto-layout frame
 */
export async function setPadding(params: CommandParams['set_padding']): Promise<NodeResult> {
  const { nodeId, paddingTop, paddingRight, paddingBottom, paddingLeft, padding } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);
  assertAutoLayoutSupport(node);
  assertAutoLayoutEnabled(node);

  // If uniform padding is provided, use it for all sides
  if (padding !== undefined) {
    node.paddingTop = padding;
    node.paddingRight = padding;
    node.paddingBottom = padding;
    node.paddingLeft = padding;
  } else {
    // Set individual padding values if provided
    if (paddingTop !== undefined) node.paddingTop = paddingTop;
    if (paddingRight !== undefined) node.paddingRight = paddingRight;
    if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
    if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;
  }

  return {
    id: node.id,
    name: node.name,
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
  };
}

/**
 * Set axis alignment on an auto-layout frame
 */
export async function setAxisAlign(params: CommandParams['set_axis_align']): Promise<NodeResult> {
  const { nodeId, primaryAxisAlignItems, counterAxisAlignItems } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);
  assertAutoLayoutSupport(node);
  assertAutoLayoutEnabled(node);

  // Validate and set primaryAxisAlignItems
  if (primaryAxisAlignItems !== undefined) {
    const validPrimary = ['MIN', 'MAX', 'CENTER', 'SPACE_BETWEEN'];
    if (!validPrimary.includes(primaryAxisAlignItems)) {
      throw new Error(`Invalid primaryAxisAlignItems value. Must be one of: ${validPrimary.join(', ')}`);
    }
    node.primaryAxisAlignItems = primaryAxisAlignItems;
  }

  // Validate and set counterAxisAlignItems
  if (counterAxisAlignItems !== undefined) {
    const validCounter = ['MIN', 'MAX', 'CENTER', 'BASELINE'];
    if (!validCounter.includes(counterAxisAlignItems)) {
      throw new Error(`Invalid counterAxisAlignItems value. Must be one of: ${validCounter.join(', ')}`);
    }
    // BASELINE is only valid for horizontal layout
    if (counterAxisAlignItems === 'BASELINE' && node.layoutMode !== 'HORIZONTAL') {
      throw new Error('BASELINE alignment is only valid for horizontal auto-layout frames');
    }
    node.counterAxisAlignItems = counterAxisAlignItems;
  }

  return {
    id: node.id,
    name: node.name,
    primaryAxisAlignItems: node.primaryAxisAlignItems,
    counterAxisAlignItems: node.counterAxisAlignItems,
    layoutMode: node.layoutMode,
  };
}

/**
 * Set layout sizing on an auto-layout frame
 */
export async function setLayoutSizing(params: CommandParams['set_layout_sizing']): Promise<NodeResult> {
  const { nodeId, horizontal, vertical } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await getNodeById(nodeId);
  assertAutoLayoutSupport(node);
  assertAutoLayoutEnabled(node);

  const validSizing = ['FIXED', 'HUG', 'FILL'];

  // Validate and set horizontal sizing
  if (horizontal !== undefined) {
    if (!validSizing.includes(horizontal)) {
      throw new Error(`Invalid layoutSizingHorizontal value. Must be one of: ${validSizing.join(', ')}`);
    }
    // HUG is only valid on auto-layout frames and text nodes
    if (horizontal === 'HUG' && !['FRAME', 'TEXT'].includes(node.type)) {
      throw new Error('HUG sizing is only valid on auto-layout frames and text nodes');
    }
    // FILL is only valid on auto-layout children
    if (horizontal === 'FILL' && (!node.parent || (node.parent as AutoLayoutNode).layoutMode === 'NONE')) {
      throw new Error('FILL sizing is only valid on auto-layout children');
    }
    node.layoutSizingHorizontal = horizontal;
  }

  // Validate and set vertical sizing
  if (vertical !== undefined) {
    if (!validSizing.includes(vertical)) {
      throw new Error(`Invalid layoutSizingVertical value. Must be one of: ${validSizing.join(', ')}`);
    }
    if (vertical === 'HUG' && !['FRAME', 'TEXT'].includes(node.type)) {
      throw new Error('HUG sizing is only valid on auto-layout frames and text nodes');
    }
    if (vertical === 'FILL' && (!node.parent || (node.parent as AutoLayoutNode).layoutMode === 'NONE')) {
      throw new Error('FILL sizing is only valid on auto-layout children');
    }
    node.layoutSizingVertical = vertical;
  }

  return {
    id: node.id,
    name: node.name,
    layoutSizingHorizontal: node.layoutSizingHorizontal,
    layoutSizingVertical: node.layoutSizingVertical,
    layoutMode: node.layoutMode,
  };
}

/**
 * Set item spacing on an auto-layout frame
 */
export async function setItemSpacing(params: CommandParams['set_item_spacing']): Promise<NodeResult> {
  const { nodeId, spacing } = params || {};

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (spacing === undefined) {
    throw new Error('Missing spacing parameter');
  }

  const node = await getNodeById(nodeId);
  assertAutoLayoutSupport(node);
  assertAutoLayoutEnabled(node);

  node.itemSpacing = spacing;

  return {
    id: node.id,
    name: node.name,
    itemSpacing: node.itemSpacing,
    layoutMode: node.layoutMode,
    layoutWrap: node.layoutWrap,
  };
}

