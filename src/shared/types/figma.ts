/**
 * Figma-related type definitions shared between MCP server and plugin
 */

// ============================================================================
// Color Types
// ============================================================================

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// ============================================================================
// Paint Types
// ============================================================================

export interface SolidPaint {
  type: 'SOLID';
  color: RGB;
  opacity?: number;
  visible?: boolean;
}

export interface GradientStop {
  position: number;
  color: RGBA;
}

export interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientStops: GradientStop[];
  gradientTransform?: Transform;
  opacity?: number;
  visible?: boolean;
}

export interface ImagePaint {
  type: 'IMAGE';
  scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageHash?: string;
  opacity?: number;
  visible?: boolean;
}

export type Paint = SolidPaint | GradientPaint | ImagePaint;

// ============================================================================
// Transform & Layout Types
// ============================================================================

export type Transform = [[number, number, number], [number, number, number]];

export interface Vector {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';
export type LayoutWrap = 'NO_WRAP' | 'WRAP';
export type LayoutAlign = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'BASELINE';
export type LayoutSizing = 'FIXED' | 'HUG' | 'FILL';
export type PrimaryAxisAlignItems = 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
export type CounterAxisAlignItems = 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';

// ============================================================================
// Node Types
// ============================================================================

export type NodeType =
  | 'DOCUMENT'
  | 'PAGE'
  | 'FRAME'
  | 'GROUP'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'TEXT'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'POLYGON'
  | 'STAR'
  | 'LINE'
  | 'VECTOR'
  | 'BOOLEAN_OPERATION'
  | 'SLICE'
  | 'SECTION'
  | 'CONNECTOR'
  | 'STICKY'
  | 'SHAPE_WITH_TEXT'
  | 'CODE_BLOCK'
  | 'STAMP'
  | 'WIDGET'
  | 'EMBED'
  | 'LINK_UNFURL'
  | 'MEDIA'
  | 'HIGHLIGHT'
  | 'WASHI_TAPE'
  | 'TABLE'
  | 'TABLE_CELL';

// ============================================================================
// Text Types
// ============================================================================

export interface FontName {
  family: string;
  style: string;
}

export interface TextStyle {
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: number;
  fontSize?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing?: number | { value: number; unit: 'PIXELS' | 'PERCENT' };
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' | 'AUTO' };
  lineHeightPx?: number;
  paragraphSpacing?: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'PNG' | 'JPG' | 'SVG' | 'PDF' | 'JSON_REST_V1';

export interface ExportSettings {
  format: ExportFormat;
  scale?: number;
  constraint?: { type: 'SCALE' | 'WIDTH' | 'HEIGHT'; value: number };
}

// ============================================================================
// Effect Types
// ============================================================================

export interface DropShadowEffect {
  type: 'DROP_SHADOW';
  color: RGBA;
  offset: Vector;
  radius: number;
  spread?: number;
  visible?: boolean;
  blendMode?: BlendMode;
}

export interface InnerShadowEffect {
  type: 'INNER_SHADOW';
  color: RGBA;
  offset: Vector;
  radius: number;
  spread?: number;
  visible?: boolean;
  blendMode?: BlendMode;
}

export interface BlurEffect {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  visible?: boolean;
}

export type Effect = DropShadowEffect | InnerShadowEffect | BlurEffect;

export type BlendMode =
  | 'PASS_THROUGH'
  | 'NORMAL'
  | 'DARKEN'
  | 'MULTIPLY'
  | 'LINEAR_BURN'
  | 'COLOR_BURN'
  | 'LIGHTEN'
  | 'SCREEN'
  | 'LINEAR_DODGE'
  | 'COLOR_DODGE'
  | 'OVERLAY'
  | 'SOFT_LIGHT'
  | 'HARD_LIGHT'
  | 'DIFFERENCE'
  | 'EXCLUSION'
  | 'HUE'
  | 'SATURATION'
  | 'COLOR'
  | 'LUMINOSITY';

// ============================================================================
// Constraint Types
// ============================================================================

export type ConstraintType = 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'SCALE';

export interface Constraints {
  horizontal: ConstraintType;
  vertical: ConstraintType;
}

// ============================================================================
// Component Types
// ============================================================================

export type ComponentPropertyType = 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT';

export interface ComponentProperty {
  type: ComponentPropertyType;
  defaultValue: string | boolean;
  preferredValues?: { type: 'COMPONENT' | 'COMPONENT_SET'; key: string }[];
  variantOptions?: string[];
}

// ============================================================================
// Reaction/Prototyping Types
// ============================================================================

export interface Reaction {
  trigger: { type: string };
  action: { type: string; destinationId?: string; navigation?: string };
}

// ============================================================================
// Variable Types (Design Tokens)
// ============================================================================

export type VariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

export interface VariableValue {
  [modeId: string]: RGBA | number | string | boolean;
}

// ============================================================================
// Filtered Node (for API responses)
// ============================================================================

export interface FilteredNode {
  id: string;
  name: string;
  type: NodeType;
  fills?: Array<{ type: string; color?: string; opacity?: number; gradientStops?: Array<{ position: number; color: string }> }>;
  strokes?: Array<{ type: string; color?: string; opacity?: number }>;
  cornerRadius?: number;
  absoluteBoundingBox?: Rectangle;
  characters?: string;
  style?: TextStyle;
  children?: FilteredNode[];
}

