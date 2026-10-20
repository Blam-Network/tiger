// Fukugen Daihon's alpha folder: its shape, and against the alpha's dumps the
// checks: same code, same bytes, same schemas.
import {
  compileBungieScript,
  directoryScriptSource,
  type HksBytecode,
  loadScriptChunk,
  loadScriptFolder,
  readBytecode,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import {
  REAL_KINDS,
  runGates,
} from "../tools/fukugen-daihon/alpha_lift/checks.ts";
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

  it("decorates each encounter with the bundle its host names", () => {
    // 36 .es files plus story_common and pvp_common (public_common's tags
    // hold no class)
    const decorated = scriptFiles.filter(
      (file) => file.activityBundle !== undefined
    );
    expect(decorated).toHaveLength(38);
    for (const file of scriptFiles.filter((f) => f.kind === "es")) {
      expect(file.activityBundle, file.path).toBeDefined();
    }
  });

  it("binds the scripts whose bundles have other names, as the hosts do", () => {
    // host activity_bundle_name: 27DD7734 bounty_1_activity, 39774EE1 pvp
    expect(alpha.scriptByBundle(0x27_dd_77_34)?.path).toBe(
      "es/venus/venus_bounty_1.es"
    );
    expect(alpha.scriptByBundle(0x39_77_4e_e1, "pvp_greenhouse")?.path).toBe(
      "es/pvp_greenhouse/pvp_greenhouse.es"
    );
    const strike = alpha.scriptByPath(
      "es/venus/strike_1_activity/strike_1_activity.es"
    );
    expect(strike && alpha.missionScripts(strike).map((f) => f.path)).toEqual([
      "es/venus/strike_1_activity/venus_strike_1_mission1.esp",
      "es/venus/strike_1_activity/venus_strike_1_mission2.esp",
      "es/venus/strike_1_activity/venus_strike_1_mission3.esp",
      "es/venus/strike_1_activity/venus_strike_1_mission4_temp.esp",
    ]);
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

  it("names every encounter handle after the encounter it reaches", () => {
    // the lookup's child_bundles fill a handle by fnv1 of the encounter's name
    const encounters = new Set(
      scriptFiles
        .filter((file) => file.kind === "es")
        .map((file) => file.path.slice(file.path.lastIndexOf("/") + 1, -3))
    );
    const handles = result.decls.flatMap((decl) =>
      decl.schema.members.filter((m) => m.type === "encounter_handle")
    );
    expect(handles.map((m) => m.name).sort()).toEqual([
      "enc_dig_site_strike1",
      "enc_engineering_strike1",
      "enc_entrance_ch2m1",
      "enc_south_tides_ch2m3",
    ]);
    for (const handle of handles) {
      expect(encounters.has(handle.name), handle.name).toBe(true);
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
  const originals = new Map<string, HksBytecode>();
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
      const actual = readBytecode(decl?.chunk as Uint8Array, tag);
      expect(diffChunks(original, actual), `${tag} ${decl?.name}`).toEqual([]);
      matched++;
    }
    expect(matched).toBe(152);
  });

  it("compiles every decl to the same bytes as its chunks but the known misses", () => {
    const misses: string[] = [];
    for (const [tag, original] of originals) {
      const decl = compiledFor(tag);
      const actual = readBytecode(decl?.chunk as Uint8Array, tag);
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
      const chunks = new Map<string, HksBytecode>();
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

    // The gate above reads classes; the structs are checked here, down to the
    // weapons' trigger_behavior (a native enum, e_trigger_behavior).
    it("gives every struct member the kind of its schema", () => {
      const schemas = readAlphaSchemas(packagesDir ?? "");
      const byModule = new Map(result.decls.map((d) => [d.modulePath, d]));
      const misses: string[] = [];
      let compared = 0;
      for (const type of schemas.packageTypes.values()) {
        const decl = type.kind === 0x19 ? byModule.get(type.name) : undefined;
        for (const real of decl ? type.members : []) {
          const member = decl?.schema.members.find((m) => m.name === real.name);
          // a member the struct inherits is its parent's
          if (member === undefined) {
            continue;
          }
          compared++;
          if (!(REAL_KINDS[real.kind] ?? []).includes(member.kind)) {
            misses.push(
              `${type.name}.${real.name}: kind ${member.kind}, real 0x${real.kind.toString(16)}`
            );
          }
        }
      }
      expect(misses).toEqual([]);
      expect(compared).toBe(647);
      const rifle = byModule.get(
        "weapons.weapon_translation_assault_rifles.s_assault_rifle"
      );
      expect(
        rifle?.schema.members.find((m) => m.name === "trigger_behavior")
      ).toMatchObject({ kind: "enum_field", type: "e_trigger_behavior" });
    });
  }
);
