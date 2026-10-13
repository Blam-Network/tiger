// Drives a debugger endpoint the way the app does and prints pass/fail per
// step. Default: the mock (npm run mock). node scripts/smoke.mjs [host:port]
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import { currentSlice, loadsInSlice } from "../src/current-slice.ts";

const address = process.argv[2] ?? "127.0.0.1:8199";
const DATA_SERVICE = fileURLToPath(new URL("./data-service.mjs", import.meta.url));
const LISTENING = /listening on (\d+)/;
const socket = new WebSocket(`ws://${address}/debug/dap`);
const pending = new Map();
const events = [];
const waiters = [];
let seq = 0;
let failed = 0;

socket.on("message", (data) => {
  const message = JSON.parse(String(data));
  if (message.type === "response") {
    pending.get(message.request_seq)?.(message);
    pending.delete(message.request_seq);
    return;
  }
  events.push(message);
  for (const waiter of [...waiters]) {
    if (waiter.match(message)) {
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve(message);
    }
  }
});

function request(command, args = {}) {
  seq += 1;
  const id = seq;
  socket.send(JSON.stringify({ seq: id, type: "request", command, arguments: args }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${command}: timeout`)), 5000);
    pending.set(id, (response) => {
      clearTimeout(timer);
      if (response.success) {
        resolve(response.body ?? {});
      } else {
        reject(new Error(`${command}: ${response.message}`));
      }
    });
  });
}

function waitFor(event, ms = 8000) {
  const seen = events.find((e) => e.event === event);
  if (seen) {
    return Promise.resolve(seen);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // only if still waiting: a stale splice(-1) would drop someone else
      const at = waiters.indexOf(waiter);
      if (at >= 0) {
        waiters.splice(at, 1);
      }
      reject(new Error(`no ${event} event in ${ms} ms`));
    }, ms);
    const waiter = {
      match: (e) => e.event === event,
      resolve: (e) => {
        clearTimeout(timer);
        resolve(e);
      },
    };
    waiters.push(waiter);
  });
}

async function step(name, run) {
  try {
    const note = await run();
    console.log(`PASS  ${name}${note ? `  (${note})` : ""}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${name}  ${error.message}`);
  }
}

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

let targetId;
let threads = [];
let path;
let breakLine;
let stoppedThread;
let frameId;

await step("initialize", async () => {
  const caps = await request("initialize", { adapterID: "smoke" });
  check(caps.supportsLogPoints, "no supportsLogPoints");
  await waitFor("initialized", 2000);
});
await step("attach", async () => {
  await request("attach");
});
await step("tiger/targets", async () => {
  const { targets } = await request("tiger/targets");
  check(targets.length > 0, "no targets");
  targetId = targets[0].id;
  return `${targets.length} target(s), ${targetId} tick ${targets[0].ticks}`;
});
await step("tiger/activity", async () => {
  // A just-started target's threads are ready, not yet at their first sleep.
  for (let i = 0; i < 30; i++) {
    threads = (await request("tiger/activity", { targetId })).threads;
    if (threads.some((t) => t.waitingOn)) {
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  check(threads.some((t) => t.name.endsWith("sc_main")), "no sc_main");
  check(threads.every((t) => typeof t.world === "string"), "a thread has no world");
  return threads.map((t) => `${t.name}:${t.state}:${t.world}`).join(", ");
});
await step("threads", async () => {
  const body = await request("threads");
  check(body.threads.length > 0, "no threads");
  return `${body.threads.length} thread(s)`;
});
await step("stackTrace (waiting thread)", async () => {
  const waiting = threads.find((t) => t.waitingOn);
  check(waiting, "no waiting thread");
  const { stackFrames } = await request("stackTrace", { threadId: waiting.id });
  check(stackFrames.length > 0, "no frames");
  return `${waiting.name} waits on ${waiting.waitingOn} at line ${stackFrames[0].line}`;
});
await step("loadedSources + source", async () => {
  const { sources } = await request("loadedSources");
  check(sources.length > 0, "no sources");
  path = sources[0].path;
  const { content } = await request("source", { source: { path } });
  const lines = content.split("\n");
  breakLine = lines.findIndex((l) => l.includes("heat = heat + bump")) + 1;
  check(breakLine > 0, "loop line not found");
  return `${path}, loop line ${breakLine}`;
});
await step("setBreakpoints (inside loop)", async () => {
  const { breakpoints } = await request("setBreakpoints", {
    source: { path },
    breakpoints: [{ line: breakLine }],
  });
  check(breakpoints[0]?.verified, "not verified");
  return `line ${breakpoints[0].line}`;
});
await step("stopped event", async () => {
  const stopped = await waitFor("stopped").catch(async (error) => {
    // Say what the target was doing instead.
    const { targets } = await request("tiger/targets");
    const activity = await request("tiger/activity", { targetId });
    const states = activity.threads.map((t) => `${t.name}:${t.state}:${t.line}`);
    throw new Error(
      `${error.message}; target ${JSON.stringify(targets[0])}; threads ${states.join(" ")}`
    );
  });
  stoppedThread = stopped.body.threadId;
  check(stopped.body.reason === "breakpoint", `reason ${stopped.body.reason}`);
  const { stackFrames } = await request("stackTrace", { threadId: stoppedThread });
  check(stackFrames[0].line === breakLine, `top line ${stackFrames[0].line}`);
  frameId = stackFrames[0].id;
  return `thread ${stoppedThread} at line ${stackFrames[0].line}`;
});
await step("scopes + variables", async () => {
  const { scopes } = await request("scopes", { frameId });
  const names = scopes.map((s) => s.name);
  check(names.includes("Locals"), "no Locals");
  const self = scopes.find((s) => s.name === "Self");
  check(self, "no Self scope");
  const { variables } = await request("variables", {
    variablesReference: self.variablesReference,
  });
  const counter = variables.find((v) => v.name === "counter");
  check(counter, "no counter member");
  return `${names.join("/")}; counter = ${counter.value}`;
});
await step("evaluate (BungieScript)", async () => {
  const body = await request("evaluate", { expression: "counter * 2 + 1", frameId });
  check(body.result !== undefined, "no result");
  return `counter * 2 + 1 = ${body.result}`;
});
await step("tiger/bundles", async () => {
  const { bundles } = await request("tiger/bundles", { targetId });
  const row = bundles[0]?.rows.find((r) => r.name === "sq_guards");
  check(row, "no sq_guards row");
  check(row.actions.some((a) => a.name === "place"), "no place action");
  check(bundles[0].world === "private", `bundle world ${bundles[0].world}`);
  return `${bundles.length} bundle(s), ${row.type} ${row.name}, world ${bundles[0].world}, bubbles ${bundles[0].bubbles?.join(",")}`;
});
await step("tiger/rowAction place", async () => {
  const { bundles } = await request("tiger/bundles", { targetId });
  const row = bundles[0].rows.find((r) => r.name === "sq_guards");
  const { result } = await request("tiger/rowAction", {
    targetId,
    bundle: bundles[0].bundle,
    typeId: row.typeId,
    typeIndex: row.typeIndex,
    action: "place",
    args: [],
  });
  return `result ${result}`;
});
await step("tiger/incidentKinds", async () => {
  const { kinds } = await request("tiger/incidentKinds");
  check(kinds.length > 0, "no kinds");
  return kinds.map((k) => k.name).join(", ");
});
await step('evaluate "/threads"', async () => {
  const { result } = await request("evaluate", { expression: "/threads", targetId });
  check(String(result).includes("sc_main"), "no sc_main in /threads");
  return String(result).split("\n").length + " line(s)";
});
await step("tiger/players", async () => {
  const { players } = await request("tiger/players");
  check(players.length > 0, "no players");
  check(players[0].targetId === targetId, `player in ${players[0].targetId}`);
  return `${players[0].id} in ${players[0].targetId}, bubble ${players[0].bubble}`;
});
// The Bundles tab's Current slice filter, on the mock's player and bundle.
await step("current slice filter", async () => {
  const { players } = await request("tiger/players");
  const { bundles } = await request("tiger/bundles", { targetId });
  const slice = currentSlice(players, undefined, targetId);
  check(slice === "0.0", `slice ${slice}`);
  check(currentSlice(players, undefined, "elsewhere") === undefined, "slice outside the target");
  check(bundles.every((b) => loadsInSlice(b, slice)), "a 0.0 bundle filtered out");
  check(loadsInSlice({ bubbles: ["0.0"] }, "0.2"), "base state not kept in a phase");
  check(!loadsInSlice({ bubbles: ["0.0"] }, "3.0"), "another bubble's bundle kept");
  check(!loadsInSlice({}, "3.0") && !loadsInSlice({ bubbles: [] }, "3.0"), "global bundle kept");
  return `slice ${slice}, ${bundles.length} bundle(s) shown`;
});
let server;
await step("tiger/server", async () => {
  server = await request("tiger/server");
  check(server.build && server.game, "no build or game");
  return `${server.game} ${server.platform} ${server.build}`;
});
// The app's data service on the target's scenario (meta) and the server's
// packages, as the teleport menu reads it.
await step("data service /slices", async () => {
  const { targets } = await request("tiger/targets");
  const scenario = targets.find((t) => t.id === targetId)?.meta?.scenario;
  check(scenario, "target has no meta.scenario");
  const service = spawn(process.execPath, [DATA_SERVICE, "--port", "0"]);
  try {
    const port = await new Promise((resolve, reject) => {
      service.stdout.on("data", (data) => {
        const match = String(data).match(LISTENING);
        if (match) {
          resolve(Number(match[1]));
        }
      });
      service.once("exit", (code) => reject(new Error(`data service exited ${code}`)));
    });
    const query = new URLSearchParams({
      build: server.build,
      dictionary: server.dictionaryDir ?? "",
      packages: server.packagesDir,
      scenario,
    });
    const body = await (await fetch(`http://127.0.0.1:${port}/slices?${query}`)).json();
    check(!body.error, body.error);
    check(body.slices.some((s) => s.region === "array"), "no array region");
    const array = body.slices.find((s) => s.region === "array");
    check(body.slices.some((s) => s.spawnPoints?.length), "no slice has spawnPoints");
    const names = array?.spawnPoints?.map((p) => (p.count > 1 ? `${p.name}×${p.count}` : p.name)) ?? [];
    check(names.includes("default") && names.includes("array_to_dome_c×3"), `array spawn points ${names}`);
    return `${scenario}: ${body.slices.length} slices, ${body.slices
      .slice(0, 4)
      .map((s) => `${s.handle} ${s.region}${s.public ? " (public)" : ""}`)
      .join(", ")}, …; array spawns ${names.join(", ")}`;
  } finally {
    service.kill();
  }
});
await step("tiger/commands", async () => {
  const { commands } = await request("tiger/commands");
  const verbs = commands.map((c) => c.verb);
  check(verbs.includes("threads"), "no /threads");
  return verbs.join(" ");
});
await step('evaluate "/teleport 14.2 spawn_a"', async () => {
  const { result } = await request("evaluate", {
    expression: "/teleport 14.2 spawn_a",
    targetId,
  });
  return result;
});
// The mock has no mission phases: a clean failure is the pass.
await step("tiger/activatePhase (expect clean failure)", async () => {
  try {
    await request("tiger/activatePhase", { targetId, phase: 0 });
  } catch (error) {
    check(error.message.includes("no mission phase"), error.message);
    return error.message;
  }
  throw new Error("activated a phase the mock doesn't have");
});
await step("continue", async () => {
  await request("setBreakpoints", { source: { path }, breakpoints: [] });
  const before = events.filter((e) => e.event === "continued").length;
  await request("continue", { targetId });
  check(
    events.filter((e) => e.event === "continued").length > before,
    "no continued event"
  );
  const { targets } = await request("tiger/targets");
  check(!targets.find((t) => t.id === targetId).paused, "still paused");
});

socket.close();
console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
