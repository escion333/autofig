/**
 * Basic Design System Creation Script
 * 
 * This script creates a very basic design system to test autofig capabilities:
 * - Color variables (design tokens)
 * - Typography styles
 * - Paint styles
 * - Spacing tokens
 * - A simple button component
 * 
 * Usage: Run this script when Figma plugin is connected via MCP
 */

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

/**
 * Main function to create the design system
 * This would be called via MCP tools in practice
 */
export async function createDesignSystem() {
  console.log('🎨 Creating Basic Design System...\n');

  // Step 1: Create color variable collection
  console.log('1️⃣ Creating color variables...');
  const colorCollection = await createColorVariables();
  
  // Step 2: Create typography styles
  console.log('\n2️⃣ Creating typography styles...');
  await createTypographyStyles();
  
  // Step 3: Create paint styles
  console.log('\n3️⃣ Creating paint styles...');
  await createPaintStyles();
  
  // Step 4: Create spacing variables
  console.log('\n4️⃣ Creating spacing variables...');
  const spacingCollection = await createSpacingVariables();
  
  // Step 5: Create button component
  console.log('\n5️⃣ Creating button component...');
  await createButtonComponent(colorCollection);
  
  console.log('\n✅ Design system created successfully!');
}

/**
 * Create color variable collection and variables
 */
async function createColorVariables() {
  // Create collection
  // const collection = await mcp_AutoFig_create_variable_collection({
  //   name: 'Colors',
  //   modes: ['Light']
  // });
  
  // Create primary colors
  const primaryColors = [
    { name: 'primary/500', color: DESIGN_SYSTEM.colors.primary['500'] },
    { name: 'primary/600', color: DESIGN_SYSTEM.colors.primary['600'] },
    { name: 'primary/700', color: DESIGN_SYSTEM.colors.primary['700'] },
  ];
  
  // Create secondary colors
  const secondaryColors = [
    { name: 'secondary/500', color: DESIGN_SYSTEM.colors.secondary['500'] },
    { name: 'secondary/600', color: DESIGN_SYSTEM.colors.secondary['600'] },
  ];
  
  // Create neutral colors
  const neutralColors = [
    { name: 'neutral/50', color: DESIGN_SYSTEM.colors.neutral['50'] },
    { name: 'neutral/100', color: DESIGN_SYSTEM.colors.neutral['100'] },
    { name: 'neutral/500', color: DESIGN_SYSTEM.colors.neutral['500'] },
    { name: 'neutral/900', color: DESIGN_SYSTEM.colors.neutral['900'] },
  ];
  
  // In practice, you would call:
  // for (const { name, color } of [...primaryColors, ...secondaryColors, ...neutralColors]) {
  //   await mcp_AutoFig_create_variable({
  //     collectionId: collection.id,
  //     name,
  //     resolvedType: 'COLOR',
  //     value: color
  //   });
  // }
  
  return { id: 'color-collection-id' }; // Placeholder
}

/**
 * Create typography text styles
 */
async function createTypographyStyles() {
  const styles = [
    { name: 'Heading 1', ...DESIGN_SYSTEM.typography['heading-1'] },
    { name: 'Heading 2', ...DESIGN_SYSTEM.typography['heading-2'] },
    { name: 'Body', ...DESIGN_SYSTEM.typography['body'] },
    { name: 'Caption', ...DESIGN_SYSTEM.typography['caption'] },
  ];
  
  // In practice, you would call:
  // for (const style of styles) {
  //   await mcp_AutoFig_create_text_style({
  //     name: style.name,
  //     fontFamily: style.fontFamily,
  //     fontStyle: style.fontStyle,
  //     fontSize: style.fontSize,
  //     lineHeight: style.lineHeight,
  //   });
  // }
}

/**
 * Create paint styles from color variables
 */
async function createPaintStyles() {
  const paintStyles = [
    { name: 'Primary/500', color: DESIGN_SYSTEM.colors.primary['500'] },
    { name: 'Primary/600', color: DESIGN_SYSTEM.colors.primary['600'] },
    { name: 'Secondary/500', color: DESIGN_SYSTEM.colors.secondary['500'] },
    { name: 'Neutral/50', color: DESIGN_SYSTEM.colors.neutral['50'] },
    { name: 'Neutral/900', color: DESIGN_SYSTEM.colors.neutral['900'] },
  ];
  
  // In practice, you would call:
  // for (const { name, color } of paintStyles) {
  //   await mcp_AutoFig_create_paint_style({
  //     name,
  //     color
  //   });
  // }
}

/**
 * Create spacing variable collection
 */
async function createSpacingVariables() {
  // Create collection
  // const collection = await mcp_AutoFig_create_variable_collection({
  //   name: 'Spacing',
  //   modes: ['Default']
  // });
  
  // Create spacing variables
  const spacingVars = Object.entries(DESIGN_SYSTEM.spacing).map(([name, value]) => ({
    name: `spacing/${name}`,
    value,
  }));
  
  // In practice, you would call:
  // for (const { name, value } of spacingVars) {
  //   await mcp_AutoFig_create_variable({
  //     collectionId: collection.id,
  //     name,
  //     resolvedType: 'FLOAT',
  //     value
  //   });
  // }
  
  return { id: 'spacing-collection-id' }; // Placeholder
}

/**
 * Create a simple button component
 */
async function createButtonComponent(colorCollection: { id: string }) {
  // Step 1: Create button frame
  // const buttonFrame = await mcp_AutoFig_create_frame({
  //   x: 100,
  //   y: 100,
  //   width: 120,
  //   height: 40,
  //   name: 'Button',
  //   fillColor: DESIGN_SYSTEM.colors.primary['500'],
  //   cornerRadius: 8,
  // });
  
  // Step 2: Create button text
  // const buttonText = await mcp_AutoFig_create_text({
  //   x: 100,
  //   y: 100,
  //   text: 'Button',
  //   fontSize: 16,
  //   fontFamily: 'Inter',
  //   fontStyle: 'Regular',
  //   fontColor: { r: 1, g: 1, b: 1, a: 1 },
  //   parentId: buttonFrame.id,
  // });
  
  // Step 3: Apply auto-layout
  // await mcp_AutoFig_set_layout_mode({
  //   nodeId: buttonFrame.id,
  //   layoutMode: 'HORIZONTAL',
  // });
  
  // await mcp_AutoFig_set_padding({
  //   nodeId: buttonFrame.id,
  //   paddingTop: DESIGN_SYSTEM.spacing.sm,
  //   paddingRight: DESIGN_SYSTEM.spacing.md,
  //   paddingBottom: DESIGN_SYSTEM.spacing.sm,
  //   paddingLeft: DESIGN_SYSTEM.spacing.md,
  // });
  
  // Step 4: Bind color variable to button fill
  // await mcp_AutoFig_bind_variable({
  //   nodeId: buttonFrame.id,
  //   field: 'fills',
  //   variableId: 'primary-500-variable-id', // Would get from actual variable creation
  // });
  
  // Step 5: Convert to component
  // await mcp_AutoFig_create_component({
  //   nodeId: buttonFrame.id,
  //   name: 'Button',
  // });
}

// Export for use
export { DESIGN_SYSTEM };

