/**
 * Tests for Styling API handlers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { figmaMock, resetFigmaMocks } from './setup';
import {
  setFillColor,
  setStrokeColor,
  setCornerRadius,
  setOpacity,
} from '../src/figma-plugin/handlers/styling';

// Mock styled node
interface MockStyledNode {
  id: string;
  name: string;
  type: string;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  opacity?: number;
}

// Create mock rectangle node
function createMockRectangle(id: string, name: string): MockStyledNode {
  return {
    id,
    name,
    type: 'RECTANGLE',
    fills: [],
    strokes: [],
    strokeWeight: 0,
    cornerRadius: 0,
    topLeftRadius: 0,
    topRightRadius: 0,
    bottomLeftRadius: 0,
    bottomRightRadius: 0,
    opacity: 1,
  };
}

describe('Styling API', () => {
  beforeEach(() => {
    resetFigmaMocks();
    // Mock viewport
    (globalThis as any).figma.viewport = {
      scrollAndZoomIntoView: vi.fn(),
    };
  });

  describe('setFillColor', () => {
    it('should set fill color on a node', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await setFillColor({
        nodeId: 'rect-1',
        color: { r: 1, g: 0, b: 0, a: 1 },
      });

      expect(result.id).toBe('rect-1');
      expect(result.name).toBe('Rectangle');
      expect(node.fills).toHaveLength(1);
      expect(node.fills![0]).toEqual({
        type: 'SOLID',
        color: { r: 1, g: 0, b: 0 },
        opacity: 1,
      });
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Updated fill color: Rectangle');
    });

    it('should default alpha to 1 if not provided', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setFillColor({
        nodeId: 'rect-1',
        color: { r: 0.5, g: 0.5, b: 0.5 },
      });

      expect(node.fills![0].opacity).toBe(1);
    });

    it('should handle semi-transparent colors', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setFillColor({
        nodeId: 'rect-1',
        color: { r: 1, g: 0, b: 0, a: 0.5 },
      });

      expect(node.fills![0].opacity).toBe(0.5);
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        setFillColor({
          nodeId: 'nonexistent',
          color: { r: 1, g: 0, b: 0 },
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        setFillColor({
          nodeId: '',
          color: { r: 1, g: 0, b: 0 },
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });

    it('should throw error when color is missing', async () => {
      await expect(
        setFillColor({
          nodeId: 'rect-1',
          color: undefined as any,
        })
      ).rejects.toThrow('Missing color parameter');
    });

    it('should throw error when node does not support fills', async () => {
      const groupNode = { id: 'group-1', name: 'Group', type: 'GROUP' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(groupNode);

      await expect(
        setFillColor({
          nodeId: 'group-1',
          color: { r: 1, g: 0, b: 0 },
        })
      ).rejects.toThrow();
    });
  });

  describe('setStrokeColor', () => {
    it('should set stroke color and weight on a node', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await setStrokeColor({
        nodeId: 'rect-1',
        color: { r: 0, g: 0, b: 1, a: 1 },
        weight: 2,
      });

      expect(result.id).toBe('rect-1');
      expect(result.strokeWeight).toBe(2);
      expect(node.strokes).toHaveLength(1);
      expect(node.strokes![0]).toEqual({
        type: 'SOLID',
        color: { r: 0, g: 0, b: 1 },
        opacity: 1,
      });
      expect(node.strokeWeight).toBe(2);
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Updated stroke: Rectangle');
    });

    it('should default weight to 1 if not provided', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setStrokeColor({
        nodeId: 'rect-1',
        color: { r: 0, g: 0, b: 0 },
      });

      expect(node.strokeWeight).toBe(1);
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        setStrokeColor({
          nodeId: 'nonexistent',
          color: { r: 0, g: 0, b: 0 },
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        setStrokeColor({
          nodeId: '',
          color: { r: 0, g: 0, b: 0 },
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });

    it('should throw error when color is missing', async () => {
      await expect(
        setStrokeColor({
          nodeId: 'rect-1',
          color: undefined as any,
        })
      ).rejects.toThrow('Missing color parameter');
    });
  });

  describe('setCornerRadius', () => {
    it('should set uniform corner radius', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await setCornerRadius({
        nodeId: 'rect-1',
        radius: 8,
      });

      expect(result.id).toBe('rect-1');
      expect(node.cornerRadius).toBe(8);
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Updated corner radius: Rectangle');
    });

    it('should set individual corner radii', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setCornerRadius({
        nodeId: 'rect-1',
        topLeftRadius: 4,
        topRightRadius: 8,
        bottomRightRadius: 12,
        bottomLeftRadius: 16,
      });

      expect(node.topLeftRadius).toBe(4);
      expect(node.topRightRadius).toBe(8);
      expect(node.bottomRightRadius).toBe(12);
      expect(node.bottomLeftRadius).toBe(16);
    });

    it('should set only specified corner radii', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      node.topLeftRadius = 10;
      node.topRightRadius = 10;
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setCornerRadius({
        nodeId: 'rect-1',
        topLeftRadius: 20,
      });

      expect(node.topLeftRadius).toBe(20);
      expect(node.topRightRadius).toBe(10); // unchanged
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        setCornerRadius({
          nodeId: 'nonexistent',
          radius: 8,
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        setCornerRadius({
          nodeId: '',
          radius: 8,
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });

    it('should throw error when no radius parameter provided', async () => {
      await expect(
        setCornerRadius({
          nodeId: 'rect-1',
        })
      ).rejects.toThrow('Missing radius parameter');
    });

    it('should throw error when node does not support corner radius', async () => {
      const groupNode = { id: 'group-1', name: 'Group', type: 'GROUP' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(groupNode);

      await expect(
        setCornerRadius({
          nodeId: 'group-1',
          radius: 8,
        })
      ).rejects.toThrow();
    });
  });

  describe('setOpacity', () => {
    it('should set opacity on a node', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      const result = await setOpacity({
        nodeId: 'rect-1',
        opacity: 0.5,
      });

      expect(result.id).toBe('rect-1');
      expect(node.opacity).toBe(0.5);
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Updated opacity: Rectangle (50%)');
    });

    it('should accept opacity of 0 (fully transparent)', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setOpacity({
        nodeId: 'rect-1',
        opacity: 0,
      });

      expect(node.opacity).toBe(0);
    });

    it('should accept opacity of 1 (fully opaque)', async () => {
      const node = createMockRectangle('rect-1', 'Rectangle');
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await setOpacity({
        nodeId: 'rect-1',
        opacity: 1,
      });

      expect(node.opacity).toBe(1);
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(
        setOpacity({
          nodeId: 'nonexistent',
          opacity: 0.5,
        })
      ).rejects.toThrow();
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(
        setOpacity({
          nodeId: '',
          opacity: 0.5,
        })
      ).rejects.toThrow('Missing nodeId parameter');
    });

    it('should throw error when opacity is missing', async () => {
      await expect(
        setOpacity({
          nodeId: 'rect-1',
          opacity: undefined as any,
        })
      ).rejects.toThrow('Missing opacity parameter');
    });

    it('should throw error when node does not support opacity', async () => {
      // All scene nodes support opacity, but let's test with a minimal node without opacity
      const node = { id: 'node-1', name: 'Node', type: 'SOME_TYPE' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(node);

      await expect(
        setOpacity({
          nodeId: 'node-1',
          opacity: 0.5,
        })
      ).rejects.toThrow();
    });
  });
});

