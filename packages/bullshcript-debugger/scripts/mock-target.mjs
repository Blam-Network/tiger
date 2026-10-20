// A stand-in for the server: one script host running a small BungieScript on
// the real bullshcript build, served over the debugger's WebSocket.
// npm run mock  ->  ws://127.0.0.1:8199/debug/dap  (MOCK_PORT to change)
import { WebSocketServer } from "ws";
import {
  DapSession,
  ScriptDebugger,
} from "../../bullshcript/dist/versions/destiny1/debug.js";
import ScriptRuntime, {
  ActivityBundleItemType,
  compileScriptFiles,
  fnv1,
} from "../../bullshcript/dist/versions/destiny1/v41375_14_07_03_1501_live.js";

const PORT = Number(process.env.MOCK_PORT ?? 8199);
const PATH = "es/mock/enc_mock_patrol.es";
const TAG = 0x82_ff_00_01;
const BUNDLE = 0x12_34_56_78;

// Line numbers matter to scripts/smoke.mjs (it breaks on `heat = ...`).
const SOURCE = `# es\\mock\\enc_mock_patrol.es
squad sq_guards
int counter = 0
int wave = 0
real heat = 0.5

@startup()
script sc_main():
    sq_guards.place()
    while true:
        counter = counter + 1
        heat = heat + bump(counter)
        event_message("main loop %d heat %f", counter, heat)
        sleep(2)

@startup()
script sc_waves():
    while true:
        sleep(3)
        wave = wave + 1
        event_message("wave %d", wave)

script sc_reward():
    event_message("reward woken")
    sleep_until(wave > 100)

def bump(amount):
    scaled = amount * 0.25
    return scaled
`;

const compiled = compileScriptFiles([{ path: PATH, text: SOURCE }]);
const errors = compiled.diagnostics.filter((d) => d.severity === "error");
if (errors.length > 0) {
  console.error(errors);
  process.exit(1);
}
const chunk = compiled.chunkFor(PATH);
const tagId = TAG.toString(16).toUpperCase();
const host = new ScriptRuntime({
  bundles: [
    {
      bundle: BUNDLE,
      rows: [
        {
          cells: [2],
          memberCount: 1,
          name: "sq_guards",
          nameHash: fnv1("sq_guards"),
          typeId: ActivityBundleItemType.Squad,
          typeIndex: 0,
        },
      ],
      tag: TAG,
    },
  ],
  clock: { activityTicks: () => 0 },
  scriptFor: () => TAG,
  scripts: {
    read: (id) => (id === tagId ? chunk : undefined),
    schema: (id) =>
      id === tagId ? compiled.compiledDecl(PATH).schema : undefined,
    tags: () => [tagId],
  },
  tickSeconds: 1,
});
host.start();
host.reportPlayerSpawned();

const dbg = new ScriptDebugger({
  sourceText: (path) => (path === PATH ? SOURCE : undefined),
});
dbg.attach("mock", "mock patrol", host, {
  bundleInfo: () => ({ bubbles: ["0.0"], world: "private" }),
  meta: { activity: "act_cosmo_m4_dome_c", scenario: "80cb8089" },
  // the decorator lines are not in the chunk's line numbers
  standInLines: (path) =>
    path === PATH ? compiled.compiledDecl(PATH).standInLines : undefined,
});

// What a server answers itself: its players, and a teleport that only notes.
dbg.registerRequest("tiger/players", () => ({
  players: [
    {
      account: "mock-account",
      activity: "mock patrol",
      bubble: "0.0",
      character: "mock-guardian",
      id: "player-1",
      level: 20,
      name: "Mock Guardian",
      platform: "xbox360",
      powerLevel: 30,
      targetId: "mock",
    },
  ],
}));
// Real data paths, so the app's data service reads the Last Array's slices.
dbg.registerRequest("tiger/server", () => ({
  build: "v41375_14_07_03_1501_live",
  dictionaryDir: String.raw`C:\Users\codie\Projects\tiger\packages\dictionary\destiny1\v41375_14_07_03_1501_live\hashes`,
  game: "destiny1",
  packagesDir: String.raw`D:\Games\x360\Destiny (World) (En,Fr,De,Es,It)\packages`,
  platform: "x360",
  scriptsDir: String.raw`C:\Users\codie\Projects\tiger\packages\fukugen-daihon`,
}));
dbg.registerCommand("teleport", {
  usage: "<bubble.state> [spawn point] | clear",
  run: (args) => {
    host.writer.note(`mock teleport ${args.join(" ")}`);
    return args[0] === "clear"
      ? "teleport cleared"
      : `teleport to ${args.join(" ")}`;
  },
});

// A held target ignores ticks itself (the scheduler is paused).
const ticker = setInterval(() => host.tick(), 1000);

const wss = new WebSocketServer({ host: "127.0.0.1", port: PORT });
wss.on("connection", (socket, request) => {
  if (request.url !== "/debug/dap") {
    socket.close(1008, "not /debug/dap");
    return;
  }
  console.log("client connected");
  const session = new DapSession(dbg, (message) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  });
  socket.on("message", (data) => {
    try {
      session.handle(JSON.parse(String(data)));
    } catch (error) {
      console.error("bad message", error);
    }
  });
  socket.on("close", () => {
    session.close();
    console.log("client gone");
  });
});
wss.on("listening", () =>
  console.log(`mock target on ws://127.0.0.1:${PORT}/debug/dap`)
);

const stop = () => {
  clearInterval(ticker);
  wss.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
