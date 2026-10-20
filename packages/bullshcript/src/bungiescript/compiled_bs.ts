// The compiled_bs tree: lua/<module>/<decl>.luac (classes only) and code_tags/<module>/<decl>.schema.json under index.json.
// <module> is the decl's module path without the decl name (`es/` becomes `_es/`, `bs/` is dropped); a publish is renamed into place, so a reader never sees a half-written tree.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { ActivityStart } from "./activity_start.ts";
import type { BsDeclKind, BsFileKind } from "./ast.ts";
import type { BsCompiledDecl, BsDiagnostic } from "./compile.ts";
import { BsCompileError } from "./lexer.ts";
import type { BsSchema } from "./schema.ts";
import type { CompiledScriptFiles } from "./script_files.ts";
import {
  normalizeScriptPath,
  type ScriptLookups,
  scriptLookups,
} from "./script_folder.ts";

export const COMPILED_BS_INDEX = "index.json";
// the shape of index.json and the schemas (3: @member_counts, 4: activity
// starts, 5: starts name their slices, 6: starts name the phase that owns
// their state, 7: starts lock the time of day, 8: chunk line numbers leave out
// the stand-in lines, which the index lists, 9: @placed, 10: @objective and
// @task, 11: member types are the short spellings); bumped when it changes,
// so an old tree is rebuilt
export const COMPILED_BS_FORMAT = 11;

export interface CompiledBsDecl {
  // the chunk's file, relative to the tree; a struct or enum has none
  readonly chunk?: string;
  readonly kind: BsDeclKind;
  readonly modulePath: string;
  readonly name: string;
  readonly schema: string;
}

export interface CompiledBsFile {
  // the bundle the file's encounter class runs in (@activity_bundle)
  readonly activityBundle?: number;
  // how its encounter starts the activities it names (@activity and the
  // decorators below it)
  readonly activityStart?: ActivityStart;
  readonly chunkName: string;
  // in declaration order; the first is the file's own decl
  readonly decls: readonly CompiledBsDecl[];
  readonly kind: BsFileKind;
  // the type of each member its es-family class declares, in order
  readonly memberTypes: readonly string[];
  // relative to the build folder, forward slashes, extension kept
  readonly path: string;
  // the source lines the chunks' line numbers leave out, ascending (see
  // fileLineOf and chunkLineOf); a debugger maps its lines through them
  readonly standInLines?: readonly number[];
}

export interface CompiledBsIndex {
  // what the compile reported; never an error, a build with one is refused
  readonly diagnostics: readonly BsDiagnostic[];
  readonly files: readonly CompiledBsFile[];
  readonly format: number;
  // when the build was written, ISO 8601
  readonly stamp: string;
}

// A compiled project as a host reads it: the index, every chunk and schema
// in memory, and the source folder's lookups over the index's files.
export interface CompiledScriptSet extends ScriptLookups<CompiledBsFile> {
  // a class decl's chunk (the file's first decl when unnamed); a struct or
  // enum has none, so that throws
  chunkFor(path: string, decl?: string): Uint8Array;
  readonly files: readonly CompiledBsFile[];
  readonly index: CompiledBsIndex;
  schemaFor(path: string, decl?: string): BsSchema;
}

export interface CompiledBsWriteOptions {
  readonly lua?: boolean;
  readonly stamp?: string;
}

export class CompiledBsError extends Error {
  readonly diagnostics: readonly BsDiagnostic[];

  constructor(diagnostics: readonly BsDiagnostic[]) {
    const errors = diagnostics.filter((d) => d.severity === "error");
    super(
      `${errors.length} error${errors.length === 1 ? "" : "s"}: ${errors
        .map(formatDiagnostic)
        .join("; ")}`
    );
    this.name = "CompiledBsError";
    this.diagnostics = diagnostics;
  }
}

export function formatDiagnostic(diagnostic: BsDiagnostic): string {
  return `${diagnostic.severity}: ${diagnostic.path}:${diagnostic.line}: ${diagnostic.message}`;
}

const UNSAFE_STAMP = /[^0-9A-Za-z]/g;

// the member kinds that are not fields: what memberTypes leaves out
const NOT_FIELDS = new Set([
  "command_script",
  "delegate",
  "enum_value",
  "implements",
  "method",
  "thread",
]);

// the type of each member an es-family class declares, as its schema lists
// them; a .bs file lists none (ScriptFileSummary)
function memberTypesOf(decl: BsCompiledDecl): readonly string[] {
  return decl.fileKind === "bs"
    ? []
    : decl.schema.members
        .filter((member) => !NOT_FIELDS.has(member.kind))
        .map((member) => member.type);
}

function moduleDir(decl: BsCompiledDecl): string {
  return decl.modulePath.split(".").slice(0, -1).join("/");
}

function chunkPath(decl: BsCompiledDecl): string {
  return `lua/${moduleDir(decl)}/${decl.name}.luac`;
}

function luaPath(decl: BsCompiledDecl): string {
  return `lua/${moduleDir(decl)}/${decl.name}.lua`;
}

function schemaPath(decl: BsCompiledDecl): string {
  return `code_tags/${moduleDir(decl)}/${decl.name}.schema.json`;
}

// The index a compile result gives, files in decl order. A file whose
// decls all failed is left out; the diagnostics say why.
export function compiledBsIndex(
  compiled: CompiledScriptFiles,
  stamp = new Date().toISOString()
): CompiledBsIndex {
  const files = new Map<string, CompiledBsFile>();
  for (const decl of compiled.decls) {
    const path = normalizeScriptPath(decl.path);
    const entry: CompiledBsDecl = {
      ...(decl.chunk === undefined ? {} : { chunk: chunkPath(decl) }),
      kind: decl.kind,
      modulePath: decl.modulePath,
      name: decl.name,
      schema: schemaPath(decl),
    };
    const file = files.get(path) ?? {
      chunkName: decl.chunkName,
      decls: [],
      kind: decl.fileKind,
      memberTypes: memberTypesOf(decl),
      path,
      ...(decl.standInLines.length === 0
        ? {}
        : { standInLines: decl.standInLines }),
    };
    const bundle = decl.schema.activityBundleName;
    const start = decl.schema.activityStart;
    files.set(path, {
      ...file,
      ...(bundle === undefined ? {} : { activityBundle: bundle }),
      ...(start === undefined ? {} : { activityStart: start }),
      decls: [...file.decls, entry],
    });
  }
  return {
    diagnostics: compiled.diagnostics,
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
    format: COMPILED_BS_FORMAT,
    stamp,
  };
}

function writeTree(
  dir: string,
  index: CompiledBsIndex,
  compiled: CompiledScriptFiles,
  lua: boolean
): void {
  const put = (
    path: string,
    data: string | Uint8Array,
    encoding?: "latin1"
  ) => {
    const at = join(dir, path);
    mkdirSync(dirname(at), { recursive: true });
    writeFileSync(at, data, encoding);
  };
  for (const decl of compiled.decls) {
    put(schemaPath(decl), `${JSON.stringify(decl.schema, null, 2)}\n`);
    if (decl.chunk !== undefined) {
      put(chunkPath(decl), decl.chunk);
    }
    if (lua) {
      put(luaPath(decl), decl.lua, "latin1");
    }
  }
  put(COMPILED_BS_INDEX, `${JSON.stringify(index, null, 2)}\n`);
}

// Publishes a compiled project to `dir` (the compiled_bs folder itself),
// replacing whatever tree was there. Refuses a build with errors, leaving
// the old tree as it was.
export function writeCompiledBs(
  dir: string,
  compiled: CompiledScriptFiles,
  options: CompiledBsWriteOptions = {}
): CompiledBsIndex {
  if (compiled.diagnostics.some((d) => d.severity === "error")) {
    throw new CompiledBsError(compiled.diagnostics);
  }
  const index = compiledBsIndex(compiled, options.stamp);
  const suffix = index.stamp.replaceAll(UNSAFE_STAMP, "");
  const fresh = `${dir}.tmp-${suffix}`;
  const stale = `${dir}.old-${suffix}`;
  rmSync(fresh, { force: true, recursive: true });
  mkdirSync(dirname(dir), { recursive: true });
  writeTree(fresh, index, compiled, options.lua ?? false);
  // Windows will not rename over a directory, so the old tree steps aside
  // first and is removed once the new one is in place.
  if (existsSync(dir)) {
    renameSync(dir, stale);
  }
  renameSync(fresh, dir);
  rmSync(stale, { force: true, recursive: true });
  return index;
}

function compiledScriptSet(
  index: CompiledBsIndex,
  chunkOf: (decl: CompiledBsDecl) => Uint8Array | undefined,
  schemaOf: (decl: CompiledBsDecl) => BsSchema
): CompiledScriptSet {
  const lookups = scriptLookups(index.files);
  const declOf = (path: string, name?: string): CompiledBsDecl => {
    const normalized = normalizeScriptPath(path);
    const decls = lookups.scriptByPath(normalized)?.decls ?? [];
    const decl =
      name === undefined ? decls[0] : decls.find((d) => d.name === name);
    if (decl === undefined) {
      throw new BsCompileError(
        `${name ?? "no decl"} is not in the compiled scripts`,
        normalized,
        1
      );
    }
    return decl;
  };
  return {
    ...lookups,
    chunkFor: (path, name) => {
      const decl = declOf(path, name);
      const chunk = decl.chunk === undefined ? undefined : chunkOf(decl);
      if (chunk === undefined) {
        throw new BsCompileError(
          `${decl.name} is a ${decl.kind}, not a class`,
          normalizeScriptPath(path),
          1
        );
      }
      return chunk;
    },
    files: index.files,
    index,
    schemaFor: (path, name) => schemaOf(declOf(path, name)),
  };
}

// Reads a published tree, every chunk and schema into memory, so the tree
// can be replaced underneath it.
export function readCompiledBs(dir: string): CompiledScriptSet {
  const index = JSON.parse(
    readFileSync(join(dir, COMPILED_BS_INDEX), "utf8")
  ) as CompiledBsIndex;
  if (index.format !== COMPILED_BS_FORMAT) {
    throw new Error(
      `${dir}: compiled_bs format ${index.format}, expected ${COMPILED_BS_FORMAT}`
    );
  }
  const chunks = new Map<string, Uint8Array>();
  const schemas = new Map<string, BsSchema>();
  for (const file of index.files) {
    for (const decl of file.decls) {
      if (decl.chunk !== undefined) {
        chunks.set(
          decl.chunk,
          new Uint8Array(readFileSync(join(dir, decl.chunk)))
        );
      }
      schemas.set(
        decl.schema,
        JSON.parse(readFileSync(join(dir, decl.schema), "utf8")) as BsSchema
      );
    }
  }
  return compiledScriptSet(
    index,
    (decl) => (decl.chunk === undefined ? undefined : chunks.get(decl.chunk)),
    (decl) => {
      const schema = schemas.get(decl.schema);
      if (schema === undefined) {
        throw new Error(`${dir}: ${decl.schema} is not in the tree`);
      }
      return schema;
    }
  );
}

// The same set straight from a compile, nothing on disk: what tests and
// replays use, and what the reader gives back after a round trip.
export function compiledScriptSetOf(
  compiled: CompiledScriptFiles,
  stamp?: string
): CompiledScriptSet {
  // a decl's schema path names its module and itself, so it is unique
  const bySchema = new Map(
    compiled.decls.map((decl) => [schemaPath(decl), decl])
  );
  const compiledOf = (decl: CompiledBsDecl): BsCompiledDecl => {
    const source = bySchema.get(decl.schema);
    if (source === undefined) {
      throw new Error(`${decl.name} is not in the compile`);
    }
    return source;
  };
  return compiledScriptSet(
    compiledBsIndex(compiled, stamp),
    (decl) => compiledOf(decl).chunk,
    (decl) => compiledOf(decl).schema
  );
}
