import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { BsSchema } from "../../bungiescript/schema.ts";
import type { HksBytecode } from "../bytecode/proto.ts";
import { readBytecode } from "../bytecode/reader.ts";

// Where compiled script tags (class 80800B48) come from. `read` returns the
// whole tag; the Lua chunk inside starts at its signature, not at byte 0.
export interface ScriptSource {
  read(tagId: string): Uint8Array | undefined;
  // The schema compiled beside a tag's chunk (TU0): thread startup flags and
  // member defaults. A tag without one is read off its chunk.
  schema?(tagId: string): BsSchema | undefined;
  tags(): readonly string[];
}

export function loadScriptSchemas(
  source: ScriptSource,
  tagIds: Iterable<string>
): Map<string, BsSchema> {
  const schemas = new Map<string, BsSchema>();
  for (const tagId of tagIds) {
    const wanted = tagId.toUpperCase();
    const schema = source.schema?.(wanted);
    if (schema !== undefined) {
      schemas.set(wanted, schema);
    }
  }
  return schemas;
}

const SIGNATURE = [0x1b, 0x4c, 0x75, 0x61];

export function formatScriptTag(tag: number): string {
  return (tag >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

// Where the Lua chunk in a dumped script tag starts; -1 for a stub tag that
// holds none.
export function scriptChunkOffset(raw: Uint8Array): number {
  for (let at = 0; at + SIGNATURE.length <= raw.length; at++) {
    if (SIGNATURE.every((byte, i) => raw[at + i] === byte)) {
      return at;
    }
  }
  return -1;
}

// Some script tags are stubs with no chunk in them; those read as undefined.
export function loadScriptChunk(
  source: ScriptSource,
  tagId: string
): HksBytecode | undefined {
  const raw = source.read(tagId.toUpperCase());
  if (!raw) {
    return;
  }
  const offset = scriptChunkOffset(raw);
  if (offset < 0) {
    return;
  }
  return readBytecode(raw.subarray(offset), tagId.toUpperCase());
}

// The tags a chunk references ("Link B"): the reference list's header is not
// decoded, so every aligned u32 is matched against the known tags.
export function scriptReferences(
  source: ScriptSource,
  tagId: string
): string[] {
  const wanted = tagId.toUpperCase();
  const raw = source.read(wanted);
  if (!raw) {
    return [];
  }
  const known = new Set(source.tags());
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const refs: string[] = [];
  const seen = new Set<string>([wanted]);
  for (let at = 0; at + 4 <= raw.length; at += 4) {
    const ref = formatScriptTag(view.getUint32(at));
    if (known.has(ref) && !seen.has(ref)) {
      seen.add(ref);
      refs.push(ref);
    }
  }
  return refs;
}

// A directory of dumped script tags named `<TAGID>_<label>.lua51`.
export function directoryScriptSource(dir: string): ScriptSource {
  const files = new Map<string, string>();
  for (const entry of readdirSync(dir)) {
    if (entry.toLowerCase().endsWith(".lua51")) {
      files.set(entry.split("_")[0].toUpperCase(), join(dir, entry));
    }
  }
  const tags = [...files.keys()].sort();
  return {
    read(tagId) {
      const path = files.get(tagId.toUpperCase());
      return path ? new Uint8Array(readFileSync(path)) : undefined;
    },
    tags() {
      return tags;
    },
  };
}
