import { describe, expect, it } from "vitest";
import type { BsField } from "../../src/bungiescript/ast.ts";
import { compileBungieScript } from "../../src/bungiescript/compile.ts";
import { parseBungieScript } from "../../src/bungiescript/parser.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";

// @member_counts in the front end: what it parses to, what it refuses and
// what the schema carries.

const PATH = "es/x/enc_x.es";
const BUNDLE = '@activity_bundle("enc_x")\n';
// an archetype holding squads, as simple_encounter does
const ARCHETYPE = {
  path: "es/utility_scripts/amb_test.esu",
  source:
    "dynamic_array<c_squad_sensor_host> _squad\nc_squad_group_sensor_host _squad_group\n",
};

function fields(source: string, path = PATH): BsField[] {
  return parseBungieScript(source, path).decls[0].members.filter(
    (member): member is BsField => member.kind === "field"
  );
}

function compile(source: string, path = PATH) {
  return compileBungieScript([{ path, source }, ARCHETYPE], { chunks: false });
}

function errors(source: string, path = PATH): string[] {
  return compile(source, path)
    .diagnostics.filter((d) => d.severity === "error")
    .map((d) => d.message);
}

function schemaCounts(source: string) {
  const result = compile(source);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return result.decls[0].schema.members.map((member) => member.memberCounts);
}

describe("@member_counts", () => {
  it("parses a map of member names, lists and hashes", () => {
    const [plain, landing] = fields(
      `${BUNDLE}c_squad_sensor_host sq_a\n@member_counts({dreg: 3, vandal: [1, 2], 0xD1F11E74: 0})\nc_squad_sensor_host sq_landing\n`
    );
    expect(plain.memberCounts).toBeUndefined();
    const value = landing.memberCounts?.value;
    expect(value?.kind).toBe("map");
    expect(
      value?.kind === "map"
        ? value.entries.map(({ hash, key }) => [key, hash])
        : []
    ).toEqual([
      ["dreg", fnv1("dreg")],
      ["vandal", fnv1("vandal")],
      ["0xD1F11E74", 0xd1_f1_1e_74],
    ]);
  });

  it("takes the first member's from the head of a file with no bundle", () => {
    const [first] = fields(
      "# a comment\n@member_counts({dreg: 2})\nc_squad_sensor_host sq_a\n",
      "es/utility_scripts/t.esu"
    );
    expect(first.memberCounts?.line).toBe(2);
  });

  it("flattens squads, arrays and archetypes into the schema", () => {
    expect(
      schemaCounts(
        [
          BUNDLE,
          "@member_counts({dreg: 3, vandal: 1})",
          "c_squad_sensor_host sq_landing",
          "@member_counts({_squad: [{dreg: 2}, {}, {thrall: [1, 2]}]})",
          "amb_test amb_x",
          "@member_counts([{}, {thrall: 2, thrall_1: 2}])",
          "static_array<c_squad_sensor_host, 5> sq_wave",
          "c_squad_sensor_host sq_plain",
          "",
        ].join("\n")
      )
    ).toEqual([
      [
        {
          members: [
            { counts: [3], hash: fnv1("dreg"), key: "dreg" },
            { counts: [1], hash: fnv1("vandal"), key: "vandal" },
          ],
        },
      ],
      [
        {
          members: [{ counts: [2], hash: fnv1("dreg"), key: "dreg" }],
          path: "_squad[0]",
        },
        {
          members: [{ counts: [1, 2], hash: fnv1("thrall"), key: "thrall" }],
          path: "_squad[2]",
        },
      ],
      [
        {
          members: [
            { counts: [2], hash: fnv1("thrall"), key: "thrall" },
            { counts: [2], hash: fnv1("thrall_1"), key: "thrall_1" },
          ],
          path: "[1]",
        },
      ],
      undefined,
    ]);
  });

  it("refuses counts that do not fit the member", () => {
    const squad = "c_squad_sensor_host sq_a\n";
    expect(errors(`${BUNDLE}@member_counts({dreg: 1})\nint i\n`)).toEqual([
      expect.stringContaining("@member_counts on i: a int holds no squads"),
    ]);
    expect(errors(`${BUNDLE}@member_counts([{dreg: 1}])\n${squad}`)).toEqual([
      expect.stringContaining("a squad takes {member: count, ...}"),
    ]);
    expect(
      errors(`${BUNDLE}@member_counts({dreg: {vandal: 1}})\n${squad}`)
    ).toEqual([expect.stringContaining("'dreg' takes a count")]);
    expect(
      errors(
        `${BUNDLE}@member_counts({_squads: [{dreg: 1}]})\namb_test amb_x\n`
      )
    ).toEqual([expect.stringContaining("amb_test has no member '_squads'")]);
    expect(
      errors(
        `${BUNDLE}@member_counts({dreg: 1})\nstatic_array<c_squad_sensor_host, 2> sq_w\n`
      )
    ).toEqual([expect.stringContaining("an array takes [..., ...] by index")]);
    expect(
      errors(
        `${BUNDLE}@member_counts({dreg: 1})\n@member_counts({dreg: 2})\n${squad}`
      )
    ).toEqual([expect.stringContaining("'sq_a' takes one @member_counts")]);
    expect(
      errors(`${BUNDLE}@member_counts({dreg: 1, dreg: 2})\n${squad}`)
    ).toEqual([expect.stringContaining("@member_counts names 'dreg' twice")]);
    expect(errors(`${BUNDLE}@member_counts({dreg: -1})\n${squad}`)).toEqual([
      expect.stringContaining(
        "takes whole numbers, lists and {member: count} maps"
      ),
    ]);
    expect(errors(`${BUNDLE}@member_counts({dreg: 1.5})\n${squad}`)).toEqual([
      expect.stringContaining(
        "takes whole numbers, lists and {member: count} maps"
      ),
    ]);
    expect(errors(`${BUNDLE}@member_counts({"dreg": 1})\n${squad}`)).toEqual([
      expect.stringContaining("keys are member names or 0x<hash>"),
    ]);
    expect(
      errors(
        `${BUNDLE}${squad}@member_counts({dreg: 1})\nthread main:\n    pass\n`
      )
    ).toEqual([
      expect.stringContaining("@member_counts decorates a squad member"),
    ]);
    expect(errors(`${BUNDLE}${squad}@member_counts({dreg: 1})\n`)).toEqual([
      expect.stringContaining("@member_counts decorates a squad member"),
    ]);
    expect(
      errors(
        "@member_counts({dreg: 1})\nclass c_x:\n    int i\n",
        "bs/activities/common/x.bs"
      )
    ).toEqual([
      expect.stringContaining("@member_counts decorates a squad member"),
    ]);
    expect(errors(`${squad}${BUNDLE}int i\n`)).toEqual([
      expect.stringContaining("@activity_bundle heads the file or its class"),
    ]);
  });
});
