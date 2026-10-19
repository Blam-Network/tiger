// BungieScript sources in, per declaration the Bungie-shape Lua, the chunk it
// compiles to (lines mapped back to the source), the schema description and the
// import list.

import { compileLua, sourceBytes } from "../hks/compiler/compile.ts";
import type { BsDeclKind, BsFile, BsFileKind } from "./ast.ts";
import { type BsDiagnostic, generateLua } from "./codegen.ts";
import { BsCompileError } from "./lexer.ts";
import {
  ENCOUNTER_PREFIX,
  encounterDeclName,
  parseBungieScript,
} from "./parser.ts";
import { Project, type ProjectDecl } from "./project.ts";
import { type BsSchema, emitSchema, methodKey } from "./schema.ts";
import { chunkLineOf } from "./stand_in.ts";
import type { BsRegistryEntry } from "./types.ts";

export type { BsDiagnostic } from "./codegen.ts";

export interface BsSourceFile {
  // project-relative, forward or back slashes: "es/utility_scripts/x.esu"
  readonly path: string;
  readonly source: string;
}

export interface BsCompileOptions {
  // compile the Lua to a chunk (default true); off for text-only tools
  readonly chunks?: boolean;
}

export interface BsCompiledDecl {
  // the compiled chunk; absent for structs, enums and with chunks: false
  readonly chunk: Uint8Array | undefined;
  readonly chunkName: string;
  readonly fileKind: BsFileKind;
  readonly imports: readonly BsRegistryEntry[];
  readonly kind: BsDeclKind;
  // generated Lua line -> source line (the file's own), [0] being the
  // fallback (see codegen)
  readonly lineMap: readonly number[];
  readonly lua: string;
  readonly modulePath: string;
  readonly name: string;
  readonly path: string;
  readonly schema: BsSchema;
  // the file's lines the chunk's line numbers leave out (stand_in.ts)
  readonly standInLines: readonly number[];
}

export interface BsCompileResult {
  readonly decls: readonly BsCompiledDecl[];
  readonly diagnostics: readonly BsDiagnostic[];
}

function errorDiagnostic(error: unknown, path: string): BsDiagnostic {
  if (error instanceof BsCompileError) {
    return {
      line: error.line,
      message: error.message,
      path: error.path,
      severity: "error",
    };
  }
  return {
    line: 0,
    message: error instanceof Error ? error.message : String(error),
    path,
    severity: "error",
  };
}

function luaNamesOf(decl: ProjectDecl, project: Project): Map<string, string> {
  const names = new Map<string, string>();
  for (const member of decl.decl.members) {
    if (member.kind === "thread") {
      names.set(member.name, `${member.name}_d_execute_impl`);
    } else if (member.kind === "def") {
      const key = methodKey(member.owner, member.name);
      if (member.owner === undefined) {
        names.set(
          key,
          project.isDelegate(decl, member.name)
            ? `${member.name}_impl`
            : member.name
        );
      } else {
        names.set(key, `${member.owner}_${member.name}_impl`);
      }
    }
  }
  return names;
}

export function compileBungieScript(
  files: readonly BsSourceFile[],
  options: BsCompileOptions = {}
): BsCompileResult {
  const diagnostics: BsDiagnostic[] = [];
  const parsed: { file: BsFile; source: string }[] = [];
  for (const file of files) {
    const source = sourceBytes(file.source);
    try {
      parsed.push({ file: parseBungieScript(source, file.path), source });
    } catch (error) {
      diagnostics.push(errorDiagnostic(error, file.path));
    }
  }
  const project = new Project(parsed.map((entry) => entry.file));
  const sources = new Map(parsed.map((entry) => [entry.file, entry.source]));
  const decls: BsCompiledDecl[] = [];
  diagnostics.push(...activityStartDiagnostics(project.decls));
  for (const decl of project.decls) {
    diagnostics.push(...encounterDiagnostics(decl, project));
    try {
      decls.push(
        compileDecl(
          decl,
          project,
          sources.get(decl.file) as string,
          options,
          diagnostics
        )
      );
    } catch (error) {
      diagnostics.push(errorDiagnostic(error, decl.file.path));
    }
  }
  return { decls, diagnostics };
}

// An encounter class is named c_encounter__<file stem>, and only encounter
// classes carry the prefix (implicit .es classes always are). Its bundle is
// the one its @activity_bundle names; without one it runs in none (reported,
// unless the file is only start decorators).
function encounterDiagnostics(
  decl: ProjectDecl,
  project: Project
): BsDiagnostic[] {
  if (decl.decl.kind !== "class") {
    return [];
  }
  const out: BsDiagnostic[] = [];
  const report = (
    message: string,
    severity: BsDiagnostic["severity"],
    line = decl.decl.line
  ) => out.push({ line, message, path: decl.file.path, severity });
  const encounter = project.isEncounter(decl);
  const expected = encounterDeclName(decl.file.path);
  if (!decl.decl.implicit && encounter && decl.name !== expected) {
    report(
      `encounter class '${decl.name}' should be named '${expected}' after its file`,
      "warning"
    );
  } else if (!encounter && decl.name.startsWith(ENCOUNTER_PREFIX)) {
    report(
      `'${decl.name}' is named as an encounter but is not built on c_encounter`,
      "warning"
    );
  }
  const bundle = decl.decl.activityBundle;
  // A root that only says how its activity starts (decorators, no members)
  // has no bundle to run in and nothing to run.
  const startOnly =
    decl.decl.activityStart !== undefined && decl.decl.members.length === 0;
  if (encounter && bundle === undefined && !startOnly) {
    report(
      `encounter class '${decl.name}' runs in no bundle; give it @activity_bundle("<bundle name>")`,
      "warning"
    );
  } else if (!encounter && bundle !== undefined) {
    report(
      `@activity_bundle on '${decl.name}', which is not an encounter class`,
      "error",
      bundle.line
    );
  }
  const start = decl.decl.activityStart;
  if (!encounter && start !== undefined) {
    report(
      `@activity on '${decl.name}', which is not an encounter class`,
      "error",
      start.line
    );
  }
  return out;
}

// An activity starts one way: two scripts naming the same activity is an error
// at the second.
function activityStartDiagnostics(
  decls: readonly ProjectDecl[]
): BsDiagnostic[] {
  const owners = new Map<string, string>();
  const out: BsDiagnostic[] = [];
  for (const decl of decls) {
    const start = decl.decl.activityStart;
    for (const activity of start?.activities ?? []) {
      const owner = owners.get(activity);
      if (owner === undefined) {
        owners.set(activity, decl.file.path);
      } else {
        out.push({
          line: start?.line ?? 1,
          message: `activity '${activity}' already starts in ${owner}`,
          path: decl.file.path,
          severity: "error",
        });
      }
    }
  }
  return out;
}

function compileDecl(
  decl: ProjectDecl,
  project: Project,
  source: string,
  options: BsCompileOptions,
  diagnostics: BsDiagnostic[]
): BsCompiledDecl {
  const schema = emitSchema(decl, project, luaNamesOf(decl, project));
  const generated = generateLua(decl, project, source);
  diagnostics.push(...generated.diagnostics);
  const chunk =
    decl.decl.kind === "class" && options.chunks !== false
      ? compileLua(Buffer.from(generated.lua, "latin1"), {
          chunkName: decl.chunkName,
          lineMap: lineMapper(generated.lineMap, decl.file.standInLines),
        })
      : undefined;
  return {
    chunk,
    chunkName: decl.chunkName,
    fileKind: decl.file.kind,
    imports: generated.imports,
    kind: decl.decl.kind,
    lineMap: generated.lineMap,
    lua: generated.lua,
    modulePath: decl.modulePath,
    name: decl.name,
    path: decl.file.path,
    schema,
    standInLines: decl.file.standInLines,
  };
}

// hks's m_debugMap for this decl: a generated Lua line's line in the chunk, and
// the first function's line for anything unmapped (the main chunk's 0). That
// is its source line less the stand-in lines above it.
export function lineMapper(
  lineMap: readonly number[],
  standInLines: readonly number[] = []
): (luaLine: number) => number {
  return (luaLine) =>
    chunkLineOf(standInLines, lineMap[luaLine] ?? lineMap[0] ?? luaLine);
}
