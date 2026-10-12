// The alpha's script tags as the lifter and the schema gate see them: every
// 80800B48 tag with its schemas, read with gibbon from TIGER_PACKAGES_DIR.
import type {
  LiftContext,
  LiftMember,
  LiftPackageType,
  LiftSide,
} from "@blamnetwork/bullshcript/destiny1/v36735_13_12_02_1953_alpha";
import {
  fnv1,
  formatScriptTag,
  nativeBaseById,
} from "@blamnetwork/bullshcript/destiny1/v36735_13_12_02_1953_alpha";
import {
  c_package_set,
  k_schema_class,
  k_schema_kind,
  k_script_class,
  read_definition,
  read_schema,
  s_script,
  type schema,
} from "@blamnetwork/gibbon/destiny1/v36735_13_12_02_1953_alpha";
import {
  read_schema_fast_init,
  read_schema_scalar,
} from "@blamnetwork/gibbon/destiny1/v36735_13_12_02_1953_alpha/definitions/schema_fast_init";
import { crackedStrings } from "./dictionary.ts";

const ALPHA_BUILD = "v36735_13_12_02_1953_alpha";

export interface AlphaScriptTag {
  readonly conservative: boolean;
  // dotted module path with the decl name last
  readonly declName: string;
  readonly definition: LiftSide;
  readonly instance: LiftSide;
  readonly tag: string;
}

export interface AlphaSchemas {
  readonly context: LiftContext;
  readonly packageTypes: ReadonlyMap<number, LiftPackageType>;
  readonly scripts: readonly AlphaScriptTag[];
  readonly strings: ReadonlyMap<number, string>;
}

const THREAD_DEFINITION = 0x80800472;
// the global incident name table: {u32 fnv1, i32 rel} x count from +0x20, rel
// relative to its own word and landing on the NUL-terminated name
const INCIDENT_NAMES_TAG = 0x808e204d;
const INCIDENT_NAMES_START = 0x20;

export function packagesDir(): string {
  const dir = process.env.TIGER_PACKAGES_DIR;
  if (dir === undefined) {
    throw new Error("TIGER_PACKAGES_DIR is not set");
  }
  return dir;
}

function members(sc: schema, mem: Buffer | undefined): LiftMember[] {
  return [...sc.members]
    .map((m, i) => ({ i, m }))
    .sort((a, b) => a.m.offset - b.m.offset || a.i - b.i)
    .map(({ m }) => {
      const out: {
        kind: number;
        name: string;
        offset: number;
        threadFlags?: number;
        type: number;
        value?: LiftMember["value"];
      } = { kind: m.kind, name: m.name ?? "", offset: m.offset, type: m.type };
      if (
        mem === undefined ||
        m.kind === k_schema_kind.method ||
        m.kind === k_schema_kind.enum_value
      ) {
        return out;
      }
      const scalar = read_schema_scalar(mem, m);
      if (scalar !== undefined) {
        out.value =
          m.kind === k_schema_kind.string_hash
            ? { hash: scalar as number }
            : scalar;
      } else if (m.kind === 0x28) {
        out.value = [mem.readFloatBE(m.offset), mem.readFloatBE(m.offset + 4)];
      } else if (m.kind === 0x2a) {
        out.value = [
          mem.readFloatBE(m.offset),
          mem.readFloatBE(m.offset + 4),
          mem.readFloatBE(m.offset + 8),
        ];
      } else if (m.kind === 0x21 || m.kind === 0x22) {
        out.value = mem.readInt8(m.offset);
      } else if (
        m.kind === k_schema_kind.script_definition &&
        m.type === THREAD_DEFINITION
      ) {
        // thread definition: {typed pointer, name hash, flags}
        out.threadFlags = mem.readUInt32BE(m.offset + 16);
      }
      return out;
    });
}

export function readAlphaSchemas(dir: string): AlphaSchemas {
  const set = c_package_set.open_directory(dir);
  const packageTypes = new Map<number, LiftPackageType>();
  const schemas = new Map<number, { buffer: Buffer; schema: schema }>();
  for (const { hash } of set.entries_of_class(k_schema_class)) {
    const buffer = set.read_tag(hash);
    const sc = read_schema(buffer);
    schemas.set(hash, { buffer, schema: sc });
    packageTypes.set(hash, {
      count: sc.info.size,
      id: hash,
      kind: sc.info.kind,
      members: members(sc, undefined),
      name: sc.header.name ?? "",
      other: sc.info.other,
      parent: sc.header.parent,
    });
  }
  const side = (id: number, methods: readonly string[]): LiftSide => {
    const entry = schemas.get(id);
    if (entry === undefined) {
      return {
        members: [],
        methods,
        name: formatScriptTag(id),
        parent: 0xffffffff,
        schema: id,
      };
    }
    const mem = read_schema_fast_init(entry.buffer, entry.schema.header);
    return {
      members: members(entry.schema, mem),
      methods,
      name: entry.schema.header.name ?? "",
      parent: entry.schema.header.parent,
      schema: id,
    };
  };
  const raw = set.entries_of_class(k_script_class).map(({ hash }) => {
    const s = read_definition(set.read_tag(hash), s_script);
    return {
      declName: s.decl_name ?? "",
      definition: side(
        s.types[0].schema,
        s.types[0].methods.map((m) => m.name ?? "")
      ),
      instance: side(
        s.types[1].schema,
        s.types[1].methods.map((m) => m.name ?? "")
      ),
      tag: formatScriptTag(hash),
    };
  });
  // a native parent whose member list is not known in full leaves its members
  // indistinguishable from the script's
  const bySchema = new Map(
    raw.flatMap(
      (s) =>
        [
          [s.definition.schema, s.definition],
          [s.instance.schema, s.instance],
        ] as const
    )
  );
  const withParents = (t: LiftSide): LiftSide => {
    const parent = bySchema.get(t.parent);
    return parent === undefined
      ? t
      : { ...t, parentMembers: parent.members.map((m) => m.name) };
  };
  const scripts: AlphaScriptTag[] = raw
    .map((s) => ({
      ...s,
      conservative:
        !packageTypes.has(s.instance.parent) &&
        nativeBaseById(s.instance.parent)?.complete !== true,
      definition: withParents(s.definition),
      instance: withParents(s.instance),
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
  const strings = readStrings(set);
  return {
    context: { delegateParams: new Map(), packageTypes, strings },
    packageTypes,
    scripts,
    strings,
  };
}

// the incident name table plus every cracked fnv1 string the dictionary holds
function readStrings(set: c_package_set): Map<number, string> {
  const strings = new Map<number, string>();
  const table = set.try_read_tag(INCIDENT_NAMES_TAG);
  if (table !== undefined) {
    const count = table.readUInt32BE(4);
    for (let i = 0; i < count; i++) {
      const at = INCIDENT_NAMES_START + i * 8;
      const hash = table.readUInt32BE(at);
      const rel = table.readInt32BE(at + 4);
      const start = at + 4 + rel;
      const text = table.toString("latin1", start, table.indexOf(0, start));
      if (fnv1(text) === hash) {
        strings.set(hash, text);
      }
    }
  }
  for (const [hash, text] of crackedStrings(ALPHA_BUILD)) {
    if (fnv1(text) === hash && !strings.has(hash)) {
      strings.set(hash, text);
    }
  }
  return strings;
}
