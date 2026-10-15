import { beforeAll, describe, expect, it } from "vitest";
import type {
  HksBytecode,
  Method,
} from "../../../../../src/hks/bytecode/proto.ts";
import { readBytecode } from "../../../../../src/hks/bytecode/reader.ts";
import { compileLua } from "../../../../../src/hks/compiler/compile.ts";
import {
  directoryScriptSource,
  type ScriptSource,
  scriptChunkOffset,
} from "../../../../../src/hks/source/script_source.ts";
import type { ItemChange } from "../../../../../src/host/state/items.ts";
import { ScriptRuntime } from "../../../../../src/versions/destiny1/v36735_13_12_02_1953_alpha/host/runtime.ts";
import { decompile } from "../../../../../src/versions/destiny1/v36735_13_12_02_1953_alpha/lua/decompile.ts";

// Every chunk in TIGER_LUA_CHUNKS decompiles, compiles back to the same code,
// and runs the same.
const chunkDir = process.env.TIGER_LUA_CHUNKS;

// the decompiler's `-- lines a-b` notes, which follow the chunk's own lines
const LINE_NOTE = / -- lines \d+-\d+/g;

interface Entry {
  at: number;
  chunk: HksBytecode;
  recompiled: Uint8Array;
  source: string;
  tag: Uint8Array;
}

// Everything but line info, which the decompiled layout does not keep.
function codeOf(proto: Method): unknown {
  return {
    code: proto.code.map((i) => i.raw),
    constants: proto.constants,
    isVararg: proto.isVararg,
    locals: proto.locals,
    maxStackSize: proto.maxStackSize,
    numParams: proto.numParams,
    nups: proto.nups,
    protos: proto.protos.map(codeOf),
    upvalues: proto.upvalues,
    name: proto.name,
    source: proto.source,
  };
}

describe.skipIf(chunkDir === undefined)("the compiler on the corpus", () => {
  let original: ScriptSource;
  const entries = new Map<string, Entry>();

  beforeAll(() => {
    original = directoryScriptSource(chunkDir as string);
    for (const tagId of original.tags()) {
      const tag = original.read(tagId) as Uint8Array;
      const at = scriptChunkOffset(tag);
      if (at < 0) {
        continue;
      }
      const chunk = readBytecode(tag.subarray(at), tagId);
      const source = decompile(chunk).source;
      const recompiled = compileLua(source, { chunkName: chunk.root.source });
      entries.set(tagId, { at, chunk, recompiled, source, tag });
    }
  });

  it("decompiles every chunk with no gap", () => {
    const gaps = [...entries.values()].flatMap(({ chunk }) =>
      decompile(chunk).gaps.map((gap) => `${chunk.tagId} ${gap.functionPath}`)
    );
    expect(gaps).toEqual([]);
  });

  it("compiles every decompiled chunk back to the same code", () => {
    expect(entries.size).toBeGreaterThan(0);
    const differ: string[] = [];
    for (const [tagId, { chunk, recompiled }] of entries) {
      const again = readBytecode(recompiled, tagId);
      if (
        JSON.stringify(codeOf(again.root)) !==
        JSON.stringify(codeOf(chunk.root))
      ) {
        differ.push(tagId);
      }
    }
    expect(differ).toEqual([]);
  });

  it("decompiles the recompiled chunk to the same source", () => {
    for (const [tagId, { recompiled, source }] of entries) {
      const again = decompile(readBytecode(recompiled, tagId)).source;
      expect(again.replace(LINE_NOTE, ""), tagId).toBe(
        source.replace(LINE_NOTE, "")
      );
    }
  });

  // The recompiled chunks spliced into their own tags, so reference lists
  // and everything else the host reads off a tag stay the original's.
  const recompiledSource = (): ScriptSource => ({
    tags: () => original.tags(),
    read: (tagId) => {
      const entry = entries.get(tagId);
      if (entry === undefined) {
        return original.read(tagId);
      }
      const { at, chunk, recompiled, tag } = entry;
      return Buffer.concat([
        tag.subarray(0, at),
        recompiled,
        tag.subarray(at + chunk.chunkBytes),
      ]);
    },
  });

  // An activity's first ticks: every item change and host log line.
  const trace = (scripts: ScriptSource, root: number) => {
    const changes: ItemChange[] = [];
    const log: string[] = [];
    const runtime = new ScriptRuntime({
      bundles: [{ bundle: 0x1234_5678, rows: [], tag: 0x809b_800d }],
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
      onItemChange: (change) => changes.push(change),
      scriptFor: () => root,
      scripts,
      seed: 7,
      tickSeconds: 1,
    });
    runtime.start();
    runtime.reportPlayerSpawned();
    for (let i = 0; i < 60; i++) {
      runtime.tick();
    }
    return { changes, log, snapshot: runtime.debugSnapshot() };
  };

  // Activity roots: venus chapter 2, the venus strike, action_mock, the
  // tower, and the pvp modes.
  const ROOTS = [
    0x821b_8000, 0x821b_801c, 0x821b_8042, 0x8228_a000, 0x821e_2000,
    0x8220_c000, 0x8223_6000, 0x8226_0000,
  ];

  it.each(
    ROOTS.map((root) => [root.toString(16).toUpperCase(), root])
  )("runs %s the same compiled from source", (_name, root) => {
    if (!original.tags().includes(root.toString(16).toUpperCase())) {
      return;
    }
    const before = trace(original, root);
    const after = trace(recompiledSource(), root);
    expect(before.log.length).toBeGreaterThan(0);
    expect(after.changes).toEqual(before.changes);
    expect(after.log).toEqual(before.log);
    expect(after.snapshot).toEqual(before.snapshot);
  });
});
