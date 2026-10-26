// Fukugen Daihon's TU0 sources compiled as one project: every decl has a
// chunk, the bundle rows the scripts declare are the bundles' (the TU0 row
// tables), and the threads flagged startup are the ones the TU0 host starts.
import {
  compileScriptFiles,
  type ScriptFileSource,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { tu0RowNames } from "./tu0_missions/tu0_rows.ts";
import { tu0Compiled, tu0Scripts } from "./tu0_missions/tu0_source.ts";

const scriptFiles = tu0Scripts.files;
const BUNGIE_PATH = /^(bs|es)\/[a-z0-9_]+(\/[a-z0-9_]+)*\.(bs|es|esp|esu)$/;

describe("TU0 BungieScript sources", () => {
  const compiled = tu0Compiled();

  it("keeps the layout the alpha's chunks record", () => {
    // the corpus grows with the missions: what holds is one decl per file
    expect(scriptFiles.length).toBeGreaterThan(0);
    for (const file of scriptFiles) {
      expect(file.path).toMatch(BUNGIE_PATH);
      expect(file.path.startsWith("bs/")).toBe(file.kind === "bs");
      expect(file.decls, file.path).toHaveLength(1);
      expect(file.stubs, file.path).toEqual([]);
    }
  });

  it("compiles as one project, every member declared", () => {
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.decls).toHaveLength(scriptFiles.length);
    for (const file of scriptFiles) {
      expect(compiled.compiledDecl(file.path).chunk, file.path).toBeDefined();
    }
    // the bundle rows it declares are the bundles' (TU0 row tables)
    const rows = tu0RowNames();
    const undeclared = new Set<string>();
    // the Last Array's scripts and what its bubbles load: no rows among the
    // tests' tables
    const noRowTable =
      /act_cosmo_m4_dome_c|enc_dome_[ac]_m4|enc_array_amb1|unknown_f9e600a7|^(simple|ambush|wave|dropship)_encounter$|^u_event_/;
    // the missions built from captures, the Cosmodrome's and Venus' areas'
    // shared scripts (ambient, events, loot, materials) and the utility scripts only their
    // bundles use: their bundles' rows are not among the tests' tables
    const noRowTablePath =
      /^es\/(mars|moon)\/|^es\/cosmo\/(act_cosmo_m(0_5_hangar|1_dome_a|2_dome_c)|dome_[ac])\/|^es\/cosmo\/hangar\/enc_hangar_m0_5\.es$|^es\/cosmo\/(array|delta_north|delta_south|dry_sea|graveyard|hangar|rocketyard)\/(enc_\w+_(amb1|events)|\w+_(loot|materials))\.es$|^es\/venus\/(academy_entrance|act_venus_m01_engineering|act_venus_m07_northern_tides|act_venus_m09_tower|lower_tower|north_tides|south_tides|tower)\/|^es\/venus\/(baby_shat|fallen_caldera|headlands|shattered_coast|vex_complex|warp_ruins)\/(enc_\w+_amb1?|\w+_(loot|materials))\.es$|^es\/utility_scripts\/(venus_raid_pillar_switch|vex_warp_gate|interactable_placement_set|loot_baby_shat)\.esu$/;
    for (const file of scriptFiles) {
      const decl = compiled.compiledDecl(file.path);
      if (noRowTable.test(decl.name) || noRowTablePath.test(file.path)) {
        continue;
      }
      for (const member of decl.schema.members) {
        if (
          (member.kind === "object" || member.kind === "static_array") &&
          !rows.has(member.name)
        ) {
          undeclared.add(`${decl.name}.${member.name}`);
        }
      }
    }
    // the script-owned hosts: listeners, the activity flag, the builder
    expect([...undeclared].sort()).toEqual([
      "act_cosmo_m0_highway_mission3.il_weapon_pickup",
      "c_encounter__cosmo_portal1_audio.il_loot_pickup",
      "c_encounter__enc_blast_portal1.__cs",
      "c_encounter__enc_breach_m0.__cs",
      "c_encounter__enc_graveyard_m0.__cs",
      "collect_loot_objective._activity_flag",
      "countdown_objective._activity_flag",
      "countdown_placement._activity_flag",
      "countdown_placement._capturable",
      "destructible_objective._activity_flag",
      "destructible_objective._incident_listener",
      "destructible_placement._activity_flag",
      "destructible_placement._object_faction",
      "interactable_objective._activity_flag",
      "interactable_objective._incident_listener",
      "interactable_placement._activity_flag",
      "interactable_placement._device",
      "interactable_placement._interactable",
      "kill_squad_objective._incident_listener",
    ]);
  });

  it("starts the threads the TU0 host started", () => {
    // every bundle script's main thread and every audio cue thread start up;
    // threads the scripts wake, restart or drive as a phase's lifecycle do
    // not (the phase host starts a phase's startup threads with the phase)
    const startup = new Map<string, string[]>();
    for (const decl of compiled.decls) {
      startup.set(
        decl.name,
        decl.schema.members
          .filter((m) => m.kind === "thread" && m.autostart)
          .map((m) => m.name)
      );
    }
    expect(startup.get("c_encounter__enc_plaza_amb1")).toEqual([
      "sc_main_plaza_thread",
      "sc_main_underwatch_thread",
    ]);
    expect(startup.get("c_encounter__strike_1_activity")).toEqual([
      "ss_venus_strike1",
    ]);
    expect(startup.get("c_encounter__enc_breach_m0")).toEqual([
      "sc_breach_main",
    ]);
    expect(startup.get("c_encounter__unknown_3c2f5ed5")).toHaveLength(20);
    // Phases and utility scripts start nothing but these: the alpha's
    // placements and warp gate (utility scripts it compiled with a startup
    // thread), a phase's own music cues, and the Northern Tides altar that
    // stands from the phase's start.
    const startedByParts = Object.fromEntries(
      scriptFiles
        .filter((f) => f.kind === "esp" || f.kind === "esu")
        .map((f) => [f.path, startup.get(f.decls[0].name) ?? []] as const)
        .filter(([, threads]) => threads.length > 0)
    );
    expect(startedByParts).toEqual({
      "es/moon/act_moon_m3_lowercitadel/act_moon_m3_lowercitadel_mission3.esp":
        ["sc_strength_music", "sc_strength_music_alt"],
      "es/utility_scripts/countdown_placement.esu": ["main"],
      "es/utility_scripts/destructible_placement.esu": ["main"],
      "es/utility_scripts/interactable_placement.esu": ["main"],
      "es/utility_scripts/interactable_placement_set.esu": ["main"],
      "es/utility_scripts/simple_encounter.esu": ["ss_initial_placement"],
      "es/utility_scripts/vex_warp_gate.esu": ["start_up_warpgate"],
      "es/venus/act_venus_m07_northern_tides/act_venus_m07_northern_tides_mission4.esp":
        ["ss_boss_pillar"],
    });
  });

  it("reaches a file's decls by path and name, and refuses what did not compile", () => {
    const files: ScriptFileSource[] = [
      {
        path: "bs/weapons/w.bs",
        text: "struct s_w:\n    real rate\n\nclass w : c_weapon:\n    s_w stats\n    def foo(): pass\n",
      },
      {
        path: "es/x/x.es",
        text: '@activity_bundle("x")\n@startup()\nscript main():\n    pass\n',
      },
    ];
    const result = compileScriptFiles(files);
    expect(result.diagnostics).toEqual([]);
    expect(result.compiledDecl("es/x/x.es").name).toBe("c_encounter__x");
    expect(result.compiledDecl("@es\\x\\x.es").chunkName).toBe("@es\\x\\x.es");
    expect(result.compiledDecl("bs/weapons/w.bs", "w").kind).toBe("class");
    expect(result.chunkFor("bs/weapons/w.bs", "w").length).toBeGreaterThan(0);
    expect(() => result.chunkFor("bs/weapons/w.bs", "s_w")).toThrow(/struct/);
    expect(() => result.compiledDecl("es/x/y.es")).toThrow(/did not compile/);
  });
});
