import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sliceRegionHash } from "../../src/bungiescript/activity_start.ts";
import { compileBungieScript } from "../../src/bungiescript/compile.ts";
import {
  COMPILED_BS_FORMAT,
  COMPILED_BS_INDEX,
  type CompiledBsIndex,
  compiledScriptSetOf,
  readCompiledBs,
  writeCompiledBs,
} from "../../src/bungiescript/compiled_bs.ts";
import { parseBungieScript } from "../../src/bungiescript/parser.ts";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import { parseScriptFile } from "../../src/bungiescript/script_folder.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";

// The decorators that say how an activity starts: what they parse to, what
// they refuse, and that the start travels with the compiled script.

const PATH = "es/venus/strike_1_activity/strike_1_activity.es";
const BUNDLE = '@activity_bundle("strike_1_activity")\n';
const BODY = "c_squad_sensor_host sq\n";

const FULL = [
  BUNDLE,
  '@activity("venus_portal_1", "venus_portal_1_hard")\n',
  '@start_slice("plaza")\n',
  '@phase("engineering_phase", "engineering")\n',
  '@phase("dig_site_phase", "dig_site")\n',
  "@phase(0xD1F11E74, 0x6AA103DB)\n",
  '@spawn_transition("venus_strike_1_phase01")\n',
  "@region_spawn_transition(24, 0x68935472)\n",
  '@region_spawn_transition(105, "")\n',
  "@time_of_day(0.77)\n",
  BODY,
].join("");

function errors(source: string, path = PATH): string[] {
  return compileBungieScript([{ path, source }], { chunks: false })
    .diagnostics.filter((d) => d.severity === "error")
    .map((d) => d.message);
}

function parseError(source: string): string {
  try {
    parseBungieScript(source, PATH);
  } catch (error) {
    return (error as Error).message;
  }
  return "";
}

describe("the activity start decorators", () => {
  it("parse to the activity's start", () => {
    const start = parseBungieScript(FULL, PATH).decls[0].activityStart;
    expect(start).toEqual({
      activities: ["venus_portal_1", "venus_portal_1_hard"],
      line: 2,
      phases: [
        {
          hash: fnv1("engineering_phase"),
          name: "engineering_phase",
          slice: "engineering",
        },
        {
          hash: fnv1("dig_site_phase"),
          name: "dig_site_phase",
          slice: "dig_site",
        },
        { hash: 0xd1_f1_1e_74, name: "0xD1F11E74", slice: "0x6AA103DB" },
      ],
      regionSpawnTransitions: { 24: 0x68_93_54_72, 105: fnv1("") },
      spawnTransition: fnv1("venus_strike_1_phase01"),
      startSlice: "plaza",
      timeOfDay: 0.77,
    });
  });

  it("set only what the script wrote", () => {
    const start = parseBungieScript(
      `${BUNDLE}@activity("x")\n@start_slice("plaza")\n${BODY}`,
      PATH
    ).decls[0].activityStart;
    expect(start).toEqual({
      activities: ["x"],
      line: 2,
      phases: [],
      regionSpawnTransitions: {},
      startSlice: "plaza",
    });
    expect(
      parseBungieScript(`${BUNDLE}${BODY}`, PATH).decls[0].activityStart
    ).toBeUndefined();
  });

  it("can share a line, as the alpha's sources keep Bungie's lines", () => {
    const shared = parseBungieScript(
      `@activity_bundle("strike_1_activity") @activity("x") @start_slice("plaza") @phase("p", "dock")\n@member_counts({dreg: 2}) ${BODY}`,
      PATH
    ).decls[0];
    expect(shared.activityStart?.startSlice).toBe("plaza");
    expect(shared.activityStart?.phases).toHaveLength(1);
    expect(shared.activityBundle?.text).toBe("strike_1_activity");
    expect(shared.members[0].line).toBe(2);
  });

  it("name the phase that owns the start state, when a phase plays in the slice", () => {
    const start = parseBungieScript(
      `${BUNDLE}@activity("x")
@start_slice("dock", "intro_phase")
@phase("intro_phase", "dock")
@phase("later", "dock")
${BODY}`,
      PATH
    ).decls[0].activityStart;
    expect(start?.startSlice).toBe("dock");
    expect(start?.startPhase).toEqual({
      hash: fnv1("intro_phase"),
      name: "intro_phase",
    });
    // a phase that never cracked, in a slice that never cracked
    const hashed = parseBungieScript(
      `${BUNDLE}@activity("x")
@start_slice(0x6AA103DB, 0xD1F11E74)
@phase(0xD1F11E74, 0x6AA103DB)
${BODY}`,
      PATH
    ).decls[0].activityStart;
    expect(hashed?.startPhase).toEqual({
      hash: 0xd1_f1_1e_74,
      name: "0xD1F11E74",
    });
    // no phase plays in the slice: no phase owns the state, it is state 0
    const none = parseBungieScript(
      `${BUNDLE}@activity("x")
@start_slice("dock")
@phase("p", "elsewhere")
${BODY}`,
      PATH
    ).decls[0].activityStart;
    expect(none?.startPhase).toBeUndefined();
  });

  it("refuse a start phase that is implied or that does not play in the slice", () => {
    expect(
      parseError(
        `${BUNDLE}@activity("x")
@start_slice("dock")
@phase("p", "dock")
${BODY}`
      )
    ).toContain("needs the @phase that owns the start state");
    expect(
      parseError(
        `${BUNDLE}@activity("x")
@start_slice("dock", "q")
@phase("p", "dock")
${BODY}`
      )
    ).toContain("phase 'q', which is not a @phase in dock");
    expect(
      parseError(
        `${BUNDLE}@activity("x")
@start_slice("dock", "p")
@phase("p", "elsewhere")
${BODY}`
      )
    ).toContain("phase 'p', which is not a @phase in dock");
    expect(
      parseError(`${BUNDLE}@activity("x")
@start_slice("dock", "")
${BODY}`)
    ).toContain("not a @phase in dock");
  });

  it("need an @activity, and take each value once", () => {
    expect(parseError(`${BUNDLE}@start_slice("plaza")\n${BODY}`)).toContain(
      "the start decorators need an @activity"
    );
    expect(
      parseError(
        `${BUNDLE}@activity("x")\n@start_slice("plaza")\n@start_slice("dock")\n${BODY}`
      )
    ).toContain("@start_slice is written once");
    expect(
      parseError(
        `${BUNDLE}@activity("x")\n@region_spawn_transition(1, "a")\n@region_spawn_transition(1, "b")\n${BODY}`
      )
    ).toContain("names region 1 twice");
  });

  it("refuse what they cannot read", () => {
    expect(
      parseError(`${BUNDLE}@activity("x")\n@start_slice(3)\n${BODY}`)
    ).toContain("@start_slice takes a name or a 0x<hash>");
    expect(
      parseError(`${BUNDLE}@activity("x")\n@start_slice("")\n${BODY}`)
    ).toContain("@start_slice takes a slice name");
    // a bubble number is no slice name
    expect(
      parseError(`${BUNDLE}@activity("x")\n@phase("p", 4)\n${BODY}`)
    ).toContain("@phase takes a name or a 0x<hash>");
    expect(
      parseError(`${BUNDLE}@activity("x")\n@start_bubble(3)\n${BODY}`)
    ).toContain("unknown decorator '@start_bubble'");
    expect(
      parseError(`${BUNDLE}@activity("x")\n@phase(3, 4)\n${BODY}`)
    ).toContain("@phase takes a name or a 0x<hash>");
    expect(
      parseError(`${BUNDLE}@activity("x")\n@time_of_day(1.5)\n${BODY}`)
    ).toContain("@time_of_day takes a fraction of the day, 0 up to 1");
    expect(parseError(`${BUNDLE}@activity("")\n${BODY}`)).toContain(
      "@activity takes activity names"
    );
    expect(parseError(`${BUNDLE}@start_slices("plaza")\n${BODY}`)).toContain(
      "unknown decorator '@start_slices'"
    );
    // a start decorator heads the file; it is no member's
    expect(
      parseError(
        `${BUNDLE}@activity("x")\nint i\n@start_slice("plaza")\nint j\n`
      )
    ).toContain("@start_slice heads the file or its class");
    expect(
      parseError(`${BUNDLE}@member_counts({dreg: 1})\n@activity("x")\n${BODY}`)
    ).toContain("@activity goes above the member's decorators");
  });

  it("belong to an encounter, and to one script per activity", () => {
    expect(
      errors(`${BUNDLE}@activity("x")\n@start_slice("plaza")\n${BODY}`)
    ).toEqual([]);
    expect(
      errors(
        '@activity("x")\n@start_slice("plaza")\nint i\n',
        "es/utility_scripts/t.esu"
      )
    ).toEqual(["@activity on 't', which is not an encounter class"]);
    const twice = compileBungieScript(
      [
        { path: PATH, source: `${BUNDLE}@activity("x", "y")\n${BODY}` },
        {
          path: "es/venus/other/other.es",
          source: '@activity_bundle("other")\n@activity("y")\nint i\n',
        },
      ],
      { chunks: false }
    );
    expect(
      twice.diagnostics
        .filter((d) => d.severity === "error")
        .map((d) => `${d.path}: ${d.message}`)
    ).toEqual([
      `es/venus/other/other.es: activity 'y' already starts in ${PATH}`,
    ]);
  });
});

describe("a root that is only start decorators", () => {
  const ROOT = "es/mars/mars_portal_1/mars_portal_1.es";
  const ONLY = '@activity("mars_portal_1")\n@start_slice("atrium")\n';

  it("compiles clean, with no bundle to run in", () => {
    // chunks included: an empty encounter class still compiles
    const compiled = compileBungieScript([{ path: ROOT, source: ONLY }]);
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.decls[0].schema.activityBundleName).toBeUndefined();
    const set = compiledScriptSetOf(
      compileScriptFiles([{ path: ROOT, text: ONLY }])
    );
    expect(set.activityStart("mars_portal_1")).toEqual({
      activity: "mars_portal_1",
      destination: "mars",
      phases: [],
      regionSpawnTransitions: {},
      script: ROOT,
      startSlice: "atrium",
    });
  });

  it("is the only encounter without a bundle that is not reported", () => {
    const warnings = (source: string) =>
      compileBungieScript([{ path: ROOT, source }], { chunks: false })
        .diagnostics.filter((d) => d.severity === "warning")
        .map((d) => d.message);
    expect(warnings(`${ONLY}${BODY}`)).toEqual([
      "encounter class 'c_encounter__mars_portal_1' runs in no bundle; give it @activity_bundle(\"<bundle name>\")",
    ]);
    expect(warnings(BODY)).toHaveLength(1);
    expect(warnings(`${BUNDLE}${ONLY}`)).toEqual([]);
  });
});

describe("the compiled start", () => {
  const SOURCES = [
    { path: PATH, text: FULL },
    {
      path: "es/city_tower/enc_city_tower_default1.es",
      text: '@activity_bundle("enc_city_tower_default1")\n@activity("city_tower_default1")\n@start_slice("plaza")\nc_fireteam_sensor_host host\n',
    },
    {
      path: "bs/activities/common/story_common.bs",
      text: '@activity_bundle("story_common")\n@activity("common_start")\n@start_slice("dock")\nclass c_encounter__story_common : c_encounter:\n    int i\n',
    },
    {
      path: "es/venus/strike_1_activity/venus_strike_1_mission1.esp",
      text: "c_squad_sensor_host sq\n",
    },
  ];
  const compiled = compileScriptFiles(SOURCES);
  const root = mkdtempSync(join(tmpdir(), "activity-start-"));
  const dir = join(root, "compiled_bs");
  afterAll(() => rmSync(root, { force: true, recursive: true }));

  const expected = {
    activity: "venus_portal_1",
    destination: "venus",
    phases: [
      {
        hash: fnv1("engineering_phase"),
        name: "engineering_phase",
        slice: "engineering",
      },
      {
        hash: fnv1("dig_site_phase"),
        name: "dig_site_phase",
        slice: "dig_site",
      },
      { hash: 0xd1_f1_1e_74, name: "0xD1F11E74", slice: "0x6AA103DB" },
    ],
    regionSpawnTransitions: { 24: 0x68_93_54_72, 105: fnv1("") },
    script: PATH,
    spawnTransition: fnv1("venus_strike_1_phase01"),
    startSlice: "plaza",
    timeOfDay: 0.77,
  };

  it("compiles clean and puts the start in the schema", () => {
    expect(compiled.diagnostics).toEqual([]);
    expect(
      compiled.compiledDecl(PATH).schema.activityStart?.activities
    ).toEqual(["venus_portal_1", "venus_portal_1_hard"]);
    expect(
      compiled.compiledDecl(
        "es/venus/strike_1_activity/venus_strike_1_mission1.esp"
      ).schema.activityStart
    ).toBeUndefined();
  });

  it("is answered by activity name from the set, in memory and from disk", () => {
    const inMemory = compiledScriptSetOf(compiled);
    writeCompiledBs(dir, compiled);
    const fromDisk = readCompiledBs(dir);
    for (const set of [inMemory, fromDisk]) {
      expect(set.activityStart("venus_portal_1")).toEqual(expected);
      expect(set.activityStart("venus_portal_1_hard")).toEqual({
        ...expected,
        activity: "venus_portal_1_hard",
      });
      expect(set.activityStart("city_tower_default1")).toEqual({
        activity: "city_tower_default1",
        destination: "city_tower",
        phases: [],
        regionSpawnTransitions: {},
        script: "es/city_tower/enc_city_tower_default1.es",
        startSlice: "plaza",
      });
      // a shared bs\ encounter has no destination of its own
      expect(set.activityStart("common_start")?.destination).toBeUndefined();
      expect(set.activityStart("common_start")?.startSlice).toBe("dock");
      expect(set.activityStart("nothing")).toBeUndefined();
    }
    expect(fromDisk.index.files).toEqual(inMemory.index.files);
  });

  it("is in the index, and the format moves with it", () => {
    const index = JSON.parse(
      readFileSync(join(dir, COMPILED_BS_INDEX), "utf8")
    ) as CompiledBsIndex;
    expect(index.format).toBe(COMPILED_BS_FORMAT);
    expect(COMPILED_BS_FORMAT).toBe(8);
    expect(
      index.files.find((file) => file.path === PATH)?.activityStart?.startSlice
    ).toBe("plaza");
    // a tree from before the start data is rebuilt, not read
    writeFileSync(
      join(dir, COMPILED_BS_INDEX),
      JSON.stringify({ ...index, format: 5 })
    );
    expect(() => readCompiledBs(dir)).toThrow(
      `compiled_bs format 5, expected ${COMPILED_BS_FORMAT}`
    );
  });

  it("is read from a source file too", () => {
    const file = parseScriptFile(PATH, FULL);
    expect(file.activityStart?.startSlice).toBe("plaza");
    // the bundle still reads when the start decorators share its line
    const shared = parseScriptFile(
      PATH,
      `@activity_bundle("x") @activity("y") @start_slice("dock")\n${BODY}`
    );
    expect(shared.activityBundle).toBe(fnv1("x"));
    expect(shared.activityStart?.startSlice).toBe("dock");
    expect(
      parseScriptFile("es/x/y.es", `${BODY}`).activityStart
    ).toBeUndefined();
    // a file that does not parse declares no start
    expect(
      parseScriptFile("es/x/y.es", "def f(:\n").activityStart
    ).toBeUndefined();
  });
});

describe("a slice's region hash", () => {
  it("is the fnv1 of its name, or the 0x<hash> of one that never cracked", () => {
    expect(sliceRegionHash("plaza")).toBe(fnv1("plaza"));
    expect(sliceRegionHash("0x1AD5E415")).toBe(0x1a_d5_e4_15);
    expect(sliceRegionHash("plaza")).toBe(0x1a_d5_e4_15);
    expect(() => sliceRegionHash("0xnope")).toThrow("not a slice name");
  });
});
