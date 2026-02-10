#!/bin/bash

# AutoFig MCP Setup
# This script configures MCP for Cursor IDE specifically.
# For other MCP clients, add the config manually — see README.md.

bun install

# Create .cursor directory if it doesn't exist
mkdir -p .cursor

# Create mcp.json with the published package
echo "{
  \"mcpServers\": {
    \"AutoFig\": {
      \"command\": \"bunx\",
      \"args\": [
        \"autofig@latest\"
      ]
    }
  }
}" > .cursor/mcp.json

echo ""
echo "✅ AutoFig configured for Cursor IDE (.cursor/mcp.json)"
echo ""
echo "For other MCP clients, add the config manually:"
echo "  See README.md for config file locations"
echo ""
