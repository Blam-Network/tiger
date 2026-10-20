import { describe, expect, it } from "vitest";
import { compileBungieScript } from "../../src/bungiescript/compile.ts";
import {
  NATIVE_TYPES,
  nativeTypeNamed,
  nativeTypeSpelled,
} from "../../src/bungiescript/native_types.ts";
import {
  BUILTINS,
  NATIVE_BASE_METHODS,
  NATIVE_DELEGATES,
  SPECIAL_FORMS,
} from "../../src/bungiescript/project.ts";
import { IMPORT_REGISTRY } from "../../src/bungiescript/types.ts";

// The native types have two names: the engine's class (`name`) and the short
// one a script writes (`spelling`).

const PATH = "es/x/enc_x.es";

// the duplicate rows of a name that one registry entry stands for
const distinct = NATIVE_TYPES.filter(
  (type, at) => NATIVE_TYPES.findIndex((t) => t.name === type.name) === at
);
const renamed = distinct.filter((type) => type.spelling !== type.name);

function members(source: string) {
  const result = compileBungieScript([{ path: PATH, source }], {
    chunks: false,
  });
  expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
  return result.decls[0].schema.members;
}

describe("native type spellings", () => {
  it("shortens the host classes, as Bungie's utility scripts name their members", () => {
    expect(nativeTypeNamed("c_squad_sensor_host")?.spelling).toBe("squad");
    expect(nativeTypeNamed("c_trigger_volume_slot_host")?.spelling).toBe(
      "trigger_volume"
    );
    expect(nativeTypeNamed("c_object_sensor_host")?.spelling).toBe("object");
    expect(nativeTypeNamed("c_encounter_handle")?.spelling).toBe(
      "encounter_handle"
    );
  });

  it("keeps the names the compiled chunks and the engine-side types reach", () => {
    for (const name of [
      "c_player_script_iterator",
      "c_command_script",
      "c_interface_reference",
      "c_weapon_magazine",
      "s_ability_configuration",
      "e_damage_type",
    ]) {
      expect(nativeTypeNamed(name)?.spelling, name).toBe(name);
    }
  });

  it("looks a type up by the one name asked for", () => {
    expect(renamed.length).toBeGreaterThan(40);
    for (const type of renamed) {
      expect(nativeTypeNamed(type.name)?.spelling).toBe(type.spelling);
      expect(nativeTypeSpelled(type.spelling)?.name).toBe(type.name);
      expect(nativeTypeSpelled(type.name), type.name).toBeUndefined();
      expect(nativeTypeNamed(type.spelling), type.spelling).toBeUndefined();
    }
  });

  it("gives every type a spelling no other type has, and no name of another", () => {
    const spellings = distinct.map((type) => type.spelling);
    expect(new Set(spellings).size).toBe(spellings.length);
    const names = new Set(distinct.map((type) => type.name));
    for (const type of renamed) {
      expect(names.has(type.spelling), type.spelling).toBe(false);
    }
  });

  it("takes no name a bare identifier in code already means", () => {
    const taken = new Set([
      ...IMPORT_REGISTRY.map((entry) => entry.name),
      ...BUILTINS,
      ...SPECIAL_FORMS,
      ...NATIVE_BASE_METHODS,
      ...NATIVE_DELEGATES,
    ]);
    for (const type of renamed) {
      expect(taken.has(type.spelling), type.spelling).toBe(false);
    }
  });

  it("spells a generic from its elements", () => {
    const generics = distinct.filter((type) => type.name.includes("<"));
    expect(generics.length).toBeGreaterThan(0);
    for (const type of generics) {
      const spelled = type.name.replace(
        /[a-z_0-9]+/g,
        (word) => nativeTypeNamed(word)?.spelling ?? word
      );
      expect(type.spelling, type.name).toBe(spelled);
    }
    expect(
      nativeTypeNamed("static_array<c_common_reference, 3>")?.spelling
    ).toBe("static_array<common_reference, 3>");
  });
});

describe("native type spellings in a script", () => {
  it("takes a member's kind from the spelling", () => {
    const [sq, handle, objects] = members(
      "squad sq\nencounter_handle enc_y\nstatic_array<object, 3> objs\n"
    );
    expect(sq).toMatchObject({ kind: "object", type: "squad" });
    expect(handle).toMatchObject({ kind: "handle", type: "encounter_handle" });
    expect(objects).toMatchObject({
      kind: "static_array",
      type: "static_array<object, 3>",
    });
  });

  it("reads a member named for its type", () => {
    const [timer, lifetime, location] = members(
      "timer timer\nlifetime lifetime\nlocation location\n\nscript main():\n    timer.start(1)\n    sleep_until(lifetime.is_active() and location.occupied())\n"
    );
    expect(timer).toMatchObject({ name: "timer", type: "timer" });
    expect(lifetime).toMatchObject({ name: "lifetime", type: "lifetime" });
    expect(location).toMatchObject({ name: "location", type: "location" });
  });

  it("takes a registered struct as an element and an enum from the registry", () => {
    const [behaviors, trigger] = members(
      "static dynamic_array<s_damage_impulse_behavior_element> behaviors\ne_trigger_behavior trigger\n"
    );
    expect(behaviors).toMatchObject({
      kind: "dynamic_array",
      side: "definition",
    });
    expect(trigger).toMatchObject({ kind: "enum_field" });
    expect(nativeTypeNamed("s_damage_impulse_behavior_element")).toMatchObject({
      kind: "struct",
    });
  });
});

// A type a script writes names something; anything else is an error at the
// member's line, and the decl does not compile.

function compileErrors(
  source: string,
  extra: { path: string; source: string }[] = []
) {
  const result = compileBungieScript([{ path: PATH, source }, ...extra], {
    chunks: false,
  });
  return {
    decls: result.decls.map((decl) => decl.name),
    errors: result.diagnostics.filter((d) => d.severity === "error"),
  };
}

describe("a type nothing declares", () => {
  it("is an error at its member's line", () => {
    const { decls, errors } = compileErrors("int a\nc_nothing_here b\n");
    expect(errors).toEqual([
      {
        line: 2,
        message: `${PATH}:2: unknown type 'c_nothing_here'`,
        path: PATH,
        severity: "error",
      },
    ]);
    expect(decls).toEqual([]);
  });

  it("is an error on a static, a decorated or a defaulted member too", () => {
    for (const source of [
      "static c_nothing_here a\n",
      "@member_counts({dreg: 1})\nc_nothing_here a\n",
      "c_nothing_here a = 1\n",
    ]) {
      expect(compileErrors(source).errors, source).toEqual([
        expect.objectContaining({
          message: expect.stringContaining("unknown type 'c_nothing_here'"),
        }),
      ]);
    }
  });

  it("is an error inside a container, a table or an array", () => {
    for (const source of [
      "dynamic_array<c_nothing_here> a\n",
      "static_array<c_nothing_here, 3> a\n",
      "static_stack<static_array<c_nothing_here, 2>, 4> a\n",
      "table<c_nothing_here, int> a\n",
      "table<e_damage_type, c_nothing_here> a\n",
      "c_nothing_here[3] a\n",
    ]) {
      expect(compileErrors(source).errors, source).toEqual([
        expect.objectContaining({
          line: 1,
          message: expect.stringContaining("unknown type 'c_nothing_here'"),
        }),
      ]);
    }
  });

  it("names the spelling when it is an engine class name", () => {
    expect(
      compileErrors("c_squad_sensor_host sq\n").errors.map((d) => d.message)
    ).toEqual([
      `${PATH}:1: unknown type 'c_squad_sensor_host'; a script writes 'squad'`,
    ]);
    expect(
      compileErrors("dynamic_array<c_object_sensor_host> objs\n").errors[0]
        .message
    ).toContain("a script writes 'object'");
    expect(
      compileErrors("c_encounter_handle enc_y\n").errors[0].message
    ).toContain("a script writes 'encounter_handle'");
  });

  it("leaves the other decls compiling", () => {
    const { decls, errors } = compileErrors("int a\n", [
      { path: "es/utility_scripts/bad.esu", source: "c_nothing_here a\n" },
    ]);
    expect(decls).toEqual(["c_encounter__enc_x"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      line: 1,
      path: "es/utility_scripts/bad.esu",
    });
  });

  it("is no error once the project declares it", () => {
    const { errors } = compileErrors(
      "c_declared a\ndynamic_array<s_declared> b\ne_declared[2] c\n",
      [
        { path: "es/utility_scripts/c_declared.esu", source: "int x\n" },
        {
          path: "bs/s_declared.bs",
          source:
            "struct s_declared:\n    int x\n\nenum e_declared:\n    first\n",
        },
      ]
    );
    expect(errors).toEqual([]);
  });
});
