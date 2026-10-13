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
    expect(scriptFiles).toHaveLength(77);
    for (const file of scriptFiles) {
      expect(file.path).toMatch(BUNGIE_PATH);
      expect(file.path.startsWith("bs/")).toBe(file.kind === "bs");
      expect(file.decls, file.path).toHaveLength(1);
      expect(file.stubs, file.path).toEqual([]);
    }
  });

  it("compiles as one project, every member declared", () => {
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.decls).toHaveLength(77);
    for (const file of scriptFiles) {
      expect(compiled.compiledDecl(file.path).chunk, file.path).toBeDefined();
    }
    // the bundle rows it declares are the bundles' (TU0 row tables)
    const rows = tu0RowNames();
    const undeclared = new Set<string>();
    // the Last Array's scripts and what its bubbles load: no rows among the
    // tests' tables
    const noRowTable =
      /act_cosmo_m4_dome_c|enc_dome_[ac]_m4|enc_array_amb1|unknown_(f9e600a7|00b02852|358ebae1|a2f66e1a|af642429|afc05f47|bdf9e3c6|d2c22dcf)|^(simple|ambush|wave|dropship)_encounter$|^u_event_/;
    for (const decl of compiled.decls) {
      if (noRowTable.test(decl.name)) {
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
      // _loot's row is the Last Array's (no table copy, above)
      "collect_loot_objective._activity_flag",
      "collect_loot_objective._loot",
      "countdown_objective._activity_flag",
      "interactable_objective._activity_flag",
      "interactable_objective._incident_listener",
      "kill_squad_objective._incident_listener",
    ]);
  });

  it("starts the threads the TU0 host started", () => {
    // every bundle script's main thread and every audio cue thread start up;
    // threads the scripts wake, restart or drive as a phase's lifecycle do not
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
    // the alpha's simple_encounter starts its own placement window
    expect(startup.get("simple_encounter")).toEqual(["ss_initial_placement"]);
    for (const file of scriptFiles.filter(
      (f) =>
        (f.kind === "esp" || f.kind === "esu") &&
        f.decls[0].name !== "simple_encounter"
    )) {
      expect(startup.get(file.decls[0].name), file.path).toEqual([]);
    }
  });

  it("reaches a file's decls by path and name, and refuses what did not compile", () => {
    const files: ScriptFileSource[] = [
      {
        path: "bs/weapons/w.bs",
        text: "struct s_w:\n    real rate\n\nclass w : c_weapon:\n    s_w stats\n    def foo(): pass\n",
      },
      { path: "es/x/x.es", text: "startup thread main:\n    pass\n" },
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
