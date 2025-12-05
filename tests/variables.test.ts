/**
 * Tests for Variables API handlers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  figmaMock,
  resetFigmaMocks,
  mockCollections,
  mockVariables,
  createMockVariable,
  createMockCollection,
} from './setup';
import {
  getLocalVariableCollections,
  getLocalVariables,
  createVariableCollection,
  createVariable,
  setVariableValue,
  deleteVariable,
  getBoundVariables,
  bindVariable,
  unbindVariable,
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

  // =============================================================================
  // Write Operations Tests
  // =============================================================================

  describe('createVariableCollection', () => {
    it('should create a collection with default mode', async () => {
      const result = await createVariableCollection({ name: 'NewCollection' });

      expect(result.name).toBe('NewCollection');
      expect(result.id).toBeDefined();
      expect(result.modes).toHaveLength(1);
      expect(figmaMock.variables.createVariableCollection).toHaveBeenCalledWith('NewCollection');
    });

    it('should create a collection with custom modes', async () => {
      const result = await createVariableCollection({
        name: 'Themes',
        modes: ['Light', 'Dark', 'High Contrast'],
      });

      expect(result.name).toBe('Themes');
      expect(result.modes).toHaveLength(3);
      expect(result.modes[0].name).toBe('Light');
    });

    it('should throw error when name is missing', async () => {
      // @ts-expect-error - testing missing param
      await expect(createVariableCollection({})).rejects.toThrow('Missing name parameter');
    });
  });

  describe('createVariable', () => {
    beforeEach(() => {
      // Mock collection exists
      figmaMock.variables.getVariableCollectionByIdAsync.mockResolvedValue({
        ...mockCollections[0],
        defaultModeId: 'mode-light',
      });
    });

    it('should create a COLOR variable', async () => {
      const result = await createVariable({
        collectionId: 'collection-1',
        name: 'brand/primary',
        resolvedType: 'COLOR',
        value: { r: 0.5, g: 0.2, b: 0.8, a: 1 },
      });

      expect(result.name).toBe('brand/primary');
      expect(result.resolvedType).toBe('COLOR');
      expect(result.variableCollectionId).toBe('collection-1');
      expect(figmaMock.variables.createVariable).toHaveBeenCalledWith(
        'brand/primary',
        'collection-1',
        'COLOR'
      );
    });

    it('should create a FLOAT variable', async () => {
      const result = await createVariable({
        collectionId: 'collection-1',
        name: 'spacing/lg',
        resolvedType: 'FLOAT',
        value: 24,
      });

      expect(result.name).toBe('spacing/lg');
      expect(result.resolvedType).toBe('FLOAT');
    });

    it('should create a STRING variable', async () => {
      const result = await createVariable({
        collectionId: 'collection-1',
        name: 'text/label',
        resolvedType: 'STRING',
        value: 'Click here',
      });

      expect(result.name).toBe('text/label');
      expect(result.resolvedType).toBe('STRING');
    });

    it('should create a BOOLEAN variable', async () => {
      const result = await createVariable({
        collectionId: 'collection-1',
        name: 'feature/enabled',
        resolvedType: 'BOOLEAN',
        value: true,
      });

      expect(result.name).toBe('feature/enabled');
      expect(result.resolvedType).toBe('BOOLEAN');
    });

    it('should throw error when collection does not exist', async () => {
      figmaMock.variables.getVariableCollectionByIdAsync.mockResolvedValue(null);

      await expect(
        createVariable({
          collectionId: 'non-existent',
          name: 'test',
          resolvedType: 'FLOAT',
        })
      ).rejects.toThrow('Collection not found');
    });

    it('should throw error when required params are missing', async () => {
      // @ts-expect-error - testing missing param
      await expect(createVariable({})).rejects.toThrow('Missing collectionId parameter');

      await expect(
        // @ts-expect-error - testing missing param
        createVariable({ collectionId: 'collection-1' })
      ).rejects.toThrow('Missing name parameter');
    });
  });

  describe('setVariableValue', () => {
    it('should update variable value for a mode', async () => {
      const mockVar = createMockVariable('test', 'collection-1', 'COLOR');
      figmaMock.variables.getVariableByIdAsync.mockResolvedValue(mockVar);

      const result = await setVariableValue({
        variableId: mockVar.id,
        modeId: 'mode-light',
        value: { r: 1, g: 0, b: 0, a: 1 },
      });

      expect(mockVar.setValueForMode).toHaveBeenCalledWith('mode-light', {
        r: 1,
        g: 0,
        b: 0,
        a: 1,
      });
      expect(result.id).toBe(mockVar.id);
    });

    it('should throw error when variable not found', async () => {
      figmaMock.variables.getVariableByIdAsync.mockResolvedValue(null);

      await expect(
        setVariableValue({
          variableId: 'non-existent',
          modeId: 'mode-light',
          value: 42,
        })
      ).rejects.toThrow('Variable not found');
    });
  });

  describe('deleteVariable', () => {
    it('should delete a variable', async () => {
      const mockVar = createMockVariable('toDelete', 'collection-1', 'FLOAT');
      figmaMock.variables.getVariableByIdAsync.mockResolvedValue(mockVar);

      const result = await deleteVariable({ variableId: mockVar.id });

      expect(mockVar.remove).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.variableId).toBe(mockVar.id);
    });

    it('should throw error when variable not found', async () => {
      figmaMock.variables.getVariableByIdAsync.mockResolvedValue(null);

      await expect(deleteVariable({ variableId: 'non-existent' })).rejects.toThrow(
        'Variable not found'
      );
    });
  });

  describe('getBoundVariables', () => {
    it('should return bound variables for a node', async () => {
      const mockNode = {
        id: 'node-1',
        type: 'FRAME',
        boundVariables: {
          fills: [{ id: 'var-1' }],
          cornerRadius: { id: 'var-3' },
        },
      };
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockNode);
      figmaMock.variables.getVariableByIdAsync.mockImplementation((id: string) =>
        Promise.resolve(mockVariables.find((v) => v.id === id) || null)
      );

      const result = await getBoundVariables({ nodeId: 'node-1' });

      expect(result.nodeId).toBe('node-1');
      expect(result.boundVariables.fills).toHaveLength(1);
      expect(result.boundVariables.fills[0].variableId).toBe('var-1');
    });

    it('should return empty object for node with no bindings', async () => {
      const mockNode = {
        id: 'node-2',
        type: 'RECTANGLE',
        boundVariables: {},
      };
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockNode);

      const result = await getBoundVariables({ nodeId: 'node-2' });

      expect(result.boundVariables).toEqual({});
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(getBoundVariables({ nodeId: 'non-existent' })).rejects.toThrow(
        'Node not found'
      );
    });
  });

  describe('bindVariable', () => {
    it('should bind a variable to a node field', async () => {
      const mockNode = {
        id: 'node-1',
        type: 'FRAME',
        setBoundVariable: vi.fn(),
      };
      const mockVar = mockVariables[0];
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockNode);
      figmaMock.variables.getVariableByIdAsync.mockResolvedValue(mockVar);

      const result = await bindVariable({
        nodeId: 'node-1',
        field: 'fills',
        variableId: 'var-1',
      });

      expect(mockNode.setBoundVariable).toHaveBeenCalledWith('fills', mockVar);
      expect(result.success).toBe(true);
      expect(result.nodeId).toBe('node-1');
      expect(result.field).toBe('fills');
      expect(result.variableId).toBe('var-1');
    });

    it('should throw error when node does not support binding', async () => {
      const mockNode = {
        id: 'node-1',
        type: 'PAGE',
        // No setBoundVariable method
      };
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockNode);
      figmaMock.variables.getVariableByIdAsync.mockResolvedValue(mockVariables[0]);

      await expect(
        bindVariable({
          nodeId: 'node-1',
          field: 'fills',
          variableId: 'var-1',
        })
      ).rejects.toThrow('does not support variable binding');
    });
  });

  describe('unbindVariable', () => {
    it('should unbind a variable from a node field', async () => {
      const mockNode = {
        id: 'node-1',
        type: 'FRAME',
        setBoundVariable: vi.fn(),
      };
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockNode);

      const result = await unbindVariable({
        nodeId: 'node-1',
        field: 'fills',
      });

      expect(mockNode.setBoundVariable).toHaveBeenCalledWith('fills', null);
      expect(result.success).toBe(true);
      expect(result.nodeId).toBe('node-1');
      expect(result.field).toBe('fills');
    });
  });
});

