#!/usr/bin/env node

/**
 * Test script to create a basic design system with variables
 */

import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3055/');
const channel = 'rukfiulk'; // Updated channel

// Store IDs for later use
const collections = {};
const variables = {};

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Join the channel
  ws.send(JSON.stringify({
    type: 'join',
    channel: channel
  }));
  
  setTimeout(() => {
    console.log('\n=== Creating Design System Variables ===\n');
    
    // Step 1: Create Color Collection
    console.log('Step 1: Creating "Colors" collection...');
    ws.send(JSON.stringify({
      id: 'create-colors-collection',
      type: 'message',
      channel: channel,
      message: {
        id: 'create-colors-collection',
        command: 'create_variable_collection',
        params: {
          name: 'Colors',
          modes: ['Light', 'Dark'],
          commandId: 'create-colors-collection'
        }
      }
    }));
  }, 500);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'system') {
    console.log('System:', msg.message);
    return;
  }
  
  if (msg.type === 'broadcast' && msg.message.result) {
    const { id, result } = msg.message;
    
    // Handle collection creation
    if (id === 'create-colors-collection') {
      collections.colors = result;
      console.log('✓ Created Colors collection:', result.id);
      console.log('  Modes:', result.modes.map(m => m.name).join(', '));
      
      // Create Spacing collection
      console.log('\nStep 2: Creating "Spacing" collection...');
      ws.send(JSON.stringify({
        id: 'create-spacing-collection',
        type: 'message',
        channel: channel,
        message: {
          id: 'create-spacing-collection',
          command: 'create_variable_collection',
          params: {
            name: 'Spacing',
            commandId: 'create-spacing-collection'
          }
        }
      }));
    }
    else if (id === 'create-spacing-collection') {
      collections.spacing = result;
      console.log('✓ Created Spacing collection:', result.id);
      
      // Create Typography collection
      console.log('\nStep 3: Creating "Typography" collection...');
      ws.send(JSON.stringify({
        id: 'create-typography-collection',
        type: 'message',
        channel: channel,
        message: {
          id: 'create-typography-collection',
          command: 'create_variable_collection',
          params: {
            name: 'Typography',
            commandId: 'create-typography-collection'
          }
        }
      }));
    }
    else if (id === 'create-typography-collection') {
      collections.typography = result;
      console.log('✓ Created Typography collection:', result.id);
      
      // Now create color variables
      console.log('\nStep 4: Creating color variables...');
      createColorVariables();
    }
    else if (id.startsWith('create-color-')) {
      const varName = id.replace('create-color-', '').replace(/-/g, '/');
      console.log(`✓ Created color variable: ${varName}`);
      variables[id] = result;
      
      // After all colors, create spacing variables
      if (id === 'create-color-error-700') {
        console.log('\nStep 5: Creating spacing variables...');
        createSpacingVariables();
      }
    }
    else if (id.startsWith('create-spacing-')) {
      const varName = id.replace('create-spacing-', '');
      console.log(`✓ Created spacing variable: ${varName}`);
      variables[id] = result;
      
      // After all spacing, create typography variables
      if (id === 'create-spacing-3xl') {
        console.log('\nStep 6: Creating typography variables...');
        createTypographyVariables();
      }
    }
    else if (id.startsWith('create-typography-')) {
      const varName = id.replace('create-typography-', '').replace(/-/g, '-');
      console.log(`✓ Created typography variable: ${varName}`);
      variables[id] = result;
      
      // After all typography, set dark mode values
      if (id === 'create-typography-line-height-loose') {
        console.log('\nStep 7: Setting dark mode color values...');
        setDarkModeColors();
      }
    }
    else if (id.startsWith('set-dark-')) {
      const varName = id.replace('set-dark-', '').replace(/-/g, '/');
      console.log(`✓ Set dark mode value for: ${varName}`);
      
      // After all dark mode values, we're done
      if (id === 'set-dark-error-700') {
        console.log('\n=== Design System Complete! ===');
        console.log('\nSummary:');
        console.log(`- Collections: ${Object.keys(collections).length}`);
        console.log(`- Variables: ${Object.keys(variables).length}`);
        console.log('\nCollections created:');
        Object.entries(collections).forEach(([name, coll]) => {
          console.log(`  - ${coll.name} (${coll.id})`);
        });
        
        setTimeout(() => {
          ws.close();
        }, 1000);
      }
    }
  }
  
  // Handle errors
  if (msg.type === 'broadcast' && msg.message.error) {
    console.error('❌ Error:', msg.message.id, msg.message.error);
  }
});

function createColorVariables() {
  const colors = [
    // Primary colors
    { name: 'primary/100', light: { r: 0.93, g: 0.94, b: 1, a: 1 }, dark: { r: 0.13, g: 0.15, b: 0.25, a: 1 } },
    { name: 'primary/300', light: { r: 0.67, g: 0.71, b: 1, a: 1 }, dark: { r: 0.25, g: 0.29, b: 0.45, a: 1 } },
    { name: 'primary/500', light: { r: 0.37, g: 0.43, b: 1, a: 1 }, dark: { r: 0.47, g: 0.53, b: 1, a: 1 } },
    { name: 'primary/700', light: { r: 0.25, g: 0.29, b: 0.75, a: 1 }, dark: { r: 0.67, g: 0.71, b: 1, a: 1 } },
    { name: 'primary/900', light: { r: 0.15, g: 0.18, b: 0.45, a: 1 }, dark: { r: 0.85, g: 0.87, b: 1, a: 1 } },
    
    // Neutral colors
    { name: 'neutral/100', light: { r: 0.98, g: 0.98, b: 0.98, a: 1 }, dark: { r: 0.13, g: 0.13, b: 0.13, a: 1 } },
    { name: 'neutral/300', light: { r: 0.88, g: 0.88, b: 0.88, a: 1 }, dark: { r: 0.25, g: 0.25, b: 0.25, a: 1 } },
    { name: 'neutral/500', light: { r: 0.63, g: 0.63, b: 0.63, a: 1 }, dark: { r: 0.63, g: 0.63, b: 0.63, a: 1 } },
    { name: 'neutral/700', light: { r: 0.38, g: 0.38, b: 0.38, a: 1 }, dark: { r: 0.75, g: 0.75, b: 0.75, a: 1 } },
    { name: 'neutral/900', light: { r: 0.13, g: 0.13, b: 0.13, a: 1 }, dark: { r: 0.98, g: 0.98, b: 0.98, a: 1 } },
    
    // Success colors
    { name: 'success/300', light: { r: 0.67, g: 0.93, b: 0.71, a: 1 }, dark: { r: 0.15, g: 0.35, b: 0.18, a: 1 } },
    { name: 'success/500', light: { r: 0.13, g: 0.77, b: 0.25, a: 1 }, dark: { r: 0.33, g: 0.87, b: 0.45, a: 1 } },
    { name: 'success/700', light: { r: 0.09, g: 0.55, b: 0.18, a: 1 }, dark: { r: 0.67, g: 0.93, b: 0.71, a: 1 } },
    
    // Error colors
    { name: 'error/300', light: { r: 0.98, g: 0.71, b: 0.71, a: 1 }, dark: { r: 0.45, g: 0.15, b: 0.15, a: 1 } },
    { name: 'error/500', light: { r: 0.94, g: 0.26, b: 0.26, a: 1 }, dark: { r: 0.98, g: 0.45, b: 0.45, a: 1 } },
    { name: 'error/700', light: { r: 0.75, g: 0.13, b: 0.13, a: 1 }, dark: { r: 0.98, g: 0.71, b: 0.71, a: 1 } },
  ];
  
  colors.forEach((color, index) => {
    const varId = `create-color-${color.name.replace(/\//g, '-')}`;
    
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: varId,
        type: 'message',
        channel: channel,
        message: {
          id: varId,
          command: 'create_variable',
          params: {
            collectionId: collections.colors.id,
            name: color.name,
            resolvedType: 'COLOR',
            value: color.light,
            commandId: varId
          }
        }
      }));
    }, index * 100);
  });
}

function createSpacingVariables() {
  const spacing = [
    { name: 'xs', value: 4 },
    { name: 'sm', value: 8 },
    { name: 'md', value: 16 },
    { name: 'lg', value: 24 },
    { name: 'xl', value: 32 },
    { name: '2xl', value: 48 },
    { name: '3xl', value: 64 },
  ];
  
  spacing.forEach((space, index) => {
    const varId = `create-spacing-${space.name}`;
    
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: varId,
        type: 'message',
        channel: channel,
        message: {
          id: varId,
          command: 'create_variable',
          params: {
            collectionId: collections.spacing.id,
            name: space.name,
            resolvedType: 'FLOAT',
            value: space.value,
            commandId: varId
          }
        }
      }));
    }, index * 100);
  });
}

function createTypographyVariables() {
  const typography = [
    { name: 'font-size-xs', value: 12 },
    { name: 'font-size-sm', value: 14 },
    { name: 'font-size-base', value: 16 },
    { name: 'font-size-lg', value: 18 },
    { name: 'font-size-xl', value: 20 },
    { name: 'font-size-2xl', value: 24 },
    { name: 'font-size-3xl', value: 32 },
    { name: 'line-height-tight', value: 1.2 },
    { name: 'line-height-normal', value: 1.5 },
    { name: 'line-height-loose', value: 1.8 },
  ];
  
  typography.forEach((typo, index) => {
    const varId = `create-typography-${typo.name}`;
    
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: varId,
        type: 'message',
        channel: channel,
        message: {
          id: varId,
          command: 'create_variable',
          params: {
            collectionId: collections.typography.id,
            name: typo.name,
            resolvedType: 'FLOAT',
            value: typo.value,
            commandId: varId
          }
        }
      }));
    }, index * 100);
  });
}

function setDarkModeColors() {
  const darkColors = [
    { name: 'primary/100', color: { r: 0.13, g: 0.15, b: 0.25, a: 1 } },
    { name: 'primary/300', color: { r: 0.25, g: 0.29, b: 0.45, a: 1 } },
    { name: 'primary/500', color: { r: 0.47, g: 0.53, b: 1, a: 1 } },
    { name: 'primary/700', color: { r: 0.67, g: 0.71, b: 1, a: 1 } },
    { name: 'primary/900', color: { r: 0.85, g: 0.87, b: 1, a: 1 } },
    
    { name: 'neutral/100', color: { r: 0.13, g: 0.13, b: 0.13, a: 1 } },
    { name: 'neutral/300', color: { r: 0.25, g: 0.25, b: 0.25, a: 1 } },
    { name: 'neutral/500', color: { r: 0.63, g: 0.63, b: 0.63, a: 1 } },
    { name: 'neutral/700', color: { r: 0.75, g: 0.75, b: 0.75, a: 1 } },
    { name: 'neutral/900', color: { r: 0.98, g: 0.98, b: 0.98, a: 1 } },
    
    { name: 'success/300', color: { r: 0.15, g: 0.35, b: 0.18, a: 1 } },
    { name: 'success/500', color: { r: 0.33, g: 0.87, b: 0.45, a: 1 } },
    { name: 'success/700', color: { r: 0.67, g: 0.93, b: 0.71, a: 1 } },
    
    { name: 'error/300', color: { r: 0.45, g: 0.15, b: 0.15, a: 1 } },
    { name: 'error/500', color: { r: 0.98, g: 0.45, b: 0.45, a: 1 } },
    { name: 'error/700', color: { r: 0.98, g: 0.71, b: 0.71, a: 1 } },
  ];
  
  // Get the Dark mode ID
  const darkModeId = collections.colors.modes.find(m => m.name === 'Dark')?.modeId;
  
  if (!darkModeId) {
    console.error('Could not find Dark mode ID');
    return;
  }
  
  darkColors.forEach((color, index) => {
    const varKey = `create-color-${color.name.replace(/\//g, '-')}`;
    const variable = variables[varKey];
    
    if (!variable) {
      console.error(`Variable not found for ${color.name}`);
      return;
    }
    
    const setId = `set-dark-${color.name.replace(/\//g, '-')}`;
    
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: setId,
        type: 'message',
        channel: channel,
        message: {
          id: setId,
          command: 'set_variable_value',
          params: {
            variableId: variable.id,
            modeId: darkModeId,
            value: color.color,
            commandId: setId
          }
        }
      }));
    }, index * 100);
  });
}

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('\nConnection closed');
  process.exit(0);
});

