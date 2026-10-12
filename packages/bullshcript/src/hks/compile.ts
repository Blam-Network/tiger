// Lua source -> compiled chunk in the dialect the hosts run.

import type { CompiledProto } from "./compiler/code.ts";
import { LuaParser } from "./compiler/parser.ts";
import { encodeLuaChunk } from "./encode.ts";
import type { LuaChunk, LuaHeader, LuaPrototype } from "./types.ts";
import {
  decodeInstruction,
  HEADER_BYTES,
  LUA_TYPE_NAMES,
  parseLuaChunk,
} from "./undump.ts";

export { LuaCompileError } from "./compiler/lexer.ts";

export interface LuaCompileOptions {
  // The chunk's source name, stored on its outermost prototype.
  readonly chunkName?: string;
  // Maps every line the compiler stamps to the one the debug info should carry
  // (hks's m_debugMap); identity when absent.
  readonly lineMap?: (luaLine: number) => number;
  // Tag id the returned LuaChunk carries (compileLuaChunk only). Default
  // "COMPILED".
  readonly tagId?: string;
}

// The outermost prototype's name in every corpus chunk.
const MAIN_CHUNK_NAME = "(main chunk)";
const DEFAULT_CHUNK_NAME = "=(compiled)";
const DEFAULT_TAG_ID = "COMPILED";
// the u32 after every prototype's constants: hks's has-debug-info flag
const UNKNOWN_AFTER_CONSTANTS = 1;

const HEADER: LuaHeader = {
  luaVersion: HEADER_BYTES[4],
  formatVersion: HEADER_BYTES[5],
  bigEndian: HEADER_BYTES[6] === 0,
  sizeofInt: HEADER_BYTES[7],
  sizeofSizeT: HEADER_BYTES[8],
  sizeofInstruction: HEADER_BYTES[9],
  sizeofNumber: HEADER_BYTES[10],
  numberIsFloat: HEADER_BYTES[11] === 0,
};

// Source as the lexer reads it: one char per byte.
export function sourceBytes(source: string | Uint8Array): string {
  return typeof source === "string"
    ? Buffer.from(source, "utf8").toString("latin1")
    : Buffer.from(source).toString("latin1");
}

type LineMap = (luaLine: number) => number;

const identityLineMap: LineMap = (line) => line;

function toPrototype(
  proto: CompiledProto,
  source: string | undefined,
  name: string | undefined,
  lineMap: LineMap
): LuaPrototype {
  return {
    offset: 0,
    endOffset: 0,
    nups: proto.upvalueNames.length,
    numParams: proto.numParams,
    isVararg: proto.isVararg,
    maxStackSize: proto.maxStackSize,
    code: proto.code.map((i) =>
      decodeInstruction(((i.op << 25) | (i.b << 17) | (i.c << 8) | i.a) >>> 0)
    ),
    constants: proto.constants,
    unknownAfterConstants: UNKNOWN_AFTER_CONSTANTS,
    lineDefined: lineMap(proto.lineDefined),
    lastLineDefined: lineMap(proto.lastLineDefined),
    source,
    name,
    lineInfo: proto.lineInfo.map(lineMap),
    locals: proto.locVars.map((v) => ({
      name: v.name,
      startPc: v.startPc,
      endPc: v.endPc,
    })),
    upvalues: proto.upvalueNames,
    protos: proto.protos.map((child) =>
      toPrototype(child, undefined, undefined, lineMap)
    ),
  };
}

// Throws LuaCompileError (chunk name and line in the message) on a syntax error.
export function compileLua(
  source: string | Uint8Array,
  options: LuaCompileOptions = {}
): Uint8Array {
  const chunkName = options.chunkName ?? DEFAULT_CHUNK_NAME;
  const proto = new LuaParser(sourceBytes(source), chunkName).parseChunk();
  const root = toPrototype(
    proto,
    chunkName,
    MAIN_CHUNK_NAME,
    options.lineMap ?? identityLineMap
  );
  return encodeLuaChunk({
    header: HEADER,
    typeTable: { names: LUA_TYPE_NAMES },
    root,
    tagId: options.tagId ?? DEFAULT_TAG_ID,
    chunkBytes: 0,
    totalBytes: 0,
  });
}

// Compiles and reads the result back through the chunk reader, so the LuaChunk
// carries real offsets and is exactly what a dumped chunk would be.
export function compileLuaChunk(
  source: string | Uint8Array,
  options: LuaCompileOptions = {}
): LuaChunk {
  return parseLuaChunk(
    compileLua(source, options),
    options.tagId ?? DEFAULT_TAG_ID
  );
}

export function compile(
  source: string,
  options: { readonly chunkName: string; readonly lineMap?: LineMap }
): Buffer {
  return Buffer.from(
    compileLua(source, {
      chunkName: options.chunkName,
      lineMap: options.lineMap,
    })
  );
}
