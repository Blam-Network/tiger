# bullshcript debugger

Desktop debugger (Tauri 2 + React + Monaco) for bullshcript's script host. It speaks the
debugger's DAP-over-WebSocket protocol (`ws://<host:port>/debug/dap`, see
`../bullshcript/src/debug/`).

- `npm install` once (this package is not an npm workspace of the monorepo).
- `npm run dev`: the UI in a browser at http://localhost:1420.
- `npm run tauri dev` / `npm run tauri build`: the desktop app.
- `npm run mock`: a stand-in target on **ws://127.0.0.1:8199/debug/dap** running a small
  BungieScript on the real bullshcript build (`../bullshcript/dist`; build it first).
  `MOCK_PORT` changes the port.
- `npm run smoke [-- host:port]`: drives a target through the main requests and prints
  pass/fail per step (default: the mock).

The app connects to `127.0.0.1:8099` (the server) by default; change the address in the
toolbar (remembered) or open the UI with `?address=127.0.0.1:8199` for the mock.

Keys: F5 continue, F6 pause, F10 step over, F11 step into, Shift+F11 step out, F8 one tick.

## The script debugger

The app talks to bullshcript's `ScriptDebugger` (`@blamnetwork/bullshcript/destiny1/debug`, source in `../bullshcript/src/debug/`). It attaches to running script hosts, one target per host. A client can:

- see a target's phases, script instances and threads, and what each thread waits on
- read stacks, locals, `self` members and bound objects with their rows
- set breakpoints, conditions and logpoints, step, pause, and advance one tick at a time
- wake, kill or restart threads, start a phase, act on bundle rows and send incidents

Expressions, conditions and log messages are BungieScript.

### Embedding

```ts
import { DapSession, ScriptDebugger } from "@blamnetwork/bullshcript/destiny1/debug";

const debug = new ScriptDebugger({
  sourcePaths: () => [...sources.keys()], // all scripts, so breakpoints can go in early
  sourceText: (path) => sources.get(path),
});
debug.attach("act_cosmo_m4_dome_c#1", "act_cosmo_m4_dome_c", host, {
  bundleInfo: (bundle) => worlds.get(bundle), // { world, bubbles }
  meta: { activity: "act_cosmo_m4_dome_c" },
});
// debug.detach(id) when the host ends

// one DapSession per client
const session = new DapSession(debug, (message) => ws.send(JSON.stringify(message)));
ws.on("message", (data) => session.handle(JSON.parse(String(data))));
```

Clients speak the Debug Adapter Protocol, plus `tiger/*` requests for the activity views. The embedder can add its own: `registerCommand` adds a `/verb` console command, `registerRequest` answers a custom request. `onChanged` tells it a client's action may have changed a target's rows, so it can send them at once.

### Behaviour

- A breakpoint freezes its whole target: no other thread runs and the script clock holds. Clients stay connected.
- A breakpoint inside a host call (a `sleep_until` condition, an import) cannot pause. It records what it saw and execution carries on.
- A step across a `sleep` runs the target until that thread reaches its next line.
