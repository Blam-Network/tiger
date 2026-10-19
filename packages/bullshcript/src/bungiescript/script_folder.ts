// Fukugen Daihon: a build's BungieScript sources in Bungie's tree (bs\ for
// libraries, es\ for encounters). Every decl compiles to its own chunk (class
// 80800B48); `# See tag <TAG>` trailers (82100029) name a decl's tags.
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatScriptTag } from "../hks/source/script_source.ts";
import { fnv1 } from "../host/tags/name_hash.ts";
import {
  type ActivityStart,
  type ActivityStartData,
  activityStartData,
  authoredActivityStart,
} from "./activity_start.ts";
import type { BsDeclKind, BsFileKind } from "./ast.ts";
import { BsCompileError } from "./lexer.ts";
import { bsFileKind, implicitDeclName, parseBungieScript } from "./parser.ts";

export { bundleHashOf } from "./parser.ts";

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
  // the bundle the file's encounter class runs in: its @activity_bundle
  readonly activityBundle: number | undefined;
  // how the encounter starts the activities it names (@activity and the
  // decorators below it)
  readonly activityStart: ActivityStart | undefined;
  // the chunk name Bungie's compiler was given, "@es\venus\venus_bounty_1.es"
  readonly chunkName: string;
  readonly decls: readonly ScriptDecl[];
  readonly kind: BsFileKind;
  // the type of each member its es-family class declares, in order
  readonly memberTypes: readonly string[];
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
const ACTIVITY_BUNDLE =
  /^@activity_bundle\(\s*(?:"([^"]*)"|0x([0-9A-Fa-f]{8}))\s*\)\s*(?:[@#].*)?$/;
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
  let activityBundle: number | undefined;
  for (const line of lines) {
    const match = ACTIVITY_BUNDLE.exec(line.trimEnd());
    if (match) {
      activityBundle =
        match[1] === undefined
          ? Number.parseInt(match[2] ?? "", 16) >>> 0
          : fnv1(match[1]);
    }
  }
  const shape = declaredShape(normalized, kind, text);
  return {
    activityBundle,
    activityStart: shape.activityStart,
    chunkName: scriptChunkName(normalized),
    decls,
    kind,
    memberTypes: shape.memberTypes,
    path: normalized,
    stubs,
    text,
  };
}

// What a host asks of a build's files, answered from what each file lists
// about itself, so the compiled tree (compiled_bs.ts) answers the same way the
// source folder does.
export interface ScriptLookups<T extends ScriptFileSummary> {
  // how an activity starts, by the activity definition's name, as the
  // script that names it authored it
  activityStart(activityName: string): ActivityStartData | undefined;
  // the file declaring a class, by its name: the archetype an Encounter row
  // runs (its childScript)
  archetypeScript(declName: string): T | undefined;
  // The other script classes a file's own class declares as members, in
  // member order: the children its instance embeds.
  memberScripts(file: T): T[];
  // A root's missions: the phase classes its own class declares as members,
  // in member order, as Bungie's root held its phases.
  missionScripts(root: T): T[];
  // the script whose encounter is decorated @activity_bundle(<the bundle>):
  // the destination's own (es\<destination>\) before a shared bs\ one.
  // Without a destination there must be one only; with none, no script runs.
  scriptByBundle(bundleHash: number, destination?: string): T | undefined;
  // takes Bungie's form ("@es\venus\venus_bounty_1.es") or the on-disk one
  scriptByPath(path: string): T | undefined;
}

// What the lookups read off a file, alike for a source (ScriptFile) and a
// compiled tree's index entry (CompiledBsFile).
export interface ScriptFileSummary {
  // the bundle its encounter class runs in (@activity_bundle)
  readonly activityBundle?: number | undefined;
  // how its encounter starts the activities it names
  readonly activityStart?: ActivityStart | undefined;
  // the classes, structs and enums it declares
  readonly decls: readonly { readonly name: string }[];
  readonly kind: BsFileKind;
  // the type of each member its es-family class declares, in order; none in
  // a .bs file
  readonly memberTypes: readonly string[];
  // relative to the build folder, forward slashes
  readonly path: string;
}

export function scriptLookups<T extends ScriptFileSummary>(
  files: readonly T[]
): ScriptLookups<T> {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const byBundle = new Map<number, T[]>();
  const byDecl = new Map<string, T>();
  const starts = new Map<string, ActivityStartData>();
  for (const file of files) {
    for (const activity of file.activityStart?.activities ?? []) {
      if (file.activityStart !== undefined && !starts.has(activity)) {
        starts.set(
          activity,
          activityStartData(file.activityStart, activity, file.path)
        );
      }
    }
    if (file.activityBundle !== undefined) {
      const bundle = file.activityBundle >>> 0;
      byBundle.set(bundle, [...(byBundle.get(bundle) ?? []), file]);
    }
    for (const { name } of file.decls) {
      if (!byDecl.has(name)) {
        byDecl.set(name, file);
      }
    }
  }
  const declared = (file: T) =>
    file.memberTypes.flatMap((type) => {
      const declarer = byDecl.get(type);
      return declarer === undefined ? [] : [declarer];
    });
  return {
    activityStart: (activityName) => starts.get(activityName),
    archetypeScript: (declName) => byDecl.get(declName),
    memberScripts: (file) => [
      ...new Set(declared(file).filter((member) => member.kind !== "esp")),
    ],
    missionScripts: (root) =>
      declared(root).filter((file) => file.kind === "esp"),
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

// What a file's class declares: the type of each member (an es-family file's
// only; a .bs file's classes are its own, see ScriptFileSummary), and how it
// starts its activities. A file that does not parse declares none.
function declaredShape(
  path: string,
  kind: BsFileKind,
  text: string
): {
  activityStart: ActivityStart | undefined;
  memberTypes: readonly string[];
} {
  try {
    const decls = parseBungieScript(text, path).decls;
    const start = decls.find(
      (decl) => decl.activityStart !== undefined
    )?.activityStart;
    return {
      activityStart: start && authoredActivityStart(start),
      memberTypes:
        kind === "bs"
          ? []
          : (decls[0]?.members.flatMap((member) =>
              member.kind === "field" ? [member.type.name] : []
            ) ?? []),
    };
  } catch {
    return { activityStart: undefined, memberTypes: [] };
  }
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
