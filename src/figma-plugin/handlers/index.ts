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
import { createRectangle, createFrame, createText, createEllipse, createPolygon, createStar, createLine, createVector } from './creation';

// Vector Operations (Boolean, Flatten, Images)
import { booleanOperation, flattenNode, outlineStroke, setImageFill } from './vectors';

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

// Paint Styles
import {
  getPaintStyles,
  createPaintStyle,
  updatePaintStyle,
  applyPaintStyle,
  deletePaintStyle,
  setGradientFill,
} from './paint-styles';

// Effect Styles
import {
  getEffectStyles,
  createEffectStyle,
  applyEffectStyle,
  deleteEffectStyle,
  setEffects,
  addDropShadow,
  addInnerShadow,
  addLayerBlur,
  addBackgroundBlur,
} from './effects';

// Layout & Constraints
import { moveNode, resizeNode, deleteNode, deleteMultipleNodes, cloneNode, getConstraints, setConstraints } from './layout';

// Grid Styles
import {
  getGridStyles,
  createGridStyle,
  applyGridStyle,
  deleteGridStyle,
  setLayoutGrids,
} from './grid-styles';

// Auto Layout
import { setLayoutMode, setPadding, setAxisAlign, setLayoutSizing, setItemSpacing } from './auto-layout';

// Components
import {
  getStyles,
  getLocalComponents,
  createComponent,
  createComponentSet,
  createComponentInstance,
  getComponentProperties,
  addComponentProperty,
  setComponentPropertyValue,
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
    case 'create_polygon':
      return await createPolygon(params as CommandParams['create_polygon']);
    case 'create_star':
      return await createStar(params as CommandParams['create_star']);
    case 'create_line':
      return await createLine(params as CommandParams['create_line']);
    case 'create_vector':
      return await createVector(params as CommandParams['create_vector']);

    // Boolean Operations
    case 'boolean_operation':
      return await booleanOperation(params as CommandParams['boolean_operation']);
    case 'flatten_node':
      return await flattenNode(params as CommandParams['flatten_node']);
    case 'outline_stroke':
      return await outlineStroke(params as CommandParams['outline_stroke']);

    // Images
    case 'set_image_fill':
      return await setImageFill(params as CommandParams['set_image_fill']);

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

    // Paint Styles
    case 'get_paint_styles':
      return await getPaintStyles();
    case 'create_paint_style':
      return await createPaintStyle(params as CommandParams['create_paint_style']);
    case 'update_paint_style':
      return await updatePaintStyle(params as CommandParams['update_paint_style']);
    case 'apply_paint_style':
      return await applyPaintStyle(params as CommandParams['apply_paint_style']);
    case 'delete_paint_style':
      return await deletePaintStyle(params as CommandParams['delete_paint_style']);
    case 'set_gradient_fill':
      return await setGradientFill(params as CommandParams['set_gradient_fill']);

    // Effect Styles
    case 'get_effect_styles':
      return await getEffectStyles();
    case 'create_effect_style':
      return await createEffectStyle(params as CommandParams['create_effect_style']);
    case 'apply_effect_style':
      return await applyEffectStyle(params as CommandParams['apply_effect_style']);
    case 'delete_effect_style':
      return await deleteEffectStyle(params as CommandParams['delete_effect_style']);
    case 'set_effects':
      return await setEffects(params as CommandParams['set_effects']);
    case 'add_drop_shadow':
      return await addDropShadow(params as CommandParams['add_drop_shadow']);
    case 'add_inner_shadow':
      return await addInnerShadow(params as CommandParams['add_inner_shadow']);
    case 'add_layer_blur':
      return await addLayerBlur(params as CommandParams['add_layer_blur']);
    case 'add_background_blur':
      return await addBackgroundBlur(params as CommandParams['add_background_blur']);

    // Constraints
    case 'get_constraints':
      return await getConstraints(params as CommandParams['get_constraints']);
    case 'set_constraints':
      return await setConstraints(params as CommandParams['set_constraints']);

    // Grid Styles
    case 'get_grid_styles':
      return await getGridStyles();
    case 'create_grid_style':
      return await createGridStyle(params as CommandParams['create_grid_style']);
    case 'apply_grid_style':
      return await applyGridStyle(params as CommandParams['apply_grid_style']);
    case 'delete_grid_style':
      return await deleteGridStyle(params as CommandParams['delete_grid_style']);
    case 'set_layout_grids':
      return await setLayoutGrids(params as CommandParams['set_layout_grids']);

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
    case 'create_component':
      return await createComponent(params as CommandParams['create_component']);
    case 'create_component_set':
      return await createComponentSet(params as CommandParams['create_component_set']);
    case 'create_component_instance':
      return await createComponentInstance(params as CommandParams['create_component_instance']);
    case 'get_component_properties':
      return await getComponentProperties(params as CommandParams['get_component_properties']);
    case 'add_component_property':
      return await addComponentProperty(params as CommandParams['add_component_property']);
    case 'set_component_property_value':
      return await setComponentPropertyValue(params as CommandParams['set_component_property_value']);
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

