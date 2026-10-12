import ScriptRuntime, {
  type ActivityBundleRow,
  type ActivityPlayer,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";
import { TOWER_ROWS, TOWER_VENDORS } from "./tu0_tower_rows.ts";

// The TU0 Tower (city_tower_default1): its binder, its activity root and
// the start bubble's ambient encounter.
const ROOT = 0xf2_d8_8b_d0;
const BINDER = 0x40_ae_bf_90;
const PLAZA = 0x8c_c3_14_36;

const TOWER = [
  {
    bundle: BINDER,
    key: "BINDER",
    path: "bs/activities/common/tower_common.bs",
    tag: 0x80_c7_a0_99,
  },
  {
    bundle: ROOT,
    key: "ROOT",
    path: "es/city_tower/enc_city_tower_default1.es",
    tag: 0x80_c7_a0_98,
  },
  {
    bundle: PLAZA,
    key: "PLAZA",
    path: "es/city_tower/enc_plaza_amb1.es",
    tag: 0x80_c8_82_cd,
  },
];

// Only the rows the scripts name, with TU0's type ids and row indices
// (read off the TU0 disc packages).
const BUNDLES = TOWER.map(({ bundle, key, tag }) => ({
  bundle,
  rows: (TOWER_ROWS[key] ?? []).map(
    ([name, typeId, typeIndex, extra]): ActivityBundleRow => ({
      name,
      nameHash: fnv1(name),
      typeId,
      typeIndex,
      ...extra,
    })
  ),
  tag,
}));

describe("TU0 Tower scripts", () => {
  it("lays each file out at Bungie's path, bound to its bundle by name", () => {
    for (const { bundle, path } of TOWER) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "city_tower")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
      expect(file?.decls).toHaveLength(1);
    }
  });

  it("compiles each decl to a chunk on its native base", () => {
    for (const { path } of TOWER) {
      const file = tu0Scripts.scriptByPath(path);
      if (!file) {
        throw new Error(`${path} missing`);
      }
      const compiled = tu0Compiled().compiledDecl(file.path);
      expect(compiled.chunkName).toBe(file.chunkName);
      expect(compiled.schema.parent).toBe("c_encounter");
      expect(tu0Compiled().chunkFor(file.path).length).toBeGreaterThan(0);
    }
  });

  it("runs on the TU0 host: binds the lifetime, waits for the fireteam, places the vendors", () => {
    // TU0 has no script tags; each bundle's script stands in under its
    // bundle's tag id.
    const scripts = tu0ScriptSource(BUNDLES, "city_tower");
    const log: string[] = [];
    const changes: ItemChange[] = [];
    let players: ActivityPlayer[] = [];
    const runtime = new ScriptRuntime({
      bundles: BUNDLES,
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
      onItemChange: (change) => changes.push(change),
      players: () => players,
      scriptFor: (bundleTag) => bundleTag,
      scripts,
      tickSeconds: 1,
    });
    runtime.start();
    runtime.setActiveBundles(new Set([ROOT, BINDER, PLAZA]));
    const prints = () =>
      log
        .filter((line) => line.includes(" print "))
        .map((line) => line.split(" print ")[1]);

    runtime.tick();
    expect(prints()).toContain("waiting for a fireteam to join");
    expect(prints()).not.toContain("CITY TOWER DEFAULT ACTIVITY");

    players = [{ characterKey: "c0", powerLevel: 1, ready: true }];
    runtime.reportPlayerSpawned();
    for (let i = 0; i < 4; i++) {
      runtime.tick();
    }
    expect(prints()).toContain("CITY TOWER DEFAULT ACTIVITY");

    const placed = new Set(
      changes
        .filter(
          (change) => change.kind === "squad" && change.item.bundle === PLAZA
        )
        .map((change) => change.item.typeIndex)
    );
    expect([...placed].sort((a, b) => a - b)).toEqual(
      TOWER_VENDORS.map(([, index]) => index).sort((a, b) => a - b)
    );
    expect(log).toContain(
      "lua lifetime:import_only_bind(lifetime_timer) -> lifetime t16#2"
    );
    expect(runtime.unresolvedBindings).toEqual([]);
  });
});
