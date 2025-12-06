/**
 * Effect style handlers (shadows, blurs, effect styles)
 */

import type { CommandParams, EffectStyleInfo, EffectInput, RGBA } from '../../shared/types';
import { getNodeById, assertNodeCapability, provideVisualFeedback } from '../utils/helpers';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert EffectInput to Figma Effect
 */
function effectInputToFigmaEffect(input: EffectInput): Effect {
  const visible = input.visible ?? true;

  switch (input.type) {
    case 'DROP_SHADOW':
      return {
        type: 'DROP_SHADOW',
        color: {
          r: input.color?.r ?? 0,
          g: input.color?.g ?? 0,
          b: input.color?.b ?? 0,
          a: input.color?.a ?? 0.25,
        },
        offset: {
          x: input.offsetX ?? 0,
          y: input.offsetY ?? 4,
        },
        radius: input.radius ?? 4,
        spread: input.spread ?? 0,
        visible,
        blendMode: 'NORMAL',
      } as DropShadowEffect;

    case 'INNER_SHADOW':
      return {
        type: 'INNER_SHADOW',
        color: {
          r: input.color?.r ?? 0,
          g: input.color?.g ?? 0,
          b: input.color?.b ?? 0,
          a: input.color?.a ?? 0.25,
        },
        offset: {
          x: input.offsetX ?? 0,
          y: input.offsetY ?? 2,
        },
        radius: input.radius ?? 4,
        spread: input.spread ?? 0,
        visible,
        blendMode: 'NORMAL',
      } as InnerShadowEffect;

    case 'LAYER_BLUR':
      return {
        type: 'LAYER_BLUR',
        radius: input.radius ?? 4,
        visible,
      } as BlurEffect;

    case 'BACKGROUND_BLUR':
      return {
        type: 'BACKGROUND_BLUR',
        radius: input.radius ?? 10,
        visible,
      } as BlurEffect;

    default:
      throw new Error(`Unknown effect type: ${input.type}`);
  }
}

/**
 * Convert Figma Effect to serializable format
 */
function figmaEffectToOutput(effect: Effect): {
  type: string;
  color?: RGBA;
  offset?: { x: number; y: number };
  radius?: number;
  spread?: number;
  visible?: boolean;
} {
  const result: {
    type: string;
    color?: RGBA;
    offset?: { x: number; y: number };
    radius?: number;
    spread?: number;
    visible?: boolean;
  } = {
    type: effect.type,
    visible: effect.visible,
  };

  if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
    const shadowEffect = effect as DropShadowEffect | InnerShadowEffect;
    result.color = {
      r: shadowEffect.color.r,
      g: shadowEffect.color.g,
      b: shadowEffect.color.b,
      a: shadowEffect.color.a,
    };
    result.offset = {
      x: shadowEffect.offset.x,
      y: shadowEffect.offset.y,
    };
    result.radius = shadowEffect.radius;
    result.spread = shadowEffect.spread;
  } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
    const blurEffect = effect as BlurEffect;
    result.radius = blurEffect.radius;
  }

  return result;
}

// ============================================================================
// Effect Style CRUD Operations
// ============================================================================

/**
 * Get all local effect styles
 */
export async function getEffectStyles(): Promise<{
  count: number;
  styles: EffectStyleInfo[];
}> {
  const effectStyles = await figma.getLocalEffectStylesAsync();

  const styles: EffectStyleInfo[] = effectStyles.map((style) => ({
    id: style.id,
    name: style.name,
    key: style.key,
    effects: style.effects.map(figmaEffectToOutput) as EffectStyleInfo['effects'],
  }));

  return {
    count: styles.length,
    styles,
  };
}

/**
 * Create a new effect style
 */
export async function createEffectStyle(
  params: CommandParams['create_effect_style']
): Promise<EffectStyleInfo> {
  const { name, effects } = params;

  if (!name) {
    throw new Error('Missing name parameter');
  }

  if (!effects || effects.length === 0) {
    throw new Error('Missing effects parameter - at least one effect is required');
  }

  // Create the effect style
  const style = figma.createEffectStyle();
  style.name = name;

  // Convert and set effects
  style.effects = effects.map(effectInputToFigmaEffect);

  // Provide visual feedback
  figma.notify(`✅ Created effect style: ${name}`);

  return {
    id: style.id,
    name: style.name,
    key: style.key,
    effects: style.effects.map(figmaEffectToOutput) as EffectStyleInfo['effects'],
  };
}

/**
 * Apply an effect style to a node
 */
export async function applyEffectStyle(
  params: CommandParams['apply_effect_style']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  styleId: string;
  styleName: string;
}> {
  const { nodeId, styleId, styleName } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!styleId && !styleName) {
    throw new Error('Either styleId or styleName must be provided');
  }

  // Find the style
  let style: EffectStyle | null = null;

  if (styleId) {
    const foundStyle = figma.getStyleById(styleId);
    if (foundStyle && foundStyle.type === 'EFFECT') {
      style = foundStyle as EffectStyle;
    }
  } else if (styleName) {
    const effectStyles = await figma.getLocalEffectStylesAsync();
    style = effectStyles.find((s) => s.name === styleName) || null;
  }

  if (!style) {
    throw new Error(`Effect style not found: ${styleId || styleName}`);
  }

  // Get the node
  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'effectStyleId', `Node "${node.name}" does not support effect styles`);

  // Apply the style
  (node as BlendMixin).effectStyleId = style.id;

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Applied effect style "${style.name}" to ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    styleId: style.id,
    styleName: style.name,
  };
}

/**
 * Delete an effect style
 */
export async function deleteEffectStyle(
  params: CommandParams['delete_effect_style']
): Promise<{
  success: boolean;
  styleId: string;
  styleName: string;
}> {
  const { styleId } = params;

  if (!styleId) {
    throw new Error('Missing styleId parameter');
  }

  // Get the style
  const style = figma.getStyleById(styleId) as EffectStyle | null;

  if (!style) {
    throw new Error(`Effect style not found: ${styleId}`);
  }

  if (style.type !== 'EFFECT') {
    throw new Error(`Style is not an effect style: ${styleId} (type: ${style.type})`);
  }

  const styleName = style.name;

  // Remove the style
  style.remove();

  // Provide visual feedback
  figma.notify(`✅ Deleted effect style: ${styleName}`);

  return {
    success: true,
    styleId,
    styleName,
  };
}

// ============================================================================
// Direct Effect Operations on Nodes
// ============================================================================

/**
 * Set effects on a node (replaces all existing effects)
 */
export async function setEffects(
  params: CommandParams['set_effects']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  effectsCount: number;
}> {
  const { nodeId, effects } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!effects) {
    throw new Error('Missing effects parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'effects', `Node "${node.name}" does not support effects`);

  // Convert and set effects
  (node as BlendMixin).effects = effects.map(effectInputToFigmaEffect);

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Set ${effects.length} effect(s) on ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    effectsCount: effects.length,
  };
}

/**
 * Add a drop shadow to a node
 */
export async function addDropShadow(
  params: CommandParams['add_drop_shadow']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  effectsCount: number;
}> {
  const { nodeId, color, offsetX = 0, offsetY = 4, radius = 4, spread = 0, visible = true } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!color) {
    throw new Error('Missing color parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'effects', `Node "${node.name}" does not support effects`);

  const blendNode = node as BlendMixin;
  const existingEffects = [...blendNode.effects];

  const newShadow: DropShadowEffect = {
    type: 'DROP_SHADOW',
    color: {
      r: color.r ?? 0,
      g: color.g ?? 0,
      b: color.b ?? 0,
      a: color.a ?? 0.25,
    },
    offset: { x: offsetX, y: offsetY },
    radius,
    spread,
    visible,
    blendMode: 'NORMAL',
  };

  blendNode.effects = [...existingEffects, newShadow];

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    effectsCount: blendNode.effects.length,
  };
}

/**
 * Add an inner shadow to a node
 */
export async function addInnerShadow(
  params: CommandParams['add_inner_shadow']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  effectsCount: number;
}> {
  const { nodeId, color, offsetX = 0, offsetY = 2, radius = 4, spread = 0, visible = true } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (!color) {
    throw new Error('Missing color parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'effects', `Node "${node.name}" does not support effects`);

  const blendNode = node as BlendMixin;
  const existingEffects = [...blendNode.effects];

  const newShadow: InnerShadowEffect = {
    type: 'INNER_SHADOW',
    color: {
      r: color.r ?? 0,
      g: color.g ?? 0,
      b: color.b ?? 0,
      a: color.a ?? 0.25,
    },
    offset: { x: offsetX, y: offsetY },
    radius,
    spread,
    visible,
    blendMode: 'NORMAL',
  };

  blendNode.effects = [...existingEffects, newShadow];

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Added inner shadow to ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    effectsCount: blendNode.effects.length,
  };
}

/**
 * Add a layer blur to a node
 */
export async function addLayerBlur(
  params: CommandParams['add_layer_blur']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  effectsCount: number;
}> {
  const { nodeId, radius, visible = true } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (radius === undefined || radius === null) {
    throw new Error('Missing radius parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'effects', `Node "${node.name}" does not support effects`);

  const blendNode = node as BlendMixin;
  const existingEffects = [...blendNode.effects];

  const newBlur = {
    type: 'LAYER_BLUR' as const,
    radius,
    visible,
  };

  blendNode.effects = [...existingEffects, newBlur] as Effect[];

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Added layer blur (${radius}px) to ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    effectsCount: blendNode.effects.length,
  };
}

/**
 * Add a background blur to a node
 */
export async function addBackgroundBlur(
  params: CommandParams['add_background_blur']
): Promise<{
  success: boolean;
  nodeId: string;
  nodeName: string;
  effectsCount: number;
}> {
  const { nodeId, radius, visible = true } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  if (radius === undefined || radius === null) {
    throw new Error('Missing radius parameter');
  }

  const node = await getNodeById(nodeId);
  assertNodeCapability(node, 'effects', `Node "${node.name}" does not support effects`);

  const blendNode = node as BlendMixin;
  const existingEffects = [...blendNode.effects];

  const newBlur = {
    type: 'BACKGROUND_BLUR' as const,
    radius,
    visible,
  };

  blendNode.effects = [...existingEffects, newBlur] as Effect[];

  // Provide visual feedback
  provideVisualFeedback(node, `✅ Added background blur (${radius}px) to ${node.name}`);

  return {
    success: true,
    nodeId: node.id,
    nodeName: node.name,
    effectsCount: blendNode.effects.length,
  };
}

