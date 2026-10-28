import ScriptRuntime, {
  type ActivityBundleTag,
  bundleHashOf,
  fnv1,
  type ItemChange,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { describe, expect, it } from "vitest";
import { CINEMATIC_QUEEN_ROWS } from "./tu0_cinematic_queen_rows.ts";
import { tu0Compiled, tu0ScriptSource, tu0Scripts } from "./tu0_source.ts";

// act_cinematic_queen_101 and act_cinematic_queen_102 on TU0: the binder and
// each activity root, under the tags their start states load (the starts
// the 2.3.1 captures show).
const STORY_COMMON = {
  bundle: 0x47_86_c0_e0,
  key: "STORY_COMMON",
  path: "bs/activities/common/story_common.bs",
  tag: 0x80_c1_40_2b,
};
const QUEEN_101 = {
  bundle: 0x4a_f7_77_57,
  key: "QUEEN_101",
  name: "enc_cinematic_queen_101",
  path: "es/cinematic_queen/act_cinematic_queen_101/enc_cinematic_queen_101.es",
  tag: 0x80_c0_2f_18,
};
const QUEEN_102 = {
  bundle: 0x4a_f7_77_54,
  key: "QUEEN_102",
  name: "enc_cinematic_queen_102",
  path: "es/cinematic_queen/act_cinematic_queen_102/enc_cinematic_queen_102.es",
  tag: 0x80_c0_2f_1d,
};
const missionsOf = (root: string, count: number) =>
  Array.from({ length: count }, (_, i) =>
    root.replace(/\.es$/, `_mission${i + 1}.esp`)
  );

type Bundle = typeof STORY_COMMON;

function tagsOf(bundles: readonly Bundle[]): ActivityBundleTag[] {
  return bundles.map(({ bundle, key, tag }) => ({
    bundle,
    rows: (CINEMATIC_QUEEN_ROWS[key] ?? []).map(
      ([name, typeId, typeIndex, extra]) => ({
        name,
        nameHash: fnv1(name),
        typeId,
        typeIndex,
        ...extra,
      })
    ),
    tag,
  }));
}

function host(tags: ActivityBundleTag[]) {
  const log: string[] = [];
  const changes: ItemChange[] = [];
  let completed = 0;
  let progress = 0;
  const runtime = new ScriptRuntime({
    bundles: tags,
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    onActivityComplete: () => {
      completed += 1;
    },
    onItemChange: (change) => changes.push(change),
    phaseProgress: {
      read: () => progress,
      write: (index) => {
        progress = index;
      },
    },
    players: () => [],
    scriptFor: (bundleTag) => bundleTag,
    scripts: tu0ScriptSource(tags, "cinematic_queen"),
    tickSeconds: 1,
  });
  runtime.start();
  runtime.setActiveBundles(new Set(tags.map((tag) => tag.bundle)));
  const ticks = (n: number) => {
    for (let i = 0; i < n; i++) {
      runtime.tick();
    }
  };
  const finished = (name: string) => {
    const tag = tags[1];
    const row = tag?.rows.find((r) => r.name === name);
    if (!(tag && row)) {
      throw new Error(`${name} missing`);
    }
    runtime.reportCinematicFinished({
      bundle: tag.bundle,
      typeIndex: row.typeIndex,
    });
  };
  const started = (typeIndex: number) =>
    changes.some(
      (change) =>
        change.kind === "cinematic" &&
        change.item.bundle === tags[1]?.bundle &&
        change.item.typeIndex === typeIndex
    );
  return {
    completed: () => completed,
    finished,
    lifetimeStates: () =>
      changes.flatMap((change) =>
        change.kind === "lifetime" ? [change.state.state] : []
      ),
    runtime,
    said: (text: string) => log.some((line) => line.includes(text)),
    started,
    ticks,
  };
}

describe("TU0 Queen cinematic scripts", () => {
  it("lays the roots and their missions out at Bungie's paths, bound by name", () => {
    for (const [root, count] of [
      [QUEEN_101, 2],
      [QUEEN_102, 1],
    ] as const) {
      expect(bundleHashOf(root.name)).toBe(root.bundle);
      for (const { bundle, path } of [STORY_COMMON, root]) {
        const file = tu0Scripts.scriptByPath(path);
        expect(file, path).toBeDefined();
        expect(tu0Scripts.scriptByBundle(bundle, "cinematic_queen")).toBe(file);
        expect(file?.text.split("\n")[0]).toBe(`# ${file?.chunkName.slice(1)}`);
      }
      const file = tu0Scripts.scriptByPath(root.path);
      const missions = missionsOf(root.path, count);
      expect(
        file && tu0Scripts.missionScripts(file).map((m) => m.path)
      ).toEqual(missions);
      for (const mission of missions) {
        expect(tu0Compiled().compiledDecl(mission).schema.parent).toBe(
          "c_mission_phase"
        );
      }
    }
  });

  it("starts 101 in phase_cine_1's state of bubble 2 and 102 in phase_cine's of queens_chamber", () => {
    const first = tu0Scripts.activityStart("act_cinematic_queen_101");
    expect(first?.startSlice).toBe("0x1A8DC399");
    expect(first?.startPhase?.name).toBe("phase_cine_1");
    expect(first?.phases.map(({ name, slice }) => [name, slice])).toEqual([
      ["phase_cine_1", "0x1A8DC399"],
      ["phase_cine_2", "queens_chamber"],
    ]);
    const second = tu0Scripts.activityStart("act_cinematic_queen_102");
    expect(second?.startSlice).toBe("queens_chamber");
    expect(second?.startPhase?.name).toBe("phase_cine");
    expect(second?.phases.map(({ name, slice }) => [name, slice])).toEqual([
      ["phase_cine", "queens_chamber"],
    ]);
  });

  it("plays 101's two cinematics, completing the activity in the second phase", () => {
    const h = host(tagsOf([STORY_COMMON, QUEEN_101]));
    h.ticks(1);
    expect(h.said("mission enc_cinematic_queen_101_mission1 starting")).toBe(
      true
    );
    expect(h.lifetimeStates()).toEqual([0, 3]);
    expect(h.started(0)).toBe(true);
    expect(h.completed()).toBe(0);

    h.finished("phase_cine_1.pf_115_rfr._cinematic");
    h.ticks(3);
    expect(h.said("mission enc_cinematic_queen_101_mission2 starting")).toBe(
      true
    );
    // Retail: activity_complete 5.5 s into the phase, the cinematic 0.4 s
    // after it.
    h.ticks(5);
    expect(h.completed()).toBe(0);
    h.ticks(1);
    expect(h.completed()).toBe(1);
    expect(h.started(1)).toBe(true);
    h.ticks(30);
    expect(h.said("lifetime end_game")).toBe(false);

    h.finished("phase_cine_2.pf_116_cro._cinematic");
    h.ticks(4);
    expect(h.said("lifetime end_game")).toBe(true);
    expect(h.completed()).toBe(1);
    expect(h.runtime.unresolvedBindings).toEqual([]);
  });

  it("completes 102 with its cinematic's start and ends the game when it finishes", () => {
    const h = host(tagsOf([STORY_COMMON, QUEEN_102]));
    h.ticks(1);
    expect(h.said("mission enc_cinematic_queen_102_mission1 starting")).toBe(
      true
    );
    expect(h.lifetimeStates()).toEqual([0, 3]);
    expect(h.completed()).toBe(1);
    expect(h.started(0)).toBe(true);
    h.ticks(30);
    expect(h.said("lifetime end_game")).toBe(false);

    h.finished("phase_cine.pf_117_que._cinematic");
    h.ticks(4);
    expect(h.said("lifetime end_game")).toBe(true);
    expect(h.completed()).toBe(1);
    expect(h.runtime.unresolvedBindings).toEqual([]);
  });
});
