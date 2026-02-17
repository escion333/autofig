/**
 * Lean Schema — strips Zod .describe() metadata from schemas at MCP registration time.
 *
 * Rich descriptions stay in source code (good for devs), but lean schemas get sent
 * to the MCP layer (good for token usage). Saves ~8-12K tokens per tool listing.
 *
 * Usage:
 *   MCP_MODE=full   — keeps all field descriptions (dev/debugging)
 *   MCP_MODE=lean   — strips all field descriptions (default, production)
 */

import { z } from "zod";

export const LEAN_MODE = process.env.MCP_MODE !== 'full';

/**
 * Recursively strips .describe() metadata from a Zod schema tree.
 * Preserves all validation logic; only removes human-readable descriptions.
 */
export function stripDescriptions<T extends z.ZodTypeAny>(schema: T): T {
  // Build a new _def without description
  const def = { ...schema._def, description: undefined };

  if (schema instanceof z.ZodObject) {
    const newShape: Record<string, z.ZodTypeAny> = {};
    for (const [k, v] of Object.entries(schema.shape as Record<string, z.ZodTypeAny>)) {
      newShape[k] = stripDescriptions(v);
    }
    def.shape = () => newShape;
  } else if (schema instanceof z.ZodOptional) {
    def.innerType = stripDescriptions(schema.unwrap());
  } else if (schema instanceof z.ZodDefault) {
    def.innerType = stripDescriptions((schema as z.ZodDefault<z.ZodTypeAny>).removeDefault());
  } else if (schema instanceof z.ZodArray) {
    def.type = stripDescriptions(schema.element);
  } else if (schema instanceof z.ZodUnion) {
    def.options = (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>).options.map(stripDescriptions);
  } else if (schema instanceof z.ZodEffects) {
    def.schema = stripDescriptions((schema as z.ZodEffects<z.ZodTypeAny>).innerType());
  } else if (schema instanceof z.ZodNullable) {
    def.innerType = stripDescriptions(schema.unwrap());
  } else if (schema instanceof z.ZodIntersection) {
    def.left = stripDescriptions((schema._def as z.ZodIntersectionDef).left);
    def.right = stripDescriptions((schema._def as z.ZodIntersectionDef).right);
  }

  return new (schema.constructor as new (def: typeof def) => T)(def);
}

/**
 * Apply lean stripping to a flat schema map (the format used by server.tool()).
 * Pass-through when LEAN_MODE is false.
 */
export function leanSchema<T extends Record<string, z.ZodTypeAny>>(shape: T): T {
  if (!LEAN_MODE) return shape;
  const result: Record<string, z.ZodTypeAny> = {};
  for (const [k, v] of Object.entries(shape)) {
    result[k] = stripDescriptions(v);
  }
  return result as T;
}
