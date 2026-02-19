import { describe, test, expect, beforeAll, afterAll } from "bun:test";

const TEST_PORT = 13055;
const BROKER_URL = `ws://localhost:${TEST_PORT}`;
const STATUS_URL = `http://localhost:${TEST_PORT}/status`;
const HEALTH_URL = `http://localhost:${TEST_PORT}/health`;

// ─── Broker lifecycle ────────────────────────────────────────────────────────

let brokerProcess: ReturnType<typeof Bun.spawn>;

beforeAll(async () => {
  brokerProcess = Bun.spawn(["bun", "src/socket.ts"], {
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdout: "ignore",
    stderr: "ignore",
  });
  await waitForBroker(TEST_PORT);
}, 15_000);

afterAll(() => {
  brokerProcess.kill();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function waitForBroker(port: number, maxMs = 8000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Broker did not start within ${maxMs}ms`);
}

interface PendingWaiter {
  pred: (msg: any) => boolean;
  resolve: (msg: any) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface Client {
  ws: WebSocket;
  send(obj: object): void;
  waitFor(pred: (msg: any) => boolean, timeoutMs?: number): Promise<any>;
  close(): void;
}

function createClient(): Promise<Client> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(BROKER_URL);
    const waiters: PendingWaiter[] = [];
    let connected = false;

    ws.addEventListener("message", (event) => {
      let msg: any;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      for (let i = waiters.length - 1; i >= 0; i--) {
        const w = waiters[i];
        if (w.pred(msg)) {
          clearTimeout(w.timer);
          waiters.splice(i, 1);
          w.resolve(msg);
        }
      }
    });

    ws.addEventListener("open", () => {
      connected = true;
      resolve({
        ws,
        send(obj: object) {
          ws.send(JSON.stringify(obj));
        },
        waitFor(pred: (msg: any) => boolean, timeoutMs = 5000): Promise<any> {
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              const idx = waiters.findIndex((w) => w.resolve === res);
              if (idx !== -1) waiters.splice(idx, 1);
              rej(new Error(`waitFor timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            waiters.push({ pred, resolve: res, reject: rej, timer });
          });
        },
        close() {
          ws.close();
        },
      });
    });

    ws.addEventListener("error", (err) => {
      // Only reject if we haven't connected yet; errors after connection
      // (e.g. on ws.close()) are expected and should be silently ignored.
      if (!connected) {
        reject(new Error(`WebSocket error: ${JSON.stringify(err)}`));
      }
    });
  });
}

async function joinChannel(client: Client, channel: string): Promise<void> {
  const id = crypto.randomUUID();
  const joined = client.waitFor(
    (m) => m.type === "system" && m.channel === channel && typeof m.message === "string" && m.message.startsWith("Joined channel"),
    5000
  );
  client.send({ type: "join", channel, id });
  await joined;
}

/** Starts a mock plugin on `commandChannel` that echoes responses. */
async function startMockPlugin(commandChannel: string): Promise<Client> {
  const plugin = await createClient();
  await joinChannel(plugin, commandChannel);
  await joinChannel(plugin, "figma-bridge");

  plugin.ws.addEventListener("message", (event) => {
    let msg: any;
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      return;
    }
    if (msg.type !== "broadcast") return;
    const inner = msg.message;
    if (!inner) return;
    const { id, replyTo } = inner;

    if (replyTo) {
      // Directed response — send back to the agent's private channel
      plugin.send({
        type: "directed",
        targetChannel: replyTo,
        message: { id, result: "mock" },
      });
    } else {
      // Legacy broadcast response
      plugin.send({
        type: "message",
        channel: commandChannel,
        message: { id, result: "mock" },
      });
    }
  });

  return plugin;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Multi-agent integration", () => {
  // ── Test 1: Basic Directed Routing ────────────────────────────────────────
  test("Test 1: directed routing delivers to correct agent", async () => {
    const plugin = await startMockPlugin("autofig-t1");

    const agent1 = await createClient();
    await joinChannel(agent1, "autofig-t1");
    await joinChannel(agent1, "agent-t1-1");

    const agent2 = await createClient();
    await joinChannel(agent2, "autofig-t1");
    await joinChannel(agent2, "agent-t1-2");

    const id1 = crypto.randomUUID();
    const id2 = crypto.randomUUID();

    // Both agents send commands with their private replyTo channels
    const reply1 = agent1.waitFor((m) => m.type === "broadcast" && m.message?.id === id1);
    const reply2 = agent2.waitFor((m) => m.type === "broadcast" && m.message?.id === id2);

    agent1.send({ type: "message", channel: "autofig-t1", message: { id: id1, command: "test", replyTo: "agent-t1-1" } });
    agent2.send({ type: "message", channel: "autofig-t1", message: { id: id2, command: "test", replyTo: "agent-t1-2" } });

    const r1 = await reply1;
    const r2 = await reply2;

    expect(r1.message.id).toBe(id1);
    expect(r1.message.result).toBe("mock");
    expect(r2.message.id).toBe(id2);
    expect(r2.message.result).toBe("mock");

    // Agent 1 must NOT receive Agent 2's response
    let crossContaminated = false;
    try {
      await agent1.waitFor((m) => m.type === "broadcast" && m.message?.id === id2, 300);
      crossContaminated = true;
    } catch {
      // Expected — timeout means no cross-contamination
    }
    expect(crossContaminated).toBe(false);

    agent1.close();
    agent2.close();
    plugin.close();
  }, 15_000);

  // ── Test 2: Legacy Single-Agent Compat ────────────────────────────────────
  test("Test 2: legacy mode (no replyTo) broadcasts on command channel", async () => {
    const plugin = await startMockPlugin("autofig-t2");

    const agent = await createClient();
    await joinChannel(agent, "autofig-t2");

    const id = crypto.randomUUID();
    const reply = agent.waitFor((m) => m.type === "broadcast" && m.message?.id === id);

    agent.send({ type: "message", channel: "autofig-t2", message: { id, command: "test" } });

    const r = await reply;
    expect(r.message.result).toBe("mock");

    agent.close();
    plugin.close();
  }, 15_000);

  // ── Test 3: Lock Acquire and Release ──────────────────────────────────────
  test("Test 3: lock acquire/deny/release cycle", async () => {
    const agent1 = await createClient();
    await joinChannel(agent1, "lock-test-t3");

    const agent2 = await createClient();
    await joinChannel(agent2, "lock-test-t3");

    const nodeId = `node-t3-${crypto.randomUUID()}`;

    // Agent 1 acquires the lock
    const acq1 = agent1.waitFor((m) => m.type === "lock:acquired" && m.nodeId === nodeId);
    agent1.send({ type: "lock:acquire", agentId: "t3-agent-1", lockType: "node", nodeId });
    await acq1;

    // Agent 2 tries to acquire same lock → denied
    const denied = agent2.waitFor((m) => m.type === "lock:denied" && m.nodeId === nodeId);
    agent2.send({ type: "lock:acquire", agentId: "t3-agent-2", lockType: "node", nodeId });
    const deniedMsg = await denied;
    expect(deniedMsg.heldBy).toBe("t3-agent-1");

    // Agent 1 releases
    const released = agent1.waitFor((m) => m.type === "lock:released" && m.nodeId === nodeId);
    agent1.send({ type: "lock:release", agentId: "t3-agent-1", lockType: "node", nodeId });
    await released;

    // Agent 2 retries → should acquire
    const acq2 = agent2.waitFor((m) => m.type === "lock:acquired" && m.nodeId === nodeId);
    agent2.send({ type: "lock:acquire", agentId: "t3-agent-2", lockType: "node", nodeId });
    await acq2;

    agent1.close();
    agent2.close();
  }, 15_000);

  // ── Test 4: Doc Lock Blocks Node Locks ────────────────────────────────────
  test("Test 4: doc lock blocks node locks from other agents", async () => {
    const agent1 = await createClient();
    await joinChannel(agent1, "lock-test-t4");

    const agent2 = await createClient();
    await joinChannel(agent2, "lock-test-t4");

    const nodeId = `node-t4-${crypto.randomUUID()}`;

    // Agent 1 acquires doc lock
    const docAcq = agent1.waitFor((m) => m.type === "lock:acquired" && m.lockType === "doc");
    agent1.send({ type: "lock:acquire", agentId: "t4-agent-1", lockType: "doc" });
    await docAcq;

    // Agent 2 tries node lock → denied due to doc lock
    const denied = agent2.waitFor((m) => m.type === "lock:denied" && m.nodeId === nodeId);
    agent2.send({ type: "lock:acquire", agentId: "t4-agent-2", lockType: "node", nodeId });
    const deniedMsg = await denied;
    expect(deniedMsg.reason).toContain("doc");

    // Agent 1 releases doc lock
    const docRel = agent1.waitFor((m) => m.type === "lock:released" && m.lockType === "doc");
    agent1.send({ type: "lock:release", agentId: "t4-agent-1", lockType: "doc" });
    await docRel;

    // Agent 2 retries node lock → should succeed
    const nodeAcq = agent2.waitFor((m) => m.type === "lock:acquired" && m.nodeId === nodeId);
    agent2.send({ type: "lock:acquire", agentId: "t4-agent-2", lockType: "node", nodeId });
    await nodeAcq;

    agent1.close();
    agent2.close();
  }, 15_000);

  // ── Test 5: Disconnect Releases Locks ─────────────────────────────────────
  test("Test 5: disconnecting agent releases its locks", async () => {
    const nodeId = `node-disc-${crypto.randomUUID()}`;
    const agentId1 = `disc-agent-${crypto.randomUUID()}`;

    const agent1 = await createClient();
    await joinChannel(agent1, "lock-test-t5");

    // Agent 1 acquires node lock
    const acq = agent1.waitFor((m) => m.type === "lock:acquired" && m.nodeId === nodeId);
    agent1.send({ type: "lock:acquire", agentId: agentId1, lockType: "node", nodeId });
    await acq;

    // Close agent 1 (simulate disconnect)
    agent1.close();

    // Wait for broker to process the close
    await new Promise((r) => setTimeout(r, 300));

    // Agent 2 should now acquire the lock
    const agent2 = await createClient();
    await joinChannel(agent2, "lock-test-t5");

    const acq2 = agent2.waitFor((m) => m.type === "lock:acquired" && m.nodeId === nodeId);
    agent2.send({ type: "lock:acquire", agentId: "disc-agent-2", lockType: "node", nodeId });
    await acq2;

    agent2.close();
  }, 15_000);

  // ── Test 6: Agent Registry in /status ─────────────────────────────────────
  test("Test 6: agent registry reflects connects and disconnects", async () => {
    const id1 = `reg-agent-${crypto.randomUUID()}`;
    const id2 = `reg-agent-${crypto.randomUUID()}`;

    const agent1 = await createClient();
    await joinChannel(agent1, id1);
    const reg1 = agent1.waitFor((m) => m.type === "agent:registered" && m.agentId === id1);
    agent1.send({ type: "agent:register", agentId: id1, channel: id1, mode: "read-write" });
    await reg1;

    const agent2 = await createClient();
    await joinChannel(agent2, id2);
    const reg2 = agent2.waitFor((m) => m.type === "agent:registered" && m.agentId === id2);
    agent2.send({ type: "agent:register", agentId: id2, channel: id2, mode: "read-write" });
    await reg2;

    // Check /status includes both agents
    const status1 = await fetch(STATUS_URL).then((r) => r.json());
    const agentIds1 = (status1.agents as any[]).map((a) => a.agentId);
    expect(agentIds1).toContain(id1);
    expect(agentIds1).toContain(id2);

    // Disconnect agent 1 and wait for broker to process
    agent1.close();
    await new Promise((r) => setTimeout(r, 300));

    // Check /status — only agent 2 should remain
    const status2 = await fetch(STATUS_URL).then((r) => r.json());
    const agentIds2 = (status2.agents as any[]).map((a) => a.agentId);
    expect(agentIds2).not.toContain(id1);
    expect(agentIds2).toContain(id2);

    agent2.close();
  }, 15_000);
});
