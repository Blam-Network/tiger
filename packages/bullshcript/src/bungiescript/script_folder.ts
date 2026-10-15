// Fukugen Daihon: a build's BungieScript sources in Bungie's tree (bs\ for
// libraries, es\ for encounters). Every decl compiles to its own chunk (class
// 80800B48); `# See tag <TAG>` trailers (82100029) name a decl's tags.
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatScriptTag } from "../hks/source/script_source.ts";
import { fnv1 } from "../host/tags/name_hash.ts";
import type { BsDeclKind, BsFileKind } from "./ast.ts";
import { BsCompileError } from "./lexer.ts";
import { bsFileKind, implicitDeclName, scriptStem } from "./parser.ts";

export interface ScriptDecl {
  readonly kind: BsDeclKind;
  // 1-based line of the decl's header (1 for an es-family file's class)
  readonly line: number;
  readonly name: string;
  // compiled script tags built from this decl, uppercase hex
  readonly tags: readonly string[];
}

// A decl the trailer names but the file does not declare: its tags hold no
// compiled code, so there was nothing to recover.
export interface ScriptStub {
  readonly name: string;
  readonly tags: readonly string[];
}

export interface ScriptFile {
  // the chunk name Bungie's compiler was given, "@es\venus\venus_bounty_1.es"
  readonly chunkName: string;
  readonly decls: readonly ScriptDecl[];
  readonly kind: BsFileKind;
  // relative to the build folder, forward slashes: "es/venus/venus_bounty_1.es"
  readonly path: string;
  readonly stubs: readonly ScriptStub[];
  readonly text: string;
}

export interface ScriptTagEntry {
  // the decl the tag was compiled from; undefined when the tag holds no
  // chunk, so the file is only the trailer that names the decl
  readonly decl: ScriptDecl | undefined;
  readonly file: ScriptFile;
  readonly name: string;
}

const DECL_HEADER = /^(class|struct|enum)\s+([A-Za-z_][A-Za-z0-9_]*)/;
const DECL_TAGS =
  /^#\s*See tags?\s+([0-9A-Fa-f]{8}(?:\s*,\s*[0-9A-Fa-f]{8})*)(?:\s+\(([A-Za-z_][A-Za-z0-9_]*)\))?\s*$/;
const TAG_SEPARATOR = /\s*,\s*/;
const LEADING_AT = /^@/;
const SOURCE_EXTENSION = /\.(bs|es|esp|esu)$/;

// "@es\venus\x.es", "es\venus\x.es" and "es/venus/x.es" all name the same file.
export function normalizeScriptPath(path: string): string {
  return path.replace(LEADING_AT, "").replaceAll("\\", "/");
}

export function scriptChunkName(path: string): string {
  return `@${normalizeScriptPath(path).replaceAll("/", "\\")}`;
}

function tagText(tag: number | string): string {
  return formatScriptTag(
    typeof tag === "number" ? tag : Number.parseInt(tag, 16)
  );
}

export function parseScriptFile(path: string, text: string): ScriptFile {
  const normalized = normalizeScriptPath(path);
  const kind = bsFileKind(normalized);
  if (!kind) {
    throw new BsCompileError(
      "not a script source (.bs/.es/.esp/.esu)",
      normalized,
      1
    );
  }
  const lines = text.split("\n");
  // decl name -> tags; "" for an unnamed line, which belongs to the file's
  // only class (structs and enums compile to no script tag)
  const tags = new Map<string, string[]>();
  for (const line of lines) {
    const match = DECL_TAGS.exec(line.trimEnd());
    if (match) {
      tags.set(match[2] ?? "", match[1].split(TAG_SEPARATOR).map(tagText));
    }
  }
  const tagsOf = (name: string, only: boolean) =>
    tags.get(name) ?? (only ? tags.get("") : undefined) ?? [];
  const decls: ScriptDecl[] = [];
  if (kind === "bs") {
    const headers = lines.flatMap((line, index) => {
      const match = DECL_HEADER.exec(line);
      return match ? [{ index, match }] : [];
    });
    const classes = headers.filter(({ match }) => match[1] === "class");
    for (const { index, match } of headers) {
      const name = match[2];
      const kind = match[1] as BsDeclKind;
      decls.push({
        kind,
        line: index + 1,
        name,
        tags: tagsOf(name, kind === "class" && classes.length === 1),
      });
    }
  } else {
    const name = implicitDeclName(normalized, kind);
    decls.push({ kind: "class", line: 1, name, tags: tagsOf(name, true) });
  }
  const declared = new Set(decls.map((decl) => decl.name));
  const stubs = [...tags]
    .filter(([name]) => name !== "" && !declared.has(name))
    .map(([name, list]) => ({ name, tags: list }));
  return {
    chunkName: scriptChunkName(normalized),
    decls,
    kind,
    path: normalized,
    stubs,
    text,
  };
}

// A bundle whose name never cracked keeps its script as unknown_<hash> (true
// name unknown); every other file's name is the one that hashes to its bundle.
const UNKNOWN_NAME = /^unknown_([0-9a-f]{8})$/;

export function bundleHashOf(stem: string): number {
  const unknown = UNKNOWN_NAME.exec(stem);
  return unknown ? Number.parseInt(unknown[1] ?? "", 16) >>> 0 : fnv1(stem);
}

function folder(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

// What a host asks of a build's files, answered from their paths and kinds
// alone, so the compiled tree (compiled_bs.ts) answers the same way the
// source folder does.
export interface ScriptLookups<T extends ScriptPathed> {
  // the archetype an Encounter row runs (its childScript), by declared
  // name: es/utility_scripts/<name>.esu
  archetypeScript(declName: string): T | undefined;
  // A root is the .es named after its folder; its missions are the .esp files
  // beside it, by name.
  missionScripts(root: T): T[];
  // A bundle's hash is fnv1 of its script's file name; a destination folder
  // picks between two files with one name, a bs\ script serves every destination.
  scriptByBundle(bundleHash: number, destination?: string): T | undefined;
  // takes Bungie's form ("@es\venus\venus_bounty_1.es") or the on-disk one
  scriptByPath(path: string): T | undefined;
}

export interface ScriptPathed {
  readonly kind: BsFileKind;
  // relative to the build folder, forward slashes
  readonly path: string;
}

export function scriptLookups<T extends ScriptPathed>(
  files: readonly T[]
): ScriptLookups<T> {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const byBundle = new Map<number, T[]>();
  for (const file of files) {
    const hash = bundleHashOf(scriptStem(file.path));
    byBundle.set(hash, [...(byBundle.get(hash) ?? []), file]);
  }
  return {
    archetypeScript: (declName) =>
      byPath.get(`es/utility_scripts/${declName}.esu`),
    missionScripts: (root) => {
      const parent = folder(root.path);
      if (
        root.kind !== "es" ||
        scriptStem(root.path) !== parent.slice(parent.lastIndexOf("/") + 1)
      ) {
        return [];
      }
      return files
        .filter((file) => file.kind === "esp" && folder(file.path) === parent)
        .sort((a, b) => a.path.localeCompare(b.path, "en", { numeric: true }));
    },
    scriptByBundle: (bundleHash, destination) => {
      const found = byBundle.get(bundleHash >>> 0) ?? [];
      if (destination === undefined) {
        return found.length === 1 ? found[0] : undefined;
      }
      return (
        found.find((file) => file.path.startsWith(`es/${destination}/`)) ??
        found.find((file) => file.kind === "bs")
      );
    },
    scriptByPath: (path) => byPath.get(normalizeScriptPath(path)),
  };
}

export interface ScriptFolder extends ScriptLookups<ScriptFile> {
  readonly dir: string;
  // every script source under it, sorted by path
  readonly files: readonly ScriptFile[];
  // the decl a compiled script tag (class 80800B48) was built from, or the
  // file that records a tag with no chunk in it
  scriptByTag(tag: number | string): ScriptTagEntry | undefined;
  // the whole folder as compileBungieScript takes it, one project
  scriptSources(): { path: string; source: string }[];
}

// Every script source under a build's folder, relative, forward slashes,
// sorted. Line endings are normalized to LF.
export function readScriptSources(dir: string): Map<string, string> {
  const paths: string[] = [];
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const path = join(at, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (SOURCE_EXTENSION.test(entry.name)) {
        paths.push(relative(dir, path).replaceAll("\\", "/"));
      }
    }
  };
  walk(dir);
  paths.sort();
  return new Map(
    paths.map((path) => [
      path,
      readFileSync(join(dir, path), "utf8").replaceAll("\r\n", "\n"),
    ])
  );
}

export function loadScriptFolder(dir: string): ScriptFolder {
  const files = [...readScriptSources(dir)].map(([path, text]) =>
    parseScriptFile(path, text)
  );
  const byTag = new Map<string, ScriptTagEntry>();
  for (const file of files) {
    for (const decl of file.decls) {
      for (const tag of decl.tags) {
        byTag.set(tag, { decl, file, name: decl.name });
      }
    }
    for (const stub of file.stubs) {
      for (const tag of stub.tags) {
        byTag.set(tag, { decl: undefined, file, name: stub.name });
      }
    }
  }
  return {
    ...scriptLookups(files),
    dir,
    files,
    scriptByTag: (tag) => byTag.get(tagText(tag)),
    scriptSources: () =>
      files.map((file) => ({ path: file.path, source: file.text })),
  };
}

// FUKUGEN_DAIHON_DIR when set, else the folder beside this package, found
// from an entry module's real path so a file: link still resolves.
export function fukugenDaihonDir(
  entryModule: string,
  build = "v41375_14_07_03_1501_live"
): string {
  const path = entryModule.startsWith("file:")
    ? fileURLToPath(entryModule)
    : entryModule;
  const root =
    process.env.FUKUGEN_DAIHON_DIR ??
    resolve(realpathSync(path), "../../../../../fukugen-daihon");
  return join(root, "destiny1", build);
}
