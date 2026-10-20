// npm run lift:alpha -- [--chunks <dir>] [--packages <dir>] [--check]
//   [--out <dir>] [--no-search] [--dump <decl>] [--linediff <decl>]
// Regenerates Fukugen Daihon's alpha folder from the dumped script tags and
// the alpha packages, then checks it compiles back to the same code, bytes and schemas; --check writes nothing,
// --out writes to another directory.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  decompile,
  directoryScriptSource,
  fnv1,
  type HksBytecode,
  type LiftedDecl,
  type LiftedFile,
  type LiftedTypeDecl,
  type LiftScriptInput,
  liftScript,
  loadScriptChunk,
  type Method,
  readBytecode,
  readLuaModule,
  renderLiftedFile,
  typeDeclLines,
} from "@blamnetwork/bullshcript/destiny1/v36735_13_12_02_1953_alpha";
import { compileBungieScript } from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { ALPHA_BUILD, fukugenDaihonBuildDir } from "../folder.ts";
import { option } from "./args.ts";
import { type GateReport, runGates } from "./checks.ts";
import { stripDecompilerHeader } from "./chunk_diff.ts";
import {
  type AlphaScriptTag,
  packagesDir,
  readAlphaSchemas,
} from "./schemas.ts";

const BUILD_STRING = "36735.13.12.02.1953.alpha";
const SCRIPT_DELEGATE = 0x80800385;
const ENUM_KIND = 0x20;
const STRUCT_KIND = 0x19;
const GENERATED_MODULE = "bs_compiler_generated";
// how many leading operands a split condition keeps on its line, tried in turn
const MAX_CONTINUATION_SPLIT = 6;

const chunksDir = option("--chunks") ?? process.env.TIGER_LUA_CHUNKS;
if (chunksDir === undefined) {
  console.error(
    "usage: npm run lift:alpha -- [--chunks <lua-chunks dir>] [--packages <dir>]\n" +
      "  [--check] [--out <dir>] [--no-search] [--dump <decl>] [--linediff <decl>]"
  );
  process.exit(1);
}
const checkOnly = process.argv.includes("--check");

const source = directoryScriptSource(chunksDir);
const schemas = readAlphaSchemas(option("--packages") ?? packagesDir());

// ---- the chunks, by decl ---------------------------------------------------

interface DeclChunks {
  readonly chunk: HksBytecode;
  readonly path: string;
  readonly script: AlphaScriptTag;
  readonly tags: string[];
}

const chunks = new Map<string, HksBytecode>();
// tags with no chunk in them, by the module name of the decl they name
const stubTags = new Map<string, string[]>();
for (const tag of source.tags()) {
  const chunk = loadScriptChunk(source, tag);
  if (chunk !== undefined) {
    chunks.set(tag, chunk);
    continue;
  }
  const script = schemas.scripts.find((s) => s.tag === tag);
  if (script === undefined) {
    throw new Error(`${tag}: no script tag in the packages`);
  }
  stubTags.set(script.declName, [
    ...(stubTags.get(script.declName) ?? []),
    tag,
  ]);
}

// A decl the build named but never compiled gets a trailer-only file.
function stubSources(): Map<string, string> {
  const byPath = new Map<string, { name: string; tags: string[] }[]>();
  for (const [declName, tags] of stubTags) {
    const parts = declName.split(".");
    const name = parts.pop() ?? "";
    if (parts[0] === "_es") {
      throw new Error(`${declName}: an es-family stub needs its extension`);
    }
    const path = `bs/${parts.join("/")}.bs`;
    byPath.set(path, [...(byPath.get(path) ?? []), { name, tags }]);
  }
  const out = new Map<string, string>();
  for (const [path, stubs] of byPath) {
    const lines = [`# Decompiled from ${BUILD_STRING} script tags`];
    let tagCount = 0;
    for (const stub of stubs.sort((a, b) => a.name.localeCompare(b.name))) {
      const tags = stub.tags.sort();
      tagCount += tags.length;
      lines.push(
        `# See tag${tags.length > 1 ? "s" : ""} ${tags.join(", ")} (${stub.name})`
      );
    }
    const plural = tagCount > 1;
    lines.push(
      `# The tag${plural ? "s name" : " names"} ${stubs.length > 1 ? "these decls" : "this decl"} but hold${plural ? "" : "s"} no compiled code, so nothing here can be recovered.`
    );
    out.set(path, `${lines.join("\n")}\n`);
  }
  return out;
}

const decls = new Map<string, DeclChunks>();
for (const [tag, chunk] of chunks) {
  const script = schemas.scripts.find((s) => s.tag === tag);
  if (script === undefined) {
    throw new Error(`${tag}: no script tag in the packages`);
  }
  const path = (chunk.root.source ?? "")
    .replace(/^@/, "")
    .replaceAll("\\", "/");
  if (!/^(bs|es)\//.test(path)) {
    throw new Error(`${tag}: unexpected source path ${chunk.root.source}`);
  }
  const existing = decls.get(script.declName);
  if (existing === undefined) {
    decls.set(script.declName, { chunk, path, script, tags: [tag] });
  } else {
    // the same decl compiled into another package: must be the same code
    if (
      stripDecompilerHeader(decompile(existing.chunk).source) !==
      stripDecompilerHeader(decompile(chunk).source)
    ) {
      throw new Error(
        `${tag}: ${script.declName} differs from ${existing.tags.join(",")}`
      );
    }
    existing.tags.push(tag);
  }
}

// every `<delegate>_impl` in the corpus names a delegate's parameters
const delegateNames = new Set<string>();
for (const s of schemas.scripts) {
  for (const m of s.instance.members) {
    if (m.kind === 0x0c && m.type === SCRIPT_DELEGATE) {
      delegateNames.add(m.name);
    }
  }
}
const delegateParams = new Map<string, readonly string[]>();
for (const { chunk } of decls.values()) {
  for (const fn of readLuaModule(decompile(chunk).source).functions) {
    const impl = /^(.+)_impl$/.exec(fn.name);
    if (
      impl !== null &&
      delegateNames.has(impl[1]) &&
      !delegateParams.has(impl[1])
    ) {
      delegateParams.set(impl[1], fn.params);
    }
  }
}
const context = { ...schemas.context, delegateParams };

// ---- lift ----------------------------------------------------------------

// @activity_bundle's argument: the bundle's name where it is known (the
// encounter's own, or cracked), else its hash
function activityBundleText(script: DeclChunks["script"]): string | undefined {
  const hash = script.activityBundle;
  if (hash === undefined) {
    return;
  }
  const own = script.declName
    .slice(script.declName.lastIndexOf(".") + 1)
    .replace("c_encounter__", "");
  const name =
    fnv1(own) === hash ? own : (schemas.strings.get(hash) ?? undefined);
  return name === undefined
    ? `0x${hash.toString(16).toUpperCase().padStart(8, "0")}`
    : `"${name}"`;
}

function inputOf(entry: DeclChunks): LiftScriptInput {
  return {
    activityBundle: activityBundleText(entry.script),
    chunk: entry.chunk,
    conservative: entry.script.conservative,
    declName: entry.script.declName,
    definition: entry.script.definition,
    instance: entry.script.instance,
    tags: entry.tags.sort(),
  };
}

// the module a .bs path declares: bs/util/mathlib.bs -> util.mathlib
function moduleOf(path: string): string {
  return path.replace(/^bs\//, "").replace(/\.bs$/, "").replaceAll("/", ".");
}

function extrasOf(module: string): LiftedTypeDecl[] {
  const out: LiftedTypeDecl[] = [];
  const seen = new Set<string>();
  for (const type of schemas.packageTypes.values()) {
    const at = type.name.lastIndexOf(".");
    if (
      type.name.slice(0, at) !== module ||
      (type.kind !== ENUM_KIND && type.kind !== STRUCT_KIND)
    ) {
      continue;
    }
    // the pvp packages hold byte-identical copies
    if (seen.has(type.name)) {
      continue;
    }
    seen.add(type.name);
    out.push(typeDeclLines(type, context));
  }
  // bases before the structs built on them
  out.sort(
    (a, b) =>
      Number(b.lines[0].includes(` : ${a.name}:`)) -
      Number(a.lines[0].includes(` : ${b.name}:`))
  );
  return out;
}

// lifted decls, re-lifted only when their continuations change
const liftedByDecl = new Map<string, LiftedDecl>();
const continuationsByDecl = new Map<string, ReadonlyMap<number, number>>();

function liftAll(): Map<string, LiftedFile> {
  const files = new Map<string, LiftedFile>();
  const lifted = new Map<string, LiftedDecl[]>();
  for (const entry of decls.values()) {
    let decl = liftedByDecl.get(entry.script.declName);
    if (decl === undefined) {
      decl = liftScript(inputOf(entry), context, {
        continuations: continuationsByDecl.get(entry.script.declName),
      });
      liftedByDecl.set(entry.script.declName, decl);
    }
    const list = lifted.get(entry.path) ?? [];
    list.push(decl);
    lifted.set(entry.path, list);
  }
  for (const [path, list] of lifted) {
    const kind = path.slice(path.lastIndexOf(".") + 1) as LiftedFile["kind"];
    files.set(path, {
      decls: list,
      extras: kind === "bs" ? extrasOf(moduleOf(path)) : [],
      kind,
      path,
    });
  }
  // modules with structs or enums but no compiled class get a file of their own
  const modules = new Set<string>();
  for (const type of schemas.packageTypes.values()) {
    if (type.kind === ENUM_KIND || type.kind === STRUCT_KIND) {
      const module = type.name.slice(0, type.name.lastIndexOf("."));
      if (!module.startsWith(GENERATED_MODULE)) {
        modules.add(module);
      }
    }
  }
  for (const module of modules) {
    const path = `bs/${module.replaceAll(".", "/")}.bs`;
    if (!files.has(path)) {
      files.set(path, {
        decls: [],
        extras: extrasOf(module),
        kind: "bs",
        path,
      });
    }
  }
  return files;
}

function render(files: ReadonlyMap<string, LiftedFile>): {
  notes: string[];
  sources: Map<string, string>;
} {
  const sources = new Map<string, string>();
  const notes: string[] = [];
  for (const [path, file] of [...files].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const rendered = renderLiftedFile(file);
    sources.set(path, rendered.text);
    notes.push(...rendered.notes, ...file.decls.flatMap((d) => d.notes));
  }
  for (const [path, text] of stubSources()) {
    sources.set(path, text);
  }
  return { notes, sources };
}

function gates(sources: ReadonlyMap<string, string>): GateReport {
  const result = compileBungieScript(
    [...sources].map(([path, text]) => ({ path, source: text }))
  );
  return runGates(result, schemas, chunks);
}

// ---- continuation search --------------------------------------------------

// A statement split over two source lines: each split is tried and the one
// whose line table matches is kept.
const started = Date.now();
let files = liftAll();
let { notes, sources } = render(files);
let report = gates(sources);
console.error(`lifted and compiled in ${Date.now() - started} ms`);
if (!process.argv.includes("--no-search")) {
  for (const miss of report.lineMisses) {
    if (miss.lines.length > 2) {
      continue;
    }
    // the gate names the decl, the lifter keys on the module path
    const key =
      [...decls.keys()].find((d) => d.endsWith(`.${miss.declName}`)) ??
      miss.declName;
    for (const line of miss.lines) {
      // the statement starts on the differing line or the one before it
      let found = false;
      for (const start of [line - 1, line]) {
        for (
          let split = 1;
          split <= MAX_CONTINUATION_SPLIT && !found;
          split++
        ) {
          const previous = continuationsByDecl.get(key);
          continuationsByDecl.set(
            key,
            new Map([...(previous ?? []), [start, split]])
          );
          liftedByDecl.delete(key);
          const trialReport = gates(render(liftAll()).sources);
          const still = trialReport.lineMisses.find(
            (m) => m.declName === miss.declName
          );
          // a split helps when it clears lines without disturbing others
          const better =
            still === undefined ||
            (still.lines.length < miss.lines.length &&
              still.lines.every((l) => miss.lines.includes(l)));
          if (better) {
            console.error(
              `${miss.declName}: line ${start} continues after operand ${split}`
            );
            found = true;
            break;
          }
          if (previous === undefined) {
            continuationsByDecl.delete(key);
          } else {
            continuationsByDecl.set(key, previous);
          }
          liftedByDecl.delete(key);
        }
        if (found) {
          break;
        }
      }
    }
  }
  files = liftAll();
  ({ notes, sources } = render(files));
  report = gates(sources);
}

// ---- dump --------------------------------------------------------------------

// --dump <decl>: the lifted source, the Lua it compiles to and the decompiled Lua
const dump = option("--dump");
if (dump !== undefined) {
  const entry = [...decls.values()].find((d) =>
    d.script.declName.endsWith(`.${dump}`)
  );
  if (entry === undefined) {
    throw new Error(`no decl ${dump}`);
  }
  const text = sources.get(entry.path) ?? "";
  console.log(`==== ${entry.path}`);
  console.log(
    text
      .split("\n")
      .map((l, i) => `${String(i + 1).padStart(4)} ${l}`)
      .join("\n")
  );
  const result = compileBungieScript(
    [...sources].map(([path, source]) => ({ path, source }))
  );
  const decl = result.decls.find((d) => d.modulePath === entry.script.declName);
  console.log("==== generated Lua");
  console.log(decl?.lua ?? "(not compiled)");
  console.log("==== decompiled Lua");
  console.log(stripDecompilerHeader(decompile(entry.chunk).source));
  for (const d of result.diagnostics.filter((x) => x.path === entry.path)) {
    console.log(`diagnostic ${d.path}:${d.line}: ${d.message}`);
  }
  process.exit(0);
}

// --linediff <decl>: where the lifted decl's line table departs from the chunk's
const lineDiff = option("--linediff");
if (lineDiff !== undefined) {
  const entry = [...decls.values()].find((d) =>
    d.script.declName.endsWith(`.${lineDiff}`)
  );
  if (entry === undefined) {
    throw new Error(`no decl ${lineDiff}`);
  }
  const result = compileBungieScript(
    [...sources].map(([path, source]) => ({ path, source }))
  );
  const decl = result.decls.find((d) => d.modulePath === entry.script.declName);
  const lines = (sources.get(entry.path) ?? "").split("\n");
  const compiled = readBytecode(decl?.chunk as Uint8Array, entry.tags[0]);
  const walk = (a: Method, b: Method, p: string) => {
    if (
      a.lineDefined !== b.lineDefined ||
      a.lastLineDefined !== b.lastLineDefined
    ) {
      console.log(
        `${p}: lifted ${b.lineDefined}-${b.lastLineDefined}, chunk ${a.lineDefined}-${a.lastLineDefined}`
      );
    }
    for (let pc = 0; pc < a.code.length; pc++) {
      if (a.lineInfo[pc] !== b.lineInfo[pc]) {
        console.log(
          `${p} pc ${pc} op ${a.code[pc].opcode}: lifted ${b.lineInfo[pc]} "${lines[b.lineInfo[pc] - 1]?.trim()}", chunk ${a.lineInfo[pc]} "${lines[a.lineInfo[pc] - 1]?.trim()}"`
        );
      }
    }
    for (const [i, c] of a.protos.entries()) {
      walk(c, b.protos[i], `${p}.${i}`);
    }
  };
  walk(entry.chunk.root, compiled.root, "0");
  process.exit(0);
}

if (!checkOnly) {
  const root = option("--out") ?? fukugenDaihonBuildDir(ALPHA_BUILD);
  for (const tree of ["bs", "es"]) {
    rmSync(join(root, tree), { force: true, recursive: true });
  }
  for (const [path, text] of sources) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  console.log(
    `${chunks.size} chunks -> ${decls.size} decls in ${files.size} files, ${stubTags.size} stub decls in ${sources.size - files.size} files, written to ${root}`
  );
}

for (const note of notes) {
  console.log(`note: ${note}`);
}
for (const d of report.diagnostics) {
  console.log(`diagnostic: ${d}`);
}
console.log(`same code: ${report.codeIdentical}/${report.tags}`);
for (const miss of report.codeMisses) {
  console.log(
    `  code miss ${miss.tag} ${miss.declName}: ${miss.diff.join(", ")}`
  );
}
console.log(`same bytes: ${report.lineIdentical}/${report.tags}`);
for (const miss of report.lineMisses) {
  console.log(
    `  byte miss ${miss.tag} ${miss.declName}: lines ${miss.lines.join(", ")} (${miss.diff.join(", ")})`
  );
}
console.log(`same schemas: ${report.schemaAgree}/${report.decls} decls`);
for (const miss of report.schemaMisses) {
  console.log(`  schema miss ${miss.declName}:`);
  for (const line of miss.mismatches) {
    console.log(`    ${line}`);
  }
}
for (const u of report.undecidable) {
  console.log(`  schema undecidable ${u.declName}: ${u.members.join(", ")}`);
}
if (continuationsByDecl.size > 0) {
  console.log(
    `continuations: ${[...continuationsByDecl].map(([d, m]) => `${d} ${[...m].map(([l, k]) => `${l}:${k}`).join(" ")}`).join("; ")}`
  );
}
