import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { scriptStem } from "../../src/bungiescript/parser.ts";
import {
  bundleHashOf,
  loadScriptFolder,
  normalizeScriptPath,
  parseScriptFile,
  scriptChunkName,
} from "../../src/bungiescript/script_folder.ts";

describe("parseScriptFile", () => {
  it("reads a .bs file's classes, structs and enums with their tags", () => {
    const text = [
      "struct s_stats:",
      "    real rate",
      "",
      "enum e_kind:",
      "    one",
      "",
      "class weapon : c_weapon:",
      "    c_weapon_magazine magazine",
      "    def foo():",
      '        print("this sucks")',
      "",
      "class weapon_infinite : c_weapon:",
      "    def foo(): pass",
      "",
      "# Decompiled from 36735.13.12.02.1953.alpha script tags",
      "# See tag 8210002c (weapon)",
      "# See tags 8210002D, 821B8053 (weapon_infinite)",
    ].join("\n");
    const file = parseScriptFile("bs/weapons/weapon_types.bs", text);
    expect(file.kind).toBe("bs");
    expect(file.chunkName).toBe("@bs\\weapons\\weapon_types.bs");
    expect(
      file.decls.map((decl) => [decl.kind, decl.name, decl.line, decl.tags])
    ).toEqual([
      ["struct", "s_stats", 1, []],
      ["enum", "e_kind", 4, []],
      ["class", "weapon", 7, ["8210002C"]],
      ["class", "weapon_infinite", 12, ["8210002D", "821B8053"]],
    ]);
    expect(file.stubs).toEqual([]);
  });

  it("reads an es-family file as the one class its name gives it", () => {
    const file = parseScriptFile(
      "@es\\cosmodrome\\x\\x.es",
      "squad sq\n\nscript main():\n    sq.place()\n\n# Decompiled from 36735.13.12.02.1953.alpha script tags\n# See tag 80CB0001\n"
    );
    expect(file.path).toBe("es/cosmodrome/x/x.es");
    expect(file.decls).toEqual([
      { kind: "class", line: 1, name: "c_encounter__x", tags: ["80CB0001"] },
    ]);
    expect(
      parseScriptFile("es/utility_scripts/u.esu", "int x\n").decls
    ).toEqual([{ kind: "class", line: 1, name: "u", tags: [] }]);
    expect(
      parseScriptFile(
        "bs/activities/pvp/c_pvp_slayer.bs",
        "class c_pvp_slayer : c_pvp_game_type:\n    def import(): return true\n\n# See tags 8220C006, 82236006, 82260006\n"
      ).decls.map((decl) => decl.tags)
    ).toEqual([["8220C006", "82236006", "82260006"]]);
  });

  it("keeps the tags of a decl the build named but never compiled", () => {
    const file = parseScriptFile(
      "bs/abilities/ability_components.bs",
      [
        "# Decompiled from 36735.13.12.02.1953.alpha script tags",
        "# See tag 82100000 (c_condition_vol_component)",
        "# See tags 82100001, 82100002 (c_player_status_icon)",
        "# The tags name these decls but hold no compiled code.",
        "",
      ].join("\n")
    );
    expect(file.decls).toEqual([]);
    expect(file.stubs).toEqual([
      { name: "c_condition_vol_component", tags: ["82100000"] },
      { name: "c_player_status_icon", tags: ["82100001", "82100002"] },
    ]);
  });

  it("refuses files that aren't scripts", () => {
    expect(() => parseScriptFile("es/x.lua", "")).toThrow();
  });
});

describe("paths and hashes", () => {
  it("normalizes Bungie's and the on-disk forms", () => {
    expect(normalizeScriptPath("@es\\venus\\venus_bounty_1.es")).toBe(
      "es/venus/venus_bounty_1.es"
    );
    expect(scriptChunkName("es/venus/venus_bounty_1.es")).toBe(
      "@es\\venus\\venus_bounty_1.es"
    );
    expect(scriptStem("es/venus/x/enc_x_amb1.es")).toBe("enc_x_amb1");
  });

  it("hashes a file's name to its bundle, or reads an uncracked one", () => {
    expect(bundleHashOf("enc_plaza_amb1")).toBe(0x8c_c3_14_36);
    expect(bundleHashOf("story_common")).toBe(0x47_86_c0_e0);
    expect(bundleHashOf("unknown_3c2f5ed5")).toBe(0x3c_2f_5e_d5);
  });
});

describe("loadScriptFolder", () => {
  const dir = mkdtempSync(join(tmpdir(), "fukugen-daihon-"));
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  };
  write(
    "bs/activities/common/story_common.bs",
    '@activity_bundle("story_common")\nclass c_encounter__story_common : c_encounter:\n    pass\n\n# See tag 80CC0001\n'
  );
  write(
    "bs/activities/common/public_common.bs",
    "# See tags 821B8003, 821E2006 (c_encounter__public_common)\n"
  );
  write(
    "es/city_tower/enc_plaza_amb1.es",
    '@activity_bundle("enc_plaza_amb1")\r\nscript main(): pass\r\n'
  );
  write(
    "es/venus/academy_plaza/enc_plaza_amb1.es",
    '@activity_bundle("enc_plaza_amb1")\nscript main(): pass\n'
  );
  write(
    "es/venus/strike_1_activity/strike_1_activity.es",
    "venus_strike_1_mission10 end_phase\nvenus_strike_1_mission2 dig_site_phase\n\nscript main(): pass\n"
  );
  write(
    "es/venus/venus_bounty_1.es",
    '@activity_bundle("bounty_1_activity")\nscript main(): pass\n'
  );
  write(
    "es/venus/strike_1_activity/venus_strike_1_mission10.esp",
    "script init(): pass\n"
  );
  write(
    "es/venus/strike_1_activity/venus_strike_1_mission2.esp",
    "script init(): pass\n"
  );
  write("es/venus/strike_1_activity/notes.txt", "not a script");
  write("es/utility_scripts/kill_squad_objective.esu", "script main(): pass\n");
  const scripts = loadScriptFolder(dir);
  afterAll(() => rmSync(dir, { force: true, recursive: true }));

  it("reads every script source, sorted, with LF line endings", () => {
    expect(scripts.dir).toBe(dir);
    expect(scripts.files.map((file) => file.path)).toEqual([
      "bs/activities/common/public_common.bs",
      "bs/activities/common/story_common.bs",
      "es/city_tower/enc_plaza_amb1.es",
      "es/utility_scripts/kill_squad_objective.esu",
      "es/venus/academy_plaza/enc_plaza_amb1.es",
      "es/venus/strike_1_activity/strike_1_activity.es",
      "es/venus/strike_1_activity/venus_strike_1_mission10.esp",
      "es/venus/strike_1_activity/venus_strike_1_mission2.esp",
      "es/venus/venus_bounty_1.es",
    ]);
    expect(
      scripts.scriptByPath("@es\\city_tower\\enc_plaza_amb1.es")?.text
    ).toBe('@activity_bundle("enc_plaza_amb1")\nscript main(): pass\n');
    expect(scripts.scriptSources()[0]).toEqual({
      path: "bs/activities/common/public_common.bs",
      source: "# See tags 821B8003, 821E2006 (c_encounter__public_common)\n",
    });
  });

  it("finds decls by tag, stubs included", () => {
    expect(scripts.scriptByTag(0x80cc0001)?.decl?.name).toBe(
      "c_encounter__story_common"
    );
    const stub = scripts.scriptByTag("821e2006");
    expect(stub?.decl).toBeUndefined();
    expect(stub?.name).toBe("c_encounter__public_common");
    expect(stub?.file.path).toBe("bs/activities/common/public_common.bs");
    expect(scripts.scriptByTag("80CC0002")).toBeUndefined();
  });

  it("finds a bundle's script by its encounter's @activity_bundle, the destination picking between twins", () => {
    const plaza = bundleHashOf("enc_plaza_amb1");
    expect(scripts.scriptByBundle(plaza)).toBeUndefined();
    expect(scripts.scriptByBundle(plaza, "city_tower")?.path).toBe(
      "es/city_tower/enc_plaza_amb1.es"
    );
    expect(scripts.scriptByBundle(plaza, "venus")?.path).toBe(
      "es/venus/academy_plaza/enc_plaza_amb1.es"
    );
    // a shared bs\ encounter runs in any destination's bundle of its name
    const common = bundleHashOf("story_common");
    expect(scripts.scriptByBundle(common)?.kind).toBe("bs");
    expect(scripts.scriptByBundle(common, "cosmo")?.kind).toBe("bs");
  });

  it("runs the script decorated with the bundle's name, whatever the script's own", () => {
    const bounty = scripts.scriptByPath("es/venus/venus_bounty_1.es");
    const bundle = bundleHashOf("bounty_1_activity");
    expect(bounty?.activityBundle).toBe(bundle);
    expect(scripts.scriptByBundle(bundle)).toBe(bounty);
    expect(scripts.scriptByBundle(bundle, "venus")).toBe(bounty);
    // another destination has no script for it, and the script's own name
    // is no binding
    expect(scripts.scriptByBundle(bundle, "city_tower")).toBeUndefined();
    expect(
      scripts.scriptByBundle(bundleHashOf("venus_bounty_1"), "venus")
    ).toBeUndefined();
  });

  it("lists the missions a root declares, in member order, and an archetype by name", () => {
    const root = scripts.scriptByPath(
      "es/venus/strike_1_activity/strike_1_activity.es"
    );
    expect(root && scripts.missionScripts(root).map((f) => f.path)).toEqual([
      "es/venus/strike_1_activity/venus_strike_1_mission10.esp",
      "es/venus/strike_1_activity/venus_strike_1_mission2.esp",
    ]);
    const plaza = scripts.scriptByPath("es/city_tower/enc_plaza_amb1.es");
    expect(plaza && scripts.missionScripts(plaza)).toEqual([]);
    expect(scripts.archetypeScript("kill_squad_objective")?.decls[0].name).toBe(
      "kill_squad_objective"
    );
    expect(scripts.archetypeScript("nothing")).toBeUndefined();
  });
});
