/**
 * Tests for Component Creation handlers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { figmaMock, resetFigmaMocks } from './setup';
import {
  createComponent,
  createComponentSet,
  getComponentProperties,
  addComponentProperty,
  setComponentPropertyValue,
} from '../src/figma-plugin/handlers/components';

// Mock component data
const mockComponentNode = {
  id: 'component-1',
  name: 'Button',
  key: 'key-component-1',
  type: 'COMPONENT',
  description: 'A button component',
  documentationLinks: [],
  remote: false,
  componentPropertyDefinitions: {
    'showIcon': {
      type: 'BOOLEAN',
      defaultValue: true,
    },
    'label': {
      type: 'TEXT',
      defaultValue: 'Click me',
    },
  },
};

const mockComponentSetNode = {
  id: 'component-set-1',
  name: 'Button',
  key: 'key-component-set-1',
  type: 'COMPONENT_SET',
  description: 'Button variants',
  variantGroupProperties: {
    'Size': { values: ['Small', 'Medium', 'Large'] },
    'State': { values: ['Default', 'Hover', 'Active'] },
  },
  children: [
    { id: 'variant-1' },
    { id: 'variant-2' },
    { id: 'variant-3' },
  ],
  componentPropertyDefinitions: {},
};

const mockFrameNode = {
  id: 'frame-1',
  name: 'Frame',
  type: 'FRAME',
};

const mockInstanceNode = {
  id: 'instance-1',
  name: 'Button Instance',
  type: 'INSTANCE',
  setProperties: vi.fn(),
};

describe('Component Creation API', () => {
  beforeEach(() => {
    resetFigmaMocks();
    // Reset component-specific mocks
    vi.clearAllMocks();
  });

  describe('createComponent', () => {
    it('should convert a frame to a component', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockFrameNode);
      
      const createdComponent = {
        id: 'new-component-1',
        name: 'Frame',
        key: 'key-new-component-1',
        type: 'COMPONENT',
        description: '',
        documentationLinks: [],
        remote: false,
      };
      
      (figmaMock as unknown as { createComponentFromNode: ReturnType<typeof vi.fn> }).createComponentFromNode = 
        vi.fn().mockReturnValue(createdComponent);

      // We need to mock figma.createComponentFromNode
      (globalThis as unknown as { figma: typeof figmaMock }).figma.createComponentFromNode = 
        vi.fn().mockReturnValue(createdComponent);

      const result = await createComponent({ nodeId: 'frame-1' });

      expect(result.id).toBe('new-component-1');
      expect(result.type).toBe('COMPONENT');
    });

    it('should rename component if name provided', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockFrameNode);
      
      const createdComponent = {
        id: 'new-component-1',
        name: 'Custom Name',
        key: 'key-new-component-1',
        type: 'COMPONENT',
        description: '',
        documentationLinks: [],
        remote: false,
      };
      
      (globalThis as unknown as { figma: typeof figmaMock }).figma.createComponentFromNode = 
        vi.fn().mockReturnValue(createdComponent);

      const result = await createComponent({ nodeId: 'frame-1', name: 'Custom Name' });

      expect(result.name).toBe('Custom Name');
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(createComponent({ nodeId: 'non-existent' }))
        .rejects.toThrow('Node not found');
    });

    it('should throw error when nodeId is missing', async () => {
      // @ts-expect-error - testing missing param
      await expect(createComponent({})).rejects.toThrow('Missing nodeId parameter');
    });
  });

  describe('createComponentSet', () => {
    it('should combine components into a variant set', async () => {
      const component1 = { ...mockComponentNode, id: 'comp-1', name: 'Button/Size=Small' };
      const component2 = { ...mockComponentNode, id: 'comp-2', name: 'Button/Size=Large' };
      
      figmaMock.getNodeByIdAsync
        .mockResolvedValueOnce(component1)
        .mockResolvedValueOnce(component2);

      const createdSet = {
        id: 'set-1',
        name: 'Button',
        key: 'key-set-1',
        type: 'COMPONENT_SET',
        description: '',
        variantGroupProperties: {
          'Size': { values: ['Small', 'Large'] },
        },
        children: [component1, component2],
      };

      (globalThis as unknown as { figma: typeof figmaMock }).figma.combineAsVariants = 
        vi.fn().mockReturnValue(createdSet);

      const result = await createComponentSet({ 
        componentIds: ['comp-1', 'comp-2'],
        name: 'Button',
      });

      expect(result.type).toBe('COMPONENT_SET');
      expect(result.variantGroupProperties).toHaveProperty('Size');
    });

    it('should throw error when less than 2 components provided', async () => {
      await expect(createComponentSet({ componentIds: ['comp-1'] }))
        .rejects.toThrow('At least 2 components are required');
    });

    it('should throw error when componentIds is empty', async () => {
      await expect(createComponentSet({ componentIds: [] }))
        .rejects.toThrow('Missing componentIds parameter');
    });

    it('should throw error when node is not a component', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockFrameNode);

      await expect(createComponentSet({ componentIds: ['frame-1', 'frame-2'] }))
        .rejects.toThrow('not a component');
    });
  });

  describe('getComponentProperties', () => {
    it('should return component properties', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockComponentNode);

      const result = await getComponentProperties({ componentId: 'component-1' });

      expect(result.componentId).toBe('component-1');
      expect(result.componentType).toBe('COMPONENT');
      expect(result.properties).toHaveLength(2);
      expect(result.properties[0].name).toBe('showIcon');
      expect(result.properties[0].type).toBe('BOOLEAN');
    });

    it('should return component set properties', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockComponentSetNode);

      const result = await getComponentProperties({ componentId: 'component-set-1' });

      expect(result.componentType).toBe('COMPONENT_SET');
    });

    it('should throw error when node is not a component', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockFrameNode);

      await expect(getComponentProperties({ componentId: 'frame-1' }))
        .rejects.toThrow('not a component or component set');
    });

    it('should throw error when componentId is missing', async () => {
      // @ts-expect-error - testing missing param
      await expect(getComponentProperties({})).rejects.toThrow('Missing componentId parameter');
    });
  });

  describe('addComponentProperty', () => {
    it('should add a BOOLEAN property', async () => {
      const componentWithAdd = {
        ...mockComponentNode,
        addComponentProperty: vi.fn(),
      };
      figmaMock.getNodeByIdAsync.mockResolvedValue(componentWithAdd);

      const result = await addComponentProperty({
        componentId: 'component-1',
        propertyName: 'isDisabled',
        propertyType: 'BOOLEAN',
        defaultValue: false,
      });

      expect(componentWithAdd.addComponentProperty).toHaveBeenCalledWith('isDisabled', 'BOOLEAN', false);
      expect(result.success).toBe(true);
      expect(result.propertyName).toBe('isDisabled');
    });

    it('should add a TEXT property', async () => {
      const componentWithAdd = {
        ...mockComponentNode,
        addComponentProperty: vi.fn(),
      };
      figmaMock.getNodeByIdAsync.mockResolvedValue(componentWithAdd);

      const result = await addComponentProperty({
        componentId: 'component-1',
        propertyName: 'buttonLabel',
        propertyType: 'TEXT',
        defaultValue: 'Submit',
      });

      expect(componentWithAdd.addComponentProperty).toHaveBeenCalledWith('buttonLabel', 'TEXT', 'Submit');
      expect(result.success).toBe(true);
    });

    it('should throw error when node is not a component', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockFrameNode);

      await expect(addComponentProperty({
        componentId: 'frame-1',
        propertyName: 'test',
        propertyType: 'BOOLEAN',
        defaultValue: true,
      })).rejects.toThrow('not a component or component set');
    });
  });

  describe('setComponentPropertyValue', () => {
    it('should set property value on instance', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockInstanceNode);

      const result = await setComponentPropertyValue({
        instanceId: 'instance-1',
        propertyName: 'showIcon',
        value: false,
      });

      expect(mockInstanceNode.setProperties).toHaveBeenCalledWith({ showIcon: false });
      expect(result.success).toBe(true);
      expect(result.propertyName).toBe('showIcon');
      expect(result.value).toBe(false);
    });

    it('should set TEXT property value', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockInstanceNode);

      const result = await setComponentPropertyValue({
        instanceId: 'instance-1',
        propertyName: 'label',
        value: 'New Label',
      });

      expect(mockInstanceNode.setProperties).toHaveBeenCalledWith({ label: 'New Label' });
      expect(result.success).toBe(true);
    });

    it('should throw error when node is not an instance', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(mockFrameNode);

      await expect(setComponentPropertyValue({
        instanceId: 'frame-1',
        propertyName: 'test',
        value: true,
      })).rejects.toThrow('not an instance');
    });

    it('should throw error when instanceId is missing', async () => {
      // @ts-expect-error - testing missing param
      await expect(setComponentPropertyValue({})).rejects.toThrow('Missing instanceId parameter');
    });
  });
});

