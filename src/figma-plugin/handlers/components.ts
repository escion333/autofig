/**
 * Component and style handlers
 */

import type {
  CommandParams,
  ComponentInfo,
  ComponentSetInfo,
  ComponentPropertyInfo,
} from '../../shared/types';

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

// =============================================================================
// Component Creation
// =============================================================================

/**
 * Convert a node to a component
 */
export async function createComponent(
  params: CommandParams['create_component']
): Promise<ComponentInfo> {
  const { nodeId, name } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // Only frame-like nodes can be converted to components
  if (!('type' in node) || !['FRAME', 'GROUP', 'RECTANGLE', 'ELLIPSE', 'POLYGON', 'STAR', 'LINE', 'VECTOR', 'TEXT'].includes(node.type)) {
    throw new Error(`Cannot convert node type ${node.type} to component. Use FRAME, GROUP, or shape nodes.`);
  }

  // Create the component from the node
  const component = figma.createComponentFromNode(node as SceneNode);

  // Rename if name provided
  if (name) {
    component.name = name;
  }

  return {
    id: component.id,
    name: component.name,
    key: component.key,
    type: 'COMPONENT',
    description: component.description,
    documentationLinks: component.documentationLinks?.map(link => link.uri) || [],
    remote: component.remote,
  };
}

/**
 * Create a component set (variant group) from multiple components
 */
export async function createComponentSet(
  params: CommandParams['create_component_set']
): Promise<ComponentSetInfo> {
  const { componentIds, name } = params;

  if (!componentIds || componentIds.length === 0) {
    throw new Error('Missing componentIds parameter');
  }

  if (componentIds.length < 2) {
    throw new Error('At least 2 components are required to create a component set');
  }

  // Get all component nodes
  const components: ComponentNode[] = [];
  for (const id of componentIds) {
    const node = await figma.getNodeByIdAsync(id);
    if (!node) {
      throw new Error(`Component not found: ${id}`);
    }
    if (node.type !== 'COMPONENT') {
      throw new Error(`Node ${id} is not a component (type: ${node.type})`);
    }
    components.push(node);
  }

  // Combine components into a component set
  const componentSet = figma.combineAsVariants(components, figma.currentPage);

  // Rename if name provided
  if (name) {
    componentSet.name = name;
  }

  // Extract variant group properties
  const variantGroupProperties: Record<string, { values: string[] }> = {};
  if (componentSet.variantGroupProperties) {
    for (const [propName, propData] of Object.entries(componentSet.variantGroupProperties)) {
      variantGroupProperties[propName] = {
        values: propData.values,
      };
    }
  }

  return {
    id: componentSet.id,
    name: componentSet.name,
    key: componentSet.key,
    type: 'COMPONENT_SET',
    description: componentSet.description,
    componentIds: componentSet.children.map(child => child.id),
    variantGroupProperties,
  };
}

/**
 * Get properties of a component or component set
 */
export async function getComponentProperties(
  params: CommandParams['get_component_properties']
): Promise<{
  componentId: string;
  componentName: string;
  componentType: 'COMPONENT' | 'COMPONENT_SET';
  properties: ComponentPropertyInfo[];
}> {
  const { componentId } = params;

  if (!componentId) {
    throw new Error('Missing componentId parameter');
  }

  const node = await figma.getNodeByIdAsync(componentId);
  if (!node) {
    throw new Error(`Node not found: ${componentId}`);
  }

  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
    throw new Error(`Node is not a component or component set (type: ${node.type})`);
  }

  const componentNode = node as ComponentNode | ComponentSetNode;
  const properties: ComponentPropertyInfo[] = [];

  // Get component properties
  if (componentNode.componentPropertyDefinitions) {
    for (const [propName, propDef] of Object.entries(componentNode.componentPropertyDefinitions)) {
      properties.push({
        name: propName,
        type: propDef.type,
        defaultValue: propDef.defaultValue,
        preferredValues: propDef.preferredValues?.map(pv => ({
          type: pv.type,
          key: pv.key,
        })),
        variantOptions: propDef.variantOptions,
      });
    }
  }

  return {
    componentId: componentNode.id,
    componentName: componentNode.name,
    componentType: componentNode.type as 'COMPONENT' | 'COMPONENT_SET',
    properties,
  };
}

/**
 * Add a property to a component or component set
 */
export async function addComponentProperty(
  params: CommandParams['add_component_property']
): Promise<{
  success: boolean;
  componentId: string;
  propertyName: string;
  propertyType: string;
}> {
  const { componentId, propertyName, propertyType, defaultValue, preferredValues, variantOptions } = params;

  if (!componentId) {
    throw new Error('Missing componentId parameter');
  }
  if (!propertyName) {
    throw new Error('Missing propertyName parameter');
  }
  if (!propertyType) {
    throw new Error('Missing propertyType parameter');
  }

  const node = await figma.getNodeByIdAsync(componentId);
  if (!node) {
    throw new Error(`Node not found: ${componentId}`);
  }

  if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') {
    throw new Error(`Node is not a component or component set (type: ${node.type})`);
  }

  const componentNode = node as ComponentNode | ComponentSetNode;

  // Add the property
  componentNode.addComponentProperty(propertyName, propertyType, defaultValue);

  return {
    success: true,
    componentId: componentNode.id,
    propertyName,
    propertyType,
  };
}

/**
 * Set a component property value on an instance
 */
export async function setComponentPropertyValue(
  params: CommandParams['set_component_property_value']
): Promise<{
  success: boolean;
  instanceId: string;
  propertyName: string;
  value: string | boolean;
}> {
  const { instanceId, propertyName, value } = params;

  if (!instanceId) {
    throw new Error('Missing instanceId parameter');
  }
  if (!propertyName) {
    throw new Error('Missing propertyName parameter');
  }
  if (value === undefined) {
    throw new Error('Missing value parameter');
  }

  const node = await figma.getNodeByIdAsync(instanceId);
  if (!node) {
    throw new Error(`Node not found: ${instanceId}`);
  }

  if (node.type !== 'INSTANCE') {
    throw new Error(`Node is not an instance (type: ${node.type})`);
  }

  const instance = node as InstanceNode;

  // Set the property value
  instance.setProperties({
    [propertyName]: value,
  });

  return {
    success: true,
    instanceId: instance.id,
    propertyName,
    value,
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

  // If overrides array is provided directly without a source instance, this isn't supported
  // because override IDs are specific to the source instance and cannot be meaningfully
  // applied to target instances without that context.
  if (overrides && overrides.length > 0) {
    return {
      success: false,
      message: 'Direct override application is not supported. Please provide a sourceInstanceId to copy overrides from an existing instance.',
    };
  }

  return { success: false, message: 'No source instance ID provided. Please specify a sourceInstanceId to copy overrides from.' };
}

