import ScriptRuntime, {
  type ActivityBundleTag,
  bundleHashOf,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { CINE_END_ROWS } from "./tu0_cine_end_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// cine_end on TU0: the binder and the activity root, under the tags bubble
// 2's state 1 loads (the start the 2.3.1 capture shows).
const BUNDLES = [
  {
    bundle: 0x47_86_c0_e0,
    key: "STORY_COMMON",
    path: "bs/activities/common/story_common.bs",
    tag: 0x80_c4_e0_0a,
  },
  {
    bundle: 0x5c_67_51_f4,
    key: "CINE_END",
    path: "es/cinematic_trv/cine_end/cine_end.es",
    tag: 0x80_c3_e0_18,
  },
];
const MISSION = "es/cinematic_trv/cine_end/cine_end_mission1.esp";
const CINEMATIC = "cine_123a_end_phase.cine_123a_end._cinematic";

const TAGS: ActivityBundleTag[] = BUNDLES.map(({ bundle, key, tag }) => ({
  bundle,
  rows: (CINE_END_ROWS[key] ?? []).map(([name, typeId, typeIndex, extra]) => ({
    name,
    nameHash: fnv1(name),
    typeId,
    typeIndex,
    ...extra,
  })),
  tag,
}));

describe("TU0 cine_end scripts", () => {
  it("lays the root and its mission out at Bungie's paths, bound by name", () => {
    expect(bundleHashOf("cine_end")).toBe(0x5c_67_51_f4);
    for (const { bundle, path } of BUNDLES) {
      const file = tu0Scripts.scriptByPath(path);
      expect(file, path).toBeDefined();
      expect(tu0Scripts.scriptByBundle(bundle, "cinematic_trv")).toBe(file);
      expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
    }
    const root = tu0Scripts.scriptByPath(BUNDLES[1]?.path ?? "");
    expect(
      root && tu0Scripts.missionScripts(root).map((file) => file.path)
    ).toEqual([MISSION]);
    expect(tu0Compiled().compiledDecl(MISSION).schema.parent).toBe(
      "c_mission_phase"
    );
  });

  it("starts in cine_123a_end_phase's state of military", () => {
    const start = tu0Scripts.activityStart("cine_end");
    expect(start?.startSlice).toBe("military");
    expect(start?.startPhase?.name).toBe("cine_123a_end_phase");
    expect(start?.phases.map(({ name, slice }) => [name, slice])).toEqual([
      ["cine_123a_end_phase", "military"],
    ]);
  });

  it("completes the activity with the cinematic's start and ends the game when it finishes", () => {
    const log: string[] = [];
    const changes: ItemChange[] = [];
    let completed = 0;
    const runtime = new ScriptRuntime({
      bundles: TAGS,
      clock: { activityTicks: () => 0 },
      log: (line) => log.push(line),
      onActivityComplete: () => {
        completed += 1;
      },
      onItemChange: (change) => changes.push(change),
      players: () => [],
      scriptFor: (bundleTag) => bundleTag,
      scripts: tu0ScriptSource(TAGS, "cinematic_trv"),
      tickSeconds: 1,
    });
    runtime.start();
    runtime.setActiveBundles(new Set(TAGS.map((tag) => tag.bundle)));
    const said = (text: string) => log.some((line) => line.includes(text));
    const lifetimeStates = () =>
      changes.flatMap((change) =>
        change.kind === "lifetime" ? [change.state.state] : []
      );
    const ticks = (n: number) => {
      for (let i = 0; i < n; i++) {
        runtime.tick();
      }
    };

    // Retail: pregame, then lifetime 4 (runtime 3), activity_complete and
    // the cinematic in one update.
    ticks(1);
    expect(said("mission cine_end_mission1 starting")).toBe(true);
    expect(lifetimeStates()).toEqual([0, 3]);
    expect(completed).toBe(1);
    expect(
      changes.some(
        (change) =>
          change.kind === "cinematic" &&
          change.item.bundle === 0x5c_67_51_f4 &&
          change.item.typeIndex === 0
      )
    ).toBe(true);

    // Nothing ends while the cinematic plays (two minutes in retail).
    ticks(120);
    expect(said("lifetime end_game")).toBe(false);

    const row = TAGS[1]?.rows.find((r) => r.name === CINEMATIC);
    if (!row) {
      throw new Error(`${CINEMATIC} missing`);
    }
    runtime.reportCinematicFinished({
      bundle: 0x5c_67_51_f4,
      typeIndex: row.typeIndex,
    });
    ticks(4);
    expect(said("lifetime end_game")).toBe(true);
    expect(completed).toBe(1);
    expect(runtime.unresolvedBindings).toEqual([]);
  });
});
