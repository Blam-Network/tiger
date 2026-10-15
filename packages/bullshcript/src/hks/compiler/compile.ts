// Lua source -> compiled chunk in the dialect the hosts run.

import type { HksBytecode, LuaHeader, Method } from "../bytecode/proto.ts";
import {
  decodeInstruction,
  HEADER_BYTES,
  LUA_TYPE_NAMES,
  readBytecode,
} from "../bytecode/reader.ts";
import { dumpBytecode } from "../bytecode/writer.ts";
import type { CompiledProto } from "./codegen.ts";
import { Parser } from "./parser.ts";

export { LuaCompileError } from "./lexer.ts";

export interface LuaCompileOptions {
  // The chunk's source name, stored on its outermost prototype.
  readonly chunkName?: string;
  // Maps every line the compiler stamps to the one the debug info should carry
  // (hks's m_debugMap); identity when absent.
  readonly lineMap?: (luaLine: number) => number;
  // Tag id the returned HksBytecode carries (compileLuaChunk only). Default
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
): Method {
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
  const proto = new Parser(sourceBytes(source), chunkName).parseChunk();
  const root = toPrototype(
    proto,
    chunkName,
    MAIN_CHUNK_NAME,
    options.lineMap ?? identityLineMap
  );
  return dumpBytecode({
    header: HEADER,
    typeTable: { names: LUA_TYPE_NAMES },
    root,
    tagId: options.tagId ?? DEFAULT_TAG_ID,
    chunkBytes: 0,
    totalBytes: 0,
  });
}

// Compiles and reads the result back through the chunk reader, so the HksBytecode
// carries real offsets and is exactly what a dumped chunk would be.
export function compileLuaChunk(
  source: string | Uint8Array,
  options: LuaCompileOptions = {}
): HksBytecode {
  return readBytecode(
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
