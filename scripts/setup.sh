#!/bin/bash

# Create .cursor directory if it doesn't exist
mkdir -p .cursor

bun install

# Create mcp.json with the current directory path
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