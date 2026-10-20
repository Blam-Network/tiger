import { describe, expect, it } from "vitest";
import { compileBungieScript } from "../../src/bungiescript/compile.ts";
import type { ScriptSource } from "../../src/hks/source/script_source.ts";
import { authoredRoster } from "../../src/host/bound/bindings.ts";
import type { ItemChange, SquadState } from "../../src/host/state/items.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";
import type { ActivityBundleRow } from "../../src/host/tags/tag_types.ts";
import { ScriptRuntime } from "../../src/versions/destiny1/v52553_16_09_28_1551_evil/host/runtime.ts";
import { ActivityBundleItemType } from "../../src/versions/destiny1/v52553_16_09_28_1551_evil/host/tag_types.ts";

// @member_counts through the host: a decorated squad places with its
// authored bodies and serves them per cell; the rest keep the package's.

const BUNDLE = fnv1("enc_counts");
const TAG = "82FF0002";
const { Actor, Squad } = ActivityBundleItemType;

const squad = (
  name: string,
  typeIndex: number,
  cells: number[],
  members: string[]
): ActivityBundleRow => ({
  cells,
  memberCount: cells.length,
  memberNames: members.map(fnv1),
  name,
  nameHash: fnv1(name),
  typeId: Squad,
  typeIndex,
});

const ROWS: ActivityBundleRow[] = [
  squad("sq_landing", 0, [1, 1], ["dreg", "vandal"]),
  squad("sq_plain", 1, [1, 1], ["dreg", "vandal"]),
  squad("sq_captain", 2, [1, 0], ["dregs_pistol", "vandal_shock"]),
  { name: "sq_captain__captain", nameHash: 0, typeId: Actor, typeIndex: 3 },
  squad("sq_wave[0]", 4, [1], ["thrall"]),
  squad("sq_wave[1]", 5, [1, 1, 1], ["thrall", "thrall", "acolyte"]),
];

const hex = (name: string) => `0x${fnv1(name).toString(16).toUpperCase()}`;

function run(declarations: string, body: string) {
  const source = `@activity_bundle("enc_counts")\n${declarations}\n@startup()\nscript main():\n${body}`;
  const compiled = compileBungieScript([
    { path: "es/test/enc_counts.es", source },
  ]);
  expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    []
  );
  const [decl] = compiled.decls;
  const scripts: ScriptSource = {
    read: (tagId) => (tagId === TAG ? decl.chunk : undefined),
    schema: (tagId) => (tagId === TAG ? decl.schema : undefined),
    tags: () => [TAG],
  };
  const changes: ItemChange[] = [];
  const log: string[] = [];
  const runtime = new ScriptRuntime({
    bundles: [{ bundle: BUNDLE, rows: ROWS, tag: 0x809b_0002 }],
    clock: { activityTicks: () => 0 },
    log: (line) => log.push(line),
    onItemChange: (change) => changes.push(change),
    scriptFor: () => Number.parseInt(TAG, 16),
    scripts,
    squadPlacedByDefault: () => false,
    tickSeconds: 1,
  });
  runtime.start();
  runtime.reportPlayerSpawned();
  for (let i = 0; i < 3; i++) {
    runtime.tick();
  }
  const last = (typeIndex: number) =>
    changes
      .filter(
        (change) =>
          change.kind === "squad" && change.item.typeIndex === typeIndex
      )
      .map((change) => change.state as SquadState)
      .at(-1);
  return { last, log };
}

const DECLARATIONS = [
  "@member_counts({dreg: 3, vandal: 1})",
  "squad sq_landing",
  "squad sq_plain",
  "@member_counts({dregs_pistol: 5, vandal_shock: 0})",
  "squad sq_captain",
  "@member_counts([{}, {thrall: [2, 3]}])",
  "static_array<squad, 2> sq_wave",
].join("\n");

describe("@member_counts in the host", () => {
  it("places a squad with its authored bodies, per cell", () => {
    const { last } = run(
      DECLARATIONS,
      "    for sq in [sq_landing, sq_plain, sq_captain, sq_wave[0], sq_wave[1]]:\n        sq.place()\n"
    );
    expect(last(0)).toMatchObject({ bodies: 4, roster: [3, 1] });
    // no decorator: the package's one body per cell, and no roster
    expect(last(1)?.bodies).toBe(2);
    expect(last(1)?.roster).toBeUndefined();
    // the named cell stays 0, its actor the sixth body
    expect(last(2)).toMatchObject({ bodies: 6, roster: [5, 0] });
    expect(last(4)?.roster).toBeUndefined();
    // two members named thrall, in order; the acolyte keeps its one
    expect(last(5)).toMatchObject({ bodies: 6, roster: [2, 3, 1] });
  });

  // The alpha's Tower talkers: host cells [1, 1, 0] on three named members.
  // A named cell's count is the anonymous bodies beside its actor.
  it("serves a named cell's count beside its actor", () => {
    const { last } = run(
      "squad sq_landing\n@member_counts({dregs_pistol: 5, vandal_shock: 1})\nsquad sq_captain",
      "    sq_captain.place()\n"
    );
    expect(last(2)).toMatchObject({ bodies: 7, roster: [5, 1] });
  });

  // Any change to a squad nothing placed (a temperament, an objective set
  // ahead of its wave) serves it empty, not at its authored counts.
  it("keeps an unplaced squad empty", () => {
    const { last } = run(
      DECLARATIONS,
      '    sq_landing.activate_temperament("temper_idle")\n'
    );
    expect(last(0)?.roster).toEqual([0, 0]);
  });

  it("empties every cell on remove()", () => {
    const { last } = run(
      DECLARATIONS,
      "    sq_landing.place()\n    sleep(1)\n    sq_landing.remove()\n"
    );
    expect(last(0)).toMatchObject({ bodies: 0, roster: [0, 0] });
  });

  it("refuses counts that do not fit the squad", () => {
    const loads = (declarations: string) =>
      run(declarations, "    sq_landing.place()\n").log.find((line) =>
        line.includes("did not load")
      );
    expect(loads("@member_counts({shank: 3})\nsquad sq_landing")).toContain(
      `@member_counts on sq_landing: its squad has no member 'shank' (members: ${hex("dreg")}, ${hex("vandal")})`
    );
    expect(
      loads(
        "squad sq_landing\n@member_counts([{}, {thrall: 2}])\nstatic_array<squad, 2> sq_wave"
      )
    ).toContain(
      "2 of its members are named 'thrall', so 'thrall' takes a list of 2 counts"
    );
    expect(
      loads("squad sq_landing\n@member_counts({dreg: 2})\nsquad sq_missing")
    ).toContain("@member_counts on sq_missing: no Squad row has that name");
  });
});

describe("authoredRoster", () => {
  const cells = { counts: [3, 1], named: [false, false] };

  it("is the authored counts at the authored total", () => {
    expect(authoredRoster(cells)).toEqual([3, 1]);
    expect(authoredRoster(cells, 4)).toEqual([3, 1]);
  });

  it("splits other totals by the authored counts", () => {
    expect(authoredRoster(cells, 0)).toEqual([0, 0]);
    expect(authoredRoster(cells, 8)).toEqual([6, 2]);
    // 4.5 and 1.5: the earlier cell takes the odd body
    expect(authoredRoster(cells, 6)).toEqual([5, 1]);
  });

  it("gives a named cell its count beside the actor", () => {
    const talkers = { counts: [1, 1, 0], named: [true, true, true] };
    expect(authoredRoster(talkers)).toEqual([1, 1, 0]);
    expect(authoredRoster(talkers, 3)).toEqual([0, 0, 0]);
  });

  it("keeps a named cell at 0", () => {
    const captain = { counts: [5, 0], named: [false, true] };
    expect(authoredRoster(captain)).toEqual([5, 0]);
    expect(authoredRoster(captain, 3)).toEqual([2, 0]);
  });
});
