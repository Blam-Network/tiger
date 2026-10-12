// Reader for compiled host Lua chunks (tag class 80800B48), hks dump format 14:
// Lua 5.1's lundump.c with hks's header bytes, type table, float32 numbers,
// widened Proto fields, aligned code and a structures section (`00000001 00000000`).

import {
  type LuaChunk,
  type LuaConstant,
  type LuaHeader,
  type LuaInstruction,
  type LuaLocalVariable,
  type LuaPrototype,
  type LuaStructPrototype,
  type LuaStructSlot,
  type LuaTypeTable,
  LuaUndumpError,
} from "./types.ts";

export const HEADER_BYTES = Uint8Array.from([
  0x1b, 0x4c, 0x75, 0x61, 0x51, 0x0e, 0x00, 0x04, 0x04, 0x04, 0x04, 0x00,
  // hks compatibility bits and bytecode-sharing flag - see module doc comment
  0x07, 0x00,
]);

export const STRUCTURES_VERSION = 1;

// Filler between a prototype's sizecode field and its 4-byte-aligned code
// array. Always 0x5F in the corpus; asserted, not assumed.
export const CODE_ALIGNMENT_PAD_BYTE = 0x5f;

// For reference and tests; the parser reads the table from the chunk.
export const LUA_TYPE_NAMES: ReadonlyMap<number, string> = new Map([
  [0, "TNIL"],
  [1, "TBOOLEAN"],
  [2, "TLIGHTUSERDATA"],
  [3, "TNUMBER"],
  [4, "TSTRING"],
  [5, "TTABLE"],
  [6, "TFUNCTION"],
  [7, "TUSERDATA"],
  [8, "TTHREAD"],
  [9, "TIFUNCTION"],
  [10, "TCFUNCTION"],
  [11, "TUI64"],
  [12, "TSTRUCT"],
]);

const CONSTANT_TAG_NIL = 0;
const CONSTANT_TAG_BOOLEAN = 1;
const CONSTANT_TAG_LIGHTUSERDATA = 2;
const CONSTANT_TAG_NUMBER = 3;
const CONSTANT_TAG_STRING = 4;
const CONSTANT_TAG_UI64 = 11;

// No other type-table id is a legal constant type.
const CONSTANT_TAGS = new Set([
  CONSTANT_TAG_NIL,
  CONSTANT_TAG_BOOLEAN,
  CONSTANT_TAG_LIGHTUSERDATA,
  CONSTANT_TAG_NUMBER,
  CONSTANT_TAG_STRING,
  CONSTANT_TAG_UI64,
]);

// Sanity ceilings, set well clear of the largest alpha chunk so a real
// outlier parses but a misalignment fails fast with a byte offset.
const MAX_PLAUSIBLE_CODE = 1 << 20;
const MAX_PLAUSIBLE_CONSTANTS = 1 << 16;
const MAX_PLAUSIBLE_PROTOS = 1 << 12;
const MAX_PLAUSIBLE_LOCALS = 1 << 16;
const MAX_PLAUSIBLE_UPVALUES = 1 << 8;
const MAX_PLAUSIBLE_STRING = 1 << 20;

// A cursor over a chunk buffer. Every read is bounds-checked and throws
// LuaUndumpError with the offset it failed at.
export class ByteReader {
  readonly buffer: Uint8Array;
  readonly view: DataView;
  position: number;

  constructor(buffer: Uint8Array, position = 0) {
    this.buffer = buffer;
    this.view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength
    );
    this.position = position;
  }

  remaining(): number {
    return this.buffer.length - this.position;
  }

  private requireBytes(count: number): void {
    if (this.remaining() < count) {
      throw new LuaUndumpError(
        `unexpected end of buffer: need ${count} byte(s), have ${this.remaining()}`,
        this.position
      );
    }
  }

  readU8(): number {
    this.requireBytes(1);
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  readU32(): number {
    this.requireBytes(4);
    const value = this.view.getUint32(this.position, false);
    this.position += 4;
    return value;
  }

  readF32(): number {
    this.requireBytes(4);
    const value = this.view.getFloat32(this.position, false);
    this.position += 4;
    return value;
  }

  readU64(): bigint {
    this.requireBytes(8);
    const value = this.view.getBigUint64(this.position, false);
    this.position += 8;
    return value;
  }

  readBytes(count: number): Uint8Array {
    this.requireBytes(count);
    const bytes = this.buffer.subarray(this.position, this.position + count);
    this.position += count;
    return bytes;
  }

  // Reads a u32 count, rejecting anything past `limit` with a message that
  // names the field - a wrong count is how a misparse always shows up.
  readCount(field: string, limit: number): number {
    const offset = this.position;
    const value = this.readU32();
    if (value > limit) {
      throw new LuaUndumpError(`implausible ${field} ${value}`, offset);
    }
    return value;
  }

  // Vanilla string encoding: u32 length including the NUL, then the bytes.
  // Length 0 is NULL and distinct from length 1 (empty); both occur.
  readLuaString(): string | undefined {
    const startOffset = this.position;
    const length = this.readCount("string length", MAX_PLAUSIBLE_STRING);
    if (length === 0) {
      return;
    }
    const bytes = this.readBytes(length);
    if (bytes.at(-1) !== 0) {
      throw new LuaUndumpError(
        `string of length ${length} is not NUL-terminated`,
        startOffset
      );
    }
    return Buffer.from(bytes.subarray(0, -1)).toString("latin1");
  }

  // A NULL where a string is required means the parse went wrong.
  readRequiredLuaString(field: string): string {
    const offset = this.position;
    const value = this.readLuaString();
    if (value === undefined) {
      throw new LuaUndumpError(`${field} is a NULL string`, offset);
    }
    return value;
  }
}

export function parseHeader(reader: ByteReader): LuaHeader {
  const startOffset = reader.position;
  const bytes = reader.readBytes(HEADER_BYTES.length);
  for (let i = 0; i < HEADER_BYTES.length; i++) {
    if (bytes[i] !== HEADER_BYTES[i]) {
      throw new LuaUndumpError(
        `header byte ${i} is 0x${bytes[i].toString(16)}, expected 0x${HEADER_BYTES[i].toString(16)}`,
        startOffset + i
      );
    }
  }
  return {
    luaVersion: bytes[4],
    formatVersion: bytes[5],
    bigEndian: bytes[6] === 0,
    sizeofInt: bytes[7],
    sizeofSizeT: bytes[8],
    sizeofInstruction: bytes[9],
    sizeofNumber: bytes[10],
    numberIsFloat: bytes[11] === 0,
  };
}

export function parseTypeTable(reader: ByteReader): LuaTypeTable {
  const count = reader.readCount("type-table entry count", 64);
  if (count === 0) {
    throw new LuaUndumpError("empty type table", reader.position - 4);
  }
  const names = new Map<number, string>();
  for (let i = 0; i < count; i++) {
    const entryOffset = reader.position;
    const id = reader.readU32();
    const name = reader.readRequiredLuaString("type name");
    if (names.has(id)) {
      throw new LuaUndumpError(
        `duplicate type-table id ${id} ("${name}")`,
        entryOffset
      );
    }
    names.set(id, name);
  }
  return { names };
}

function readConstant(reader: ByteReader): LuaConstant {
  const tagOffset = reader.position;
  const tag = reader.readU8();
  switch (tag) {
    case CONSTANT_TAG_NIL:
      return { kind: "nil" };
    case CONSTANT_TAG_BOOLEAN:
      return { kind: "boolean", value: reader.readU8() !== 0 };
    case CONSTANT_TAG_LIGHTUSERDATA:
      return { kind: "lightuserdata", value: reader.readU32() };
    case CONSTANT_TAG_NUMBER:
      return { kind: "number", value: reader.readF32() };
    case CONSTANT_TAG_STRING:
      return {
        kind: "string",
        value: reader.readRequiredLuaString("constant"),
      };
    case CONSTANT_TAG_UI64:
      return { kind: "ui64", value: reader.readU64() };
    default:
      throw new LuaUndumpError(
        LUA_TYPE_NAMES.has(tag) && !CONSTANT_TAGS.has(tag)
          ? `constant tag ${tag} (${LUA_TYPE_NAMES.get(tag)}) is a type-table id but not a legal constant type`
          : `unknown constant tag ${tag}`,
        tagOffset
      );
  }
}

// The structures section after the root prototype (hksc lundump.c
// LoadStructures): version word, then structure prototypes until a NULL name.
function parseStructures(reader: ByteReader): LuaStructPrototype[] {
  const versionOffset = reader.position;
  const version = reader.readU32();
  if (version !== STRUCTURES_VERSION) {
    throw new LuaUndumpError(
      `Header mismatch when loading prototype declarations (version ${version})`,
      versionOffset
    );
  }
  const structures: LuaStructPrototype[] = [];
  for (;;) {
    const name = reader.readLuaString();
    if (name === undefined) {
      return structures;
    }
    const id = reader.readU32();
    const hasMeta = reader.readU32();
    const hasProxy = reader.readU32();
    const slotCount = reader.readCount("struct slot count", 0xff);
    const slots: LuaStructSlot[] = [];
    for (let i = 0; i < slotCount; i++) {
      slots.push({
        name: reader.readRequiredLuaString("struct slot name"),
        structId: reader.readU32(),
        typeId: reader.readU32(),
        reserved: reader.readU32(),
        position: reader.readU32(),
      });
    }
    structures.push({ name, id, hasMeta, hasProxy, slots });
  }
}

export function parseConstantPool(reader: ByteReader): LuaConstant[] {
  const count = reader.readCount("constant count", MAX_PLAUSIBLE_CONSTANTS);
  const constants: LuaConstant[] = [];
  for (let i = 0; i < count; i++) {
    constants.push(readConstant(reader));
  }
  return constants;
}

// Instruction word, MSB-first: opcode(7) B(8) C(9) A(8).
const INSTRUCTION_SBX_BIAS = 0xffff;

export function decodeInstruction(raw: number): LuaInstruction {
  const bx = (raw >>> 8) & 0x1_ffff;
  return {
    raw: raw >>> 0,
    opcode: raw >>> 25,
    b: (raw >>> 17) & 0xff,
    c: (raw >>> 8) & 0x1ff,
    a: raw & 0xff,
    bx,
    sbx: bx - INSTRUCTION_SBX_BIAS,
  };
}

export function encodeInstruction(instruction: LuaInstruction): number {
  return (
    ((instruction.opcode << 25) |
      (instruction.b << 17) |
      (instruction.c << 8) |
      instruction.a) >>>
    0
  );
}

function parsePrototype(reader: ByteReader): LuaPrototype {
  const offset = reader.position;
  const nups = reader.readCount("nups", MAX_PLAUSIBLE_UPVALUES);
  const numParams = reader.readCount("numparams", MAX_PLAUSIBLE_UPVALUES);
  const isVararg = reader.readU8();
  const maxStackSize = reader.readCount("maxstacksize", 0xff);
  const sizeCode = reader.readCount("sizecode", MAX_PLAUSIBLE_CODE);

  // The code array is 4-byte aligned relative to the chunk's first byte.
  while (reader.position % 4 !== 0) {
    const padOffset = reader.position;
    const pad = reader.readU8();
    if (pad !== CODE_ALIGNMENT_PAD_BYTE) {
      throw new LuaUndumpError(
        `code alignment pad byte is 0x${pad.toString(16)}, expected 0x5f`,
        padOffset
      );
    }
  }
  const code: LuaInstruction[] = [];
  for (let i = 0; i < sizeCode; i++) {
    code.push(decodeInstruction(reader.readU32()));
  }

  const constants = parseConstantPool(reader);
  // hks's has-debug-info flag; the corpus is never stripped, and the
  // debug block below is read unconditionally
  const unknownAfterConstants = reader.readU32();

  const sizeLineInfo = reader.readCount("sizelineinfo", MAX_PLAUSIBLE_CODE);
  if (sizeLineInfo !== sizeCode) {
    throw new LuaUndumpError(
      `sizelineinfo ${sizeLineInfo} does not match sizecode ${sizeCode}`,
      reader.position - 4
    );
  }
  const sizeLocals = reader.readCount("sizelocvars", MAX_PLAUSIBLE_LOCALS);
  const sizeUpvalues = reader.readCount("sizeupvalues", MAX_PLAUSIBLE_UPVALUES);
  if (sizeUpvalues !== nups) {
    throw new LuaUndumpError(
      `sizeupvalues ${sizeUpvalues} does not match nups ${nups}`,
      reader.position - 4
    );
  }
  const lineDefined = reader.readU32();
  const lastLineDefined = reader.readU32();
  const source = reader.readLuaString();
  const name = reader.readLuaString();

  const lineInfo: number[] = [];
  for (let i = 0; i < sizeLineInfo; i++) {
    lineInfo.push(reader.readU32());
  }
  const locals: LuaLocalVariable[] = [];
  for (let i = 0; i < sizeLocals; i++) {
    locals.push({
      name: reader.readRequiredLuaString("local name"),
      startPc: reader.readU32(),
      endPc: reader.readU32(),
    });
  }
  const upvalues: string[] = [];
  for (let i = 0; i < sizeUpvalues; i++) {
    upvalues.push(reader.readRequiredLuaString("upvalue name"));
  }

  // sizep is last, so a prototype's children trail its own debug block.
  const sizeProtos = reader.readCount("sizep", MAX_PLAUSIBLE_PROTOS);
  const protos: LuaPrototype[] = [];
  for (let i = 0; i < sizeProtos; i++) {
    protos.push(parsePrototype(reader));
  }

  return {
    offset,
    endOffset: reader.position,
    nups,
    numParams,
    isVararg,
    maxStackSize,
    code,
    constants,
    unknownAfterConstants,
    lineDefined,
    lastLineDefined,
    source,
    name,
    lineInfo,
    locals,
    upvalues,
    protos,
  };
}

export function parseLuaChunk(buffer: Uint8Array, tagId: string): LuaChunk {
  const reader = new ByteReader(buffer);
  const header = parseHeader(reader);
  const typeTable = parseTypeTable(reader);
  const root = parsePrototype(reader);
  const structures = parseStructures(reader);
  return {
    tagId,
    totalBytes: buffer.length,
    chunkBytes: reader.position,
    header,
    typeTable,
    root,
    structures,
  };
}

// Depth-first walk over a chunk's prototypes, outermost first.
export function* walkPrototypes(
  prototype: LuaPrototype
): Generator<LuaPrototype> {
  yield prototype;
  for (const child of prototype.protos) {
    yield* walkPrototypes(child);
  }
}
