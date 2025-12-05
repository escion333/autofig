/**
 * Tests for Variables API handlers
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  figmaMock,
  resetFigmaMocks,
  mockCollections,
  mockVariables,
} from './setup';
import {
  getLocalVariableCollections,
  getLocalVariables,
} from '../src/figma-plugin/handlers/variables';

describe('Variables API', () => {
  beforeEach(() => {
    resetFigmaMocks();
  });

  describe('getLocalVariableCollections', () => {
    it('should return all variable collections', async () => {
      const result = await getLocalVariableCollections();

      expect(result.count).toBe(2);
      expect(result.collections).toHaveLength(2);
      expect(figmaMock.variables.getLocalVariableCollectionsAsync).toHaveBeenCalledTimes(1);
    });

    it('should return collection details correctly', async () => {
      const result = await getLocalVariableCollections();

      const colorsCollection = result.collections.find((c) => c.name === 'Colors');
      expect(colorsCollection).toBeDefined();
      expect(colorsCollection?.id).toBe('collection-1');
      expect(colorsCollection?.modes).toHaveLength(2);
      expect(colorsCollection?.modes[0]).toEqual({ modeId: 'mode-light', name: 'Light' });
      expect(colorsCollection?.modes[1]).toEqual({ modeId: 'mode-dark', name: 'Dark' });
      expect(colorsCollection?.defaultModeId).toBe('mode-light');
      expect(colorsCollection?.variableIds).toContain('var-1');
    });

    it('should return empty array when no collections exist', async () => {
      figmaMock.variables.getLocalVariableCollectionsAsync.mockResolvedValue([]);

      const result = await getLocalVariableCollections();

      expect(result.count).toBe(0);
      expect(result.collections).toEqual([]);
    });

    it('should include hiddenFromPublishing flag', async () => {
      const result = await getLocalVariableCollections();

      result.collections.forEach((collection) => {
        expect(typeof collection.hiddenFromPublishing).toBe('boolean');
      });
    });
  });

  describe('getLocalVariables', () => {
    it('should return all variables when no filter is provided', async () => {
      const result = await getLocalVariables({});

      expect(result.count).toBe(4);
      expect(result.variables).toHaveLength(4);
      expect(figmaMock.variables.getLocalVariablesAsync).toHaveBeenCalledTimes(1);
    });

    it('should filter variables by collection ID', async () => {
      const result = await getLocalVariables({ collectionId: 'collection-1' });

      expect(result.count).toBe(2);
      expect(result.variables).toHaveLength(2);
      result.variables.forEach((v) => {
        expect(v.variableCollectionId).toBe('collection-1');
      });
    });

    it('should return empty array when filtering by non-existent collection', async () => {
      const result = await getLocalVariables({ collectionId: 'non-existent' });

      expect(result.count).toBe(0);
      expect(result.variables).toEqual([]);
    });

    it('should correctly serialize COLOR variables', async () => {
      const result = await getLocalVariables({ collectionId: 'collection-1' });

      const primaryColor = result.variables.find((v) => v.name === 'primary/500');
      expect(primaryColor).toBeDefined();
      expect(primaryColor?.resolvedType).toBe('COLOR');
      
      const lightValue = primaryColor?.valuesByMode['mode-light'] as { r: number; g: number; b: number; a: number };
      expect(lightValue.r).toBe(0.2);
      expect(lightValue.g).toBe(0.4);
      expect(lightValue.b).toBe(1);
      expect(lightValue.a).toBe(1);
    });

    it('should correctly serialize FLOAT variables', async () => {
      const result = await getLocalVariables({ collectionId: 'collection-2' });

      const spacingSm = result.variables.find((v) => v.name === 'spacing/sm');
      expect(spacingSm).toBeDefined();
      expect(spacingSm?.resolvedType).toBe('FLOAT');
      expect(spacingSm?.valuesByMode['mode-default']).toBe(8);
    });

    it('should include variable metadata', async () => {
      const result = await getLocalVariables({});

      const variable = result.variables[0];
      expect(variable.id).toBeDefined();
      expect(variable.name).toBeDefined();
      expect(variable.key).toBeDefined();
      expect(variable.variableCollectionId).toBeDefined();
      expect(variable.resolvedType).toBeDefined();
      expect(variable.scopes).toBeDefined();
      expect(Array.isArray(variable.scopes)).toBe(true);
      expect(variable.codeSyntax).toBeDefined();
      expect(typeof variable.codeSyntax).toBe('object');
    });

    it('should handle undefined params', async () => {
      // @ts-expect-error - testing undefined params
      const result = await getLocalVariables(undefined);

      expect(result.count).toBe(4);
      expect(result.variables).toHaveLength(4);
    });
  });

  describe('Variable value serialization', () => {
    it('should serialize variable aliases correctly', async () => {
      // Add a variable with an alias
      const variableWithAlias = {
        ...mockVariables[0],
        id: 'var-alias',
        name: 'aliased/color',
        valuesByMode: {
          'mode-light': { type: 'VARIABLE_ALIAS', id: 'var-1' },
        },
      };

      figmaMock.variables.getLocalVariablesAsync.mockResolvedValue([
        ...mockVariables,
        variableWithAlias,
      ]);

      const result = await getLocalVariables({});

      const aliasedVar = result.variables.find((v) => v.name === 'aliased/color');
      expect(aliasedVar).toBeDefined();
      
      const aliasValue = aliasedVar?.valuesByMode['mode-light'] as { type: string; id: string };
      expect(aliasValue.type).toBe('VARIABLE_ALIAS');
      expect(aliasValue.id).toBe('var-1');
    });
  });
});

