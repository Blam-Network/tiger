// The chunk graph: which scripts a bundle set runs, and how enum_of and enum
// definitions read. Free of any host instance.

import { scriptStem } from "../../bungiescript/parser.ts";
import type { BsSchema } from "../../bungiescript/schema.ts";
import type { HksBytecode } from "../../hks/bytecode/proto.ts";
import {
  formatScriptTag,
  loadScriptChunk,
  type ScriptSource,
  scriptReferences,
} from "../../hks/source/script_source.ts";
import { LuaHostFunction, LuaTable, type LuaValue } from "../../hks/vm/values.ts";
import type { EncounterScriptHostOptions } from "../activity/host_context.ts";
import type {
  ActivityBundleItemTypes,
  ActivityBundleTag,
} from "../tags/tag_types.ts";

// enum_of(t): the compiler's generic-for generator, indexed from 0.
const ENUM_OF_STEP = new LuaHostFunction("enum_of.step", (args) => {
  const table = args[0];
  const index = (typeof args[1] === "number" ? args[1] : -1) + 1;
  const value = table instanceof LuaTable ? table.get(index) : undefined;
  return value === undefined ? [] : [index, value];
});
export const ENUM_OF = new LuaHostFunction("enum_of", (args) => [
  ENUM_OF_STEP,
  args[0],
  -1,
]);

// Member meanings are unknown.
export class EnumDefinition extends LuaTable {
  private readonly enumName: string;

  constructor(enumName: string) {
    super();
    this.enumName = enumName;
  }

  override get(key: LuaValue): LuaValue {
    const own = super.get(key);
    if (own !== undefined || typeof key !== "string") {
      return own;
    }
    return `${this.enumName}.${key}`;
  }
}

// Each bundle's own script (Link A) plus the closure of what it references
// (Link B); siblings resolve by name (Link C). `rowOwners` is the bundle each
// root speaks for, and each mission (phase script) a root references.
export function loadScriptGraph(
  scripts: ScriptSource,
  scriptFor: (bundleTag: number) => number | undefined,
  bundles: readonly ActivityBundleTag[]
): {
  chunks: HksBytecode[];
  chunkOwners: Map<string, number>;
  rootTags: Set<string>;
  rowOwners: Map<string, number>;
} {
  const chunks: HksBytecode[] = [];
  const chunkOwners = new Map<string, number>();
  const rootTags = new Set<string>();
  const referencedBy = new Map<string, number>();
  const rowOwners = new Map<string, number>();
  const seen = new Set<string>();
  const queue: string[] = [];
  for (const bundle of bundles) {
    const script = scriptFor(bundle.tag);
    if (script !== undefined) {
      const tagId = formatScriptTag(script);
      rootTags.add(tagId);
      if (!chunkOwners.has(tagId)) {
        chunkOwners.set(tagId, bundle.bundle);
      }
      queue.push(tagId);
    }
  }
  while (queue.length > 0) {
    const tagId = queue.shift();
    if (tagId === undefined || seen.has(tagId)) {
      continue;
    }
    seen.add(tagId);
    const chunk = loadScriptChunk(scripts, tagId);
    if (chunk === undefined) {
      continue;
    }
    chunks.push(chunk);
    const refs = scriptReferences(scripts, tagId);
    const owner = chunkOwners.get(tagId);
    const mission = referencedBy.get(tagId);
    if (owner !== undefined) {
      rowOwners.set(tagId, owner);
      for (const ref of refs) {
        if (!referencedBy.has(ref)) {
          referencedBy.set(ref, owner);
        }
      }
    } else if (
      mission !== undefined &&
      chunk.root.source?.toLowerCase().endsWith(".esp") === true
    ) {
      rowOwners.set(tagId, mission);
    }
    queue.push(...refs);
  }
  return { chunkOwners, chunks, rootTags, rowOwners };
}

const STATIC_ARRAY_OF = /^static_array<\s*([A-Za-z_]\w*)\s*,\s*(\d+)\s*>$/;
const DYNAMIC_ARRAY_OF = /^dynamic_array<\s*([A-Za-z_]\w*)\s*>$/;
const ROW_ELEMENT = /^\[\d+\]$/;

// From the Encounter row's 8080047B lookup tag (the child's script name),
// else childScriptSchemaMap, else the script classes a compiled schema
// declares as members. A phase is the activity's own, never a child.
export function childScriptsFor(
  types: ActivityBundleItemTypes,
  scripts: ScriptSource,
  chunks: readonly HksBytecode[],
  bundles: readonly ActivityBundleTag[],
  scriptBundles: readonly ActivityBundleTag[],
  childScriptSchemaMap: EncounterScriptHostOptions["childScriptSchemaMap"] = {},
  schemas: ReadonlyMap<string, BsSchema> = new Map()
): ReadonlyMap<string, HksBytecode> {
  const slots = new Map<string, HksBytecode>();
  const byName = new Map<string, HksBytecode>();
  for (const chunk of chunks) {
    byName.set(scriptName(chunk), chunk);
  }
  const rowBundles = new Map<number, ActivityBundleTag>();
  for (const bundle of [...bundles, ...scriptBundles]) {
    rowBundles.set(bundle.tag, bundle);
  }
  for (const bundle of rowBundles.values()) {
    for (const row of bundle.rows) {
      if (
        row.typeId !== types.Encounter ||
        row.childScript === undefined ||
        row.name === undefined
      ) {
        continue;
      }
      const child = byName.get(row.childScript);
      if (child) {
        // The slot key is the row name's last segment.
        slots.set(row.name.split(".").at(-1) ?? row.name, child);
      }
    }
  }
  for (const chunk of chunks) {
    const entry = childScriptSchemaMap?.[chunk.tagId.toUpperCase()];
    if (entry === undefined) {
      continue;
    }
    for (const [slot, childTag] of Object.entries(entry)) {
      if (slots.has(slot)) {
        continue;
      }
      const child = loadScriptChunk(scripts, childTag);
      if (child) {
        slots.set(slot, child);
      }
    }
  }
  // every Encounter row's last name segment ("pf_point[0]")
  const encounterSlots = new Set<string>();
  for (const bundle of rowBundles.values()) {
    for (const row of bundle.rows) {
      if (row.typeId === types.Encounter && row.name !== undefined) {
        encounterSlots.add(row.name.split(".").at(-1) ?? row.name);
      }
    }
  }
  const byClass = new Map<string, HksBytecode>();
  for (const chunk of chunks) {
    const name = schemas.get(chunk.tagId.toUpperCase())?.name;
    if (name !== undefined && !isPhaseChunk(chunk) && !byClass.has(name)) {
      byClass.set(name, chunk);
    }
  }
  for (const chunk of chunks) {
    for (const member of schemas.get(chunk.tagId.toUpperCase())?.members ??
      []) {
      const child =
        member.kind === "class_instance" ? byClass.get(member.type) : undefined;
      if (child !== undefined && !slots.has(member.name)) {
        slots.set(member.name, child);
      }
      // A static array of a script class (`static_array<taken_invasion_party,
      // 4> taken_invasion_party`) is one slot per element, as the rows name
      // them.
      const list =
        member.kind === "static_array"
          ? STATIC_ARRAY_OF.exec(member.type)
          : null;
      const element = list ? byClass.get(list[1] ?? "") : undefined;
      for (let i = 0; element && i < Number(list?.[2]); i++) {
        const slot = `${member.name}[${i}]`;
        // a declared element the bundles have no row for is not built
        if (encounterSlots.has(slot) && !slots.has(slot)) {
          slots.set(slot, element);
        }
      }
      // A dynamic array of one (`dynamic_array<u_event_dropship_point>
      // pf_point`) has as many elements as the bundles' Encounter rows name.
      const dynamic =
        member.kind === "dynamic_array"
          ? DYNAMIC_ARRAY_OF.exec(member.type)
          : null;
      const each = dynamic ? byClass.get(dynamic[1] ?? "") : undefined;
      if (each !== undefined) {
        for (const slot of encounterSlots) {
          if (
            slot.startsWith(`${member.name}[`) &&
            ROW_ELEMENT.test(slot.slice(member.name.length)) &&
            !slots.has(slot)
          ) {
            slots.set(slot, each);
          }
        }
      }
    }
  }
  return slots;
}

// A mission phase's script, run by the activity rather than embedded.
export function isPhaseChunk(chunk: HksBytecode): boolean {
  return chunk.root.source?.toLowerCase().endsWith(".esp") === true;
}

// The script a chunk was compiled from, by its source path's stem:
// `@es\venus\academy_entrance\enc_entrance_ch2m1.es` is enc_entrance_ch2m1.
// Its `_M.decl_name` is the class (`c_encounter__enc_entrance_ch2m1`).
export function scriptName(chunk: HksBytecode): string {
  const source = chunk.root.source;
  if (source === undefined || source === "") {
    throw new Error(
      `script chunk ${chunk.tagId} has no source path, so no script name`
    );
  }
  return scriptStem(source);
}
