import { describe, expect, it } from "vitest";
import type { HksInstruction, Method } from "../../src/hks/bytecode/proto.ts";
import { LuaState } from "../../src/hks/vm/interpreter.ts";
import { LuaClosure, type LuaValue } from "../../src/hks/vm/values.ts";

function prototype(overrides: Partial<Method> = {}): Method {
  return {
    offset: 0,
    endOffset: 0,
    nups: 0,
    numParams: 0,
    isVararg: 0,
    maxStackSize: 4,
    code: [],
    constants: [],
    unknownAfterConstants: 1,
    lineDefined: 1,
    lastLineDefined: 1,
    source: undefined,
    name: undefined,
    lineInfo: [],
    locals: [],
    upvalues: [],
    protos: [],
    ...overrides,
  };
}

function instruction(overrides: Partial<HksInstruction>): HksInstruction {
  return { raw: 0, opcode: 0, a: 0, b: 0, c: 0, bx: 0, sbx: 0, ...overrides };
}

function run(code: HksInstruction[], constants: Method["constants"]) {
  const closure = new LuaClosure(
    prototype({ maxStackSize: 2, code, constants }),
    [],
    "TEST"
  );
  return new LuaState().call(closure);
}

// R0 := false, then a TEST-shaped conditional on R0 with C=0, JMP to a
// distinct branch on each side so the result tells which one ran.
function branchOnFalse(testOpcode: number): readonly LuaValue[] {
  return run(
    [
      instruction({ opcode: 13, a: 0, b: 0, c: 0 }), // LOADBOOL R0 = false
      instruction({ opcode: testOpcode, a: 0, b: 0, c: 0 }), // TEST(_R1) R0
      instruction({ opcode: 28, sbx: 2 }), // JMP -> pc5 (taken)
      instruction({ opcode: 25, a: 1, bx: 0 }), // LOADK R1 = K0 (fell through)
      instruction({ opcode: 28, sbx: 1 }), // JMP -> pc6
      instruction({ opcode: 25, a: 1, bx: 1 }), // LOADK R1 = K1 (branch taken)
      instruction({ opcode: 9, a: 1, b: 2 }), // RETURN R1
    ],
    [
      { kind: "string", value: "fell_through" },
      { kind: "string", value: "branched" },
    ]
  );
}

describe("TEST_R1 (op 71)", () => {
  it("branches on a false operand exactly like TEST", () => {
    // TEST (op 1): known-good reference behaviour.
    expect(branchOnFalse(1)).toEqual(["branched"]);
    // TEST_R1 (op 71): branches the same way.
    expect(branchOnFalse(71)).toEqual(["branched"]);
  });
});

describe("UNM (op 53)", () => {
  it("negates a number", () => {
    const result = run(
      [
        instruction({ opcode: 25, a: 0, bx: 0 }), // LOADK R0 = K0 (5)
        instruction({ opcode: 53, a: 1, b: 0 }), // UNM R1 = -R0
        instruction({ opcode: 9, a: 1, b: 2 }), // RETURN R1
      ],
      [{ kind: "number", value: 5 }]
    );
    expect(result).toEqual([-5]);
  });

  it("refuses a nil operand with hks's unary text", () => {
    expect(() =>
      run(
        [
          instruction({ opcode: 53, a: 0, b: 1 }), // UNM R0 = -R1, R1 is nil
          instruction({ opcode: 9, a: 0, b: 2 }), // RETURN R0
        ],
        []
      )
    ).toThrow("operator - is not supported for - nil");
  });
});
