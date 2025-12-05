/**
 * esbuild configuration for Figma plugin
 * 
 * Bundles the TypeScript plugin code into a single code.js file
 * that Figma can load.
 */

import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/figma-plugin/code.ts'],
  bundle: true,
  outfile: 'src/cursor_mcp_plugin/code.js',
  format: 'iife', // Immediately Invoked Function Expression for Figma
  target: 'es2017', // Use older target to ensure optional chaining is transpiled
  minify: false,
  sourcemap: false,
  // Figma plugin environment doesn't have Node.js globals
  platform: 'browser',
  // Keep names readable for debugging
  keepNames: true,
  // External modules that shouldn't be bundled (none for Figma plugins)
  external: [],
  // Banner to indicate this is auto-generated
  banner: {
    js: '// Auto-generated from TypeScript source. Do not edit directly.\n// Run `bun run build:plugin` to rebuild.\n',
  },
};

if (isWatch) {
  // Watch mode
  const context = await esbuild.context(buildOptions);
  await context.watch();
  console.log('Watching for changes...');
} else {
  // Single build
  await esbuild.build(buildOptions);
  console.log('Plugin built successfully!');
}

