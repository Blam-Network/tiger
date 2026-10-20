import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  COMPILED_BS_FORMAT,
  COMPILED_BS_INDEX,
  CompiledBsError,
  type CompiledBsIndex,
  compiledScriptSetOf,
  readCompiledBs,
  writeCompiledBs,
} from "../../src/bungiescript/compiled_bs.ts";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import { bundleHashOf } from "../../src/bungiescript/script_folder.ts";

const SOURCES = [
  {
    path: "bs/activities/common/story_common.bs",
    text: [
      "struct s_stats:",
      "    real rate",
      "",
      "enum e_kind:",
      "    one",
      "",
      '@activity_bundle("story_common")',
      "class c_encounter__story_common : c_encounter:",
      "    def foo():",
      '        print("hi")',
      "",
    ].join("\n"),
  },
  {
    path: "es/utility_scripts/kill_squad_objective.esu",
    text: "squad sq\n\nscript main():\n    sq.place()\n",
  },
  {
    path: "es/venus/strike_1_activity/strike_1_activity.es",
    text: '@activity_bundle("venus_portal_1")\nvenus_strike_1_mission2 dig_site_phase\nvenus_strike_1_mission10 end_phase\nsquad sq\n\nscript main():\n    sq.place()\n',
  },
  {
    path: "es/venus/strike_1_activity/venus_strike_1_mission2.esp",
    text: "squad sq\n\nscript init():\n    sq.place()\n",
  },
  {
    path: "es/venus/strike_1_activity/venus_strike_1_mission10.esp",
    text: "squad sq\n\nscript init():\n    sq.place()\n",
  },
];

const walk = (dir: string, at = ""): string[] =>
  readdirSync(join(dir, at), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(dir, `${at}${entry.name}/`)
      : [`${at}${entry.name}`]
  );

describe("the compiled_bs tree", () => {
  const root = mkdtempSync(join(tmpdir(), "compiled-bs-"));
  const dir = join(root, "compiled_bs");
  const compiled = compileScriptFiles(SOURCES);
  afterAll(() => rmSync(root, { force: true, recursive: true }));

  it("compiles the fixture clean", () => {
    expect(compiled.diagnostics).toEqual([]);
  });

  it("writes Bungie's layout and an index of it", () => {
    const index = writeCompiledBs(dir, compiled, {
      lua: true,
      stamp: "2026-10-13T00:00:00.000Z",
    });
    expect(walk(dir).sort()).toEqual([
      "code_tags/_es/utility_scripts/kill_squad_objective/kill_squad_objective.schema.json",
      "code_tags/_es/venus/strike_1_activity/strike_1_activity/c_encounter__strike_1_activity.schema.json",
      "code_tags/_es/venus/strike_1_activity/venus_strike_1_mission10/venus_strike_1_mission10.schema.json",
      "code_tags/_es/venus/strike_1_activity/venus_strike_1_mission2/venus_strike_1_mission2.schema.json",
      "code_tags/activities/common/story_common/c_encounter__story_common.schema.json",
      "code_tags/activities/common/story_common/e_kind.schema.json",
      "code_tags/activities/common/story_common/s_stats.schema.json",
      "index.json",
      "lua/_es/utility_scripts/kill_squad_objective/kill_squad_objective.lua",
      "lua/_es/utility_scripts/kill_squad_objective/kill_squad_objective.luac",
      "lua/_es/venus/strike_1_activity/strike_1_activity/c_encounter__strike_1_activity.lua",
      "lua/_es/venus/strike_1_activity/strike_1_activity/c_encounter__strike_1_activity.luac",
      "lua/_es/venus/strike_1_activity/venus_strike_1_mission10/venus_strike_1_mission10.lua",
      "lua/_es/venus/strike_1_activity/venus_strike_1_mission10/venus_strike_1_mission10.luac",
      "lua/_es/venus/strike_1_activity/venus_strike_1_mission2/venus_strike_1_mission2.lua",
      "lua/_es/venus/strike_1_activity/venus_strike_1_mission2/venus_strike_1_mission2.luac",
      "lua/activities/common/story_common/c_encounter__story_common.lua",
      "lua/activities/common/story_common/c_encounter__story_common.luac",
      "lua/activities/common/story_common/e_kind.lua",
      "lua/activities/common/story_common/s_stats.lua",
    ]);
    const onDisk = JSON.parse(
      readFileSync(join(dir, COMPILED_BS_INDEX), "utf8")
    ) as CompiledBsIndex;
    expect(onDisk).toEqual(index);
    expect(index.format).toBe(COMPILED_BS_FORMAT);
    expect(index.stamp).toBe("2026-10-13T00:00:00.000Z");
    expect(index.diagnostics).toEqual([]);
    expect(index.files.map((file) => file.path)).toEqual(
      SOURCES.map((source) => source.path).sort()
    );
    const common = index.files[0];
    expect(common).toEqual({
      activityBundle: bundleHashOf("story_common"),
      chunkName: "@bs\\activities\\common\\story_common.bs",
      decls: [
        {
          kind: "struct",
          modulePath: "activities.common.story_common.s_stats",
          name: "s_stats",
          schema:
            "code_tags/activities/common/story_common/s_stats.schema.json",
        },
        {
          kind: "enum",
          modulePath: "activities.common.story_common.e_kind",
          name: "e_kind",
          schema: "code_tags/activities/common/story_common/e_kind.schema.json",
        },
        {
          chunk:
            "lua/activities/common/story_common/c_encounter__story_common.luac",
          kind: "class",
          modulePath:
            "activities.common.story_common.c_encounter__story_common",
          name: "c_encounter__story_common",
          schema:
            "code_tags/activities/common/story_common/c_encounter__story_common.schema.json",
        },
      ],
      kind: "bs",
      memberTypes: [],
      path: "bs/activities/common/story_common.bs",
      // the decorator's line is left out of the chunks' line numbers
      standInLines: [7],
    });
    expect(existsSync(`${dir}.tmp-20261013T000000000Z`)).toBe(false);
  });

  it("reads back what the compile gave, chunks and schemas alike", () => {
    const fromDisk = readCompiledBs(dir);
    const inMemory = compiledScriptSetOf(compiled);
    expect(fromDisk.index.files).toEqual(inMemory.index.files);
    for (const source of SOURCES) {
      const decl = compiled.compiledDecl(source.path);
      expect(fromDisk.schemaFor(source.path)).toEqual(decl.schema);
      expect(inMemory.schemaFor(source.path)).toEqual(decl.schema);
      if (decl.chunk) {
        expect(fromDisk.chunkFor(source.path)).toEqual(decl.chunk);
        expect(inMemory.chunkFor(source.path)).toEqual(decl.chunk);
      }
    }
    expect(
      fromDisk.schemaFor("es/venus/strike_1_activity/strike_1_activity.es")
        .nameHash
    ).toBe(bundleHashOf("strike_1_activity"));
    // a .bs file's own decl is its first; the others by name
    expect(
      fromDisk.schemaFor("@bs\\activities\\common\\story_common.bs")
    ).toEqual(
      compiled.compiledDecl("bs/activities/common/story_common.bs", "s_stats")
        .schema
    );
    expect(
      fromDisk.chunkFor(
        "bs/activities/common/story_common.bs",
        "c_encounter__story_common"
      )
    ).toEqual(
      compiled.chunkFor(
        "bs/activities/common/story_common.bs",
        "c_encounter__story_common"
      )
    );
    expect(() =>
      fromDisk.chunkFor("bs/activities/common/story_common.bs", "s_stats")
    ).toThrow("s_stats is a struct, not a class");
    expect(() => fromDisk.chunkFor("es/nothing.es")).toThrow(
      "no decl is not in the compiled scripts"
    );
  });

  it("answers the folder's lookups from the index", () => {
    const set = readCompiledBs(dir);
    const root = set.scriptByPath(
      "@es\\venus\\strike_1_activity\\strike_1_activity.es"
    );
    expect(root?.kind).toBe("es");
    expect(root && set.missionScripts(root).map((file) => file.path)).toEqual([
      "es/venus/strike_1_activity/venus_strike_1_mission2.esp",
      "es/venus/strike_1_activity/venus_strike_1_mission10.esp",
    ]);
    expect(set.archetypeScript("kill_squad_objective")?.path).toBe(
      "es/utility_scripts/kill_squad_objective.esu"
    );
    expect(set.archetypeScript("nothing")).toBeUndefined();
    expect(
      set.files.find((f) => f.path.endsWith("strike_1_activity.es"))
        ?.memberTypes
    ).toEqual(["venus_strike_1_mission2", "venus_strike_1_mission10", "squad"]);
    expect(
      set.scriptByBundle(bundleHashOf("venus_portal_1"), "venus")?.path
    ).toBe("es/venus/strike_1_activity/strike_1_activity.es");
    // a shared bs\ encounter runs in any destination's bundle of its name
    expect(set.scriptByBundle(bundleHashOf("story_common"))?.kind).toBe("bs");
    expect(
      set.scriptByBundle(bundleHashOf("story_common"), "cosmo")?.kind
    ).toBe("bs");
    // a script's own name is no binding
    expect(
      set.scriptByBundle(bundleHashOf("strike_1_activity"), "venus")
    ).toBeUndefined();
  });

  it("refuses a build with errors and keeps the published tree", () => {
    const before = walk(dir).sort();
    const stamp = readCompiledBs(dir).index.stamp;
    const broken = compileScriptFiles([
      ...SOURCES,
      { path: "es/venus/broken.es", text: "def f(:\n" },
    ]);
    expect(() => writeCompiledBs(dir, broken)).toThrow(CompiledBsError);
    expect(walk(dir).sort()).toEqual(before);
    expect(readCompiledBs(dir).index.stamp).toBe(stamp);
    expect(readdirSync(root)).toEqual(["compiled_bs"]);
  });

  it("replaces the tree whole, stale files included", () => {
    const smaller = compileScriptFiles(SOURCES.slice(1));
    writeCompiledBs(dir, smaller);
    const set = readCompiledBs(dir);
    expect(set.files.map((file) => file.path)).toEqual(
      SOURCES.slice(1)
        .map((source) => source.path)
        .sort()
    );
    expect(walk(dir).some((path) => path.includes("story_common"))).toBe(false);
    expect(walk(dir).some((path) => path.endsWith(".lua"))).toBe(false);
    expect(readdirSync(root)).toEqual(["compiled_bs"]);
  });

  it("refuses a tree written in another format", () => {
    const other = join(root, "other");
    writeCompiledBs(other, compiled);
    const index = JSON.parse(
      readFileSync(join(other, COMPILED_BS_INDEX), "utf8")
    ) as CompiledBsIndex;
    rmSync(join(other, COMPILED_BS_INDEX));
    expect(() => readCompiledBs(other)).toThrow();
    expect(index.format).toBe(COMPILED_BS_FORMAT);
  });
});
