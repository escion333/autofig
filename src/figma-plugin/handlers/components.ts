/**
 * Component and style handlers
 */

import type { CommandParams } from '../../shared/types';

/**
 * Get all local styles (paint, text, effect, grid)
 */
export async function getStyles() {
  const styles = {
    colors: await figma.getLocalPaintStylesAsync(),
    texts: await figma.getLocalTextStylesAsync(),
    effects: await figma.getLocalEffectStylesAsync(),
    grids: await figma.getLocalGridStylesAsync(),
  };

  return {
    colors: styles.colors.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      paint: style.paints[0],
    })),
    texts: styles.texts.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      fontSize: style.fontSize,
      fontName: style.fontName,
    })),
    effects: styles.effects.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
    grids: styles.grids.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
  };
}

/**
 * Get all local components
 */
export async function getLocalComponents() {
  await figma.loadAllPagesAsync();

  const components = figma.root.findAllWithCriteria({
    types: ['COMPONENT'],
  });

  return {
    count: components.length,
    components: components.map((component) => ({
      id: component.id,
      name: component.name,
      key: 'key' in component ? (component as ComponentNode).key : null,
    })),
  };
}

/**
 * Create an instance of a component by key
 */
export async function createComponentInstance(params: CommandParams['create_component_instance']) {
  const { componentKey, x = 0, y = 0, parentId } = params || {};

  if (!componentKey) {
    throw new Error('Missing componentKey parameter');
  }

  try {
    const component = await figma.importComponentByKeyAsync(componentKey);
    const instance = component.createInstance();

    instance.x = x;
    instance.y = y;

    // Append to parent if specified, otherwise to current page
    if (parentId) {
      const parentNode = await figma.getNodeByIdAsync(parentId);
      if (parentNode && 'appendChild' in parentNode) {
        (parentNode as BaseNode & ChildrenMixin).appendChild(instance);
      } else {
        figma.currentPage.appendChild(instance);
      }
    } else {
      figma.currentPage.appendChild(instance);
    }

    return {
      id: instance.id,
      name: instance.name,
      x: instance.x,
      y: instance.y,
      width: instance.width,
      height: instance.height,
      componentId: instance.mainComponent?.id,
    };
  } catch (error) {
    throw new Error(`Error creating component instance: ${(error as Error).message}`);
  }
}

/**
 * Get overrides from a component instance
 */
export async function getInstanceOverrides(params: CommandParams['get_instance_overrides']) {
  const { instanceNodeId } = params || {};

  let sourceInstance: InstanceNode | null = null;

  if (instanceNodeId) {
    const node = await figma.getNodeByIdAsync(instanceNodeId);
    if (!node) {
      throw new Error(`Instance node not found with ID: ${instanceNodeId}`);
    }
    if (node.type !== 'INSTANCE') {
      return { success: false, message: 'Provided node is not a component instance' };
    }
    sourceInstance = node;
  } else {
    // Use current selection
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      return { success: false, message: 'No nodes selected' };
    }

    const instances = selection.filter((node): node is InstanceNode => node.type === 'INSTANCE');
    if (instances.length === 0) {
      return { success: false, message: 'No instances found in selection' };
    }

    sourceInstance = instances[0];
  }

  try {
    const overrides = sourceInstance.overrides || [];
    const mainComponent = await sourceInstance.getMainComponentAsync();

    if (!mainComponent) {
      return { success: false, message: 'Failed to get main component' };
    }

    return {
      success: true,
      message: `Got component information from "${sourceInstance.name}" for overrides.length: ${overrides.length}`,
      sourceInstanceId: sourceInstance.id,
      mainComponentId: mainComponent.id,
      overridesCount: overrides.length,
    };
  } catch (error) {
    return { success: false, message: `Error: ${(error as Error).message}` };
  }
}

/**
 * Set overrides on component instances
 */
export async function setInstanceOverrides(params: CommandParams['set_instance_overrides']) {
  const { targetNodeIds, sourceInstanceId, overrides } = params || {};

  if (!targetNodeIds || !Array.isArray(targetNodeIds) || targetNodeIds.length === 0) {
    return { success: false, message: 'No target instances provided' };
  }

  // Get valid target instances
  const targetInstances: InstanceNode[] = [];
  for (const id of targetNodeIds) {
    const node = await figma.getNodeByIdAsync(id);
    if (node && node.type === 'INSTANCE') {
      targetInstances.push(node);
    }
  }

  if (targetInstances.length === 0) {
    return { success: false, message: 'No valid instances found' };
  }

  // If sourceInstanceId is provided, copy from source
  if (sourceInstanceId) {
    const sourceNode = await figma.getNodeByIdAsync(sourceInstanceId);
    if (!sourceNode || sourceNode.type !== 'INSTANCE') {
      return { success: false, message: 'Source instance not found or is not an instance' };
    }

    const sourceInstance = sourceNode as InstanceNode;
    const mainComponent = await sourceInstance.getMainComponentAsync();
    if (!mainComponent) {
      return { success: false, message: 'Failed to get main component from source instance' };
    }

    const sourceOverrides = sourceInstance.overrides || [];
    const results: Array<{ success: boolean; instanceId: string; instanceName: string; appliedCount?: number; message?: string }> = [];
    let totalAppliedCount = 0;

    for (const targetInstance of targetInstances) {
      try {
        // Swap to same component
        targetInstance.swapComponent(mainComponent);

        let appliedCount = 0;

        // Apply each override
        for (const override of sourceOverrides) {
          if (!override.id || !override.overriddenFields || override.overriddenFields.length === 0) {
            continue;
          }

          const overrideNodeId = override.id.replace(sourceInstance.id, targetInstance.id);
          const overrideNode = await figma.getNodeByIdAsync(overrideNodeId);

          if (!overrideNode) continue;

          const sourceOverrideNode = await figma.getNodeByIdAsync(override.id);
          if (!sourceOverrideNode) continue;

          for (const field of override.overriddenFields) {
            try {
              if (field === 'characters' && overrideNode.type === 'TEXT') {
                await figma.loadFontAsync((overrideNode as TextNode).fontName as FontName);
                (overrideNode as TextNode).characters = (sourceOverrideNode as TextNode).characters;
                appliedCount++;
              } else if (field in overrideNode && field in sourceOverrideNode) {
                (overrideNode as any)[field] = (sourceOverrideNode as any)[field];
                appliedCount++;
              }
            } catch (e) {
              console.error(`Error applying field ${field}:`, e);
            }
          }
        }

        if (appliedCount > 0) {
          totalAppliedCount += appliedCount;
          results.push({ success: true, instanceId: targetInstance.id, instanceName: targetInstance.name, appliedCount });
        } else {
          results.push({ success: false, instanceId: targetInstance.id, instanceName: targetInstance.name, message: 'No overrides applied' });
        }
      } catch (error) {
        results.push({ success: false, instanceId: targetInstance.id, instanceName: targetInstance.name, message: (error as Error).message });
      }
    }

    return {
      success: totalAppliedCount > 0,
      message: totalAppliedCount > 0
        ? `Applied overrides to ${results.filter(r => r.success).length} instances`
        : 'No overrides applied to any instance',
      totalCount: totalAppliedCount,
      results,
    };
  }

  // If overrides array is provided directly, apply them
  if (overrides && overrides.length > 0) {
    // TODO: Implement direct override application
    return { success: false, message: 'Direct override application not yet implemented' };
  }

  return { success: false, message: 'No source instance ID or overrides provided' };
}

