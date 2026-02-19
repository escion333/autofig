import { Server, ServerWebSocket } from "bun";

// Store clients by channel
const channels = new Map<string, Set<ServerWebSocket<any>>>();

interface AgentInfo {
  agentId: string;
  channel: string;
  mode: "read-write" | "read-only";
  connectedAt: number;
  ws: ServerWebSocket<any>;
}

const agents = new Map<string, AgentInfo>();

interface LockEntry {
  agentId: string;
  acquiredAt: number;
  ttl: number;
}

// Per-node locks: nodeId → LockEntry
const nodeLocks = new Map<string, LockEntry>();

// Global doc lock: only one agent can hold this at a time
let docLock: LockEntry | null = null;

const DEFAULT_LOCK_TTL_MS = 60_000;

function releaseAgentLocks(agentId: string) {
  nodeLocks.forEach((lock, nodeId) => {
    if (lock.agentId === agentId) {
      console.log(`[lock] Released node lock: ${nodeId} held by ${agentId}`);
      nodeLocks.delete(nodeId);
    }
  });
  if (docLock?.agentId === agentId) {
    console.log(`[lock] Released doc lock held by ${agentId}`);
    docLock = null;
  }
}

function handleConnection(ws: ServerWebSocket<any>) {
  // Don't add to clients immediately - wait for channel join
  console.log("New client connected");

  // Send welcome message to the new client
  ws.send(JSON.stringify({
    type: "system",
    message: "Please join a channel to start chatting",
  }));

  ws.close = () => {
    console.log("Client disconnected");

    // Release any locks held by this agent
    const agentId = ws.data.agentId as string | undefined;
    if (agentId) {
      releaseAgentLocks(agentId);
    }

    // Remove client from their channel
    channels.forEach((clients, channelName) => {
      if (clients.has(ws)) {
        clients.delete(ws);

        // Notify other clients in same channel
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "system",
              message: "A user has left the channel",
              channel: channelName
            }));
          }
        });
      }
    });
  };
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 3055,
  // uncomment this to allow connections in windows wsl
  // hostname: "0.0.0.0",
  fetch(req: Request, server: Server<unknown>) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Handle status endpoint
    if (url.pathname === "/status") {
      const totalClients = Array.from(channels.values()).reduce(
        (sum, clients) => sum + clients.size,
        0
      );
      const channelList = Array.from(channels.entries()).map(([name, clients]) => ({
        name,
        clients: clients.size,
      }));

      return new Response(
        JSON.stringify({
          status: "running",
          port: server.port,
          timestamp: new Date().toISOString(),
          channels: channelList.length,
          totalClients,
          channelDetails: channelList,
          agents: Array.from(agents.values()).map(({ agentId, channel, mode, connectedAt }) => ({
            agentId,
            channel,
            mode,
            connectedAt: new Date(connectedAt).toISOString(),
          })),
          agentCount: agents.size,
          locks: {
            nodes: Array.from(nodeLocks.entries()).map(([nodeId, lock]) => ({
              nodeId,
              agentId: lock.agentId,
              acquiredAt: new Date(lock.acquiredAt).toISOString(),
              ttlMs: lock.ttl,
            })),
            doc: docLock ? {
              agentId: docLock.agentId,
              acquiredAt: new Date(docLock.acquiredAt).toISOString(),
              ttlMs: docLock.ttl,
            } : null,
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Handle health check endpoint
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Handle WebSocket upgrade
    const success = server.upgrade(req, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      data: {},
    });

    if (success) {
      return; // Upgraded to WebSocket
    }

    // Return response for non-WebSocket requests
    return new Response("AutoFig WebSocket Server - Use /status or /health for info", {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
  websocket: {
    open(ws: ServerWebSocket<any>) {
      handleConnection(ws);
      // Keepalive: ping every 30s to prevent silent TCP connection drops
      ws.data.pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }, 30000);
    },
    message(ws: ServerWebSocket<any>, message: string | Buffer) {
      try {
        const data = JSON.parse(message as string);
        console.log(`\n=== Received message from client ===`);
        console.log(`Type: ${data.type}, Channel: ${data.channel || 'N/A'}`);
        if (data.message?.command) {
          console.log(`Command: ${data.message.command}, ID: ${data.id}`);
        } else if (data.message?.result) {
          console.log(`Response: ID: ${data.id}, Has Result: ${!!data.message.result}`);
        }
        console.log(`Full message:`, JSON.stringify(data, null, 2));

        if (data.type === "join") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            return;
          }

          // Create channel if it doesn't exist
          if (!channels.has(channelName)) {
            channels.set(channelName, new Set());
          }

          // Add client to channel
          const channelClients = channels.get(channelName)!;
          channelClients.add(ws);

          console.log(`\n✓ Client joined channel "${channelName}" (${channelClients.size} total clients)`);

          // Notify client they joined successfully
          ws.send(JSON.stringify({
            type: "system",
            message: `Joined channel: ${channelName}`,
            channel: channelName
          }));

          ws.send(JSON.stringify({
            type: "system",
            message: {
              id: data.id,
              result: "Connected to channel: " + channelName,
            },
            channel: channelName
          }));

          // Notify other clients in channel
          channelClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "system",
                message: "A new user has joined the channel",
                channel: channelName
              }));
            }
          });
          return;
        }

        if (data.type === "agent:register") {
          const { agentId, channel, mode } = data;
          if (!agentId || !channel) {
            ws.send(JSON.stringify({ type: "error", message: "agentId and channel are required" }));
            return;
          }
          ws.data.agentId = agentId;
          const info: AgentInfo = {
            agentId,
            channel,
            mode: mode || "read-write",
            connectedAt: Date.now(),
            ws,
          };
          agents.set(agentId, info);

          // Confirm to sender
          ws.send(JSON.stringify({ type: "agent:registered", agentId, channel }));

          // Broadcast to figma-bridge channel (plugin + any bridge clients)
          const bridgeClients = channels.get("figma-bridge");
          if (bridgeClients) {
            bridgeClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "agent:registered", agentId, channel, mode: info.mode }));
              }
            });
          }

          console.log(`[agent] Registered: ${agentId} on channel ${channel} (${info.mode})`);
          return;
        }

        if (data.type === "lock:acquire") {
          const { id, agentId, lockType, nodeId, ttl } = data;
          if (!agentId) {
            ws.send(JSON.stringify({ type: "error", id, message: "agentId is required" }));
            return;
          }

          // Auto-register agentId on socket if not already set
          if (!ws.data.agentId) {
            ws.data.agentId = agentId;
          }

          const effectiveTtl = ttl || DEFAULT_LOCK_TTL_MS;

          if (lockType === "doc") {
            if (!docLock || docLock.agentId === agentId) {
              docLock = { agentId, acquiredAt: Date.now(), ttl: effectiveTtl };
              ws.send(JSON.stringify({ type: "lock:acquired", id, lockType: "doc" }));
            } else {
              ws.send(JSON.stringify({
                type: "lock:denied", id, lockType: "doc",
                heldBy: docLock.agentId
              }));
            }
            return;
          }

          if (lockType === "node") {
            if (!nodeId) {
              ws.send(JSON.stringify({ type: "error", id, message: "nodeId is required for node locks" }));
              return;
            }
            // Check if doc is globally locked by someone else
            if (docLock && docLock.agentId !== agentId) {
              ws.send(JSON.stringify({
                type: "lock:denied", id, lockType: "node", nodeId,
                heldBy: docLock.agentId, reason: "doc-locked"
              }));
              return;
            }
            const existing = nodeLocks.get(nodeId);
            if (existing && existing.agentId !== agentId) {
              ws.send(JSON.stringify({
                type: "lock:denied", id, lockType: "node", nodeId,
                heldBy: existing.agentId
              }));
              return;
            }
            nodeLocks.set(nodeId, { agentId, acquiredAt: Date.now(), ttl: effectiveTtl });
            ws.send(JSON.stringify({ type: "lock:acquired", id, lockType: "node", nodeId }));
            return;
          }

          ws.send(JSON.stringify({ type: "error", id, message: `Unknown lockType: ${lockType}` }));
          return;
        }

        if (data.type === "lock:release") {
          const { id, agentId, lockType, nodeId } = data;

          if (lockType === "doc") {
            if (docLock?.agentId === agentId) {
              docLock = null;
            }
            ws.send(JSON.stringify({ type: "lock:released", id, lockType: "doc" }));
            return;
          }

          if (lockType === "node") {
            if (nodeLocks.get(nodeId)?.agentId === agentId) {
              nodeLocks.delete(nodeId);
            }
            ws.send(JSON.stringify({ type: "lock:released", id, lockType: "node", nodeId }));
            return;
          }

          ws.send(JSON.stringify({ type: "error", id, message: `Unknown lockType: ${lockType}` }));
          return;
        }

        if (data.type === "directed") {
          const { targetChannel, message: payload } = data;
          if (!targetChannel) return;

          const targetClients = channels.get(targetChannel);
          if (!targetClients || targetClients.size === 0) return;

          const outgoing = JSON.stringify({
            type: "broadcast",
            message: payload,
            sender: "plugin",
            channel: targetChannel,
          });

          targetClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(outgoing);
            }
          });
          return;
        }

        // Handle regular messages
        if (data.type === "message") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            return;
          }

          const channelClients = channels.get(channelName);
          if (!channelClients || !channelClients.has(ws)) {
            ws.send(JSON.stringify({
              type: "error",
              message: "You must join the channel first"
            }));
            return;
          }

          // Broadcast to all OTHER clients in the channel (not the sender)
          // This prevents echo and ensures proper request-response flow
          let broadcastCount = 0;
          channelClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              broadcastCount++;
              const broadcastMessage = {
                type: "broadcast",
                message: data.message,
                sender: "peer",
                channel: channelName
              };
              console.log(`\n=== Broadcasting to peer #${broadcastCount} ===`);
              console.log(JSON.stringify(broadcastMessage, null, 2));
              client.send(JSON.stringify(broadcastMessage));
            }
          });
          
          if (broadcastCount === 0) {
            console.log(`⚠️  No other clients in channel "${channelName}" to receive message!`);
          } else {
            console.log(`✓ Broadcast to ${broadcastCount} peer(s) in channel "${channelName}"`);
          }
        }

        // Handle progress updates - relay to all other clients in the channel
        if (data.type === "progress_update") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") return;

          const channelClients = channels.get(channelName);
          if (!channelClients || !channelClients.has(ws)) return;

          channelClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "progress_update",
                message: data.message,
                id: data.id,
                channel: channelName
              }));
            }
          });
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    },
    close(ws: ServerWebSocket<any>) {
      clearInterval(ws.data.pingInterval);

      // Remove client from all channels
      channels.forEach((clients) => {
        clients.delete(ws);
      });

      // Remove from agent registry if this WS was a registered agent
      let releasedViaRegistry = false;
      agents.forEach((info, agentId) => {
        if (info.ws === ws) {
          agents.delete(agentId);
          releaseAgentLocks(agentId);
          releasedViaRegistry = true;

          // Notify figma-bridge
          const bridgeClients = channels.get("figma-bridge");
          if (bridgeClients) {
            bridgeClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: "agent:disconnected", agentId }));
              }
            });
          }

          console.log(`[agent] Disconnected: ${agentId}`);
        }
      });

      // Also release locks for agents that acquired locks via lock:acquire without agent:register
      if (!releasedViaRegistry) {
        const agentId = ws.data.agentId as string | undefined;
        if (agentId) {
          releaseAgentLocks(agentId);
          console.log(`[lock] Released locks for ${agentId} on disconnect (non-registered agent)`);
        }
      }
    }
  }
});

// Lock expiry sweep — runs every 5s to clean up stale locks
setInterval(() => {
  const now = Date.now();
  nodeLocks.forEach((lock, nodeId) => {
    if (now - lock.acquiredAt > lock.ttl) {
      console.log(`[lock] Expired node lock: ${nodeId} held by ${lock.agentId}`);
      nodeLocks.delete(nodeId);
    }
  });
  if (docLock && now - docLock.acquiredAt > docLock.ttl) {
    console.log(`[lock] Expired doc lock held by ${docLock.agentId}`);
    docLock = null;
  }
}, 5000);

console.log(`WebSocket server running on port ${server.port}`);
