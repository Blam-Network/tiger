import { describe, expect, it } from "vitest";
import {
  isTrailingWord,
  LUA_OPCODES,
  opcodeName,
  TRAILING_WORD_OPCODE,
  trailingWordCount,
  walkInstructions,
} from "../../src/hks/opcodes.ts";
import type { LuaPrototype } from "../../src/hks/types.ts";
import { decodeInstruction } from "../../src/hks/undump.ts";

function prototype(overrides: Partial<LuaPrototype> = {}): LuaPrototype {
  return {
    offset: 0,
    endOffset: 0,
    nups: 0,
    numParams: 0,
    isVararg: 0,
    maxStackSize: 8,
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

describe("opcode table", () => {
  it("keys every row by its own opcode number", () => {
    for (const [opcode, entry] of LUA_OPCODES) {
      expect(entry.opcode).toBe(opcode);
    }
  });

  it("names unmapped opcodes op_NN", () => {
    expect(opcodeName(2)).toBe("CALL");
    expect(opcodeName(3)).toBe("op_03");
    expect(opcodeName(73)).toBe("GETFIELD_R1");
  });

  it("resolves CLOSURE's trailing word count from the closed prototype", () => {
    const parent = prototype({
      protos: [prototype({ nups: 3 })],
    });
    // CLOSURE A=0 Bx=0
    expect(trailingWordCount(decodeInstruction(0x84_00_00_00), parent)).toBe(3);
    // GETFIELD always takes two, GETGLOBAL one, CALL none
    expect(trailingWordCount(decodeInstruction(0x00_00_03_03), parent)).toBe(2);
    expect(trailingWordCount(decodeInstruction(0xb6_00_04_01), parent)).toBe(1);
    expect(trailingWordCount(decodeInstruction(0x04_04_01_01), parent)).toBe(0);
  });

  it("walks past trailing argument words", () => {
    // GETGLOBAL / cache word / CLOSURE / capture word / RETURN
    const proto = prototype({
      code: [
        0xb6_00_04_01, 0x98_00_05_14, 0x84_00_00_04, 0x98_00_01_01,
        0x12_02_00_00,
      ].map(decodeInstruction),
      protos: [prototype({ nups: 1 })],
    });
    const walked = [...walkInstructions(proto)];
    expect(walked.map((step) => step.pc)).toEqual([0, 2, 4]);
    expect(walked.map((step) => opcodeName(step.instruction.opcode))).toEqual([
      "GETGLOBAL",
      "CLOSURE",
      "RETURN",
    ]);
    expect(walked[0].trailing).toHaveLength(1);
    expect(walked[1].trailing).toHaveLength(1);
    expect(walked[2].trailing).toHaveLength(0);
  });

  it("treats opcode 76 as the trailing argument word", () => {
    expect(TRAILING_WORD_OPCODE).toBe(76);
    expect(isTrailingWord(76)).toBe(true);
    expect(isTrailingWord(66)).toBe(false);
  });
});
