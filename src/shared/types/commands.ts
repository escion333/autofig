/**
 * Command and response type definitions for MCP ↔ Plugin communication
 */

import type { RGBA, LayoutMode, LayoutWrap, LayoutSizing, PrimaryAxisAlignItems, CounterAxisAlignItems, ExportFormat, FilteredNode, NodeType } from './figma';

// ============================================================================
// Command Types (All supported commands)
// ============================================================================

export type FigmaCommand =
  // Document & Selection
  | 'get_document_info'
  | 'get_selection'
  | 'read_my_design'
  | 'get_node_info'
  | 'get_nodes_info'
  | 'set_focus'
  | 'set_selections'
  // Element Creation
  | 'create_rectangle'
  | 'create_frame'
  | 'create_text'
  | 'create_ellipse'
  // Styling
  | 'set_fill_color'
  | 'set_stroke_color'
  | 'set_corner_radius'
  | 'set_opacity'
  // Organization
  | 'group_nodes'
  | 'ungroup_node'
  // Variables (Design Tokens)
  | 'get_local_variable_collections'
  | 'get_local_variables'
  | 'create_variable_collection'
  | 'create_variable'
  | 'set_variable_value'
  | 'delete_variable'
  | 'get_bound_variables'
  | 'bind_variable'
  | 'unbind_variable'
  // Typography
  | 'get_available_fonts'
  | 'load_font'
  | 'get_text_styles'
  | 'create_text_style'
  | 'apply_text_style'
  | 'set_text_properties'
  // Layout
  | 'move_node'
  | 'resize_node'
  | 'delete_node'
  | 'delete_multiple_nodes'
  | 'clone_node'
  // Auto Layout
  | 'set_layout_mode'
  | 'set_padding'
  | 'set_axis_align'
  | 'set_layout_sizing'
  | 'set_item_spacing'
  // Components
  | 'get_styles'
  | 'get_local_components'
  | 'create_component_instance'
  | 'get_instance_overrides'
  | 'set_instance_overrides'
  // Text
  | 'set_text_content'
  | 'scan_text_nodes'
  | 'set_multiple_text_contents'
  // Annotations
  | 'get_annotations'
  | 'set_annotation'
  | 'set_multiple_annotations'
  | 'scan_nodes_by_types'
  // Prototyping
  | 'get_reactions'
  | 'set_default_connector'
  | 'create_connections'
  // Export
  | 'export_node_as_image'
  // WebSocket Channel Management (MCP server only)
  | 'join';

// ============================================================================
// Command Parameters
// ============================================================================

export interface CommandParams {
  // Document & Selection
  get_document_info: Record<string, never>;
  get_selection: Record<string, never>;
  read_my_design: Record<string, never>;
  get_node_info: { nodeId: string };
  get_nodes_info: { nodeIds: string[] };
  set_focus: { nodeId: string };
  set_selections: { nodeIds: string[] };

  // Variables (Design Tokens)
  get_local_variable_collections: Record<string, never>;
  get_local_variables: {
    collectionId?: string;
  };
  create_variable_collection: {
    name: string;
    modes?: string[];
  };
  create_variable: {
    collectionId: string;
    name: string;
    resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
    value?: VariableValue;
  };
  set_variable_value: {
    variableId: string;
    modeId: string;
    value: VariableValue;
  };
  delete_variable: {
    variableId: string;
  };
  get_bound_variables: {
    nodeId: string;
  };
  bind_variable: {
    nodeId: string;
    field: VariableBindableField;
    variableId: string;
  };
  unbind_variable: {
    nodeId: string;
    field: VariableBindableField;
  };

  // Element Creation
  create_rectangle: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    parentId?: string;
  };
  create_frame: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    parentId?: string;
    fillColor?: RGBA;
    strokeColor?: RGBA;
    strokeWeight?: number;
    layoutMode?: LayoutMode;
    layoutWrap?: LayoutWrap;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    primaryAxisAlignItems?: PrimaryAxisAlignItems;
    counterAxisAlignItems?: CounterAxisAlignItems;
    layoutSizingHorizontal?: LayoutSizing;
    layoutSizingVertical?: LayoutSizing;
    itemSpacing?: number;
  };
  create_text: {
    x?: number;
    y?: number;
    text?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    fontStyle?: string;
    fontColor?: RGBA;
    name?: string;
    parentId?: string;
  };
  create_ellipse: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    name?: string;
    parentId?: string;
    fillColor?: RGBA;
    strokeColor?: RGBA;
    strokeWeight?: number;
  };

  // Styling
  set_fill_color: {
    nodeId: string;
    color: RGBA;
  };
  set_stroke_color: {
    nodeId: string;
    color: RGBA;
    weight?: number;
  };
  set_corner_radius: {
    nodeId: string;
    radius?: number;
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
  };
  set_opacity: {
    nodeId: string;
    opacity: number;
  };

  // Organization
  group_nodes: {
    nodeIds: string[];
    name?: string;
  };
  ungroup_node: {
    nodeId: string;
  };

  // Typography
  get_available_fonts: {
    filter?: string;
  };
  load_font: {
    family: string;
    style?: string;
  };
  get_text_styles: Record<string, never>;
  create_text_style: {
    name: string;
    fontFamily?: string;
    fontStyle?: string;
    fontSize?: number;
    letterSpacing?: number;
    lineHeight?: number | 'AUTO';
    paragraphSpacing?: number;
    textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
    textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  };
  apply_text_style: {
    nodeId: string;
    styleId?: string;
    styleName?: string;
  };
  set_text_properties: {
    nodeId: string;
    fontFamily?: string;
    fontStyle?: string;
    fontSize?: number;
    letterSpacing?: number;
    lineHeight?: number | 'AUTO';
    paragraphSpacing?: number;
    textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
    textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
    textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
    textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  };

  // Layout
  move_node: {
    nodeId: string;
    x: number;
    y: number;
  };
  resize_node: {
    nodeId: string;
    width: number;
    height: number;
  };
  delete_node: {
    nodeId: string;
  };
  delete_multiple_nodes: {
    nodeIds: string[];
  };
  clone_node: {
    nodeId: string;
    x?: number;
    y?: number;
  };

  // Auto Layout
  set_layout_mode: {
    nodeId: string;
    mode: LayoutMode;
    layoutWrap?: LayoutWrap;
    itemSpacing?: number;
  };
  set_padding: {
    nodeId: string;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    padding?: number;
  };
  set_axis_align: {
    nodeId: string;
    primaryAxisAlignItems?: PrimaryAxisAlignItems;
    counterAxisAlignItems?: CounterAxisAlignItems;
  };
  set_layout_sizing: {
    nodeId: string;
    horizontal?: LayoutSizing;
    vertical?: LayoutSizing;
  };
  set_item_spacing: {
    nodeId: string;
    spacing: number;
  };

  // Components
  get_styles: Record<string, never>;
  get_local_components: Record<string, never>;
  create_component_instance: {
    componentKey: string;
    x?: number;
    y?: number;
    parentId?: string;
  };
  get_instance_overrides: {
    instanceNodeId?: string;
  };
  set_instance_overrides: {
    targetNodeIds: string[];
    sourceInstanceId?: string;
    overrides?: InstanceOverride[];
  };

  // Text
  set_text_content: {
    nodeId: string;
    text: string;
  };
  scan_text_nodes: {
    nodeId?: string;
    depth?: number;
    filter?: string;
  };
  set_multiple_text_contents: {
    updates: Array<{ nodeId: string; text: string }>;
  };

  // Annotations
  get_annotations: {
    nodeId?: string;
  };
  set_annotation: {
    nodeId: string;
    label: string;
  };
  set_multiple_annotations: {
    annotations: Array<{ nodeId: string; label: string }>;
  };
  scan_nodes_by_types: {
    types: NodeType[];
    parentNodeId?: string;
    depth?: number;
  };

  // Prototyping
  get_reactions: {
    nodeIds?: string[];
  };
  set_default_connector: {
    connectorType?: 'ELBOWED' | 'STRAIGHT';
    strokeColor?: RGBA;
    strokeWeight?: number;
  };
  create_connections: {
    connections: Array<{
      fromNodeId: string;
      toNodeId: string;
      label?: string;
    }>;
  };

  // Export
  export_node_as_image: {
    nodeId: string;
    format?: ExportFormat;
    scale?: number;
  };
}

// ============================================================================
// Instance Override Types
// ============================================================================

export interface InstanceOverride {
  id: string;
  overriddenFields: string[];
  [key: string]: unknown;
}

// ============================================================================
// Progress Update Types
// ============================================================================

export type ProgressStatus = 'started' | 'in_progress' | 'completed' | 'error';

export interface ProgressUpdate {
  type: 'command_progress';
  commandId: string;
  commandType: string;
  status: ProgressStatus;
  progress: number;
  totalItems: number;
  processedItems: number;
  currentChunk?: number;
  totalChunks?: number;
  chunkSize?: number;
  message: string;
  payload?: unknown;
  timestamp: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface CommandResponse<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
}

export interface DocumentInfoResult {
  name: string;
  id: string;
  type: string;
  children: Array<{ id: string; name: string; type: string }>;
  currentPage: { id: string; name: string; childCount: number };
  pages: Array<{ id: string; name: string; childCount: number }>;
}

export interface SelectionResult {
  selectionCount: number;
  selection: Array<{ id: string; name: string; type: string; visible: boolean }>;
}

export interface NodeResult {
  id: string;
  name: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parentId?: string;
  [key: string]: unknown;
}

export interface ExportResult {
  nodeId: string;
  format: string;
  data: string;
  size: { width: number; height: number };
}

export interface TextNodeInfo {
  nodeId: string;
  nodeName: string;
  characters: string;
  path: string[];
  depth: number;
  fontSize?: number;
  fontName?: { family: string; style: string };
  hasMultipleFonts?: boolean;
  textStyleId?: string;
}

export interface AnnotationInfo {
  nodeId: string;
  nodeName: string;
  label: string;
  labelText: string;
}

// ============================================================================
// Variable Types (Design Tokens)
// ============================================================================

export type VariableValue =
  | { r: number; g: number; b: number; a?: number }  // COLOR
  | number  // FLOAT
  | string  // STRING
  | boolean;  // BOOLEAN

export type VariableBindableField =
  | 'fills'
  | 'strokes'
  | 'strokeWeight'
  | 'cornerRadius'
  | 'topLeftRadius'
  | 'topRightRadius'
  | 'bottomLeftRadius'
  | 'bottomRightRadius'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingTop'
  | 'paddingBottom'
  | 'itemSpacing'
  | 'counterAxisSpacing'
  | 'opacity'
  | 'width'
  | 'height'
  | 'minWidth'
  | 'maxWidth'
  | 'minHeight'
  | 'maxHeight';

export interface VariableModeInfo {
  modeId: string;
  name: string;
}

export interface VariableCollectionInfo {
  id: string;
  name: string;
  modes: VariableModeInfo[];
  defaultModeId: string;
  variableIds: string[];
  hiddenFromPublishing: boolean;
}

export interface VariableInfo {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';
  valuesByMode: Record<string, unknown>;
  hiddenFromPublishing: boolean;
  scopes: string[];
  codeSyntax: Record<string, string>;
}

