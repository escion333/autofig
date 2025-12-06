#!/usr/bin/env node

/**
 * AutoFig Connection Helper
 * 
 * This script helps users verify and connect to the AutoFig system
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3055/status');
    const data = await response.json();
    return {
      running: true,
      data,
    };
  } catch (error) {
    return {
      running: false,
      error: error.message,
    };
  }
}

async function checkCursorMCP() {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const { stdout } = await execAsync(`cat ${homeDir}/.cursor/mcp.json`);
    const config = JSON.parse(stdout);
    return {
      configured: !!config.mcpServers?.AutoFig,
      config: config.mcpServers?.AutoFig,
    };
  } catch (error) {
    return {
      configured: false,
      error: error.message,
    };
  }
}

async function main() {
  logSection('AutoFig Connection Diagnostics');

  // Check 1: WebSocket Server
  log('1️⃣  Checking WebSocket Server...', colors.bright);
  const serverStatus = await checkServerStatus();
  
  if (serverStatus.running) {
    log('   ✅ Server is running on port 3055', colors.green);
    log(`   📊 Active channels: ${serverStatus.data.channels}`, colors.blue);
    log(`   👥 Connected clients: ${serverStatus.data.totalClients}`, colors.blue);
    
    if (serverStatus.data.channelDetails && serverStatus.data.channelDetails.length > 0) {
      log('   📡 Active channels:', colors.blue);
      serverStatus.data.channelDetails.forEach(channel => {
        log(`      • ${channel.name} (${channel.clients} client${channel.clients !== 1 ? 's' : ''})`, colors.cyan);
      });
    }
  } else {
    log('   ❌ Server is not running', colors.red);
    log('   💡 Start it with: bun dev', colors.yellow);
  }
  console.log('');

  // Check 2: Cursor MCP Configuration
  log('2️⃣  Checking Cursor MCP Configuration...', colors.bright);
  const mcpStatus = await checkCursorMCP();
  
  if (mcpStatus.configured) {
    log('   ✅ AutoFig MCP is configured in Cursor', colors.green);
    log(`   📝 Command: ${mcpStatus.config.command}`, colors.blue);
    if (mcpStatus.config.args) {
      log(`   📝 Args: ${mcpStatus.config.args.join(' ')}`, colors.blue);
    }
  } else {
    log('   ❌ AutoFig MCP is not configured', colors.red);
    log('   💡 Run: bun setup', colors.yellow);
  }
  console.log('');

  // Check 3: Figma Plugin
  logSection('Figma Plugin Setup');
  log('3️⃣  Figma Plugin Installation', colors.bright);
  log('   📁 Plugin location: src/cursor_mcp_plugin/', colors.blue);
  log('   📄 Manifest: src/cursor_mcp_plugin/manifest.json', colors.blue);
  console.log('');
  log('   To install in Figma:', colors.bright);
  log('   1. Open Figma', colors.yellow);
  log('   2. Go to Plugins → Development → Import plugin from manifest', colors.yellow);
  log('   3. Select: src/cursor_mcp_plugin/manifest.json', colors.yellow);
  console.log('');

  // Summary and Next Steps
  logSection('Connection Status Summary');
  
  const allGood = serverStatus.running && mcpStatus.configured;
  
  if (allGood) {
    log('🎉 All systems are ready!', colors.green + colors.bright);
    console.log('');
    log('Next steps:', colors.bright);
    log('1. Open Figma and run the AutoFig plugin', colors.blue);
    log('2. The plugin should auto-connect to the WebSocket server', colors.blue);
    log('3. Use Cursor with the AutoFig MCP tools', colors.blue);
  } else {
    log('⚠️  Some components need attention:', colors.yellow + colors.bright);
    console.log('');
    
    if (!serverStatus.running) {
      log('▶️  Start the WebSocket server:', colors.bright);
      log('   bun dev', colors.cyan);
      console.log('');
    }
    
    if (!mcpStatus.configured) {
      log('▶️  Configure Cursor MCP:', colors.bright);
      log('   bun setup', colors.cyan);
      console.log('');
    }
  }

  log('═══════════════════════════════════════════════════════', colors.cyan);
  console.log('');
  log('📚 For more help, see: readme.md', colors.blue);
  console.log('');
}

main().catch(console.error);


