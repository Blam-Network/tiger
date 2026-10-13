# @blamnetwork/bullshcript

BullShcript is a best-effort reimplementation of BungieScript (and EncounterScript) for Destiny 1. It includes a compiler, decompiler, syntax highlighting and a runtime / VM. It can be used to compile Destiny 1 mission scripts and run them on a server.

Its name originates from the fact that we have to my knowledge never seen real BungieScript, so this is an estimation, and kind of BS.

## What is BungieScript

BungieScript seemingly has evolved through the years, BullShcript focuses on its earlier iterations. BungieScript is a proprietary language created by Bungie used to write mission scripts for Destiny. In Destiny 1, this language is seemingly based on Python 2.

On June 21, 2023 Gamecheat13 located a `release_internal` Alpha build of Destiny 1 (ver `36735.13.12.02.1953.alpha`) on Production Xbox LIVE (ProdNet). This is the earliest known build of Destiny and the only `release_internal` build that has leaked. This build of Destiny 1 is unique in that it includes compiled BungieScript files. These compiled scripts include snippets of source code and other information that have helped us understand how the language works. Notably, these scripts are compiled to Havok Script (hks) bytecode: Lua 5.1 underneath, but with its own opcodes and value types, which is why BullShcript has its own decompiler and VM rather than using stock Lua's. It can be assumed that they were then run in the Havok Script VM (formerly Kore VM).

Beyond the Havok Script influence, it is also worth noting that these scripts have their HaloScript roots as well.

For more information about the language, see [LANGUAGE.md](./LANGUAGE.md).

### BungieScript Files

| Extension | Name | Description |
|----|-----|--------|
|.bs|BungieScript|Libraries and classes: `class`, `struct` and `enum` blocks, several per file (math helpers, weapons, the PvP game types and controllers).|
|.es|EncounterScript|One encounter per file, bound to the activity bundle its file name hashes to. The whole file is the class (`c_encounter__<stem>`).|
|.esp|EncounterScript Phase|One mission phase per file, beside its mission's `.es` (`<mission>_mission1.esp`, `_mission2`, ...), run in order.|
|.esu|EncounterScript Utilities|Reusable encounter pieces (kill objectives, dropship events, ...) that rows spawn as child scripts.|

### Script Execution

BungieScript is executed on the Destiny Activity Host server and **NOT ON THE GAME CLIENT**.
The game sends up incidents when the player does something (like killing mobs, picking up loot, activating triggers) and the server sends down bundle information which can be used to control scriptable objects in the slice, such as spawning a boss. The lifecycle of these scripts comes from the Havok Script VM. I recommend studying Call of Duty Ghosts to learn more about that.

## Tools

- `decompile(chunk)` (alpha build) renders a parsed chunk (`parseLuaChunk`, or `loadScriptChunk` from a `ScriptSource`).
- `debugSnapshot()` on a running runtime lists threads, what each is waiting on, the encounters the director has scheduled, and recent calls.
- `compileBungieScript(files)` compiles a set of BungieScript sources as one project to chunks, schemas and the intermediate Lua; `compileLua(source)` compiles plain Lua (both exported from the TU0 build, neither tied to it).

## Builds

| Import | Build |
|---|---|
| `@blamnetwork/bullshcript/destiny1/v36735_13_12_02_1953_alpha` | 36735.13.12.02.1953.alpha, 2013-12-02 (Xbox 360) |
| `@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live` | 41375.14.07.03.1501.live, 2014-07-03 (Xbox 360) |

For the most part the language is the same across versions but some game versions have different native functions and structures they use, so the core compiler and VM is shared with natives being overridden for your version.

## Running scripts

A `ScriptRuntime` runs one activity's scripts. Give it the activity's bundles and somewhere to read scripts from, tell it what happens in the game, and it tells you what the scripts change:

```ts
import { directoryScriptSource, ScriptRuntime } from "@blamnetwork/bullshcript/destiny1/v36735_13_12_02_1953_alpha";

const runtime = new ScriptRuntime({
  bundles,                                       // the activity's bundle tags
  scripts: directoryScriptSource("lua-chunks"),  // compiled scripts by tag id
  scriptFor: (bundleTag) => scriptTagOf(bundleTag),
  clock: { activityTicks: () => ticks },
  tickSeconds: 1 / 30,
  onItemChange: (change) => send(change),        // spawn a squad, start a timer...
});

runtime.start();
runtime.reportPlayerSpawned();                   // ...and report*() for kills, triggers, pickups
setInterval(() => runtime.tickIfDue(Date.now()), 33);
```

For TU0, import from `v41375_14_07_03_1501_live` and read scripts compiled from Fukugen Daihon (`readCompiledBs`).

## Building

From the tiger root:

```sh
npm install
npm run build -w @blamnetwork/bullshcript
```

This writes `dist/` (ESM), `dist-cjs/` (CommonJS) and the `bullshcript` command (`dist/cli.js`).

## The CLI

Once built, the `bullshcript` command does three things:

```sh
# Turn a compiled chunk back into Lua (--lines notes each statement's source line)
bullshcript decompile 821B8049_hostonly_venus.lua51 --lines

# Compile Lua into a chunk
bullshcript compile mission.lua --out mission.luac

# Compile BungieScript, every file passed in as one project
bullshcript bs compile es/venus/**/*.es bs/**/*.bs --out build
```

`bs compile` writes a `compiled_bs/` folder laid out like Bungie's own build output:

```
compiled_bs/
  index.json                              what was compiled, and where it went
  lua/<module>/<decl>.luac                each class's chunk (add --lua for the Lua too)
  code_tags/<module>/<decl>.schema.json   each class's members, types and defaults
```

`<module>` is the source file's path, with `bs/` dropped and `es/` renamed to `_es/`.

If anything fails to compile, nothing is written and the previous `compiled_bs/` stays as it was. Servers read and write this folder with the same code: `readCompiledBs` and `writeCompiledBs`.

## Debugging scripts

`ScriptDebugger` (`@blamnetwork/bullshcript/destiny1/debug`) lets a client inspect and control running script hosts over the Debug Adapter Protocol. [bullshcript-debugger](../bullshcript-debugger) is its desktop client, and its README covers embedding it.

## The VS Code extension

`vscode-extension/` highlights BungieScript and EncounterScript (`.bs`, `.es`, `.esp`, `.esu`). `npm run vscode:package` packs it into a `.vsix` without vsce; `npm run vscode:install` installs it.

## Fukugen Daihon

The scripts themselves live next door in [Fukugen Daihon](../fukugen-daihon), one folder per build (`destiny1/<build>/`), laid out the way Bungie's source tree was: `bs/` for libraries, `es/` for encounters.

- **Alpha:** recovered from the alpha's compiled scripts by `npm run lift:alpha`. Every script compiles back to the same code Bungie shipped, and all but two to the same bytes.
- **TU0:** the disc shipped no scripts, so these are written by hand.

To use a folder from code, `fukugenDaihonDir()` finds it and `loadScriptFolder()` reads it. To compile one from the command line, run `bullshcript bs compile` on it.

## ESM and CommonJS

The package ships both builds (`dist/` and `dist-cjs/`). Node consumers `require` the CommonJS build; vitest consumers can import the ESM one.

## Tests

```sh
npm test -w @blamnetwork/bullshcript
```

Tests live in `test/`, in the same layout as `src/`. Most need nothing but the repo. The rest need the game's files, and skip when they can't find them:

| Variable | Points at | Turns on |
|---|---|---|
| `TIGER_LUA_CHUNKS` | a folder of the alpha's dumped script tags (`<TAGID>_<label>.lua51`) | decompiling, recompiling and running the alpha's real scripts |
| `TIGER_PACKAGES_DIR` | the alpha's `packages` folder | checking compiled schemas against the alpha's |

The Fukugen Daihon tests (`test/fukugen_daihon_*.test.ts`, `test/tu0_missions/`) compile and run the scripts in [Fukugen Daihon](../fukugen-daihon), so they expect it beside this package. Set `FUKUGEN_DAIHON_DIR` if it lives somewhere else.
