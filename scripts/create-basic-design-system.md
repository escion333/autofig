# Basic Design System Creation Guide

This guide shows how to create a very basic design system using the autofig MCP plugin.

## Prerequisites

1. Figma desktop app must be open
2. The autofig plugin must be installed and running
3. MCP server must be connected to Figma

## Design System Components

The basic design system includes:

### 1. Color Variables (Design Tokens)
- **Primary colors**: Blue shades (500, 600, 700)
- **Secondary colors**: Green shades (500, 600)
- **Neutral colors**: Grayscale (50, 100, 500, 900)

### 2. Typography Styles
- **Heading 1**: Inter Bold, 32px
- **Heading 2**: Inter Bold, 24px
- **Body**: Inter Regular, 16px
- **Caption**: Inter Regular, 12px

### 3. Paint Styles
- Reusable color styles for easy application

### 4. Spacing Variables
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### 5. Button Component
- Simple button with auto-layout
- Uses design tokens for colors and spacing

## Usage

You can create this design system by calling the MCP functions in sequence. Here's the order:

1. Create color variable collection
2. Create color variables (primary, secondary, neutral)
3. Create typography text styles
4. Create paint styles
5. Create spacing variable collection
6. Create spacing variables
7. Create button component

## Example MCP Calls

```typescript
// 1. Create color collection
const colorCollection = await mcp_AutoFig_create_variable_collection({
  name: 'Colors',
  modes: ['Light']
});

// 2. Create primary color variable
await mcp_AutoFig_create_variable({
  collectionId: colorCollection.id,
  name: 'primary/500',
  resolvedType: 'COLOR',
  value: { r: 0.2, g: 0.4, b: 1, a: 1 }
});

// 3. Create text style
await mcp_AutoFig_create_text_style({
  name: 'Heading 1',
  fontFamily: 'Inter',
  fontStyle: 'Bold',
  fontSize: 32,
  lineHeight: 40
});

// 4. Create paint style
await mcp_AutoFig_create_paint_style({
  name: 'Primary/500',
  color: { r: 0.2, g: 0.4, b: 1, a: 1 }
});

// 5. Create spacing collection
const spacingCollection = await mcp_AutoFig_create_variable_collection({
  name: 'Spacing',
  modes: ['Default']
});

// 6. Create spacing variable
await mcp_AutoFig_create_variable({
  collectionId: spacingCollection.id,
  name: 'spacing/sm',
  resolvedType: 'FLOAT',
  value: 8
});

// 7. Create button frame
const buttonFrame = await mcp_AutoFig_create_frame({
  x: 100,
  y: 100,
  width: 120,
  height: 40,
  name: 'Button',
  fillColor: { r: 0.2, g: 0.4, b: 1, a: 1 },
  cornerRadius: 8
});

// 8. Add button text
await mcp_AutoFig_create_text({
  x: 0,
  y: 0,
  text: 'Button',
  fontSize: 16,
  fontFamily: 'Inter',
  fontStyle: 'Regular',
  fontColor: { r: 1, g: 1, b: 1, a: 1 },
  parentId: buttonFrame.id
});

// 9. Set auto-layout
await mcp_AutoFig_set_layout_mode({
  nodeId: buttonFrame.id,
  layoutMode: 'HORIZONTAL'
});

await mcp_AutoFig_set_padding({
  nodeId: buttonFrame.id,
  paddingTop: 8,
  paddingRight: 16,
  paddingBottom: 8,
  paddingLeft: 16
});

// 10. Convert to component
await mcp_AutoFig_create_component({
  nodeId: buttonFrame.id,
  name: 'Button'
});
```

## Testing the Design System

Once created, you can test various capabilities:

1. **Variable binding**: Bind color variables to component fills
2. **Style application**: Apply text styles and paint styles
3. **Component creation**: Create instances of the button component
4. **Auto-layout**: Test responsive behavior with auto-layout
5. **Variable updates**: Update variable values and see them propagate

