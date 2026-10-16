// The alpha checks: every decl compiles to the same code as its chunks, to
// the same bytes (line tables included), and to the same schema as its tags.
import type {
  HksBytecode,
  LiftMember,
  LiftSide,
} from "@blamnetwork/bullshcript/destiny1/v36735_13_12_02_1953_alpha";
import {
  formatScriptTag,
  nativeBaseById,
  nativeTypeById,
  readBytecode,
} from "@blamnetwork/bullshcript/destiny1/v36735_13_12_02_1953_alpha";
import type {
  BsCompiledDecl,
  BsCompileResult,
  BsSchemaMember,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { diffChunks } from "./chunk_diff.ts";
import type { AlphaSchemas, AlphaScriptTag } from "./schemas.ts";

export interface ChunkMiss {
  readonly declName: string;
  readonly diff: readonly string[];
  // source lines whose instructions differ
  readonly lines: readonly number[];
  readonly tag: string;
}

export interface SchemaMiss {
  readonly declName: string;
  readonly mismatches: readonly string[];
}

// a conservative decl's schema members the source leaves out: a single
// derived schema cannot tell the native base's members from the script's
export interface Undecidable {
  readonly declName: string;
  readonly members: readonly string[];
}

export interface GateReport {
  readonly codeIdentical: number;
  readonly codeMisses: readonly ChunkMiss[];
  readonly decls: number;
  readonly diagnostics: readonly string[];
  readonly lineIdentical: number;
  readonly lineMisses: readonly ChunkMiss[];
  readonly schemaAgree: number;
  readonly schemaMisses: readonly SchemaMiss[];
  readonly tags: number;
  readonly undecidable: readonly Undecidable[];
}

const THREAD_DEFINITION = 0x80800472;
const THREAD_INSTANCE = 0x80800473;
const THREAD_AUTOSTART = 0x01000000;
const EMPTY_HASH = 0x811c9dc5;
const COMMAND_SCRIPT_BUILDER = "__cs";

// what the real schema's member kind must come back as
const REAL_KINDS: Readonly<Record<number, readonly string[]>> = {
  1: ["int"],
  2: ["short"],
  4: ["typed_pointer"],
  6: ["pointer"],
  7: ["pointer"],
  8: ["tag_reference"],
  9: ["real"],
  11: ["bool"],
  12: ["delegate"],
  15: ["interface"],
  17: ["string"],
  18: ["string_hash"],
  19: ["handle"],
  21: ["static_array"],
  22: ["static_stack"],
  23: ["dynamic_array"],
  24: ["table"],
  25: ["struct"],
  26: ["c_array"],
  27: ["object", "class_instance"],
  28: ["object", "class_instance"],
  29: ["implements"],
  33: ["enum_field"],
  34: ["flags"],
  40: ["vector2d"],
  41: ["vector4"],
  42: ["vector3d"],
};

const INSTANCE_SUFFIX = /_instance$/;
const DATA_KINDS = new Set([
  "method",
  "thread",
  "command_script",
  "enum_value",
]);
const CODE_KINDS = new Set(["method", "thread", "command_script"]);

function isThread(m: LiftMember): boolean {
  return m.type === THREAD_DEFINITION || m.type === THREAD_INSTANCE;
}

function differingLines(expected: HksBytecode, actual: HksBytecode): number[] {
  const lines = new Set<number>();
  const walk = (a: typeof expected.root, b: typeof actual.root) => {
    for (let pc = 0; pc < Math.min(a.code.length, b.code.length); pc++) {
      if (a.lineInfo[pc] !== b.lineInfo[pc]) {
        lines.add(a.lineInfo[pc]);
      }
    }
    if (a.lineDefined !== b.lineDefined) {
      lines.add(a.lineDefined);
    }
    if (a.lastLineDefined !== b.lastLineDefined) {
      lines.add(a.lastLineDefined);
    }
    for (const [i, child] of a.protos.entries()) {
      if (b.protos[i]) {
        walk(child, b.protos[i]);
      }
    }
  };
  walk(expected.root, actual.root);
  return [...lines].sort((x, y) => x - y);
}

// the members a side declares itself: not the native
// base's, not a script parent's, not the hidden command-script builder
function ownMembers(side: LiftSide): LiftMember[] {
  const inherited = new Set(
    side.parentMembers ?? nativeBaseById(side.parent)?.members ?? []
  );
  return side.members.filter(
    (m) =>
      !inherited.has(m.name) &&
      m.name !== COMMAND_SCRIPT_BUILDER &&
      !(m.kind === 0x14 && m.type !== side.schema)
  );
}

function defaultText(m: LiftMember): string {
  const v = m.value;
  if (v === undefined || v === false || v === 0) {
    return "";
  }
  if (typeof v === "object" && "hash" in v) {
    return v.hash === EMPTY_HASH ? "" : formatScriptTag(v.hash);
  }
  if (Array.isArray(v)) {
    return v.every((x) => x === 0) ? "" : v.join(",");
  }
  return String(v);
}

function compiledDefault(m: BsSchemaMember): string {
  const d = m.default;
  if (d === undefined) {
    return "";
  }
  switch (d.kind) {
    case "bool":
      return d.value ? "true" : "";
    case "number":
      return d.value === 0 ? "" : String(d.value);
    case "string":
      if (m.kind !== "string_hash") {
        return d.value;
      }
      return d.hash === EMPTY_HASH ? "" : formatScriptTag(d.hash);
    case "vector":
      return d.values.every((x) => x === 0) ? "" : d.values.join(",");
    default:
      return "";
  }
}

// The schema check for one decl against one side: data members, threads, methods
function compareSide(
  decl: BsCompiledDecl,
  side: LiftSide,
  which: "definition" | "instance",
  schemas: AlphaSchemas,
  conservative: boolean,
  out: string[],
  undecidable: string[]
): void {
  const real = ownMembers(side);
  compareData(decl, real, which, schemas, conservative, out, undecidable);
  compareBuilder(decl, side, which, out);
  if (which === "definition") {
    compareThreads(decl, real, out);
  }
  compareMethods(decl, side.methods, which, out);
}

function compareData(
  decl: BsCompiledDecl,
  real: readonly LiftMember[],
  which: "definition" | "instance",
  schemas: AlphaSchemas,
  conservative: boolean,
  out: string[],
  undecidable: string[]
): void {
  const realData = real.filter(
    (m) => m.kind !== 0x14 && !isThread(m) && m.name !== COMMAND_SCRIPT_BUILDER
  );
  const emittedData = decl.schema.members.filter(
    (m) =>
      (m.side === which || m.side === "both") &&
      !DATA_KINDS.has(m.kind) &&
      m.name !== COMMAND_SCRIPT_BUILDER
  );
  const realNames = realData.map((m) => m.name);
  const emittedNames = emittedData.map((m) => m.name);
  const missing = realNames.filter((n) => !emittedNames.includes(n));
  const extra = emittedNames.filter((n) => !realNames.includes(n));
  if (conservative && missing.length > 0) {
    undecidable.push(...missing.map((n) => `${which} ${n}`));
  }
  const comparable = conservative
    ? realNames.filter((n) => emittedNames.includes(n))
    : realNames;
  if (comparable.join(",") !== emittedNames.join(",")) {
    const lost = conservative ? [] : missing;
    const parts = [
      lost.length > 0 ? `missing ${lost.join(" ")}` : "",
      extra.length > 0 ? `extra ${extra.join(" ")}` : "",
    ].filter((p) => p !== "");
    out.push(
      `${which} members: ${parts.length > 0 ? parts.join(" ") : "order differs"}`
    );
  }
  compareKindsAndDefaults(realData, emittedData, which, schemas, out);
}

// the hidden command-script builder is on both real sides (the own-member
// list leaves it out, so this looks at the whole side)
function compareBuilder(
  decl: BsCompiledDecl,
  side: LiftSide,
  which: "definition" | "instance",
  out: string[]
): void {
  const emittedBuilder = decl.schema.members.some(
    (m) => m.name === COMMAND_SCRIPT_BUILDER
  );
  const realBuilder = side.members.some(
    (m) => m.name === COMMAND_SCRIPT_BUILDER
  );
  if (realBuilder !== emittedBuilder) {
    out.push(`${which}: __cs ${realBuilder ? "missing" : "extra"}`);
  }
}

function compareKindsAndDefaults(
  realData: readonly LiftMember[],
  emittedData: readonly BsSchemaMember[],
  which: "definition" | "instance",
  schemas: AlphaSchemas,
  out: string[]
): void {
  for (const m of realData) {
    const e = emittedData.find((x) => x.name === m.name);
    if (e === undefined) {
      continue;
    }
    if (!(REAL_KINDS[m.kind] ?? []).includes(e.kind)) {
      const type =
        schemas.packageTypes.get(m.type)?.name ??
        nativeTypeById(m.type)?.name ??
        formatScriptTag(m.type);
      out.push(
        `${which} ${m.name}: kind ${e.kind}, real ${formatScriptTag(m.kind)} ${type}`
      );
    }
    const isClass = m.kind === 0x1b || m.kind === 0x1c;
    if (!isClass && defaultText(m) !== compiledDefault(e)) {
      out.push(
        `${which} ${m.name}: default ${compiledDefault(e) || "none"}, real ${defaultText(m) || "none"}`
      );
    }
  }
}

function compareThreads(
  decl: BsCompiledDecl,
  real: readonly LiftMember[],
  out: string[]
): void {
  const realThreads = real.filter(isThread);
  const emittedThreads = decl.schema.members.filter((m) => m.kind === "thread");
  const names = (list: readonly { name: string }[]) =>
    list.map((m) => m.name).join(",");
  if (names(realThreads) !== names(emittedThreads)) {
    out.push(`threads: ${names(realThreads)} vs ${names(emittedThreads)}`);
  }
  for (const t of realThreads) {
    const e = emittedThreads.find((x) => x.name === t.name);
    const autostart = t.threadFlags === THREAD_AUTOSTART;
    if (e !== undefined && autostart !== (e.autostart === true)) {
      out.push(
        `thread ${t.name}: autostart ${e.autostart === true}, real ${autostart}`
      );
    }
  }
}

// the Lua functions a side holds, in order: methods and thread bodies, the
// generated es-family import() last
function compareMethods(
  decl: BsCompiledDecl,
  realMethods: readonly string[],
  which: "definition" | "instance",
  out: string[]
): void {
  const emitted = decl.schema.members
    .filter((m) => CODE_KINDS.has(m.kind))
    .filter((m) =>
      m.kind === "thread" ? which === "instance" : m.side === which
    )
    .map((m) => m.luaName ?? m.name);
  if (which === "instance" && decl.fileKind !== "bs") {
    emitted.push("import");
  }
  if (realMethods.join(",") !== emitted.join(",")) {
    out.push(
      `${which} methods: ${realMethods.join(" ")} vs ${emitted.join(" ")}`
    );
  }
}

function hashText(hash: number | undefined): string {
  return hash === undefined ? "none" : formatScriptTag(hash);
}

// the name hash bsc wrote into the definition
function compareName(
  decl: BsCompiledDecl,
  script: AlphaScriptTag,
  out: string[]
): void {
  if (decl.schema.nameHash !== script.nameSlot) {
    out.push(
      `name ${hashText(decl.schema.nameHash)}, real ${hashText(script.nameSlot)}`
    );
  }
}

function compareSchema(
  decl: BsCompiledDecl,
  script: AlphaScriptTag,
  schemas: AlphaSchemas
): { mismatches: string[]; undecidable: string[] } {
  const out: string[] = [];
  const undecidable: string[] = [];
  compareName(decl, script, out);
  compareSide(
    decl,
    script.definition,
    "definition",
    schemas,
    script.conservative,
    out,
    undecidable
  );
  compareSide(
    decl,
    script.instance,
    "instance",
    schemas,
    script.conservative,
    out,
    undecidable
  );
  // parent: a script parent by name, a native one by its registry name
  const parent = script.instance.parent;
  const pkg = schemas.packageTypes.get(parent);
  const realParent = pkg
    ? pkg.name.slice(pkg.name.lastIndexOf(".") + 1).replace(INSTANCE_SUFFIX, "")
    : (nativeBaseById(parent)?.name ?? formatScriptTag(parent));
  if (decl.schema.parent !== realParent) {
    out.push(`parent ${decl.schema.parent}, real ${realParent}`);
  }
  return { mismatches: out, undecidable };
}

export function runGates(
  result: BsCompileResult,
  schemas: AlphaSchemas,
  chunks: ReadonlyMap<string, HksBytecode>
): GateReport {
  const diagnostics = result.diagnostics.map(
    (d) => `${d.path}:${d.line}: ${d.severity}: ${d.message}`
  );
  const byModule = new Map(result.decls.map((d) => [d.modulePath, d]));
  const codeMisses: ChunkMiss[] = [];
  const lineMisses: ChunkMiss[] = [];
  const schemaMisses: SchemaMiss[] = [];
  const undecidable: Undecidable[] = [];
  let codeIdentical = 0;
  let lineIdentical = 0;
  let schemaAgree = 0;
  let declCount = 0;
  const seenDecls = new Set<string>();
  for (const [tag, original] of chunks) {
    const script = schemas.scripts.find((s) => s.tag === tag);
    const decl =
      script === undefined ? undefined : byModule.get(script.declName);
    if (
      script === undefined ||
      decl === undefined ||
      decl.chunk === undefined
    ) {
      codeMisses.push({
        declName: script?.declName ?? tag,
        diff: ["not compiled"],
        lines: [],
        tag,
      });
      lineMisses.push({
        declName: script?.declName ?? tag,
        diff: ["not compiled"],
        lines: [],
        tag,
      });
      continue;
    }
    const compiled = readBytecode(decl.chunk, tag);
    const codeDiff = diffChunks(original, compiled);
    if (codeDiff.length === 0) {
      codeIdentical++;
    } else {
      codeMisses.push({ declName: decl.name, diff: codeDiff, lines: [], tag });
    }
    const lineDiff = diffChunks(original, compiled, { lines: true });
    if (lineDiff.length === 0) {
      lineIdentical++;
    } else {
      lineMisses.push({
        declName: decl.name,
        diff: lineDiff,
        lines: differingLines(original, compiled),
        tag,
      });
    }
    if (!seenDecls.has(script.declName)) {
      seenDecls.add(script.declName);
      declCount++;
      const compared = compareSchema(decl, script, schemas);
      if (compared.mismatches.length === 0) {
        schemaAgree++;
      } else {
        schemaMisses.push({
          declName: decl.name,
          mismatches: compared.mismatches,
        });
      }
      if (compared.undecidable.length > 0) {
        undecidable.push({
          declName: decl.name,
          members: compared.undecidable,
        });
      }
    }
  }
  return {
    codeIdentical,
    codeMisses,
    decls: declCount,
    diagnostics,
    lineIdentical,
    lineMisses,
    schemaAgree,
    schemaMisses,
    tags: chunks.size,
    undecidable,
  };
}
