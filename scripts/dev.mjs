#!/usr/bin/env node

/**
 * Unified Development Server
 * 
 * This script starts the WebSocket server with:
 * - Health check endpoint
 * - Auto-restart on crashes
 * - Better logging
 * - Connection status
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('═══════════════════════════════════════════════════════', colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log('═══════════════════════════════════════════════════════', colors.cyan);
  console.log('');
}

// Track server process
let serverProcess = null;
let restartCount = 0;
const MAX_RESTARTS = 5;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    log('❌ Maximum restart attempts reached. Please check for errors.', colors.red);
    process.exit(1);
  }

  logSection('Starting AutoFig Development Server');
  
  log(`📡 WebSocket Server: ws://localhost:3055`, colors.green);
  log(`🔌 Status: Starting...`, colors.yellow);
  console.log('');
  log('Waiting for Figma plugin to connect...', colors.blue);
  console.log('');

  serverProcess = spawn('bun', ['run', 'src/socket.ts'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  serverProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      restartCount++;
      log(`⚠️  Server crashed with code ${code}. Restarting... (${restartCount}/${MAX_RESTARTS})`, colors.yellow);
      setTimeout(() => startServer(), 2000);
    } else if (signal === 'SIGINT' || signal === 'SIGTERM') {
      log('\n👋 Server stopped gracefully', colors.green);
      process.exit(0);
    }
  });

  serverProcess.on('error', (error) => {
    log(`❌ Failed to start server: ${error.message}`, colors.red);
    process.exit(1);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\n🛑 Shutting down...', colors.yellow);
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 1000);
});

// Show quick start instructions
function showInstructions() {
  logSection('AutoFig Quick Start Guide');
  
  log('1️⃣  WebSocket server is starting...', colors.bright);
  console.log('');
  
  log('2️⃣  Open Figma and load the AutoFig plugin:', colors.bright);
  log('    • In Figma: Plugins → Development → AutoFig', colors.blue);
  console.log('');
  
  log('3️⃣  The plugin will auto-connect to this server', colors.bright);
  console.log('');
  
  log('4️⃣  Use Cursor with the AutoFig MCP tools', colors.bright);
  log('    • The MCP server will communicate through this WebSocket', colors.blue);
  console.log('');
  
  log('═══════════════════════════════════════════════════════', colors.cyan);
  console.log('');
  log('💡 Tip: Keep this terminal open while working', colors.yellow);
  log('    Press Ctrl+C to stop the server', colors.yellow);
  console.log('');
}

// Start everything
showInstructions();
startServer();


