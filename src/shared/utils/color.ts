/**
 * Color conversion utilities shared between MCP server and plugin
 */

import type { RGBA, RGB } from '../types/figma';

/**
 * Convert RGBA color (0-1 range) to hex string
 * @param color RGBA color with values 0-1
 * @returns Hex string like "#RRGGBB" or "#RRGGBBAA"
 */
export function rgbaToHex(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = color.a !== undefined ? Math.round(color.a * 255) : 255;

  if (a === 255) {
    return '#' + [r, g, b]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('');
  }

  return '#' + [r, g, b, a]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to RGBA color (0-1 range)
 * @param hex Hex string like "#RRGGBB" or "#RRGGBBAA" or "RRGGBB"
 * @returns RGBA color with values 0-1
 */
export function hexToRgba(hex: string): RGBA {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');
  
  let r: number, g: number, b: number, a: number;

  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    a = 1;
  } else if (cleanHex.length === 8) {
    r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    a = parseInt(cleanHex.slice(6, 8), 16) / 255;
  } else if (cleanHex.length === 3) {
    // Short form like #RGB
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
    a = 1;
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return { r, g, b, a };
}

/**
 * Create a solid paint from RGBA color
 * @param color RGBA color with values 0-1
 * @returns Figma-compatible solid paint object
 */
export function createSolidPaint(color: RGBA): { type: 'SOLID'; color: RGB; opacity: number } {
  return {
    type: 'SOLID',
    color: {
      r: color.r,
      g: color.g,
      b: color.b,
    },
    opacity: color.a ?? 1,
  };
}

/**
 * Ensure color values are in 0-1 range
 * Handles both 0-1 and 0-255 inputs
 */
export function normalizeColor(color: RGBA): RGBA {
  const isLikelyByteRange = color.r > 1 || color.g > 1 || color.b > 1;
  
  if (isLikelyByteRange) {
    return {
      r: Math.min(1, color.r / 255),
      g: Math.min(1, color.g / 255),
      b: Math.min(1, color.b / 255),
      a: color.a !== undefined ? (color.a > 1 ? color.a / 255 : color.a) : 1,
    };
  }

  return {
    r: Math.max(0, Math.min(1, color.r)),
    g: Math.max(0, Math.min(1, color.g)),
    b: Math.max(0, Math.min(1, color.b)),
    a: color.a !== undefined ? Math.max(0, Math.min(1, color.a)) : 1,
  };
}

/**
 * Parse a color value that could be RGBA or hex
 */
export function parseColor(color: RGBA | string): RGBA {
  if (typeof color === 'string') {
    return hexToRgba(color);
  }
  return normalizeColor(color);
}

