// Shared types for the compiled host-Lua reader (the alpha's script tag class
// 80800B48; TU0 has no script tags).

export class LuaUndumpError extends Error {
  readonly offset: number;

  constructor(message: string, offset: number) {
    super(`${message} (at byte offset ${offset})`);
    this.name = "LuaUndumpError";
    this.offset = offset;
  }
}

// The 12-byte Lua 5.1 header plus hks's compatibility bits (0x07) and
// bytecode-sharing flag (0). See undump.ts.
export interface LuaHeader {
  bigEndian: boolean;
  formatVersion: number; // 0x0E here; vanilla Lua 5.1 writes 0x00
  luaVersion: number; // 0x51 = Lua 5.1
  numberIsFloat: boolean;
  sizeofInstruction: number;
  sizeofInt: number;
  sizeofNumber: number;
  sizeofSizeT: number;
}

// The 13-entry type-name table that follows the header. hks extension: types
// 9-12 (TIFUNCTION/TCFUNCTION/TUI64/TSTRUCT) don't exist in vanilla Lua 5.1.
export interface LuaTypeTable {
  names: ReadonlyMap<number, string>;
}

// The six legal constant types (hksc DumpConstants); lightuserdata and ui64
// never occur in the alpha chunks.
export type LuaConstant =
  | { kind: "nil" }
  | { kind: "boolean"; value: boolean }
  | { kind: "lightuserdata"; value: number }
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "ui64"; value: bigint };

export interface LuaStructSlot {
  name: string;
  position: number;
  reserved: number;
  structId: number;
  // hks type id of the slot (12 = TSTRUCT, then structId names the type)
  typeId: number;
}

// A structure prototype from the chunk's structures section (hksc ldump.c
// DumpProto / lundump.c LoadStructures). The corpus declares none.
export interface LuaStructPrototype {
  hasMeta: number;
  hasProxy: number;
  id: number;
  name: string;
  slots: readonly LuaStructSlot[];
}

// One decoded 32-bit instruction word. Field positions are hks's, not
// vanilla Lua 5.1's - see decodeInstruction in undump.ts.
export interface LuaInstruction {
  a: number;
  b: number;
  bx: number;
  c: number;
  opcode: number;
  raw: number;
  sbx: number;
}

export interface LuaLocalVariable {
  endPc: number;
  name: string;
  startPc: number;
}

// Every field is read from the chunk; nothing is inferred or defaulted.
export interface LuaPrototype {
  code: readonly LuaInstruction[];
  constants: readonly LuaConstant[];
  // first byte after this prototype (and all of its nested prototypes)
  endOffset: number;
  isVararg: number;
  lastLineDefined: number;
  lineDefined: number;
  lineInfo: readonly number[];
  locals: readonly LuaLocalVariable[];
  maxStackSize: number;
  // undefined (a NULL string, not an empty one) for every prototype but a
  // chunk's outermost one
  name: string | undefined;
  numParams: number;
  nups: number;
  // offset of this prototype's first byte (its nups field)
  offset: number;
  protos: readonly LuaPrototype[];
  // undefined (a NULL string, not an empty one) for every prototype but a
  // chunk's outermost one
  source: string | undefined;
  // hks's has-debug-info flag (hksc ldump.c:396-401): 1 = the debug block
  // follows, as in every alpha prototype.
  unknownAfterConstants: number;
  upvalues: readonly string[];
}

export interface LuaChunk {
  // bytes of `buffer` the chunk occupies, structures section included.
  chunkBytes: number;
  header: LuaHeader;
  root: LuaPrototype;
  // the structures section that trails the root prototype (hksc ldump.c
  // DumpStructures). Empty for every corpus chunk; absent means empty.
  structures?: readonly LuaStructPrototype[];
  tagId: string;
  totalBytes: number;
  typeTable: LuaTypeTable;
}
