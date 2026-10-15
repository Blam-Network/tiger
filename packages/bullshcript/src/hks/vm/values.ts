// The value model for Destiny's forked Lua 5.1 VM (the alpha's script tag class
// 80800B48).

import type { Method } from "../bytecode/proto.ts";
import { formatLuaNumber } from "../env/printf.ts";

export type LuaValue =
  | LuaFunction
  | LuaLightUserdata
  | LuaTable
  | LuaUi64
  | boolean
  | number
  | string
  | undefined;

// hks TLIGHTUSERDATA: a bare 32-bit pointer value. Only reachable from a
// chunk's constant pool; compares by value, as pointers do.
export class LuaLightUserdata {
  readonly kind = "lightuserdata";
  readonly value: number;

  constructor(value: number) {
    this.value = value >>> 0;
  }
}

// hks TUI64: an unsigned 64-bit integer. Likewise constant-pool only here;
// no arithmetic is defined on it (hks has none without WITHNATIVEINT).
export class LuaUi64 {
  readonly kind = "ui64";
  readonly value: bigint;

  constructor(value: bigint) {
    this.value = BigInt.asUintN(64, value);
  }
}

// Anything but nil can be a table key. Tables and functions key by identity,
// which is what Map already does.
type LuaKey = Exclude<LuaValue, undefined>;

export function isTruthy(value: LuaValue): boolean {
  return value !== undefined && value !== false;
}

// hks's luaT_typenames: lightuserdata shares "userdata" with full
// userdata, as in Lua 5.1.
export function typeName(value: LuaValue): string {
  if (value === undefined) {
    return "nil";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "string") {
    return "string";
  }
  if (value instanceof LuaLightUserdata) {
    return "userdata";
  }
  if (value instanceof LuaUi64) {
    return "ui64";
  }
  return value instanceof LuaTable ? "table" : "function";
}

// Stable per-object ids, so printing a table is deterministic.
const objectIds = new WeakMap<object, number>();
let nextObjectId = 1;

function objectId(value: object): string {
  let id = objectIds.get(value);
  if (id === undefined) {
    id = nextObjectId;
    nextObjectId += 1;
    objectIds.set(value, id);
  }
  return `0x${id.toString(16).padStart(8, "0")}`;
}

// hksL_tostring: nil, booleans, "%0.8g" numbers, strings as they are, TUI64 as
// "0x%8.8x%8.8x", everything else "%s: %p".
export function luaToString(value: LuaValue): string {
  if (value === undefined) {
    return "nil";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return formatLuaNumber(value);
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof LuaUi64) {
    return `0x${value.value.toString(16).padStart(16, "0")}`;
  }
  if (value instanceof LuaLightUserdata) {
    return `userdata: 0x${value.value.toString(16).padStart(8, "0")}`;
  }
  if (value instanceof LuaTable) {
    return `table: ${objectId(value)}`;
  }
  return value instanceof LuaHostFunction
    ? `function: builtin: ${value.name}`
    : `function: ${objectId(value)}`;
}

// hks EQ: different types are never equal (no metamethods), numbers, ui64
// and lightuserdata compare by value, the rest by identity.
export function luaEquals(left: LuaValue, right: LuaValue): boolean {
  if (left instanceof LuaUi64 && right instanceof LuaUi64) {
    return left.value === right.value;
  }
  if (left instanceof LuaLightUserdata && right instanceof LuaLightUserdata) {
    return left.value === right.value;
  }
  return left === right;
}

export class LuaTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LuaTypeError";
  }
}

// strtod's decimal grammar (MSVC's strtod reads no hex floats, no inf/nan)
const DECIMAL_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const HEX_INTEGER = /^([+-]?)0[xX]([0-9a-fA-F]+)$/;
const C_WHITESPACE = /^[ \t\n\v\f\r]+|[ \t\n\v\f\r]+$/g;
const ULONG_MAX = 0xff_ff_ff_ff;

// hks::stringToNumber: strtod, re-read with strtoul(16) at an 'x'; float32.
function stringToNumber(text: string): number | undefined {
  const trimmed = text.replace(C_WHITESPACE, "");
  if (DECIMAL_NUMBER.test(trimmed)) {
    return Math.fround(Number(trimmed));
  }
  const hex = HEX_INTEGER.exec(trimmed);
  if (hex === null) {
    return;
  }
  const magnitude = Number.parseInt(hex[2], 16);
  const unsigned = magnitude > ULONG_MAX ? ULONG_MAX : magnitude;
  return Math.fround(hex[1] === "-" ? (~unsigned + 1) >>> 0 : unsigned);
}

// The arithmetic operand coercion: a number as it is, a numeric string via
// stringToNumber, anything else does not convert.
export function toNumber(value: LuaValue): number | undefined {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return stringToNumber(value);
  }
  return;
}

// An unauthored field reads nil and the scripts compare it with numbers, so
// nil orders as 0 until instances come from the schemas; arithmetic on nil raises.
function orderable(value: LuaValue): LuaValue {
  return value === undefined ? 0 : value;
}

function orderError(left: LuaValue, right: LuaValue): LuaTypeError {
  const l = typeName(left);
  const r = typeName(right);
  return new LuaTypeError(
    l === r
      ? `attempt to compare two ${l} values`
      : `attempt to compare ${l} with ${r}`
  );
}

export function luaLessThan(rawLeft: LuaValue, rawRight: LuaValue): boolean {
  const left = orderable(rawLeft);
  const right = orderable(rawRight);
  if (typeof left === "number" && typeof right === "number") {
    return left < right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return left < right;
  }
  throw orderError(left, right);
}

export function luaLessEqual(rawLeft: LuaValue, rawRight: LuaValue): boolean {
  const left = orderable(rawLeft);
  const right = orderable(rawRight);
  if (typeof left === "number" && typeof right === "number") {
    return left <= right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return left <= right;
  }
  throw orderError(left, right);
}

// A key as the table stores it: -0 and 0 are the same slot, NaN is not a
// key at all. Both are vanilla behaviour.
function normalizeKey(key: LuaValue): LuaKey {
  if (key === undefined) {
    throw new LuaTypeError("table index is nil");
  }
  if (typeof key === "number") {
    if (Number.isNaN(key)) {
      throw new LuaTypeError("table index is NaN");
    }
    return key === 0 ? 0 : key;
  }
  return key;
}

// Array part plus hash part, as vanilla. The compiler indexes from 0 and
// emits no constructors (82100008), so the scripts only ever touch the hash.
export class LuaTable {
  readonly array: LuaValue[] = [];
  readonly hash = new Map<LuaKey, LuaValue>();

  get(key: LuaValue): LuaValue {
    const normalized = normalizeKey(key);
    const index = this.arrayIndex(normalized);
    if (index !== undefined) {
      return this.array[index];
    }
    return this.hash.get(normalized);
  }

  set(key: LuaValue, value: LuaValue): void {
    const normalized = normalizeKey(key);
    const index = this.arrayIndex(normalized);
    if (index !== undefined) {
      this.array[index] = value;
      this.trimArray();
      return;
    }
    if (value === undefined) {
      this.hash.delete(normalized);
      return;
    }
    if (normalized === this.array.length + 1) {
      this.array.push(value);
      this.migrateFromHash();
      return;
    }
    this.hash.set(normalized, value);
  }

  length(): number {
    return this.array.length;
  }

  *entries(): Generator<[LuaKey, LuaValue]> {
    for (const [index, value] of this.array.entries()) {
      if (value !== undefined) {
        yield [index + 1, value];
      }
    }
    for (const entry of this.hash) {
      yield entry;
    }
  }

  private arrayIndex(key: LuaKey): number | undefined {
    if (typeof key !== "number" || !Number.isInteger(key)) {
      return;
    }
    return key >= 1 && key <= this.array.length ? key - 1 : undefined;
  }

  private trimArray(): void {
    while (this.array.length > 0 && this.array.at(-1) === undefined) {
      this.array.pop();
    }
  }

  // After a push, keys that were sitting in the hash may now continue the
  // dense run.
  private migrateFromHash(): void {
    let next = this.array.length + 1;
    let value = this.hash.get(next);
    while (value !== undefined) {
      this.hash.delete(next);
      this.array.push(value);
      next += 1;
      value = this.hash.get(next);
    }
  }
}

export interface LuaHostCallContext {
  readonly name: string;
  requestYield(): void;
}

export type LuaHostCallback = (
  args: readonly LuaValue[],
  context: LuaHostCallContext
  // a native that only has an effect returns nothing; forcing `return []` on
  // every binding would be noise
  // biome-ignore lint/suspicious/noConfusingVoidType: see above
) => readonly LuaValue[] | void;

export class LuaHostFunction {
  readonly kind = "host";
  readonly name: string;
  readonly callback: LuaHostCallback;

  constructor(name: string, callback: LuaHostCallback) {
    this.name = name;
    this.callback = callback;
  }
}

export class LuaClosure {
  readonly kind = "closure";
  readonly prototype: Method;
  readonly upvalues: readonly LuaUpvalue[];
  // tag id of the chunk this came from, for error messages
  readonly chunkName: string;

  constructor(
    prototype: Method,
    upvalues: readonly LuaUpvalue[],
    chunkName: string
  ) {
    this.prototype = prototype;
    this.upvalues = upvalues;
    this.chunkName = chunkName;
  }
}

export type LuaFunction = LuaClosure | LuaHostFunction;

export function isFunction(value: LuaValue): value is LuaFunction {
  return value instanceof LuaClosure || value instanceof LuaHostFunction;
}

export class LuaUpvalue {
  private registers: LuaValue[] | undefined;
  private index: number;
  private value: LuaValue;

  private constructor(registers: LuaValue[] | undefined, index: number) {
    this.registers = registers;
    this.index = index;
  }

  static open(registers: LuaValue[], index: number): LuaUpvalue {
    return new LuaUpvalue(registers, index);
  }

  static closed(value: LuaValue): LuaUpvalue {
    const upvalue = new LuaUpvalue(undefined, -1);
    upvalue.value = value;
    return upvalue;
  }

  get isOpen(): boolean {
    return this.registers !== undefined;
  }

  get registerIndex(): number {
    return this.index;
  }

  get(): LuaValue {
    return this.registers === undefined
      ? this.value
      : this.registers[this.index];
  }

  set(value: LuaValue): void {
    if (this.registers === undefined) {
      this.value = value;
      return;
    }
    this.registers[this.index] = value;
  }

  close(): void {
    if (this.registers === undefined) {
      return;
    }
    this.value = this.registers[this.index];
    this.registers = undefined;
    this.index = -1;
  }
}
