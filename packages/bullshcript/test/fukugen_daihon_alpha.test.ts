// Fukugen Daihon's alpha folder: its shape, and against the alpha's dumps the
// checks: same code, same bytes, same schemas.
import {
  compileBungieScript,
  directoryScriptSource,
  type LuaChunk,
  loadScriptChunk,
  loadScriptFolder,
  parseLuaChunk,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { runGates } from "../tools/fukugen-daihon/alpha_lift/checks.ts";
import { diffChunks } from "../tools/fukugen-daihon/alpha_lift/chunk_diff.ts";
import { readAlphaSchemas } from "../tools/fukugen-daihon/alpha_lift/schemas.ts";
import {
  ALPHA_BUILD,
  fukugenDaihonBuildDir,
} from "../tools/fukugen-daihon/folder.ts";

const BUNGIE_PATH = /^(bs|es)\/[a-z0-9_]+(\/[a-z0-9_]+)*\.(bs|es|esp|esu)$/;

const alpha = loadScriptFolder(fukugenDaihonBuildDir(ALPHA_BUILD));
const { scriptByPath, scriptByTag, files: scriptFiles } = alpha;
const decls = scriptFiles.flatMap((file) => file.decls);
const compiled = decls.filter((decl) => decl.tags.length > 0);
const tags = decls.flatMap((decl) => decl.tags);
const stubs = scriptFiles.filter((file) => file.stubs.length > 0);
const stubTags = stubs.flatMap((file) => file.stubs.flatMap((s) => s.tags));

// Compiled once: the whole folder is one project.
const result = compileBungieScript(alpha.scriptSources());

describe("alpha script sources", () => {
  it("holds every chunk of the alpha's script tags", () => {
    // 152 chunks: 127 distinct decls in 120 files; the rest are the same decl
    // compiled into several packages.
    expect(scriptFiles).toHaveLength(129);
    expect(compiled).toHaveLength(127);
    expect(tags).toHaveLength(152);
    expect(new Set(tags).size).toBe(152);
    expect(stubs).toHaveLength(7);
    expect(stubTags).toHaveLength(13);
    expect(decls.filter((d) => d.kind === "enum")).toHaveLength(12);
    expect(decls.filter((d) => d.kind === "struct").length).toBeGreaterThan(80);
  });

  it("lays files out at Bungie's source paths", () => {
    for (const file of scriptFiles) {
      expect(file.path).toMatch(BUNGIE_PATH);
      expect(file.path.startsWith("bs/")).toBe(file.kind === "bs");
      expect(file.text).toContain(
        "# Decompiled from 36735.13.12.02.1953.alpha script tags"
      );
    }
    // a stub file is nothing but its trailer
    for (const file of stubs) {
      expect(file.decls, file.path).toEqual([]);
      expect(
        file.text
          .split("\n")
          .every((line) => line === "" || line.startsWith("#")),
        file.path
      ).toBe(true);
    }
  });

  it("finds sources by path and tag", () => {
    const strike = scriptByTag(0x821b8018);
    expect(strike?.file.path).toBe(
      "es/venus/strike_1_activity/strike_1_activity.es"
    );
    expect(strike?.decl?.name).toBe("c_encounter__strike_1_activity");
    expect(scriptByTag("821B8042")?.file.path).toBe(
      "es/venus/strike_1_activity/venus_strike_1_mission4_temp.esp"
    );
    expect(scriptByTag("82100029")?.decl?.name).toBe("full_auto_weapon");
    expect(scriptByTag("8228A00D")?.decl?.tags).toEqual([
      "82100010",
      "821B8053",
      "821E2007",
      "8228A00D",
    ]);
    expect(
      scriptByPath("@bs\\weapons\\weapon_types.bs")?.decls.filter(
        (d) => d.kind === "class"
      )
    ).toHaveLength(7);
    const stub = scriptByTag("821B8003");
    expect(stub?.decl).toBeUndefined();
    expect(stub?.name).toBe("c_encounter__public_common");
    expect(stub?.file.path).toBe("bs/activities/common/public_common.bs");
    expect(scriptByTag("82100001")?.name).toBe("c_player_status_icon");
  });

  it("compiles as one project with every name resolved", () => {
    expect(result.diagnostics).toEqual([]);
    const byName = new Set(result.decls.map((d) => d.name));
    for (const decl of compiled) {
      expect(byName.has(decl.name), decl.name).toBe(true);
    }
    for (const file of stubs) {
      expect(
        result.decls.some((d) => d.path === file.path),
        file.path
      ).toBe(false);
    }
  });
});

// TIGER_LUA_CHUNKS: the alpha's dumped script tags (<TAGID>_<package>.lua51)
const chunksDir = process.env.TIGER_LUA_CHUNKS;

// The line tables the layout cannot reproduce: interactable_placement's main
// (no line for `else:`), in both packages that carry it.
const KNOWN_LINE_MISSES = new Set(["821B8023", "8228A009"]);

describe.skipIf(!chunksDir)("alpha script sources against the chunks", () => {
  // a skipped suite still collects, so nothing reads the dumps until it runs
  const source = chunksDir ? directoryScriptSource(chunksDir) : undefined;
  const originals = new Map<string, LuaChunk>();
  for (const tag of source?.tags() ?? []) {
    const chunk = source && loadScriptChunk(source, tag);
    if (chunk) {
      originals.set(tag, chunk);
    }
  }

  it("has each chunk's decl at the path the chunk declares", () => {
    expect(source?.tags()).toHaveLength(165);
    for (const tag of source?.tags() ?? []) {
      const chunk = originals.get(tag);
      const entry = scriptByTag(tag);
      if (!chunk) {
        expect(entry?.file, tag).toBeDefined();
        expect(entry?.decl, tag).toBeUndefined();
        continue;
      }
      expect(entry?.file.chunkName, tag).toBe(chunk.root.source);
    }
  });

  // the compiled decl behind a tag: by file and name, since two files
  // declare a c_encounter__enc_plaza_amb1 (the Tower's and the academy's)
  const compiledFor = (tag: string) => {
    const entry = scriptByTag(tag);
    return result.decls.find(
      (d) => d.path === entry?.file.path && d.name === entry?.name
    );
  };

  // Same code: every decl compiles to the instructions and constants of
  // every chunk compiled from it
  it("compiles every decl to the same code as its chunks", () => {
    let matched = 0;
    for (const [tag, original] of originals) {
      const decl = compiledFor(tag);
      expect(decl?.chunk, tag).toBeDefined();
      const actual = parseLuaChunk(decl?.chunk as Uint8Array, tag);
      expect(diffChunks(original, actual), `${tag} ${decl?.name}`).toEqual([]);
      matched++;
    }
    expect(matched).toBe(152);
  });

  it("compiles every decl to the same bytes as its chunks but the known misses", () => {
    const misses: string[] = [];
    for (const [tag, original] of originals) {
      const decl = compiledFor(tag);
      const actual = parseLuaChunk(decl?.chunk as Uint8Array, tag);
      if (diffChunks(original, actual, { lines: true }).length > 0) {
        misses.push(tag);
      }
    }
    expect(misses.sort()).toEqual([...KNOWN_LINE_MISSES].sort());
  });
});

// TIGER_PACKAGES_DIR: the alpha packages, for the schema tags
const packagesDir = process.env.TIGER_PACKAGES_DIR;

describe.skipIf(!(chunksDir && packagesDir))(
  "alpha script sources against the schemas",
  () => {
    // Same schemas: member names, order, kinds, side, defaults, thread flags,
    // parent
    it("compiles every decl to the same schema as its tags", () => {
      const schemas = readAlphaSchemas(packagesDir ?? "");
      const source = directoryScriptSource(chunksDir ?? "");
      const chunks = new Map<string, LuaChunk>();
      for (const tag of source.tags()) {
        const chunk = loadScriptChunk(source, tag);
        if (chunk) {
          chunks.set(tag, chunk);
        }
      }
      const report = runGates(result, schemas, chunks);
      expect(report.schemaMisses).toEqual([]);
      expect(report.schemaAgree).toBe(127);
      // every native base is complete (native_types.ts), so no member is left
      // between base and script
      expect(report.undecidable).toEqual([]);
    });
  }
);
