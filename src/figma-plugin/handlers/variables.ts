/**
 * Variable handlers for design tokens (Figma Variables API)
 */

import type {
  CommandParams,
  VariableCollectionInfo,
  VariableInfo,
  VariableModeInfo,
} from '../../shared/types';

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

