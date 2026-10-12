import { beforeAll, describe, expect, it } from "vitest";
import { encodeLuaChunk } from "../../../../../src/hks/encode.ts";
import {
  applyUpvalueProvider,
  missingGlobals,
  runMainChunk,
} from "../../../../../src/hks/host_env.ts";
import {
  directoryScriptSource,
  type ScriptSource,
  scriptChunkOffset,
} from "../../../../../src/hks/script_source.ts";
import type { LuaChunk } from "../../../../../src/hks/types.ts";
import { parseLuaChunk } from "../../../../../src/hks/undump.ts";
import { ScriptRuntime } from "../../../../../src/versions/destiny1/v36735_13_12_02_1953_alpha/host/runtime.ts";
import { decompile } from "../../../../../src/versions/destiny1/v36735_13_12_02_1953_alpha/lua/decompile.ts";

// A directory of dumped script tags (`<TAGID>_<label>.lua51`).
const chunkDir = process.env.TIGER_LUA_CHUNKS;

describe.skipIf(chunkDir === undefined)("the TU0 script corpus", () => {
  let source: ScriptSource;
  const chunks: { chunk: LuaChunk; raw: Uint8Array }[] = [];
  beforeAll(() => {
    source = directoryScriptSource(chunkDir as string);
    // Stub script tags carry no chunk; everything else has to parse.
    for (const tagId of source.tags()) {
      const tag = source.read(tagId) as Uint8Array;
      const at = scriptChunkOffset(tag);
      if (at >= 0) {
        const raw = tag.subarray(at);
        chunks.push({ chunk: parseLuaChunk(raw, tagId), raw });
      }
    }
  });

  it("undumps every chunk and re-encodes it byte for byte", () => {
    expect(chunks.length).toBeGreaterThan(0);
    for (const { chunk, raw } of chunks) {
      expect(
        Buffer.from(encodeLuaChunk(chunk)).equals(
          Buffer.from(raw.subarray(0, chunk.chunkBytes))
        ),
        chunk.tagId
      ).toBe(true);
    }
  });

  it("decompiles every chunk", () => {
    for (const { chunk } of chunks) {
      expect(decompile(chunk).source, chunk.tagId).toContain(chunk.tagId);
    }
  });

  const runtime = () =>
    new ScriptRuntime({
      bundles: [],
      clock: { activityTicks: () => 0 },
      scriptFor: () => undefined,
      scripts: source,
      tickSeconds: 1,
    });

  it("binds every global every chunk reads", () => {
    const { vm } = runtime();
    const missing = new Map<string, string[]>();
    for (const { chunk } of chunks) {
      for (const name of missingGlobals(chunk, vm.globals)) {
        missing.set(name, [...(missing.get(name) ?? []), chunk.tagId]);
      }
    }
    expect(Object.fromEntries(missing)).toEqual({});
  });

  it("loads every chunk's module and fills its imports", () => {
    const { vm } = runtime();
    const failed: Record<string, string> = {};
    for (const { chunk } of chunks) {
      try {
        applyUpvalueProvider(vm, runMainChunk(vm, chunk));
      } catch (error) {
        failed[chunk.tagId] = String(error);
      }
    }
    expect(failed).toEqual({});
  });
});
