// Where a prototype's code came from: its chunk's source path, and the name
// a script knows it by. BungieScript line numbers are already in lineInfo
// (the compiler maps them), so a frame's line is lineInfo[pc].

import type { HksBytecode, Method } from "../hks/bytecode/proto.ts";
import { walkProtos } from "../hks/bytecode/reader.ts";
import { LuaClosure, type LuaTable } from "../hks/vm/values.ts";

const THREAD_IMPL_SUFFIX = "_d_execute_impl";
const SOURCE_PREFIX = /^[@=]/;

// "@es\\cosmo\\dome_c\\enc_dome_c_m4.es" -> "es/cosmo/dome_c/enc_dome_c_m4.es"
export function sourcePath(source: string | undefined): string | undefined {
  if (source === undefined) {
    return;
  }
  return source.replace(SOURCE_PREFIX, "").replaceAll("\\", "/");
}

export class SourceIndex {
  private readonly paths = new WeakMap<Method, string>();
  private readonly names = new WeakMap<Method, string>();
  private readonly byPath = new Map<string, Method[]>();
  private readonly seen = new WeakSet<HksBytecode>();

  addChunk(chunk: HksBytecode): void {
    if (this.seen.has(chunk)) {
      return;
    }
    this.seen.add(chunk);
    const path = sourcePath(chunk.root.source) ?? chunk.tagId;
    const list = this.byPath.get(path) ?? [];
    for (const prototype of walkProtos(chunk.root)) {
      this.paths.set(prototype, path);
      list.push(prototype);
    }
    this.byPath.set(path, list);
  }

  // Names the closures an instance holds: methods by their key, threads by
  // their name.
  nameFrom(table: LuaTable): void {
    for (const [key, value] of table.entries()) {
      if (typeof key !== "string" || !(value instanceof LuaClosure)) {
        continue;
      }
      if (this.names.has(value.prototype)) {
        continue;
      }
      this.names.set(
        value.prototype,
        key.endsWith(THREAD_IMPL_SUFFIX)
          ? `thread ${key.slice(0, -THREAD_IMPL_SUFFIX.length)}`
          : key
      );
    }
  }

  pathOf(prototype: Method): string | undefined {
    return this.paths.get(prototype);
  }

  nameOf(prototype: Method): string {
    const name = this.names.get(prototype) ?? prototype.name;
    if (name !== undefined && name !== "(main chunk)") {
      return name;
    }
    return prototype.name === "(main chunk)"
      ? "(main chunk)"
      : `function@${prototype.lineDefined}`;
  }

  prototypesOf(path: string): readonly Method[] {
    return this.byPath.get(path) ?? [];
  }

  get sourcePaths(): string[] {
    return [...this.byPath.keys()].sort();
  }
}
