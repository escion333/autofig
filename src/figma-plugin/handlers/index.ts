/**
 * Command handlers barrel export and dispatcher
 */

import type { FigmaCommand, CommandParams } from '../../shared/types';

// Document & Selection
import {
  getDocumentInfo,
  getSelection,
  readMyDesign,
  getNodeInfo,
  getNodesInfo,
  setFocus,
  setSelections,
} from './document';

// Element Creation
import { createRectangle, createFrame, createText, createEllipse } from './creation';

// Styling
import { setFillColor, setStrokeColor, setCornerRadius, setOpacity } from './styling';

// Organization
import { groupNodes, ungroupNode } from './organization';

// Variables (Design Tokens)
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
} from './variables';

// Typography
import {
  getAvailableFonts,
  loadFont,
  getTextStyles,
  createTextStyle,
  applyTextStyle,
  setTextProperties,
} from './typography';

// Layout
import { moveNode, resizeNode, deleteNode, deleteMultipleNodes, cloneNode } from './layout';

// Auto Layout
import { setLayoutMode, setPadding, setAxisAlign, setLayoutSizing, setItemSpacing } from './auto-layout';

// Components
import {
  getStyles,
  getLocalComponents,
  createComponentInstance,
  getInstanceOverrides,
  setInstanceOverrides,
} from './components';

// Text
import { setTextContent, scanTextNodes, setMultipleTextContents, setCharacters } from './text';

// Annotations
import { getAnnotations, setAnnotation, setMultipleAnnotations, scanNodesByTypes } from './annotations';

// Prototyping
import { getReactions, setDefaultConnector, createConnections } from './prototyping';

// Export
import { exportNodeAsImage } from './export';

// Re-export setCharacters for use in creation.ts
export { setCharacters };

/**
 * Main command dispatcher
 */
export async function handleCommand<T extends FigmaCommand>(
  command: T,
  params: CommandParams[T]
): Promise<unknown> {
  switch (command) {
    // Document & Selection
    case 'get_document_info':
      return await getDocumentInfo();
    case 'get_selection':
      return await getSelection();
    case 'read_my_design':
      return await readMyDesign();
    case 'get_node_info':
      return await getNodeInfo(params as CommandParams['get_node_info']);
    case 'get_nodes_info':
      return await getNodesInfo(params as CommandParams['get_nodes_info']);
    case 'set_focus':
      return await setFocus(params as CommandParams['set_focus']);
    case 'set_selections':
      return await setSelections(params as CommandParams['set_selections']);

    // Element Creation
    case 'create_rectangle':
      return await createRectangle(params as CommandParams['create_rectangle']);
    case 'create_frame':
      return await createFrame(params as CommandParams['create_frame']);
    case 'create_text':
      return await createText(params as CommandParams['create_text']);
    case 'create_ellipse':
      return await createEllipse(params as CommandParams['create_ellipse']);

    // Styling
    case 'set_fill_color':
      return await setFillColor(params as CommandParams['set_fill_color']);
    case 'set_stroke_color':
      return await setStrokeColor(params as CommandParams['set_stroke_color']);
    case 'set_corner_radius':
      return await setCornerRadius(params as CommandParams['set_corner_radius']);
    case 'set_opacity':
      return await setOpacity(params as CommandParams['set_opacity']);

    // Organization
    case 'group_nodes':
      return await groupNodes(params as CommandParams['group_nodes']);
    case 'ungroup_node':
      return await ungroupNode(params as CommandParams['ungroup_node']);

    // Variables (Design Tokens)
    case 'get_local_variable_collections':
      return await getLocalVariableCollections();
    case 'get_local_variables':
      return await getLocalVariables(params as CommandParams['get_local_variables']);
    case 'create_variable_collection':
      return await createVariableCollection(params as CommandParams['create_variable_collection']);
    case 'create_variable':
      return await createVariable(params as CommandParams['create_variable']);
    case 'set_variable_value':
      return await setVariableValue(params as CommandParams['set_variable_value']);
    case 'delete_variable':
      return await deleteVariable(params as CommandParams['delete_variable']);
    case 'get_bound_variables':
      return await getBoundVariables(params as CommandParams['get_bound_variables']);
    case 'bind_variable':
      return await bindVariable(params as CommandParams['bind_variable']);
    case 'unbind_variable':
      return await unbindVariable(params as CommandParams['unbind_variable']);

    // Typography
    case 'get_available_fonts':
      return await getAvailableFonts(params as CommandParams['get_available_fonts']);
    case 'load_font':
      return await loadFont(params as CommandParams['load_font']);
    case 'get_text_styles':
      return await getTextStyles();
    case 'create_text_style':
      return await createTextStyle(params as CommandParams['create_text_style']);
    case 'apply_text_style':
      return await applyTextStyle(params as CommandParams['apply_text_style']);
    case 'set_text_properties':
      return await setTextProperties(params as CommandParams['set_text_properties']);

    // Layout
    case 'move_node':
      return await moveNode(params as CommandParams['move_node']);
    case 'resize_node':
      return await resizeNode(params as CommandParams['resize_node']);
    case 'delete_node':
      return await deleteNode(params as CommandParams['delete_node']);
    case 'delete_multiple_nodes':
      return await deleteMultipleNodes(params as CommandParams['delete_multiple_nodes']);
    case 'clone_node':
      return await cloneNode(params as CommandParams['clone_node']);

    // Auto Layout
    case 'set_layout_mode':
      return await setLayoutMode(params as CommandParams['set_layout_mode']);
    case 'set_padding':
      return await setPadding(params as CommandParams['set_padding']);
    case 'set_axis_align':
      return await setAxisAlign(params as CommandParams['set_axis_align']);
    case 'set_layout_sizing':
      return await setLayoutSizing(params as CommandParams['set_layout_sizing']);
    case 'set_item_spacing':
      return await setItemSpacing(params as CommandParams['set_item_spacing']);

    // Components
    case 'get_styles':
      return await getStyles();
    case 'get_local_components':
      return await getLocalComponents();
    case 'create_component_instance':
      return await createComponentInstance(params as CommandParams['create_component_instance']);
    case 'get_instance_overrides':
      return await getInstanceOverrides(params as CommandParams['get_instance_overrides']);
    case 'set_instance_overrides':
      return await setInstanceOverrides(params as CommandParams['set_instance_overrides']);

    // Text
    case 'set_text_content':
      return await setTextContent(params as CommandParams['set_text_content']);
    case 'scan_text_nodes':
      return await scanTextNodes(params as CommandParams['scan_text_nodes']);
    case 'set_multiple_text_contents':
      return await setMultipleTextContents(params as CommandParams['set_multiple_text_contents']);

    // Annotations
    case 'get_annotations':
      return await getAnnotations(params as CommandParams['get_annotations']);
    case 'set_annotation':
      return await setAnnotation(params as CommandParams['set_annotation']);
    case 'set_multiple_annotations':
      return await setMultipleAnnotations(params as CommandParams['set_multiple_annotations']);
    case 'scan_nodes_by_types':
      return await scanNodesByTypes(params as CommandParams['scan_nodes_by_types']);

    // Prototyping
    case 'get_reactions':
      return await getReactions(params as CommandParams['get_reactions']);
    case 'set_default_connector':
      return await setDefaultConnector(params as CommandParams['set_default_connector']);
    case 'create_connections':
      return await createConnections(params as CommandParams['create_connections']);

    // Export
    case 'export_node_as_image':
      return await exportNodeAsImage(params as CommandParams['export_node_as_image']);

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

