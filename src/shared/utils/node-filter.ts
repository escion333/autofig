/**
 * Node filtering utilities for API responses
 * Filters out unnecessary data and converts colors to hex
 */

import type { FilteredNode, NodeType, TextStyle } from '../types/figma';
import { rgbaToHex } from './color';

// Helper types for array element access
type FillElement = NonNullable<FilteredNode['fills']>[number];
type StrokeElement = NonNullable<FilteredNode['strokes']>[number];

/**
 * Interface for raw Figma node data from exportAsync
 */
interface RawFigmaNode {
  id: string;
  name: string;
  type: NodeType;
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    opacity?: number;
    gradientStops?: Array<{
      position: number;
      color: { r: number; g: number; b: number; a?: number };
      boundVariables?: unknown;
    }>;
    boundVariables?: unknown;
    imageRef?: unknown;
  }>;
  strokes?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a?: number };
    opacity?: number;
    boundVariables?: unknown;
  }>;
  cornerRadius?: number;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  characters?: string;
  style?: TextStyle;
  children?: RawFigmaNode[];
}

/**
 * Filter a Figma node to remove unnecessary data and convert colors
 * @param node Raw Figma node from exportAsync
 * @returns Filtered node suitable for API response
 */
export function filterFigmaNode(node: RawFigmaNode): FilteredNode | null {
  // Skip vector nodes (typically complex paths that bloat responses)
  if (node.type === 'VECTOR') {
    return null;
  }

  const filtered: FilteredNode = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  // Process fills
  if (node.fills && node.fills.length > 0) {
    filtered.fills = node.fills.map((fill) => {
      const processedFill: FillElement = {
        type: fill.type,
      };

      // Convert gradient stops
      if (fill.gradientStops) {
        processedFill.gradientStops = fill.gradientStops.map((stop) => ({
          position: stop.position,
          color: stop.color ? rgbaToHex(stop.color) : '#000000',
        }));
      }

      // Convert solid color
      if (fill.color) {
        processedFill.color = rgbaToHex(fill.color);
      }

      if (fill.opacity !== undefined) {
        processedFill.opacity = fill.opacity;
      }

      return processedFill;
    });
  }

  // Process strokes
  if (node.strokes && node.strokes.length > 0) {
    filtered.strokes = node.strokes.map((stroke) => {
      const processedStroke: StrokeElement = {
        type: stroke.type,
      };

      if (stroke.color) {
        processedStroke.color = rgbaToHex(stroke.color);
      }

      if (stroke.opacity !== undefined) {
        processedStroke.opacity = stroke.opacity;
      }

      return processedStroke;
    });
  }

  // Copy simple properties
  if (node.cornerRadius !== undefined) {
    filtered.cornerRadius = node.cornerRadius;
  }

  if (node.absoluteBoundingBox) {
    filtered.absoluteBoundingBox = node.absoluteBoundingBox;
  }

  if (node.characters) {
    filtered.characters = node.characters;
  }

  // Process text style
  if (node.style) {
    filtered.style = {
      fontFamily: node.style.fontFamily,
      fontStyle: node.style.fontStyle,
      fontWeight: node.style.fontWeight,
      fontSize: node.style.fontSize,
      textAlignHorizontal: node.style.textAlignHorizontal,
      letterSpacing: node.style.letterSpacing,
      lineHeightPx: node.style.lineHeightPx,
    };
  }

  // Recursively process children
  if (node.children) {
    filtered.children = node.children
      .map((child) => filterFigmaNode(child))
      .filter((child): child is FilteredNode => child !== null);
  }

  return filtered;
}

/**
 * Check if a node matches the given types
 */
export function nodeMatchesTypes(nodeType: string, types: string[]): boolean {
  return types.includes(nodeType);
}

/**
 * Get human-readable node type name
 */
export function getNodeTypeName(type: NodeType): string {
  const typeNames: Record<string, string> = {
    FRAME: 'Frame',
    GROUP: 'Group',
    COMPONENT: 'Component',
    COMPONENT_SET: 'Component Set',
    INSTANCE: 'Instance',
    TEXT: 'Text',
    RECTANGLE: 'Rectangle',
    ELLIPSE: 'Ellipse',
    POLYGON: 'Polygon',
    STAR: 'Star',
    LINE: 'Line',
    VECTOR: 'Vector',
    BOOLEAN_OPERATION: 'Boolean Operation',
    SECTION: 'Section',
    CONNECTOR: 'Connector',
    STICKY: 'Sticky Note',
  };

  return typeNames[type] || type;
}

