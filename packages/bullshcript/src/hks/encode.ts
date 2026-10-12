// Re-serialiser for compiled host Lua chunks.

import {
  type LuaChunk,
  type LuaConstant,
  type LuaPrototype,
  type LuaStructPrototype,
  LuaUndumpError,
} from "./types.ts";
import {
  CODE_ALIGNMENT_PAD_BYTE,
  encodeInstruction,
  HEADER_BYTES,
  STRUCTURES_VERSION,
} from "./undump.ts";

class ByteWriter {
  private readonly parts: number[] = [];

  get length(): number {
    return this.parts.length;
  }

  u8(value: number): void {
    this.parts.push(value & 0xff);
  }

  u32(value: number): void {
    this.parts.push(
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff
    );
  }

  f32(value: number): void {
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(value, 0);
    this.parts.push(...buffer);
  }

  u64(value: bigint): void {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(value, 0);
    this.parts.push(...buffer);
  }

  bytes(value: Uint8Array): void {
    this.parts.push(...value);
  }

  // u32 length including the trailing NUL, then the bytes. undefined is
  // vanilla's NULL string: length 0 and no bytes.
  luaString(value: string | undefined): void {
    if (value === undefined) {
      this.u32(0);
      return;
    }
    const bytes = Buffer.from(value, "latin1");
    this.u32(bytes.length + 1);
    this.parts.push(...bytes, 0);
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.parts);
  }
}

function writeConstant(writer: ByteWriter, constant: LuaConstant): void {
  switch (constant.kind) {
    case "nil":
      writer.u8(0);
      break;
    case "boolean":
      writer.u8(1);
      writer.u8(constant.value ? 1 : 0);
      break;
    case "lightuserdata":
      writer.u8(2);
      writer.u32(constant.value);
      break;
    case "number":
      writer.u8(3);
      writer.f32(constant.value);
      break;
    case "string":
      writer.u8(4);
      writer.luaString(constant.value);
      break;
    case "ui64":
      writer.u8(11);
      writer.u64(constant.value);
      break;
    default: {
      const unhandled: never = constant;
      throw new LuaUndumpError(
        `constant kind ${JSON.stringify(unhandled)} has no encoding`,
        writer.length
      );
    }
  }
}

// hksc DumpStructures: version, each prototype, NULL-name terminator.
function writeStructures(
  writer: ByteWriter,
  structures: readonly LuaStructPrototype[]
): void {
  writer.u32(STRUCTURES_VERSION);
  for (const proto of structures) {
    writer.luaString(proto.name);
    writer.u32(proto.id);
    writer.u32(proto.hasMeta);
    writer.u32(proto.hasProxy);
    writer.u32(proto.slots.length);
    for (const slot of proto.slots) {
      writer.luaString(slot.name);
      writer.u32(slot.structId);
      writer.u32(slot.typeId);
      writer.u32(slot.reserved);
      writer.u32(slot.position);
    }
  }
  writer.luaString(undefined);
}

function writePrototype(writer: ByteWriter, prototype: LuaPrototype): void {
  writer.u32(prototype.nups);
  writer.u32(prototype.numParams);
  writer.u8(prototype.isVararg);
  writer.u32(prototype.maxStackSize);
  writer.u32(prototype.code.length);
  while (writer.length % 4 !== 0) {
    writer.u8(CODE_ALIGNMENT_PAD_BYTE);
  }
  for (const instruction of prototype.code) {
    writer.u32(encodeInstruction(instruction));
  }

  writer.u32(prototype.constants.length);
  for (const constant of prototype.constants) {
    writeConstant(writer, constant);
  }
  writer.u32(prototype.unknownAfterConstants);

  writer.u32(prototype.lineInfo.length);
  writer.u32(prototype.locals.length);
  writer.u32(prototype.upvalues.length);
  writer.u32(prototype.lineDefined);
  writer.u32(prototype.lastLineDefined);
  writer.luaString(prototype.source);
  writer.luaString(prototype.name);
  for (const line of prototype.lineInfo) {
    writer.u32(line);
  }
  for (const local of prototype.locals) {
    writer.luaString(local.name);
    writer.u32(local.startPc);
    writer.u32(local.endPc);
  }
  for (const upvalue of prototype.upvalues) {
    writer.luaString(upvalue);
  }

  writer.u32(prototype.protos.length);
  for (const child of prototype.protos) {
    writePrototype(writer, child);
  }
}

export function encodeLuaChunk(chunk: LuaChunk): Uint8Array {
  const writer = new ByteWriter();
  writer.bytes(HEADER_BYTES);
  const entries = [...chunk.typeTable.names.entries()].sort(
    (a, b) => a[0] - b[0]
  );
  writer.u32(entries.length);
  for (const [id, name] of entries) {
    writer.u32(id);
    writer.luaString(name);
  }
  writePrototype(writer, chunk.root);
  writeStructures(writer, chunk.structures ?? []);
  return writer.toUint8Array();
}
