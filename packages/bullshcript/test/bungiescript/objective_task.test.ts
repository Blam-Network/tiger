import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BsField } from "../../src/bungiescript/ast.ts";
import { compileBungieScript } from "../../src/bungiescript/compile.ts";
import {
  compiledScriptSetOf,
  readCompiledBs,
  writeCompiledBs,
} from "../../src/bungiescript/compiled_bs.ts";
import { parseBungieScript } from "../../src/bungiescript/parser.ts";
import { compileScriptFiles } from "../../src/bungiescript/script_files.ts";
import { fnv1 } from "../../src/host/tags/name_hash.ts";

// @objective and @task in the front end: what they parse to, what they
// refuse and what the schema carries.

const PATH = "es/x/enc_x.es";
const BUNDLE = '@activity_bundle("enc_x")\n';
// an archetype holding squads, as simple_encounter does
const ARCHETYPE = {
  path: "es/utility_scripts/amb_test.esu",
  source:
    "dynamic_array<c_squad_sensor_host> _squad\nc_squad_group_sensor_host _squad_group\nc_objective_sensor_host _objective\n",
};
const OBJECTIVES =
  "c_objective_sensor_host obj_x\nc_objective_sensor_host obj_y\n";

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

function schemaMembers(source: string) {
  const result = compile(source);
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return result.decls[0].schema.members;
}

describe("@objective", () => {
  it("parses a member path, and a map of them across lines", () => {
    const [plain, squad, deep, nested] = fields(
      [
        `${BUNDLE}${OBJECTIVES}c_squad_sensor_host sq_plain`,
        "@objective(phase02.obj_x)",
        "c_squad_sensor_host sq_a",
        "@objective(waves[1].obj_y) c_squad_sensor_host sq_b",
        "@objective({",
        "    _squad: obj_x,",
        "    inner: {_squad: obj_y},",
        "})",
        "amb_test amb_x",
        "",
      ].join("\n")
    ).slice(2);
    expect(plain.objective).toBeUndefined();
    expect(squad.objective?.value).toMatchObject({
      kind: "target",
      path: "phase02.obj_x",
    });
    expect(deep.objective?.value).toMatchObject({
      kind: "target",
      path: "waves[1].obj_y",
    });
    const map = nested.objective?.value;
    expect(map?.kind === "map" ? map.entries.map((e) => e.key) : []).toEqual([
      "_squad",
      "inner",
    ]);
  });

  it("takes the first member's from the head of a file with no bundle", () => {
    const [first] = fields(
      "# a comment\n@objective(obj_x)\nc_squad_sensor_host sq_a\n",
      "es/utility_scripts/t.esu"
    );
    expect(first.objective?.line).toBe(2);
  });

  it("flattens squads, arrays and archetypes into the schema", () => {
    const members = schemaMembers(
      [
        BUNDLE,
        OBJECTIVES,
        "@objective(obj_x)",
        "c_squad_sensor_host sq_a",
        "@objective(obj_y)",
        "static_array<c_squad_sensor_host, 5> sq_wave",
        "@objective({_squad: obj_x})",
        "amb_test amb_a",
        "@objective({_squad: obj_y})",
        "static_array<amb_test, 2> amb_b",
        "c_squad_sensor_host sq_plain",
        "",
      ].join("\n")
    ).map((member) => [member.name, member.objective]);
    expect(members.filter(([, objective]) => objective !== undefined)).toEqual([
      ["sq_a", [{ target: "obj_x" }]],
      ["sq_wave", [{ path: "[]", target: "obj_y" }]],
      ["amb_a", [{ path: "_squad[]", target: "obj_x" }]],
      ["amb_b", [{ path: "[]._squad[]", target: "obj_y" }]],
    ]);
  });

  it("refuses what does not fit the member", () => {
    const squad = "c_squad_sensor_host sq_a\n";
    expect(errors(`${BUNDLE}${OBJECTIVES}@objective(obj_z)\n${squad}`)).toEqual(
      [
        expect.stringContaining(
          "@objective on sq_a: c_encounter__enc_x has no member 'obj_z'"
        ),
      ]
    );
    expect(
      errors(
        `${BUNDLE}${OBJECTIVES}@objective(sq_b)\n${squad}c_squad_sensor_host sq_b\n`
      )
    ).toEqual([
      expect.stringContaining(
        "'sq_b' is a c_squad_sensor_host, not an Objective"
      ),
    ]);
    expect(
      errors(`${BUNDLE}${OBJECTIVES}@objective({_squad: obj_x})\n${squad}`)
    ).toEqual([
      expect.stringContaining("a squad takes the Objective it is against"),
    ]);
    expect(
      errors(`${BUNDLE}${OBJECTIVES}@objective(obj_x)\namb_test amb_a\n`)
    ).toEqual([
      expect.stringContaining(
        "a amb_test takes {member: ..., ...} of its squads"
      ),
    ]);
    expect(
      errors(
        `${BUNDLE}${OBJECTIVES}@objective({_squads: obj_x})\namb_test amb_a\n`
      )
    ).toEqual([expect.stringContaining("amb_test has no member '_squads'")]);
    expect(errors(`${BUNDLE}${OBJECTIVES}@objective(obj_x)\nint i\n`)).toEqual([
      expect.stringContaining("@objective on i: a int holds no squads"),
    ]);
    expect(
      errors(
        `${BUNDLE}${OBJECTIVES}@objective(obj_x)\n@objective(obj_y)\n${squad}`
      )
    ).toEqual([expect.stringContaining("'sq_a' takes one @objective")]);
    expect(
      errors(
        `${BUNDLE}${OBJECTIVES}@objective({_squad: obj_x, _squad: obj_y})\namb_test amb_a\n`
      )
    ).toEqual([expect.stringContaining("@objective names '_squad' twice")]);
    expect(errors(`${BUNDLE}${OBJECTIVES}@objective(3)\n${squad}`)).toEqual([
      expect.stringContaining("@objective takes a member name"),
    ]);
    expect(errors(`${BUNDLE}${squad}@objective(obj_x)\n`)).toEqual([
      expect.stringContaining("@objective decorates a member"),
    ]);
    expect(
      errors(
        "@objective(obj_x)\nclass c_x:\n    int i\n",
        "bs/activities/common/x.bs"
      )
    ).toEqual([expect.stringContaining("@objective decorates a member")]);
  });
});

describe("@task", () => {
  const SQUADS =
    "c_squad_sensor_host sq_a\nc_squad_group_sensor_host sqg_a\nbool open\n";

  it("parses a name or a hash, the squad and the condition, once per task", () => {
    const [, , , gated] = fields(
      [
        `${BUNDLE}${SQUADS}`,
        '@task("gating", squad: sq_a, condition: open)',
        "@task(0xD1F11E74)",
        '@task("idle", condition: open, squad: sqg_a)',
        "c_objective_sensor_host obj_x",
        "",
      ].join("\n")
    );
    expect(gated.tasks.map((task) => [task.name, task.hash])).toEqual([
      ["gating", fnv1("gating")],
      ["0xD1F11E74", 0xd1_f1_1e_74],
      ["idle", fnv1("idle")],
    ]);
    expect(gated.tasks[0].squad?.path).toBe("sq_a");
    expect(gated.tasks[0].condition?.name).toBe("open");
    expect(gated.tasks[1].squad).toBeUndefined();
    expect(gated.tasks[2].squad?.path).toBe("sqg_a");
  });

  it("puts the gates in the schema, in the order written", () => {
    const members = schemaMembers(
      [
        `${BUNDLE}${SQUADS}`,
        '@task("gating", squad: sq_a, condition: open)',
        "@task(0xD1F11E74)",
        '@task("idle", squad: sqg_a)',
        "c_objective_sensor_host obj_x",
        "",
      ].join("\n")
    );
    expect(members.find((member) => member.name === "obj_x")?.tasks).toEqual([
      {
        condition: "open",
        hash: fnv1("gating"),
        name: "gating",
        squad: "sq_a",
      },
      { hash: 0xd1_f1_1e_74, name: "0xD1F11E74" },
      { hash: fnv1("idle"), name: "idle", squad: "sqg_a" },
    ]);
  });

  it("names the Objective inside an archetype instance", () => {
    const members = schemaMembers(
      `${BUNDLE}@task("a", objective: _objective, squad: amb_x._squad[0])\n@task(0xD1F11E74, objective: _objective)\namb_test amb_x\n`
    );
    expect(members.find((member) => member.name === "amb_x")?.tasks).toEqual([
      {
        hash: fnv1("a"),
        name: "a",
        path: "_objective",
        squad: "amb_x._squad[0]",
      },
      { hash: 0xd1_f1_1e_74, name: "0xD1F11E74", path: "_objective" },
    ]);
  });

  it("refuses what does not fit", () => {
    const objective = "c_objective_sensor_host obj_x\n";
    expect(errors(`${BUNDLE}@task("a")\namb_test amb_x\n`)).toEqual([
      expect.stringContaining(
        "@task on amb_x: a amb_test takes objective: the Objective inside it"
      ),
    ]);
    expect(
      errors(`${BUNDLE}@task("a", objective: _squad)\namb_test amb_x\n`)
    ).toEqual([
      expect.stringContaining("'_squad' is not an Objective of amb_test"),
    ]);
    expect(
      errors(`${BUNDLE}@task("a", objective: _objective)\n${objective}`)
    ).toEqual([
      expect.stringContaining("an Objective has no Objective inside it"),
    ]);
    expect(errors(`${BUNDLE}${SQUADS}@task("a")\nint i\n`)).toEqual([
      expect.stringContaining("@task on i: a int is no Objective"),
    ]);
    expect(
      errors(`${BUNDLE}${SQUADS}@task("a", squad: nobody)\n${objective}`)
    ).toEqual([
      expect.stringContaining("c_encounter__enc_x has no member 'nobody'"),
    ]);
    expect(
      errors(`${BUNDLE}${SQUADS}@task("a", squad: open)\n${objective}`)
    ).toEqual([
      expect.stringContaining("'open' is a bool, not a squad or squad group"),
    ]);
    expect(
      errors(`${BUNDLE}${SQUADS}@task("a", condition: sq_a)\n${objective}`)
    ).toEqual([
      expect.stringContaining("'sq_a' is a c_squad_sensor_host, not a bool"),
    ]);
    expect(
      errors(`${BUNDLE}${SQUADS}@task("a", condition: gone)\n${objective}`)
    ).toEqual([
      expect.stringContaining("c_encounter__enc_x has no member 'gone'"),
    ]);
    expect(
      errors(
        `${BUNDLE}${SQUADS}@task("a")\n@task("a", squad: sq_a)\n${objective}`
      )
    ).toEqual([expect.stringContaining("'obj_x' takes @task a once")]);
    expect(
      errors(`${BUNDLE}${SQUADS}@task("a", other: sq_a)\n${objective}`)
    ).toEqual([
      expect.stringContaining(
        "@task takes squad:, condition: and objective: once each, not 'other'"
      ),
    ]);
    expect(
      errors(
        `${BUNDLE}${SQUADS}@task("a", squad: sq_a, squad: sq_a)\n${objective}`
      )
    ).toEqual([
      expect.stringContaining(
        "@task takes squad:, condition: and objective: once each, not 'squad'"
      ),
    ]);
    expect(errors(`${BUNDLE}${SQUADS}@task(open)\n${objective}`)).toEqual([
      expect.stringContaining("@task takes a name or a 0x<hash>"),
    ]);
    expect(errors(`${BUNDLE}${objective}@task("a")\n`)).toEqual([
      expect.stringContaining("@task decorates a member"),
    ]);
  });
});

describe("@objective and @task through a compiled tree", () => {
  const FILES = [ARCHETYPE.path, PATH].map((path) => ({
    path,
    text:
      path === PATH
        ? [
            BUNDLE,
            "bool open",
            "c_squad_sensor_host sq_a",
            '@task("gating", squad: sq_a, condition: open)',
            "@task(0xD1F11E74)",
            "c_objective_sensor_host obj_x",
            "@objective(obj_x)",
            "static_array<c_squad_sensor_host, 3> sq_wave",
            "@objective({_squad: obj_x})",
            "amb_test amb_x",
            "",
          ].join("\n")
        : ARCHETYPE.source,
  }));

  it("reads back the schema it wrote", () => {
    const compiled = compileScriptFiles(FILES);
    expect(compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
      []
    );
    const dir = mkdtempSync(join(tmpdir(), "bs-objective-"));
    try {
      writeCompiledBs(join(dir, "tree"), compiled);
      const written = readCompiledBs(join(dir, "tree"));
      const members = (path: string) =>
        written
          .schemaFor(path)
          .members.filter((member) => member.objective ?? member.tasks);
      expect(members(PATH).map((member) => member.name)).toEqual([
        "obj_x",
        "sq_wave",
        "amb_x",
      ]);
      expect(members(PATH)).toEqual(
        compiledScriptSetOf(compiled)
          .schemaFor(PATH)
          .members.filter((member) => member.objective ?? member.tasks)
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
