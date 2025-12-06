/**
 * Tests for Layout API handlers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { figmaMock, resetFigmaMocks } from './setup';
import {
  moveNode,
  resizeNode,
  deleteNode,
  deleteMultipleNodes,
  cloneNode,
  getConstraints,
  setConstraints,
} from '../src/figma-plugin/handlers/layout';

// Mock layout node
interface MockLayoutNode {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  resize?: (w: number, h: number) => void;
  remove?: () => void;
  clone?: () => MockLayoutNode;
  constraints?: { horizontal: string; vertical: string };
}

// Create mock frame node
function createMockFrame(id: string, name: string, x = 0, y = 0, width = 100, height = 100): MockLayoutNode {
  const node: MockLayoutNode = {
    id,
    name,
    type: 'FRAME',
    x,
    y,
    width,
    height,
    resize: vi.fn((w: number, h: number) => {
      node.width = w;
      node.height = h;
    }),
    remove: vi.fn(),
    clone: vi.fn(() => createMockFrame(`${id}-clone`, `${name} copy`, x, y, width, height)),
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
  };
  return node;
}

describe('Layout API', () => {
  beforeEach(() => {
    resetFigmaMocks();
    // Mock viewport
    (globalThis as any).figma.viewport = {
      scrollAndZoomIntoView: vi.fn(),
    };
  });

  describe('moveNode', () => {
    it('should move node to new position', async () => {
      const node = createMockFrame('frame-1', 'Frame', 0, 0);
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await moveNode({
        nodeId: 'frame-1',
        x: 100,
        y: 200,
      });

      expect(result.id).toBe('frame-1');
      expect(result.name).toBe('Frame');
      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Moved: Frame to (100, 200)');
    });

    it('should handle negative coordinates', async () => {
      const node = createMockFrame('frame-1', 'Frame');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await moveNode({
        nodeId: 'frame-1',
        x: -50,
        y: -100,
      });

      expect(node.x).toBe(-50);
      expect(node.y).toBe(-100);
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        moveNode({
          nodeId: 'nonexistent',
          x: 0,
          y: 0,
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        moveNode({
          nodeId: '',
          x: 0,
          y: 0,
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });

    it('should throw error when x or y is missing', async () => {
      await expect(
        moveNode({
          nodeId: 'frame-1',
          x: undefined as any,
          y: 0,
        })
      ).rejects.toThrow('Missing x or y parameters');
    });

    it('should throw error when node does not support position', async () => {
      const node = { id: 'node-1', name: 'Node', type: 'SOME_TYPE' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await expect(
        moveNode({
          nodeId: 'node-1',
          x: 0,
          y: 0,
        })
      ).rejects.toThrow();
    });
  });

  describe('resizeNode', () => {
    it('should resize node to new dimensions', async () => {
      const node = createMockFrame('frame-1', 'Frame', 0, 0, 100, 100);
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await resizeNode({
        nodeId: 'frame-1',
        width: 200,
        height: 300,
      });

      expect(result.id).toBe('frame-1');
      expect(result.width).toBe(200);
      expect(result.height).toBe(300);
      expect(node.resize).toHaveBeenCalledWith(200, 300);
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Resized: Frame to 200×300');
    });

    it('should handle small dimensions', async () => {
      const node = createMockFrame('frame-1', 'Frame');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await resizeNode({
        nodeId: 'frame-1',
        width: 1,
        height: 1,
      });

      expect(node.resize).toHaveBeenCalledWith(1, 1);
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        resizeNode({
          nodeId: 'nonexistent',
          width: 100,
          height: 100,
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        resizeNode({
          nodeId: '',
          width: 100,
          height: 100,
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });

    it('should throw error when width or height is missing', async () => {
      await expect(
        resizeNode({
          nodeId: 'frame-1',
          width: undefined as any,
          height: 100,
        })
      ).rejects.toThrow('Missing width or height parameters');
    });

    it('should throw error when node does not support resizing', async () => {
      const node = { id: 'node-1', name: 'Node', type: 'GROUP' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await expect(
        resizeNode({
          nodeId: 'node-1',
          width: 100,
          height: 100,
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteNode', () => {
    it('should delete a node', async () => {
      const node = createMockFrame('frame-1', 'Frame to Delete');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await deleteNode({
        nodeId: 'frame-1',
      });

      expect(result.id).toBe('frame-1');
      expect(result.name).toBe('Frame to Delete');
      expect(result.type).toBe('FRAME');
      expect(node.remove).toHaveBeenCalled();
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Deleted: Frame to Delete');
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        deleteNode({
          nodeId: 'nonexistent',
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        deleteNode({
          nodeId: '',
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });
  });

  describe('deleteMultipleNodes', () => {
    it('should delete multiple nodes', async () => {
      const node1 = createMockFrame('frame-1', 'Frame 1');
      const node2 = createMockFrame('frame-2', 'Frame 2');

      figmaMock.getNodeByIdAsync.mockImplementation((id: string) => {
        if (id === 'frame-1') return Promise.resolve(node1);
        if (id === 'frame-2') return Promise.resolve(node2);
        return Promise.resolve(null);
      });

      const result = await deleteMultipleNodes({
        nodeIds: ['frame-1', 'frame-2'],
      });

      expect(result.success).toBe(true);
      expect(result.nodesDeleted).toBe(2);
      expect(result.nodesFailed).toBe(0);
      expect(node1.remove).toHaveBeenCalled();
      expect(node2.remove).toHaveBeenCalled();
    });

    it('should handle partial failures', async () => {
      const node1 = createMockFrame('frame-1', 'Frame 1');

      figmaMock.getNodeByIdAsync.mockImplementation((id: string) => {
        if (id === 'frame-1') return Promise.resolve(node1);
        return Promise.resolve(null);
      });

      const result = await deleteMultipleNodes({
        nodeIds: ['frame-1', 'nonexistent'],
      });

      expect(result.success).toBe(true);
      expect(result.nodesDeleted).toBe(1);
      expect(result.nodesFailed).toBe(1);
    });

    it('should throw error when nodeIds is empty', async () => {
      await expect(
        deleteMultipleNodes({
          nodeIds: [],
        })
      ).rejects.toThrow('Missing or invalid nodeIds parameter');
    });

    it('should throw error when nodeIds is missing', async () => {
      await expect(
        deleteMultipleNodes({
          nodeIds: undefined as any,
        })
      ).rejects.toThrow('Missing or invalid nodeIds parameter');
    });
  });

  describe('cloneNode', () => {
    it('should clone a node', async () => {
      const node = createMockFrame('frame-1', 'Original', 100, 100);
      const clonedNode = createMockFrame('frame-1-clone', 'Original copy', 100, 100);
      node.clone = vi.fn(() => clonedNode);
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await cloneNode({
        nodeId: 'frame-1',
      });

      expect(result.id).toBe('frame-1-clone');
      expect(result.name).toBe('Original copy');
      expect(node.clone).toHaveBeenCalled();
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Cloned: Original copy');
    });

    it('should clone and position at specified coordinates', async () => {
      const node = createMockFrame('frame-1', 'Original', 100, 100);
      const clonedNode = createMockFrame('frame-1-clone', 'Original copy', 100, 100);
      node.clone = vi.fn(() => clonedNode);
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await cloneNode({
        nodeId: 'frame-1',
        x: 200,
        y: 300,
      });

      expect(clonedNode.x).toBe(200);
      expect(clonedNode.y).toBe(300);
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        cloneNode({
          nodeId: 'nonexistent',
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        cloneNode({
          nodeId: '',
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });
  });

  describe('getConstraints', () => {
    it('should get node constraints', async () => {
      const node = createMockFrame('frame-1', 'Frame');
      node.constraints = { horizontal: 'CENTER', vertical: 'MAX' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await getConstraints({
        nodeId: 'frame-1',
      });

      expect(result.nodeId).toBe('frame-1');
      expect(result.nodeName).toBe('Frame');
      expect(result.horizontal).toBe('CENTER');
      expect(result.vertical).toBe('MAX');
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        getConstraints({
          nodeId: 'nonexistent',
        })
      ).rejects.toThrow();
    });

    it('should throw error when node does not support constraints', async () => {
      const node = { id: 'node-1', name: 'Node', type: 'SOME_TYPE' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await expect(
        getConstraints({
          nodeId: 'node-1',
        })
      ).rejects.toThrow();
    });
  });

  describe('setConstraints', () => {
    it('should set node constraints', async () => {
      const node = createMockFrame('frame-1', 'Frame');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await setConstraints({
        nodeId: 'frame-1',
        horizontal: 'STRETCH',
        vertical: 'SCALE',
      });

      expect(result.nodeId).toBe('frame-1');
      expect(result.nodeName).toBe('Frame');
      expect(result.horizontal).toBe('STRETCH');
      expect(result.vertical).toBe('SCALE');
      expect(node.constraints).toEqual({
        horizontal: 'STRETCH',
        vertical: 'SCALE',
      });
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Updated constraints: Frame');
    });

    it('should set only horizontal constraint', async () => {
      const node = createMockFrame('frame-1', 'Frame');
      node.constraints = { horizontal: 'MIN', vertical: 'MIN' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setConstraints({
        nodeId: 'frame-1',
        horizontal: 'MAX',
      });

      expect(node.constraints!.horizontal).toBe('MAX');
      expect(node.constraints!.vertical).toBe('MIN'); // unchanged
    });

    it('should set only vertical constraint', async () => {
      const node = createMockFrame('frame-1', 'Frame');
      node.constraints = { horizontal: 'MIN', vertical: 'MIN' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setConstraints({
        nodeId: 'frame-1',
        vertical: 'CENTER',
      });

      expect(node.constraints!.horizontal).toBe('MIN'); // unchanged
      expect(node.constraints!.vertical).toBe('CENTER');
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        setConstraints({
          nodeId: 'nonexistent',
          horizontal: 'MIN',
        })
      ).rejects.toThrow();
    });

    it('should throw error when no constraints provided', async () => {
      await expect(
        setConstraints({
          nodeId: 'frame-1',
        })
      ).rejects.toThrow('At least one constraint (horizontal or vertical) must be provided');
    });

    it('should throw error when node does not support constraints', async () => {
      const node = { id: 'node-1', name: 'Node', type: 'SOME_TYPE' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await expect(
        setConstraints({
          nodeId: 'node-1',
          horizontal: 'MIN',
        })
      ).rejects.toThrow();
    });
  });
});

