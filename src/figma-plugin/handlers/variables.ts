/**
 * Variable handlers for design tokens (Figma Variables API)
 */

import type {
  CommandParams,
  VariableCollectionInfo,
  VariableInfo,
  VariableModeInfo,
  VariableValueInput,
  VariableBindableField,
} from '../../shared/types';
import { delay } from '../utils/helpers';
import { sendProgressUpdate, generateCommandId } from '../utils/progress';

/**
 * Get all local variable collections in the document
 */
export async function getLocalVariableCollections(): Promise<{
  collections: VariableCollectionInfo[];
  count: number;
}> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const collectionInfos: VariableCollectionInfo[] = collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    modes: collection.modes.map((mode): VariableModeInfo => ({
      modeId: mode.modeId,
      name: mode.name,
    })),
    defaultModeId: collection.defaultModeId,
    variableIds: collection.variableIds,
    hiddenFromPublishing: collection.hiddenFromPublishing,
  }));

  return {
    collections: collectionInfos,
    count: collectionInfos.length,
  };
}

/**
 * Get local variables, optionally filtered by collection
 */
export async function getLocalVariables(
  params: CommandParams['get_local_variables']
): Promise<{
  variables: VariableInfo[];
  count: number;
}> {
  const { collectionId } = params || {};

  const variables = await figma.variables.getLocalVariablesAsync();

  // Filter by collection if specified
  const filteredVariables = collectionId
    ? variables.filter((v) => v.variableCollectionId === collectionId)
    : variables;

  const variableInfos: VariableInfo[] = filteredVariables.map((variable) => {
    // Convert valuesByMode to a serializable format
    const valuesByMode: Record<string, unknown> = {};
    for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
      // Handle different value types
      if (isVariableAlias(value)) {
        // Variable alias - reference to another variable
        valuesByMode[modeId] = {
          type: 'VARIABLE_ALIAS',
          id: value.id,
        };
      } else if (isRGBA(value)) {
        // Color value - convert to serializable format
        valuesByMode[modeId] = {
          r: value.r,
          g: value.g,
          b: value.b,
          a: value.a,
        };
      } else {
        // Primitive value (number, string, boolean)
        valuesByMode[modeId] = value;
      }
    }

    return {
      id: variable.id,
      name: variable.name,
      key: variable.key,
      variableCollectionId: variable.variableCollectionId,
      resolvedType: variable.resolvedType,
      valuesByMode,
      hiddenFromPublishing: variable.hiddenFromPublishing,
      scopes: [...variable.scopes],
      codeSyntax: { ...variable.codeSyntax },
    };
  });

  return {
    variables: variableInfos,
    count: variableInfos.length,
  };
}

// Type guards for variable values
function isVariableAlias(value: unknown): value is { type: 'VARIABLE_ALIAS'; id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type: string }).type === 'VARIABLE_ALIAS'
  );
}

function isRGBA(value: unknown): value is { r: number; g: number; b: number; a: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'r' in value &&
    'g' in value &&
    'b' in value
  );
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Create a new variable collection
 */
export async function createVariableCollection(
  params: CommandParams['create_variable_collection']
): Promise<VariableCollectionInfo> {
  const { name, modes } = params;

  if (!name) {
    throw new Error('Missing name parameter');
  }

  // Create the collection
  const collection = figma.variables.createVariableCollection(name);

  // Rename the default mode if modes are provided
  if (modes && modes.length > 0) {
    // Rename the default mode to the first provided mode name
    const defaultMode = collection.modes[0];
    collection.renameMode(defaultMode.modeId, modes[0]);

    // Add additional modes (skip the first since we renamed the default)
    for (let i = 1; i < modes.length; i++) {
      collection.addMode(modes[i]);
    }
  }

  return {
    id: collection.id,
    name: collection.name,
    modes: collection.modes.map((mode): VariableModeInfo => ({
      modeId: mode.modeId,
      name: mode.name,
    })),
    defaultModeId: collection.defaultModeId,
    variableIds: collection.variableIds,
    hiddenFromPublishing: collection.hiddenFromPublishing,
  };
}

/**
 * Create a new variable in a collection
 */
export async function createVariable(
  params: CommandParams['create_variable']
): Promise<VariableInfo> {
  const { collectionId, name, resolvedType, value } = params;

  if (!collectionId) {
    throw new Error('Missing collectionId parameter');
  }
  if (!name) {
    throw new Error('Missing name parameter');
  }
  if (!resolvedType) {
    throw new Error('Missing resolvedType parameter');
  }

  // Verify collection exists
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  // Create the variable (pass the collection object, not the ID)
  const variable = figma.variables.createVariable(name, collection, resolvedType);

  // Set initial value if provided
  if (value !== undefined) {
    const defaultModeId = collection.defaultModeId;
    const figmaValue = convertToFigmaValue(value, resolvedType);
    variable.setValueForMode(defaultModeId, figmaValue);
  }

  // Return the created variable info
  const valuesByMode: Record<string, unknown> = {};
  for (const [modeId, val] of Object.entries(variable.valuesByMode)) {
    valuesByMode[modeId] = serializeVariableValue(val);
  }

  return {
    id: variable.id,
    name: variable.name,
    key: variable.key,
    variableCollectionId: variable.variableCollectionId,
    resolvedType: variable.resolvedType,
    valuesByMode,
    hiddenFromPublishing: variable.hiddenFromPublishing,
    scopes: [...variable.scopes],
    codeSyntax: { ...variable.codeSyntax },
  };
}

/**
 * Set a variable's value for a specific mode
 */
export async function setVariableValue(
  params: CommandParams['set_variable_value']
): Promise<VariableInfo> {
  const { variableId, modeId, value } = params;

  if (!variableId) {
    throw new Error('Missing variableId parameter');
  }
  if (!modeId) {
    throw new Error('Missing modeId parameter');
  }
  if (value === undefined) {
    throw new Error('Missing value parameter');
  }

  // Get the variable
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) {
    throw new Error(`Variable not found: ${variableId}`);
  }

  // Convert and set the value
  const figmaValue = convertToFigmaValue(value, variable.resolvedType);
  variable.setValueForMode(modeId, figmaValue);

  // Return updated variable info
  const valuesByMode: Record<string, unknown> = {};
  for (const [mode, val] of Object.entries(variable.valuesByMode)) {
    valuesByMode[mode] = serializeVariableValue(val);
  }

  return {
    id: variable.id,
    name: variable.name,
    key: variable.key,
    variableCollectionId: variable.variableCollectionId,
    resolvedType: variable.resolvedType,
    valuesByMode,
    hiddenFromPublishing: variable.hiddenFromPublishing,
    scopes: [...variable.scopes],
    codeSyntax: { ...variable.codeSyntax },
  };
}

/**
 * Delete a variable
 */
export async function deleteVariable(
  params: CommandParams['delete_variable']
): Promise<{ success: boolean; variableId: string }> {
  const { variableId } = params;

  if (!variableId) {
    throw new Error('Missing variableId parameter');
  }

  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) {
    throw new Error(`Variable not found: ${variableId}`);
  }

  variable.remove();

  return {
    success: true,
    variableId,
  };
}

/**
 * Get variables bound to a node
 */
export async function getBoundVariables(
  params: CommandParams['get_bound_variables']
): Promise<{
  nodeId: string;
  boundVariables: Record<string, { variableId: string; variableName?: string }[]>;
}> {
  const { nodeId } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const boundVariables: Record<string, { variableId: string; variableName?: string }[]> = {};

  // Check if node has boundVariables property
  if ('boundVariables' in node && node.boundVariables) {
    for (const [field, bindings] of Object.entries(node.boundVariables)) {
      if (bindings) {
        const bindingArray = Array.isArray(bindings) ? bindings : [bindings];
        const results: { variableId: string; variableName?: string }[] = [];
        
        for (const binding of bindingArray) {
          // Handle VariableAlias (has 'id' property) vs nested objects
          if (binding && typeof binding === 'object' && 'id' in binding) {
            const variableAlias = binding as { id: string };
            const variable = await figma.variables.getVariableByIdAsync(variableAlias.id);
            results.push({
              variableId: variableAlias.id,
              variableName: variable?.name,
            });
          }
        }
        
        boundVariables[field] = results;
      }
    }
  }

  return {
    nodeId,
    boundVariables,
  };
}

/**
 * Bind a variable to a node, handling paint-level binding for fills/strokes
 */
async function bindVariableToNode(
  node: SceneNode,
  field: string,
  variable: Variable
): Promise<void> {
  // For fills/strokes, use paint-level binding API
  if (field === 'fills' || field === 'strokes') {
    if (!(field in node)) {
      throw new Error(`Node type ${node.type} does not support ${field}`);
    }
    const paintNode = node as SceneNode & { fills: Paint[]; strokes: Paint[] };
    const paints = [...(paintNode[field] as Paint[])];
    if (paints.length === 0) {
      // Auto-create a default solid fill so we can bind the variable
      paints.push({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true } as SolidPaint);
    }
    // Bind to the first paint
    const updatedPaint = figma.variables.setBoundVariableForPaint(paints[0], 'color', variable);
    paints[0] = updatedPaint;
    (paintNode as any)[field] = paints;
    return;
  }

  // For all other fields, use standard setBoundVariable
  if (!('setBoundVariable' in node)) {
    throw new Error(`Node type ${node.type} does not support variable binding`);
  }
  const bindableNode = node as SceneNode & { setBoundVariable: (field: string, variable: Variable) => void };
  bindableNode.setBoundVariable(field as VariableBindableNodeField, variable);
}

/**
 * Bind a variable to a node field
 */
export async function bindVariable(
  params: CommandParams['bind_variable']
): Promise<{
  success: boolean;
  nodeId: string;
  field: string;
  variableId: string;
}> {
  const { nodeId, field, variableId } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }
  if (!field) {
    throw new Error('Missing field parameter');
  }
  if (!variableId) {
    throw new Error('Missing variableId parameter');
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) {
    throw new Error(`Variable not found: ${variableId}`);
  }

  await bindVariableToNode(node as SceneNode, field, variable);

  return {
    success: true,
    nodeId,
    field,
    variableId,
  };
}

/**
 * Unbind a variable from a node field
 */
export async function unbindVariable(
  params: CommandParams['unbind_variable']
): Promise<{
  success: boolean;
  nodeId: string;
  field: string;
}> {
  const { nodeId, field } = params;

  if (!nodeId) {
    throw new Error('Missing nodeId parameter');
  }
  if (!field) {
    throw new Error('Missing field parameter');
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  // Check if node supports setBoundVariable
  if (!('setBoundVariable' in node)) {
    throw new Error(`Node type ${node.type} does not support variable binding`);
  }

  // Unbind by setting to null
  const bindableNode = node as SceneNode & { setBoundVariable: (field: string, variable: Variable | null) => void };
  bindableNode.setBoundVariable(field as VariableBindableNodeField, null);

  return {
    success: true,
    nodeId,
    field,
  };
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Bind variables to multiple nodes in a batch operation
 */
export async function bindMultipleVariables(
  params: CommandParams['bind_multiple_variables']
): Promise<{
  success: boolean;
  successCount: number;
  failureCount: number;
  totalBindings: number;
  results: Array<{ success: boolean; nodeId: string; field: string; variableId: string; error?: string }>;
  commandId: string;
}> {
  const { bindings } = params;
  const commandId = generateCommandId();

  if (!bindings || !Array.isArray(bindings) || bindings.length === 0) {
    throw new Error('Missing or invalid bindings parameter');
  }

  sendProgressUpdate(
    commandId,
    'bind_multiple_variables',
    'started',
    0,
    bindings.length,
    0,
    `Starting to bind variables on ${bindings.length} nodes`,
    { totalBindings: bindings.length }
  );

  const results: Array<{ success: boolean; nodeId: string; field: string; variableId: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Cache variables to avoid repeated lookups
  const variableCache = new Map<string, Variable>();

  // Process in chunks of 5
  const CHUNK_SIZE = 5;
  const chunks: Array<typeof bindings> = [];
  for (let i = 0; i < bindings.length; i += CHUNK_SIZE) {
    chunks.push(bindings.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'bind_multiple_variables',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      bindings.length,
      successCount + failureCount,
      `Processing chunk ${chunkIndex + 1}/${chunks.length}`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
    );

    const chunkPromises = chunk.map(async ({ nodeId, field, variableId }) => {
      try {
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node) {
          return { success: false, nodeId, field, variableId, error: `Node not found: ${nodeId}` };
        }

        let variable = variableCache.get(variableId);
        if (!variable) {
          const v = await figma.variables.getVariableByIdAsync(variableId);
          if (!v) {
            return { success: false, nodeId, field, variableId, error: `Variable not found: ${variableId}` };
          }
          variable = v;
          variableCache.set(variableId, v);
        }

        await bindVariableToNode(node as SceneNode, field, variable);
        return { success: true, nodeId, field, variableId };
      } catch (error) {
        return { success: false, nodeId, field, variableId, error: (error as Error).message };
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

    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'bind_multiple_variables',
    'completed',
    100,
    bindings.length,
    successCount + failureCount,
    `Variable binding complete: ${successCount} successful, ${failureCount} failed`,
    { results }
  );

  const message = `✅ Bound ${successCount} variables` + (failureCount > 0 ? ` (${failureCount} failed)` : '');
  figma.notify(message);

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalBindings: bindings.length,
    results,
    commandId,
  };
}

/**
 * Create multiple variables in a single collection (batch)
 */
export async function createMultipleVariables(
  params: CommandParams['create_multiple_variables']
): Promise<{
  success: boolean;
  successCount: number;
  failureCount: number;
  totalVariables: number;
  results: Array<{ success: boolean; name: string; variableId?: string; error?: string }>;
  commandId: string;
}> {
  const { collectionId, variables } = params;
  const commandId = generateCommandId();

  if (!collectionId) {
    throw new Error('Missing collectionId parameter');
  }
  if (!variables || !Array.isArray(variables) || variables.length === 0) {
    throw new Error('Missing or invalid variables parameter');
  }

  // Fetch collection once upfront
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
  if (!collection) {
    throw new Error(`Collection not found: ${collectionId}`);
  }

  sendProgressUpdate(
    commandId,
    'create_multiple_variables',
    'started',
    0,
    variables.length,
    0,
    `Starting to create ${variables.length} variables in collection "${collection.name}"`,
    { totalVariables: variables.length }
  );

  const results: Array<{ success: boolean; name: string; variableId?: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Process in chunks of 5
  const CHUNK_SIZE = 5;
  const chunks: Array<typeof variables> = [];
  for (let i = 0; i < variables.length; i += CHUNK_SIZE) {
    chunks.push(variables.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'create_multiple_variables',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      variables.length,
      successCount + failureCount,
      `Processing chunk ${chunkIndex + 1}/${chunks.length}`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
    );

    const chunkPromises = chunk.map(async ({ name, resolvedType, value }) => {
      try {
        const variable = figma.variables.createVariable(name, collection, resolvedType);

        // Set initial value if provided
        if (value !== undefined) {
          const figmaValue = convertToFigmaValue(value, resolvedType);
          variable.setValueForMode(collection.defaultModeId, figmaValue);
        }

        return { success: true, name, variableId: variable.id };
      } catch (error) {
        return { success: false, name, error: (error as Error).message };
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

    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'create_multiple_variables',
    'completed',
    100,
    variables.length,
    successCount + failureCount,
    `Variable creation complete: ${successCount} successful, ${failureCount} failed`,
    { results }
  );

  const message = `✅ Created ${successCount} variables` + (failureCount > 0 ? ` (${failureCount} failed)` : '');
  figma.notify(message);

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalVariables: variables.length,
    results,
    commandId,
  };
}

/**
 * Set values for multiple variables across modes (batch)
 */
export async function setMultipleVariableValues(
  params: CommandParams['set_multiple_variable_values']
): Promise<{
  success: boolean;
  successCount: number;
  failureCount: number;
  totalUpdates: number;
  results: Array<{ success: boolean; variableId: string; modeId: string; error?: string }>;
  commandId: string;
}> {
  const { updates } = params;
  const commandId = generateCommandId();

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    throw new Error('Missing or invalid updates parameter');
  }

  sendProgressUpdate(
    commandId,
    'set_multiple_variable_values',
    'started',
    0,
    updates.length,
    0,
    `Starting to update ${updates.length} variable values`,
    { totalUpdates: updates.length }
  );

  const results: Array<{ success: boolean; variableId: string; modeId: string; error?: string }> = [];
  let successCount = 0;
  let failureCount = 0;

  // Process in chunks of 5
  const CHUNK_SIZE = 5;
  const chunks: Array<typeof updates> = [];
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    chunks.push(updates.slice(i, i + CHUNK_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    sendProgressUpdate(
      commandId,
      'set_multiple_variable_values',
      'in_progress',
      Math.round(5 + (chunkIndex / chunks.length) * 90),
      updates.length,
      successCount + failureCount,
      `Processing chunk ${chunkIndex + 1}/${chunks.length}`,
      { currentChunk: chunkIndex + 1, totalChunks: chunks.length }
    );

    const chunkPromises = chunk.map(async ({ variableId, modeId, value }) => {
      try {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (!variable) {
          return { success: false, variableId, modeId, error: `Variable not found: ${variableId}` };
        }

        const figmaValue = convertToFigmaValue(value, variable.resolvedType);
        variable.setValueForMode(modeId, figmaValue);

        return { success: true, variableId, modeId };
      } catch (error) {
        return { success: false, variableId, modeId, error: (error as Error).message };
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

    if (chunkIndex < chunks.length - 1) {
      await delay(100);
    }
  }

  sendProgressUpdate(
    commandId,
    'set_multiple_variable_values',
    'completed',
    100,
    updates.length,
    successCount + failureCount,
    `Variable value updates complete: ${successCount} successful, ${failureCount} failed`,
    { results }
  );

  const message = `✅ Updated ${successCount} variable values` + (failureCount > 0 ? ` (${failureCount} failed)` : '');
  figma.notify(message);

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    totalUpdates: updates.length,
    results,
    commandId,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert a VariableValueInput to Figma's expected format
 */
function convertToFigmaValue(
  value: VariableValueInput,
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
): RGB | RGBA | number | string | boolean {
  // Handle string values that may have been serialized during WebSocket transport
  if (typeof value === 'string' && (resolvedType === 'COLOR' || resolvedType === 'FLOAT')) {
    try { value = JSON.parse(value) as VariableValueInput; } catch (_e) { /* not JSON */ }
  }
  if (resolvedType === 'COLOR') {
    if (typeof value === 'object' && 'r' in value) {
      return {
        r: value.r,
        g: value.g,
        b: value.b,
        a: value.a ?? 1,
      };
    }
    throw new Error('COLOR variable requires an RGBA object');
  }

  if (resolvedType === 'FLOAT') {
    if (typeof value === 'number') {
      return value;
    }
    throw new Error('FLOAT variable requires a number');
  }

  if (resolvedType === 'STRING') {
    if (typeof value === 'string') {
      return value;
    }
    throw new Error('STRING variable requires a string');
  }

  if (resolvedType === 'BOOLEAN') {
    if (typeof value === 'boolean') {
      return value;
    }
    throw new Error('BOOLEAN variable requires a boolean');
  }

  return value as string | number | boolean;
}

/**
 * Serialize a variable value for JSON response
 */
function serializeVariableValue(value: unknown): unknown {
  if (isVariableAlias(value)) {
    return {
      type: 'VARIABLE_ALIAS',
      id: value.id,
    };
  }
  if (isRGBA(value)) {
    return {
      r: value.r,
      g: value.g,
      b: value.b,
      a: value.a,
    };
  }
  return value;
}

