/**
 * Tests for Text API handlers
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { figmaMock, resetFigmaMocks } from './setup';
import {
  setTextContent,
  setMultipleTextContents,
  scanTextNodes,
} from '../src/figma-plugin/handlers/text';

// Mock text node
interface MockTextNode {
  id: string;
  name: string;
  type: 'TEXT';
  characters: string;
  fontName: FontName | symbol; // symbol for mixed
  fontSize: number;
  fontWeight: number;
  getRangeFontName?: (start: number, end: number) => FontName;
}

// Create mock text node
function createMockTextNode(
  id: string,
  name: string,
  characters: string = 'Sample text',
  fontName: FontName = { family: 'Inter', style: 'Regular' }
): MockTextNode {
  return {
    id,
    name,
    type: 'TEXT',
    characters,
    fontName,
    fontSize: 14,
    fontWeight: 400,
  };
}

describe('Text API', () => {
  beforeEach(() => {
    resetFigmaMocks();
    // Mock loadFontAsync
    (globalThis as any).figma.loadFontAsync = vi.fn().mockResolvedValue(undefined);
    // Mock viewport
    (globalThis as any).figma.viewport = {
      scrollAndZoomIntoView: vi.fn(),
    };
  });

  describe('setTextContent', () => {
    it('should set text content on a text node', async () => {
      const textNode = createMockTextNode('text-1', 'Title', 'Old text');
      figmaMock.getNodeByIdAsync.mockResolvedValue(textNode);

      const result = await setTextContent({ nodeId: 'text-1', text: 'New text' });

      expect(result.id).toBe('text-1');
      expect(result.name).toBe('Title');
      expect(textNode.characters).toBe('New text');
      expect((globalThis as any).figma.loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' });
      expect(figmaMock.notify).toHaveBeenCalledWith('✅ Updated text: "New text"');
    });

    it('should load font before setting text', async () => {
      const textNode = createMockTextNode('text-1', 'Title', 'Old text', { family: 'Roboto', style: 'Bold' });
      figmaMock.getNodeByIdAsync.mockResolvedValue(textNode);

      await setTextContent({ nodeId: 'text-1', text: 'New text' });

      expect((globalThis as any).figma.loadFontAsync).toHaveBeenCalledWith({ family: 'Roboto', style: 'Bold' });
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(setTextContent({ nodeId: 'nonexistent', text: 'Text' })).rejects.toThrow(
        'Node not found: nonexistent'
      );
    });

    it('should throw error when node is not a text node', async () => {
      const frameNode = { id: 'frame-1', name: 'Frame', type: 'FRAME' };
      figmaMock.getNodeByIdAsync.mockResolvedValue(frameNode);

      await expect(setTextContent({ nodeId: 'frame-1', text: 'Text' })).rejects.toThrow(
        'Node is not a text node: frame-1'
      );
    });

    it('should throw error when nodeId is missing', async () => {
      await expect(setTextContent({ nodeId: '', text: 'Text' })).rejects.toThrow('Missing nodeId parameter');
    });

    it('should throw error when text is missing', async () => {
      await expect(setTextContent({ nodeId: 'text-1', text: undefined as any })).rejects.toThrow(
        'Missing text parameter'
      );
    });

    it('should handle mixed fonts by using first character font', async () => {
      const textNode = createMockTextNode('text-1', 'Title', 'Mixed');
      textNode.fontName = figmaMock.mixed;
      textNode.getRangeFontName = vi.fn().mockReturnValue({ family: 'Arial', style: 'Regular' });
      figmaMock.getNodeByIdAsync.mockResolvedValue(textNode);

      await setTextContent({ nodeId: 'text-1', text: 'New text' });

      expect(textNode.getRangeFontName).toHaveBeenCalledWith(0, 1);
      expect((globalThis as any).figma.loadFontAsync).toHaveBeenCalledWith({ family: 'Arial', style: 'Regular' });
    });
  });

  describe('setMultipleTextContents', () => {
    it('should set text on multiple text nodes', async () => {
      const textNode1 = createMockTextNode('text-1', 'Title 1', 'Old 1');
      const textNode2 = createMockTextNode('text-2', 'Title 2', 'Old 2');

      figmaMock.getNodeByIdAsync.mockImplementation((id: string) => {
        if (id === 'text-1') return Promise.resolve(textNode1);
        if (id === 'text-2') return Promise.resolve(textNode2);
        return Promise.resolve(null);
      });

      const result = await setMultipleTextContents({
        updates: [
          { nodeId: 'text-1', text: 'New 1' },
          { nodeId: 'text-2', text: 'New 2' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalNodes).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(textNode1.characters).toBe('New 1');
      expect(textNode2.characters).toBe('New 2');
    });

    it('should handle partial success when some nodes fail', async () => {
      const textNode1 = createMockTextNode('text-1', 'Title 1', 'Old 1');

      figmaMock.getNodeByIdAsync.mockImplementation((id: string) => {
        if (id === 'text-1') return Promise.resolve(textNode1);
        if (id === 'text-2') return Promise.resolve(null); // Not found
        return Promise.resolve(null);
      });

      const result = await setMultipleTextContents({
        updates: [
          { nodeId: 'text-1', text: 'New 1' },
          { nodeId: 'text-2', text: 'New 2' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.totalNodes).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(textNode1.characters).toBe('New 1');
    });

    it('should throw error when updates array is missing', async () => {
      await expect(
        setMultipleTextContents({
          updates: undefined as any,
        })
      ).rejects.toThrow('Missing or invalid updates parameter');
    });

    it('should throw error when updates array is empty', async () => {
      await expect(
        setMultipleTextContents({
          updates: [],
        })
      ).rejects.toThrow('Missing or invalid updates parameter');
    });
  });

  describe('scanTextNodes', () => {
    it('should scan and return all text nodes', async () => {
      const textNode1 = createMockTextNode('text-1', 'Title', 'Hello');
      const textNode2 = createMockTextNode('text-2', 'Body', 'World');
      const parentNode = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        children: [textNode1, textNode2],
      };

      figmaMock.getNodeByIdAsync.mockResolvedValue(parentNode);

      const result = await scanTextNodes({ nodeId: 'parent-1' });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.textNodes).toHaveLength(2);
      expect(result.textNodes[0].nodeId).toBe('text-1');
      expect(result.textNodes[0].nodeName).toBe('Title');
      expect(result.textNodes[0].characters).toBe('Hello');
      expect(result.textNodes[1].nodeId).toBe('text-2');
      expect(result.textNodes[1].nodeName).toBe('Body');
      expect(result.textNodes[1].characters).toBe('World');
    });

    it('should return empty array when no text nodes found', async () => {
      const parentNode = {
        id: 'parent-1',
        name: 'Parent',
        type: 'FRAME',
        children: [],
      };

      figmaMock.getNodeByIdAsync.mockResolvedValue(parentNode);

      const result = await scanTextNodes({ nodeId: 'parent-1' });

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(result.textNodes).toHaveLength(0);
    });

    it('should throw error when node not found', async () => {
      figmaMock.getNodeByIdAsync.mockResolvedValue(null);

      await expect(scanTextNodes({ nodeId: 'nonexistent' })).rejects.toThrow('Node with ID nonexistent not found');
    });

    it('should scan current page when no nodeId provided', async () => {
      const textNode = createMockTextNode('text-1', 'Title', 'Hello');
      figmaMock.currentPage.children = [textNode];

      const result = await scanTextNodes({});

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.textNodes[0].nodeId).toBe('text-1');
    });
  });
});

