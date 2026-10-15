import { describe, expect, it } from "vitest";
import type { LuaConstant } from "../../src/hks/bytecode/proto.ts";
import { BytecodeError } from "../../src/hks/bytecode/proto.ts";
import {
  BytecodeReader,
  decodeInstruction,
  encodeInstruction,
  LUA_TYPE_NAMES,
  parseHeader,
  parseTypeTable,
  readBytecode,
  readConstants,
  walkProtos,
} from "../../src/hks/bytecode/reader.ts";
import { dumpBytecode } from "../../src/hks/bytecode/writer.ts";

const HEADER = [
  0x1b, 0x4c, 0x75, 0x61, 0x51, 0x0e, 0x00, 0x04, 0x04, 0x04, 0x04, 0x00, 0x07,
  0x00,
];

function u32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

function luaString(value: string | undefined): number[] {
  if (value === undefined) {
    return u32(0);
  }
  const bytes = [...Buffer.from(value, "latin1"), 0];
  return [...u32(bytes.length), ...bytes];
}

function typeTable(): number[] {
  const bytes: number[] = [...u32(LUA_TYPE_NAMES.size)];
  for (const [id, name] of [...LUA_TYPE_NAMES.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    bytes.push(...u32(id), ...luaString(name));
  }
  return bytes;
}

function encodeConstant(constant: LuaConstant): number[] {
  switch (constant.kind) {
    case "nil":
      return [0];
    case "boolean":
      return [1, constant.value ? 1 : 0];
    case "lightuserdata":
      return [2, ...u32(constant.value)];
    case "number": {
      const buffer = Buffer.alloc(5);
      buffer.writeUInt8(3, 0);
      buffer.writeFloatBE(constant.value, 1);
      return [...buffer];
    }
    case "string":
      return [4, ...luaString(constant.value)];
    case "ui64": {
      const buffer = Buffer.alloc(9);
      buffer.writeUInt8(11, 0);
      buffer.writeBigUInt64BE(constant.value, 1);
      return [...buffer];
    }
    default:
      throw new Error("unreachable");
  }
}

// The empty structures section every corpus chunk ends with: version 1 and
// a NULL name.
const EMPTY_STRUCTURES = [...u32(1), ...u32(0)];

function prototype(options: {
  at: number;
  code?: number[];
  constants?: LuaConstant[];
  lineInfo?: number[];
  locals?: { name: string; startPc: number; endPc: number }[];
  name?: string;
  nups?: number;
  protos?: ((at: number) => number[])[];
  source?: string;
  upvalues?: string[];
}): number[] {
  const code = options.code ?? [];
  const upvalues = options.upvalues ?? [];
  const locals = options.locals ?? [];
  const bytes: number[] = [
    ...u32(upvalues.length),
    ...u32(0), // numparams
    0, // is_vararg
    ...u32(2), // maxstacksize
    ...u32(code.length),
  ];
  while ((options.at + bytes.length) % 4 !== 0) {
    bytes.push(0x5f);
  }
  for (const word of code) {
    bytes.push(...u32(word));
  }
  const constants = options.constants ?? [];
  bytes.push(...u32(constants.length));
  for (const constant of constants) {
    bytes.push(...encodeConstant(constant));
  }
  bytes.push(...u32(1)); // the always-1 word; true name unknown
  bytes.push(
    ...u32(code.length), // sizelineinfo, must equal sizecode
    ...u32(locals.length),
    ...u32(upvalues.length),
    ...u32(0), // linedefined
    ...u32(0), // lastlinedefined
    ...luaString(options.source),
    ...luaString(options.name)
  );
  for (const line of options.lineInfo ?? code.map(() => 1)) {
    bytes.push(...u32(line));
  }
  for (const local of locals) {
    bytes.push(
      ...luaString(local.name),
      ...u32(local.startPc),
      ...u32(local.endPc)
    );
  }
  for (const upvalue of upvalues) {
    bytes.push(...luaString(upvalue));
  }
  const protos = options.protos ?? [];
  bytes.push(...u32(protos.length));
  for (const child of protos) {
    bytes.push(...child(options.at + bytes.length));
  }
  return bytes;
}

function buildChunk(
  root: (at: number) => number[],
  structures: number[] = EMPTY_STRUCTURES
): Uint8Array {
  const prefix = [...HEADER, ...typeTable()];
  return Uint8Array.from([...prefix, ...root(prefix.length), ...structures]);
}

describe("parseHeader", () => {
  it("reads the measured 12-byte header", () => {
    const reader = new BytecodeReader(Uint8Array.from(HEADER));
    const header = parseHeader(reader);
    expect(header).toEqual({
      luaVersion: 0x51,
      formatVersion: 0x0e,
      bigEndian: true,
      sizeofInt: 4,
      sizeofSizeT: 4,
      sizeofInstruction: 4,
      sizeofNumber: 4,
      numberIsFloat: true,
    });
    expect(reader.position).toBe(14);
  });

  it("throws naming the offset of the first mismatched byte", () => {
    const bad = [...HEADER];
    bad[5] = 0x00; // vanilla format byte instead of Bungie's 0x0e
    const reader = new BytecodeReader(Uint8Array.from(bad));
    expect.assertions(1);
    try {
      parseHeader(reader);
    } catch (error) {
      expect((error as BytecodeError).offset).toBe(5);
    }
  });
});

describe("parseTypeTable", () => {
  it("reads the 13-entry table with its leading count", () => {
    const reader = new BytecodeReader(Uint8Array.from(typeTable()));
    const table = parseTypeTable(reader);
    expect(table.names.size).toBe(13);
    expect(table.names.get(4)).toBe("TSTRING");
    expect(table.names.get(12)).toBe("TSTRUCT");
  });

  it("rejects an implausible entry count", () => {
    const reader = new BytecodeReader(Uint8Array.from(u32(9999)));
    expect(() => parseTypeTable(reader)).toThrow(BytecodeError);
  });
});

describe("readConstants", () => {
  it("round-trips nil, boolean, number, and string constants", () => {
    const constants: LuaConstant[] = [
      { kind: "nil" },
      { kind: "boolean", value: true },
      { kind: "number", value: 4 },
      { kind: "string", value: "sleep_until" },
      // a length-1 string: a real empty string, not a NULL one
      { kind: "string", value: "" },
    ];
    const bytes = [
      ...u32(constants.length),
      ...constants.flatMap((c) => encodeConstant(c)),
    ];
    const reader = new BytecodeReader(Uint8Array.from(bytes));
    expect(readConstants(reader)).toEqual(constants);
    expect(reader.position).toBe(bytes.length);
  });

  it("round-trips lightuserdata and ui64 constants", () => {
    const constants: LuaConstant[] = [
      { kind: "lightuserdata", value: 0xde_ad_be_ef },
      { kind: "ui64", value: 0x01_23_45_67_89_ab_cd_efn },
    ];
    const bytes = [
      ...u32(constants.length),
      ...constants.flatMap((c) => encodeConstant(c)),
    ];
    const reader = new BytecodeReader(Uint8Array.from(bytes));
    expect(readConstants(reader)).toEqual(constants);
    expect(reader.position).toBe(bytes.length);
  });

  it("throws on a type that is not a legal constant", () => {
    const bytes = [...u32(1), 9]; // TIFUNCTION
    const reader = new BytecodeReader(Uint8Array.from(bytes));
    expect(() => readConstants(reader)).toThrow(
      /TIFUNCTION.*not a legal constant type/
    );
  });
});

describe("decodeInstruction", () => {
  // opcode(7) B(8) C(9) A(8), MSB first.
  it("splits a word the way the alpha packs it", () => {
    // 04040101: CALL A=1 B=2 C=1, from 8210002C's print("this sucks")
    const call = decodeInstruction(0x04_04_01_01);
    expect(call).toMatchObject({ opcode: 2, a: 1, b: 2, c: 1 });
    // 12020000: the RETURN 0 1 that terminates every prototype
    const ret = decodeInstruction(0x12_02_00_00);
    expect(ret).toMatchObject({ opcode: 9, a: 0, b: 1, c: 0 });
    // 32000002: LOADK A=2 Bx=0
    expect(decodeInstruction(0x32_00_00_02)).toMatchObject({
      opcode: 25,
      a: 2,
      bx: 0,
    });
  });

  it("biases sBx by 0xFFFF", () => {
    expect(decodeInstruction(0x38_ff_ff_00).sbx).toBe(0);
  });

  it("re-encodes to the same word", () => {
    for (const word of [0x04_04_01_01, 0x12_02_00_00, 0x84_00_01_03]) {
      expect(encodeInstruction(decodeInstruction(word))).toBe(word);
    }
  });
});

describe("readBytecode", () => {
  it("reads a prototype's scalar header, code, constants and debug block", () => {
    const chunk = buildChunk((at) =>
      prototype({
        at,
        source: "@bs\\weapons\\weapon_types.bs",
        name: "(main chunk)",
        code: [0x32_00_00_02, 0x12_02_00_00],
        constants: [{ kind: "string", value: "decl_name" }],
        lineInfo: [14, 15],
        locals: [{ name: "_M", startPc: 1, endPc: 2 }],
      })
    );
    const parsed = readBytecode(chunk, "TEST0001");
    expect(parsed.chunkBytes).toBe(chunk.length);
    expect(parsed.root.source).toBe("@bs\\weapons\\weapon_types.bs");
    expect(parsed.root.name).toBe("(main chunk)");
    expect(parsed.root.code).toHaveLength(2);
    expect(parsed.root.code[1]).toMatchObject({ opcode: 9, b: 1 });
    expect(parsed.root.lineInfo).toEqual([14, 15]);
    expect(parsed.root.locals).toEqual([{ name: "_M", startPc: 1, endPc: 2 }]);
    expect(parsed.root.protos).toHaveLength(0);
  });

  it("walks nested prototypes, which trail their parent's debug block", () => {
    const chunk = buildChunk((at) =>
      prototype({
        at,
        source: "@x.bs",
        name: "(main chunk)",
        code: [0x84_00_00_04, 0x12_02_00_00],
        protos: [
          (childAt) =>
            prototype({
              at: childAt,
              code: [0x12_02_00_00],
              constants: [{ kind: "string", value: "this sucks" }],
              upvalues: ["print"],
            }),
        ],
      })
    );
    const parsed = readBytecode(chunk, "TEST0002");
    expect(parsed.chunkBytes).toBe(chunk.length);
    expect([...walkProtos(parsed.root)]).toHaveLength(2);
    const child = parsed.root.protos[0];
    expect(child.upvalues).toEqual(["print"]);
    expect(child.nups).toBe(1);
    expect(child.source).toBeUndefined();
  });

  it("re-encodes byte-for-byte", () => {
    const chunk = buildChunk((at) =>
      prototype({
        at,
        source: "@x.bs",
        name: "(main chunk)",
        code: [0x32_00_00_02, 0x12_02_00_00],
        constants: [
          { kind: "string", value: "" },
          { kind: "number", value: 0.5 },
          { kind: "nil" },
          { kind: "lightuserdata", value: 16 },
          { kind: "ui64", value: 1n << 40n },
        ],
      })
    );
    const parsed = readBytecode(chunk, "TEST0003");
    expect(parsed.structures).toEqual([]);
    expect(dumpBytecode(parsed)).toEqual(chunk);
  });

  it("reads the structures section and re-encodes it", () => {
    // hksc DumpProto: name, id, hasmeta, hasproxy, nslots, then per slot
    // name, structid, typeid, reserved, position
    const section = [
      ...u32(1),
      ...luaString("vec2"),
      ...u32(7),
      ...u32(0),
      ...u32(1),
      ...u32(2),
      ...luaString("x"),
      ...u32(0xff_ff),
      ...u32(3),
      ...u32(0),
      ...u32(0),
      ...luaString("next"),
      ...u32(7),
      ...u32(12),
      ...u32(0),
      ...u32(1),
      ...u32(0),
    ];
    const chunk = buildChunk(
      (at) => prototype({ at, code: [0x12_02_00_00] }),
      section
    );
    const parsed = readBytecode(chunk, "TEST0005");
    expect(parsed.chunkBytes).toBe(chunk.length);
    expect(parsed.structures).toEqual([
      {
        name: "vec2",
        id: 7,
        hasMeta: 0,
        hasProxy: 1,
        slots: [
          { name: "x", structId: 0xff_ff, typeId: 3, reserved: 0, position: 0 },
          { name: "next", structId: 7, typeId: 12, reserved: 0, position: 1 },
        ],
      },
    ]);
    expect(dumpBytecode(parsed)).toEqual(chunk);
  });

  it("rejects a structures section of another version", () => {
    const chunk = buildChunk(
      (at) => prototype({ at, code: [0x12_02_00_00] }),
      [...u32(2), ...u32(0)]
    );
    expect(() => readBytecode(chunk, "TEST0006")).toThrow(
      /Header mismatch when loading prototype declarations/
    );
  });

  it("refuses a chunk with no structures section", () => {
    const chunk = buildChunk(
      (at) => prototype({ at, code: [0x12_02_00_00] }),
      []
    );
    expect(() => readBytecode(chunk, "TEST0007")).toThrow(BytecodeError);
  });

  it("throws with a byte offset when sizelineinfo contradicts sizecode", () => {
    const chunk = buildChunk((at) =>
      prototype({ at, code: [0x12_02_00_00], lineInfo: [1] })
    );
    // corrupt the sizelineinfo u32 (the word after the always-1 word)
    const bad = Uint8Array.from(chunk);
    const marker = bad.indexOf(0x12); // start of the single instruction
    bad[marker + 4 + 4 + 4 + 3] = 9; // sizelineinfo low byte
    expect.assertions(2);
    try {
      readBytecode(bad, "TEST0004");
    } catch (error) {
      expect(error).toBeInstanceOf(BytecodeError);
      expect((error as BytecodeError).offset).toBeGreaterThan(0);
    }
  });
});
