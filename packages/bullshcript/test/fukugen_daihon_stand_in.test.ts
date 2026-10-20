// Stand-in lines in Fukugen Daihon's builds. A decorator's line is not a line of
// Bungie's script, so a build compiles to the same chunks whether its sources
// carry the decorators or not: lua, schema and chunk bytes, line info included.
import {
  chunkLineOf,
  compileScriptFiles,
  fileLineOf,
  loadScriptFolder,
  readBytecode,
  tokenize,
  walkProtos,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  ALPHA_BUILD,
  EVIL_BUILD,
  fukugenDaihonBuildDir,
  TU0_BUILD,
} from "../tools/fukugen-daihon/folder.ts";

const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS = new Set([")", "]", "}"]);

// The source with its decorators taken out, written apart from the compiler's
// rule: a decorator's text goes, a line left with nothing on it goes too, and
// so do the comment lines directly above such a line.
function withoutDecorators(text: string, path: string): string {
  const tokens = tokenize(text, path);
  const cuts: [number, number][] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind !== "op" || tokens[i].text !== "@") {
      continue;
    }
    // `@`, the name, `(`, then to the `)` that closes it
    let depth = 0;
    let close = i + 2;
    for (let k = i + 2; k < tokens.length; k++) {
      if (tokens[k].kind === "op" && OPENERS.has(tokens[k].text)) {
        depth++;
      } else if (tokens[k].kind === "op" && CLOSERS.has(tokens[k].text)) {
        depth--;
      }
      if (depth === 0) {
        close = k;
        break;
      }
    }
    let to = tokens[close].end;
    while (text[to] === " ") {
      to++;
    }
    cuts.push([tokens[i].start, to]);
    i = close;
  }
  const mask = new Uint8Array(text.length);
  for (const [from, to] of cuts) {
    mask.fill(1, from, to);
  }
  const removed = (offset: number) => mask[offset] === 1;
  const lines: { cut: boolean; left: string; original: string }[] = [];
  let offset = 0;
  for (const original of text.split("\n")) {
    let left = "";
    let cut = false;
    for (let i = 0; i < original.length; i++) {
      if (removed(offset + i)) {
        cut = true;
      } else {
        left += original[i];
      }
    }
    lines.push({ cut, left, original });
    offset += original.length + 1;
  }
  const dropped = new Set<number>();
  lines.forEach((line, index) => {
    if (line.cut && line.left.trim() === "") {
      dropped.add(index);
    }
  });
  for (const index of [...dropped]) {
    for (
      let above = index - 1;
      above >= 0 && lines[above].original.trimStart().startsWith("#");
      above--
    ) {
      dropped.add(above);
    }
  }
  return lines
    .filter((_, index) => !dropped.has(index))
    .map((line) => line.left)
    .join("\n");
}

// what stripping the decorators cannot keep: the start data, the bundle, the
// squad counts, the squads that start placed, the scripts that start with
// their class, the squads' Objectives, the tasks' gates, the phases that can
// hard wipe, and the source lines schemas carry for diagnostics
const DECORATOR_DATA = new Set([
  "activityBundleName",
  "activityStart",
  "autostart",
  "hardWipe",
  "line",
  "memberCounts",
  "objective",
  "placed",
  "tasks",
]);

function schemaWithoutDecorators(schema: unknown): string {
  return JSON.stringify(schema, (key, value) =>
    DECORATOR_DATA.has(key) ? undefined : value
  );
}

const BUILDS = [ALPHA_BUILD, TU0_BUILD, EVIL_BUILD];

describe.each(BUILDS)("%s without its decorators", (build) => {
  const folder = loadScriptFolder(fukugenDaihonBuildDir(build));
  const authored = compileScriptFiles(folder.files);
  const stripped = compileScriptFiles(
    folder.files.map((file) => ({
      path: file.path,
      text: withoutDecorators(file.text, file.path),
    }))
  );

  it("compiles both ways", () => {
    expect(authored.diagnostics.filter((d) => d.severity === "error")).toEqual(
      []
    );
    expect(stripped.diagnostics.filter((d) => d.severity === "error")).toEqual(
      []
    );
    expect(authored.decls.length).toBeGreaterThan(0);
    expect(stripped.decls.map((d) => [d.path, d.name])).toEqual(
      authored.decls.map((d) => [d.path, d.name])
    );
  });

  it("has the same chunks, lua and schemas, line info included", () => {
    const withLines = authored.decls.filter((d) => d.standInLines.length > 0);
    expect(withLines.length).toBeGreaterThan(0);
    expect(stripped.decls.every((d) => d.standInLines.length === 0)).toBe(true);
    authored.decls.forEach((decl, index) => {
      const bare = stripped.decls[index];
      const name = `${decl.path} ${decl.name}`;
      expect(decl.lua, name).toBe(bare.lua);
      expect(
        decl.chunk && Buffer.from(decl.chunk).toString("base64"),
        name
      ).toBe(bare.chunk && Buffer.from(bare.chunk).toString("base64"));
      expect(schemaWithoutDecorators(decl.schema), name).toBe(
        schemaWithoutDecorators(bare.schema)
      );
    });
  });

  it("puts a chunk's lines back on lines of the file", () => {
    for (const decl of authored.decls) {
      if (decl.chunk === undefined || decl.standInLines.length === 0) {
        continue;
      }
      const standIn = new Set(decl.standInLines);
      const chunk = readBytecode(decl.chunk, decl.name);
      for (const proto of walkProtos(chunk.root)) {
        for (const line of proto.lineInfo) {
          const at = fileLineOf(decl.standInLines, line);
          expect(standIn.has(at), `${decl.path}:${at}`).toBe(false);
          expect(chunkLineOf(decl.standInLines, at)).toBe(line);
        }
      }
    }
  });
});
