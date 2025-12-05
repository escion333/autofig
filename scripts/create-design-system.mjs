#!/usr/bin/env node
/**
 * Basic Design System Creation Script
 * 
 * Creates a very basic design system using autofig MCP functions.
 * Run this script when Figma is open and the autofig plugin is connected.
 * 
 * Usage: node scripts/create-design-system.mjs
 * 
 * Note: This script demonstrates the MCP calls needed.
 * In practice, these would be called via the MCP server interface.
 */

console.log('🎨 Basic Design System Creation Script');
console.log('=====================================\n');
console.log('This script demonstrates how to create a basic design system.');
console.log('To execute, use the MCP functions via your MCP client.\n');

// Design system configuration
const DESIGN_SYSTEM = {
  colors: {
    primary: {
      '500': { r: 0.2, g: 0.4, b: 1, a: 1 }, // Blue
      '600': { r: 0.15, g: 0.3, b: 0.85, a: 1 },
      '700': { r: 0.1, g: 0.2, b: 0.7, a: 1 },
    },
    secondary: {
      '500': { r: 0.4, g: 0.8, b: 0.4, a: 1 }, // Green
      '600': { r: 0.3, g: 0.7, b: 0.3, a: 1 },
    },
    neutral: {
      '50': { r: 0.98, g: 0.98, b: 0.98, a: 1 },
      '100': { r: 0.95, g: 0.95, b: 0.95, a: 1 },
      '500': { r: 0.5, g: 0.5, b: 0.5, a: 1 },
      '900': { r: 0.1, g: 0.1, b: 0.1, a: 1 },
    },
  },
  typography: {
    'heading-1': {
      fontFamily: 'Inter',
      fontStyle: 'Bold',
      fontSize: 32,
      lineHeight: 40,
    },
    'heading-2': {
      fontFamily: 'Inter',
      fontStyle: 'Bold',
      fontSize: 24,
      lineHeight: 32,
    },
    'body': {
      fontFamily: 'Inter',
      fontStyle: 'Regular',
      fontSize: 16,
      lineHeight: 24,
    },
    'caption': {
      fontFamily: 'Inter',
      fontStyle: 'Regular',
      fontSize: 12,
      lineHeight: 16,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

console.log('Design System Configuration:');
console.log(JSON.stringify(DESIGN_SYSTEM, null, 2));
console.log('\n');

console.log('📋 Step-by-step MCP calls needed:\n');

console.log('STEP 1: Create Color Variable Collection');
console.log('----------------------------------------');
console.log('mcp_AutoFig_create_variable_collection({');
console.log('  name: "Colors",');
console.log('  modes: ["Light"]');
console.log('});\n');

console.log('STEP 2: Create Color Variables');
console.log('------------------------------');
Object.entries(DESIGN_SYSTEM.colors).forEach(([category, shades]) => {
  Object.entries(shades).forEach(([shade, color]) => {
    console.log(`mcp_AutoFig_create_variable({`);
    console.log(`  collectionId: "<color-collection-id>",`);
    console.log(`  name: "${category}/${shade}",`);
    console.log(`  resolvedType: "COLOR",`);
    console.log(`  value: { r: ${color.r}, g: ${color.g}, b: ${color.b}, a: ${color.a} }`);
    console.log(`});`);
  });
});
console.log('');

console.log('STEP 3: Create Typography Styles');
console.log('-------------------------------');
Object.entries(DESIGN_SYSTEM.typography).forEach(([name, style]) => {
  const displayName = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  console.log(`mcp_AutoFig_create_text_style({`);
  console.log(`  name: "${displayName}",`);
  console.log(`  fontFamily: "${style.fontFamily}",`);
  console.log(`  fontStyle: "${style.fontStyle}",`);
  console.log(`  fontSize: ${style.fontSize},`);
  console.log(`  lineHeight: ${style.lineHeight}`);
  console.log(`});`);
});
console.log('');

console.log('STEP 4: Create Paint Styles');
console.log('---------------------------');
const paintStyles = [
  { name: 'Primary/500', color: DESIGN_SYSTEM.colors.primary['500'] },
  { name: 'Primary/600', color: DESIGN_SYSTEM.colors.primary['600'] },
  { name: 'Secondary/500', color: DESIGN_SYSTEM.colors.secondary['500'] },
  { name: 'Neutral/50', color: DESIGN_SYSTEM.colors.neutral['50'] },
  { name: 'Neutral/900', color: DESIGN_SYSTEM.colors.neutral['900'] },
];
paintStyles.forEach(({ name, color }) => {
  console.log(`mcp_AutoFig_create_paint_style({`);
  console.log(`  name: "${name}",`);
  console.log(`  color: { r: ${color.r}, g: ${color.g}, b: ${color.b}, a: ${color.a} }`);
  console.log(`});`);
});
console.log('');

console.log('STEP 5: Create Spacing Variable Collection');
console.log('-----------------------------------------');
console.log('mcp_AutoFig_create_variable_collection({');
console.log('  name: "Spacing",');
console.log('  modes: ["Default"]');
console.log('});\n');

console.log('STEP 6: Create Spacing Variables');
console.log('--------------------------------');
Object.entries(DESIGN_SYSTEM.spacing).forEach(([name, value]) => {
  console.log(`mcp_AutoFig_create_variable({`);
  console.log(`  collectionId: "<spacing-collection-id>",`);
  console.log(`  name: "spacing/${name}",`);
  console.log(`  resolvedType: "FLOAT",`);
  console.log(`  value: ${value}`);
  console.log(`});`);
});
console.log('');

console.log('STEP 7: Create Button Component');
console.log('-------------------------------');
console.log('// Create button frame');
console.log('const buttonFrame = await mcp_AutoFig_create_frame({');
console.log('  x: 100,');
console.log('  y: 100,');
console.log('  width: 120,');
console.log('  height: 40,');
console.log('  name: "Button",');
console.log('  fillColor: { r: 0.2, g: 0.4, b: 1, a: 1 },');
console.log('  cornerRadius: 8');
console.log('});\n');

console.log('// Add button text');
console.log('await mcp_AutoFig_create_text({');
console.log('  x: 0,');
console.log('  y: 0,');
console.log('  text: "Button",');
console.log('  fontSize: 16,');
console.log('  fontFamily: "Inter",');
console.log('  fontStyle: "Regular",');
console.log('  fontColor: { r: 1, g: 1, b: 1, a: 1 },');
console.log('  parentId: buttonFrame.id');
console.log('});\n');

console.log('// Set auto-layout');
console.log('await mcp_AutoFig_set_layout_mode({');
console.log('  nodeId: buttonFrame.id,');
console.log('  layoutMode: "HORIZONTAL"');
console.log('});\n');

console.log('await mcp_AutoFig_set_padding({');
console.log('  nodeId: buttonFrame.id,');
console.log('  paddingTop: 8,');
console.log('  paddingRight: 16,');
console.log('  paddingBottom: 8,');
console.log('  paddingLeft: 16');
console.log('});\n');

console.log('// Convert to component');
console.log('await mcp_AutoFig_create_component({');
console.log('  nodeId: buttonFrame.id,');
console.log('  name: "Button"');
console.log('});\n');

console.log('✅ Design system creation complete!');
console.log('\nNote: Replace <color-collection-id> and <spacing-collection-id> with actual IDs from step 1 and 5.');

