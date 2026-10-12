#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  decompile,
  type LuaChunk,
  parseLuaChunk,
  scriptChunkOffset,
} from "./versions/destiny1/v36735_13_12_02_1953_alpha.ts";
import {
  compile,
  compileScriptFiles,
  formatDiagnostic,
  writeCompiledBs,
} from "./versions/destiny1/v41375_14_07_03_1501_live.ts";

const USAGE = `usage: bullshcript <command> <path> [options]

  decompile <file> [--lines]   Lua source for a script tag or bare chunk
  compile <file.lua> [--out <file>] [--chunk-name <name>]
                               Lua source to a chunk, written to --out
                               (default <file>.luac). --chunk-name is the
                               source path the chunk records, Bungie's form
                               "@es\\venus\\strike.es"; default "@<file>"
  bs compile <files...> [--out <dir>] [--lua]
                               BungieScript (.bs/.es/.esp/.esu) sources
                               compiled as one project into Bungie's tree,
                               <dir>/compiled_bs/ (index.json, lua/<module>/
                               <decl>.luac, code_tags/<module>/<decl>.schema.json),
                               published whole or not at all; --lua writes
                               the Lua beside the chunk

A file is a dumped script tag (<TAGID>_<label>.lua51) or a bare chunk.`;

const TAG_ID_END = /[_.]/;
const LUA_EXTENSION = /\.lua$/;
const PROJECT_ROOT = /(?:^|[\\/])((?:bs|es)[\\/].*)$/;

function readChunk(path: string): LuaChunk {
  const bytes = readFileSync(path);
  const at = scriptChunkOffset(bytes);
  if (at < 0) {
    throw new Error(`${path}: no Lua chunk in it`);
  }
  const tagId = basename(path).split(TAG_ID_END)[0].toUpperCase();
  return parseLuaChunk(new Uint8Array(bytes.subarray(at)), tagId);
}

function option(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  return at < 0 ? undefined : args[at + 1];
}

function compileFile(path: string, rest: string[]): string {
  const out =
    option(rest, "--out") ?? `${path.replace(LUA_EXTENSION, "")}.luac`;
  const chunkName =
    option(rest, "--chunk-name") ?? `@${path.replaceAll("/", "\\")}`;
  const bytes = compile(readFileSync(path, "utf8"), { chunkName });
  writeFileSync(out, bytes);
  return `${out}: ${bytes.length} bytes, source ${chunkName}`;
}

// The path a BungieScript file has inside its project: from its bs/ or es/
// root, else just the file name.
function projectPath(path: string): string {
  return (PROJECT_ROOT.exec(path)?.[1] ?? basename(path)).replaceAll("\\", "/");
}

function compileBs(args: string[]): string {
  const outDir = option(args, "--out");
  const files = args.filter(
    (arg, i) => !arg.startsWith("--") && args[i - 1] !== "--out"
  );
  if (files.length === 0) {
    return USAGE;
  }
  // LF line endings, as the folder loader reads them, so the chunks match
  const result = compileScriptFiles(
    files.map((path) => ({
      path: projectPath(path),
      text: readFileSync(path, "utf8").replaceAll("\r\n", "\n"),
    }))
  );
  const lines = result.diagnostics.map(formatDiagnostic);
  for (const decl of result.decls) {
    const imports = decl.imports.map((entry) => entry.name).join(" ");
    lines.push(
      `${decl.name}: ${decl.chunk?.length ?? 0} bytes, ${decl.chunkName}, imports ${imports || "none"}`
    );
  }
  if (result.diagnostics.some((d) => d.severity === "error")) {
    // the writer would refuse the build anyway; say so instead of throwing
    process.exitCode = 1;
    if (outDir !== undefined) {
      lines.push(`${outDir}: not written, the sources have errors`);
    }
  } else if (outDir !== undefined) {
    const dir = join(outDir, "compiled_bs");
    const index = writeCompiledBs(dir, result, { lua: args.includes("--lua") });
    lines.push(`${dir}: ${index.files.length} files, ${index.stamp}`);
  }
  return lines.join("\n");
}

function run(args: string[]): string {
  const [command, path, ...rest] = args;
  if (!(command && path)) {
    return USAGE;
  }
  if (command === "bs") {
    return path === "compile" ? compileBs(rest) : USAGE;
  }
  switch (command) {
    case "decompile":
      return decompile(readChunk(path), {
        lineNumbers: rest.includes("--lines"),
      }).source;
    case "compile":
      return compileFile(path, rest);
    default:
      return USAGE;
  }
}

try {
  process.stdout.write(`${run(process.argv.slice(2))}\n`);
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exitCode = 1;
}
