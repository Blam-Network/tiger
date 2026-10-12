// A folder of BungieScript sources compiled as one project (classes share
// bases and types across files), each decl reached by path.
import {
  type BsCompiledDecl,
  type BsCompileOptions,
  type BsDiagnostic,
  compileBungieScript,
} from "./compile.ts";
import { BsCompileError } from "./lexer.ts";

export interface ScriptFileSource {
  // relative to the folder, forward or back slashes: "es/venus/x/x.es"
  readonly path: string;
  readonly text: string;
}

export interface CompiledScriptFiles {
  // a class decl's chunk; a struct or enum has none, so that throws
  chunkFor(path: string, decl?: string): Uint8Array;
  // the compiled decl behind a file's decl (its first when unnamed): the chunk,
  // the schema, the Lua and the imports.
  compiledDecl(path: string, decl?: string): BsCompiledDecl;
  readonly decls: readonly BsCompiledDecl[];
  readonly diagnostics: readonly BsDiagnostic[];
}

const LEADING_AT = /^@/;

function normalizePath(path: string): string {
  return path.replace(LEADING_AT, "").replaceAll("\\", "/");
}

export function compileScriptFiles(
  files: readonly ScriptFileSource[],
  options: BsCompileOptions = {}
): CompiledScriptFiles {
  const result = compileBungieScript(
    files.map((file) => ({ path: file.path, source: file.text })),
    options
  );
  const byPath = new Map<string, BsCompiledDecl[]>();
  for (const decl of result.decls) {
    const path = normalizePath(decl.path);
    byPath.set(path, [...(byPath.get(path) ?? []), decl]);
  }
  const compiledDecl = (path: string, name?: string): BsCompiledDecl => {
    const normalized = normalizePath(path);
    const decls = byPath.get(normalized) ?? [];
    const compiled =
      name === undefined ? decls[0] : decls.find((d) => d.name === name);
    if (compiled === undefined) {
      const errors = result.diagnostics.filter(
        (d) => d.path === normalized && d.severity === "error"
      );
      const detail = errors.map((d) => `${d.line}: ${d.message}`).join("; ");
      throw new BsCompileError(
        `${name ?? "no decl"} did not compile${detail ? `: ${detail}` : ""}`,
        normalized,
        errors[0]?.line ?? 1
      );
    }
    return compiled;
  };
  return {
    chunkFor: (path, name) => {
      const compiled = compiledDecl(path, name);
      if (compiled.chunk === undefined) {
        throw new BsCompileError(
          `${compiled.name} is a ${compiled.kind}, not a class`,
          normalizePath(path),
          1
        );
      }
      return compiled.chunk;
    },
    compiledDecl,
    decls: result.decls,
    diagnostics: result.diagnostics,
  };
}
