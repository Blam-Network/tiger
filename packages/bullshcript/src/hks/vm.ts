// Interpreter for the Havok Script (hks) VM Destiny's host scripts ran on (the
// alpha's script tag class 80800B48).

import {
  CLOSURE_UPVALUE_FROM_REGISTER,
  CLOSURE_UPVALUE_FROM_UPVALUE,
  isTrailingWord,
  opcodeName,
  trailingWordCount,
} from "./opcodes.ts";
import type {
  LuaChunk,
  LuaConstant,
  LuaInstruction,
  LuaPrototype,
} from "./types.ts";
import {
  isFunction,
  isTruthy,
  LuaClosure,
  type LuaFunction,
  type LuaHostCallContext,
  LuaHostFunction,
  LuaLightUserdata,
  LuaTable,
  LuaTypeError,
  LuaUi64,
  LuaUpvalue,
  type LuaValue,
  luaEquals,
  luaLessEqual,
  luaLessThan,
  luaToString,
  toNumber,
  typeName,
} from "./values.ts";

const OP = {
  GETFIELD: 0,
  TEST: 1,
  CALL: 2,
  EQ: 4,
  EQ_K: 5,
  MOVE: 7,
  SELF: 8,
  RETURN: 9,
  GETTABLE: 10,
  LOADBOOL: 13,
  TFORLOOP: 14,
  SETFIELD: 15,
  SETTABLE: 16,
  SETTABLE_K: 17,
  TAILCALL: 22,
  LOADK: 25,
  LOADNIL: 26,
  SETGLOBAL: 27,
  JMP: 28,
  GETUPVAL: 38,
  SETUPVAL: 39,
  ADD: 40,
  ADD_K: 41,
  SUB: 42,
  SUB_K: 43,
  MUL: 44,
  MUL_K: 45,
  DIV: 46,
  DIV_K: 47,
  MOD: 48,
  MOD_K: 49,
  POW: 50,
  POW_K: 51,
  NEWTABLE: 52,
  UNM: 53,
  NOT: 54,
  LEN: 55,
  LT: 56,
  LT_K: 57,
  LE: 58,
  LE_K: 59,
  CONCAT: 60,
  TESTSET: 61,
  FORPREP: 62,
  FORLOOP: 63,
  SETLIST: 64,
  CLOSE: 65,
  CLOSURE: 66,
  VARARG: 67,
  TAILCALL_I_R1: 68,
  CALL_I_R1: 69,
  SETUPVAL_R1: 70,
  TEST_R1: 71,
  NOT_R1: 72,
  GETFIELD_R1: 73,
  SETFIELD_R1: 74,
  GETGLOBAL: 91,
} as const;

// C keeps vanilla's 9-bit RK slot throughout: >= 256 means constant C-256.
const RK_CONSTANT_BIAS = 256;
// SETLIST's C counts blocks of this many array items
const FIELDS_PER_FLUSH = 50;

// hks's arithmetic (operator_outofline<Opcode*>, and the fast path's
// fadds/fsubs/fmuls/fdivs): every result is a float32.
const fround = Math.fround;

interface ArithmeticOp {
  readonly apply: (l: number, r: number) => number;
  // the metamethod event hks looks up when an operand does not convert
  readonly event: string;
  readonly symbol: string;
}

const ARITHMETIC: Record<string, ArithmeticOp> = {
  add: { symbol: "+", event: "__add", apply: (l, r) => fround(l + r) },
  sub: { symbol: "-", event: "__sub", apply: (l, r) => fround(l - r) },
  mul: { symbol: "*", event: "__mul", apply: (l, r) => fround(l * r) },
  div: { symbol: "/", event: "__div", apply: (l, r) => fround(l / r) },
  mod: {
    symbol: "%",
    event: "__mod",
    apply: (l, r) => fround(l - fround(fround(Math.floor(fround(l / r))) * r)),
  },
  pow: { symbol: "^", event: "__pow", apply: (l, r) => fround(l ** r) },
};

// hks's binary-handler failure text: "operator + is not supported for nil +
// number".
function unsupportedBinary(
  op: ArithmeticOp,
  left: LuaValue,
  right: LuaValue
): string {
  return `operator ${op.symbol} is not supported for ${typeName(left)} ${op.symbol} ${typeName(right)}`;
}

function unsupportedUnary(symbol: string, operand: LuaValue): string {
  return `operator ${symbol} is not supported for ${symbol} ${typeName(operand)}`;
}

interface LuaErrorSite {
  readonly chunkName: string;
  // what the failing instruction was working on (a key, a callee), kept out
  // of the message so that reads as hks's
  readonly detail?: string;
  readonly opcode: number | undefined;
  readonly pc: number;
  readonly prototypeOffset: number;
}

export class LuaRuntimeError extends Error {
  constructor(message: string, site?: LuaErrorSite) {
    super(site === undefined ? message : `${message} ${describeSite(site)}`);
    this.name = "LuaRuntimeError";
  }
}

function describeSite(site: LuaErrorSite): string {
  const op =
    site.opcode === undefined
      ? ""
      : `, ${opcodeName(site.opcode)} (${site.opcode})`;
  const detail = site.detail === undefined ? "" : `, ${site.detail}`;
  return `[chunk ${site.chunkName}, proto @${site.prototypeOffset}, pc ${site.pc}${op}${detail}]`;
}

// hksi_lua_yield's refusal when a C function yields more than one C level
// deep; Lua-to-Lua calls never count.
export const YIELD_ACROSS_C_BOUNDARY =
  "attempt to yield across metamethod/C-call boundary";

// One executable instruction with the trailing argument words it owns and the
// raw pc of the next one.
interface LuaStep {
  readonly instruction: LuaInstruction;
  readonly nextPc: number;
  // previous executable instruction, so CALL_I_R1 can tell its SELF
  // companion-word form from a real call
  readonly previous: LuaInstruction | undefined;
  readonly trailing: readonly LuaInstruction[];
}

const stepTables = new WeakMap<
  LuaPrototype,
  readonly (LuaStep | undefined)[]
>();

function stepsOf(prototype: LuaPrototype): readonly (LuaStep | undefined)[] {
  const cached = stepTables.get(prototype);
  if (cached !== undefined) {
    return cached;
  }
  const table: (LuaStep | undefined)[] = new Array(prototype.code.length).fill(
    undefined
  );
  let previous: LuaInstruction | undefined;
  let pc = 0;
  while (pc < prototype.code.length) {
    const instruction = prototype.code[pc];
    if (isTrailingWord(instruction.opcode)) {
      // orphaned argument word; leave the slot undefined so reaching it fails
      pc += 1;
      continue;
    }
    const words = trailingWordCount(instruction, prototype);
    table[pc] = {
      instruction,
      trailing: prototype.code.slice(pc + 1, pc + 1 + words),
      nextPc: pc + 1 + words,
      previous,
    };
    previous = instruction;
    pc += 1 + words;
  }
  stepTables.set(prototype, table);
  return table;
}

// lightuserdata and ui64 constants become one object each, so that reading
// the same constant twice gives the same table key.
const boxedConstants = new WeakMap<LuaConstant, LuaLightUserdata | LuaUi64>();

function constantValue(constant: LuaConstant): LuaValue {
  switch (constant.kind) {
    case "nil":
      return;
    case "lightuserdata":
    case "ui64": {
      let boxed = boxedConstants.get(constant);
      if (boxed === undefined) {
        boxed =
          constant.kind === "ui64"
            ? new LuaUi64(constant.value)
            : new LuaLightUserdata(constant.value);
        boxedConstants.set(constant, boxed);
      }
      return boxed;
    }
    default:
      return constant.value;
  }
}

// A TFORLOOP whose generator turned out to be a Lua closure: the loop's own
// bookkeeping has to run after that call returns, so the frame remembers it.
interface LuaPendingForLoop {
  readonly a: number;
  readonly pc: number;
}

export interface LuaFrame {
  readonly closure: LuaClosure;
  // pc of the instruction being executed, which is what an error reports;
  // `pc` has already moved on by the time anything can fail
  currentPc: number;
  openUpvalues: LuaUpvalue[];
  pc: number;
  pending: LuaPendingForLoop | undefined;
  readonly registers: LuaValue[];
  // where this frame's results go in its caller, and how many it wants
  // (-1 = vanilla MULTRET)
  readonly resultCount: number;
  readonly resultRegister: number;
  // first free register after a MULTRET call, which is what a following
  // B=0 / C=0 operand counts up to
  top: number;
  readonly varargs: readonly LuaValue[];
}

type LuaThreadStatus = "dead" | "error" | "running" | "suspended";

type LuaResumeResult =
  | { readonly status: "returned"; readonly values: readonly LuaValue[] }
  | { readonly status: "yielded" };

export interface LuaVmOptions {
  // ceiling on call depth, likewise ours
  readonly callDepthLimit?: number;
  readonly globals?: LuaTable;
  // ceiling on instructions executed per resume(), so a runaway script fails
  // the tick instead of hanging it. Ours, not the game's.
  readonly stepLimit?: number;
  // hks keeps one metatable per non-table type in its registry; strings are the
  // only type whose metatable the host fills (host_env.ts installs an __add).
  readonly stringMetatable?: LuaTable;
}

// A debugger's look at a thread before each instruction: "pause" suspends a
// coroutine there (the instruction has not run), "continue" runs it. Only a
// thread that could yield may pause; the hook decides what to do otherwise.
export interface LuaDebugHook {
  beforeInstruction(thread: LuaThread, frame: LuaFrame): "continue" | "pause";
}

const DEFAULT_STEP_LIMIT = 1_000_000;
const DEFAULT_CALL_DEPTH_LIMIT = 200;

export class LuaVm {
  readonly globals: LuaTable;
  readonly stepLimit: number;
  readonly callDepthLimit: number;
  stringMetatable: LuaTable | undefined;
  // threads currently inside resume(), nested when a native runs Lua
  // through LuaVm.call; the C-call depth the yield rule is about
  activeResumes = 0;
  // Unset unless a debugger is attached with something to stop on: one
  // field test per instruction otherwise.
  debugHook: LuaDebugHook | undefined;
  // The threads inside resume(), outermost first, so a debugger can show a
  // native's nested Lua under the coroutine that called it.
  readonly resuming: LuaThread[] = [];

  constructor(options: LuaVmOptions = {}) {
    this.globals = options.globals ?? new LuaTable();
    this.stepLimit = options.stepLimit ?? DEFAULT_STEP_LIMIT;
    this.callDepthLimit = options.callDepthLimit ?? DEFAULT_CALL_DEPTH_LIMIT;
    this.stringMetatable = options.stringMetatable;
  }

  // The chunk's outermost prototype as a callable. It has nups=0 in every
  // alpha chunk, so it captures nothing.
  loadChunk(chunk: LuaChunk): LuaClosure {
    return new LuaClosure(chunk.root, [], chunk.tagId);
  }

  createThread(fn: LuaFunction, args: readonly LuaValue[] = []): LuaThread {
    return new LuaThread(this, fn, args);
  }

  // Runs a function to completion, the way the host's lua_call does.
  call(fn: LuaFunction, args: readonly LuaValue[] = []): readonly LuaValue[] {
    const thread = this.createThread(fn, args);
    thread.hostCall = true;
    const result = thread.resume();
    if (result.status === "yielded") {
      throw new LuaRuntimeError(YIELD_ACROSS_C_BOUNDARY);
    }
    return result.values;
  }
}

export class LuaThread {
  readonly vm: LuaVm;
  status: LuaThreadStatus = "suspended";
  // set by LuaVm.call: this thread is a C-level call, not a coroutine, so
  // it may not yield
  hostCall = false;
  private readonly frames: LuaFrame[] = [];
  private results: readonly LuaValue[] = [];
  private yieldRequested = false;
  // Set when a debugger paused the thread before frame.pc: the resume runs
  // that instruction without asking the hook again.
  debugPaused = false;

  constructor(vm: LuaVm, fn: LuaFunction, args: readonly LuaValue[]) {
    this.vm = vm;
    if (fn instanceof LuaHostFunction) {
      throw new LuaRuntimeError(
        `cannot start a thread on the host function "${fn.name}": only a Lua closure has a frame to suspend`
      );
    }
    this.pushFrame(fn, args, 0, -1);
  }

  // Runs until the thread returns or a native asks to suspend.
  resume(): LuaResumeResult {
    if (this.status === "dead" || this.status === "error") {
      throw new LuaRuntimeError("cannot resume a dead coroutine");
    }
    if (this.status === "running") {
      throw new LuaRuntimeError("cannot resume running coroutine");
    }
    this.status = "running";
    this.yieldRequested = false;
    this.vm.activeResumes += 1;
    this.vm.resuming.push(this);
    let skipHook = this.debugPaused;
    this.debugPaused = false;
    let steps = 0;
    try {
      while (this.frames.length > 0) {
        steps += 1;
        if (steps > this.vm.stepLimit) {
          this.fail(`step limit of ${this.vm.stepLimit} instructions exceeded`);
        }
        const hook = this.vm.debugHook;
        if (hook !== undefined && !skipHook) {
          const frame = this.frame;
          if (
            hook.beforeInstruction(this, frame) === "pause" &&
            this.mayPause()
          ) {
            this.debugPaused = true;
            this.status = "suspended";
            return { status: "yielded" };
          }
        }
        skipHook = false;
        this.execute();
        if (this.yieldRequested) {
          this.yieldRequested = false;
          this.status = "suspended";
          return { status: "yielded" };
        }
      }
    } catch (error) {
      this.status = "error";
      throw error;
    } finally {
      this.vm.activeResumes -= 1;
      this.vm.resuming.pop();
    }
    this.status = "dead";
    return { status: "returned", values: this.results };
  }

  // Whether a pause here could be resumed later: the same rule as a yield.
  mayPause(): boolean {
    return !this.hostCall && this.vm.activeResumes === 1;
  }

  // The live frames, outermost first, for a debugger to read.
  debugFrames(): readonly LuaFrame[] {
    return this.frames;
  }

  // ---- frames ------------------------------------------------------------

  private get frame(): LuaFrame {
    const frame = this.frames.at(-1);
    if (frame === undefined) {
      throw new LuaRuntimeError("no active frame");
    }
    return frame;
  }

  private pushFrame(
    closure: LuaClosure,
    args: readonly LuaValue[],
    resultRegister: number,
    resultCount: number
  ): void {
    if (this.frames.length >= this.vm.callDepthLimit) {
      this.fail(`call depth limit of ${this.vm.callDepthLimit} exceeded`);
    }
    const prototype = closure.prototype;
    const registers: LuaValue[] = new Array(prototype.maxStackSize).fill(
      undefined
    );
    for (let i = 0; i < prototype.numParams; i++) {
      registers[i] = args[i];
    }
    this.frames.push({
      closure,
      registers,
      pc: 0,
      currentPc: 0,
      top: prototype.numParams,
      varargs: prototype.isVararg === 0 ? [] : args.slice(prototype.numParams),
      openUpvalues: [],
      resultRegister,
      resultCount,
      pending: undefined,
    });
  }

  private returnFrom(frame: LuaFrame, values: readonly LuaValue[]): void {
    this.closeUpvalues(frame, 0);
    this.frames.pop();
    const caller = this.frames.at(-1);
    if (caller === undefined) {
      this.results = values;
      return;
    }
    this.placeResults(caller, frame.resultRegister, frame.resultCount, values);
    const pending = caller.pending;
    if (pending !== undefined) {
      caller.pending = undefined;
      this.finishForLoop(caller, pending);
    }
  }

  private placeResults(
    frame: LuaFrame,
    register: number,
    count: number,
    values: readonly LuaValue[]
  ): void {
    if (count < 0) {
      for (const [index, value] of values.entries()) {
        frame.registers[register + index] = value;
      }
      frame.top = register + values.length;
      return;
    }
    for (let i = 0; i < count; i++) {
      frame.registers[register + i] = values[i];
    }
  }

  private constant(frame: LuaFrame, index: number): LuaValue {
    const constant = frame.closure.prototype.constants[index];
    if (constant === undefined) {
      this.fail(`constant index ${index} is out of range`);
    }
    return constantValue(constant);
  }

  private rk(frame: LuaFrame, operand: number): LuaValue {
    return operand >= RK_CONSTANT_BIAS
      ? this.constant(frame, operand - RK_CONSTANT_BIAS)
      : frame.registers[operand];
  }

  // gettable_event / settable_event on a non-table: hks's text names the
  // type only; the key goes in the error site.
  private index(base: LuaValue, key: LuaValue, opcode: number): LuaValue {
    if (base instanceof LuaTable) {
      return base.get(key);
    }
    this.fail(
      `attempt to index a ${typeName(base)} value`,
      opcode,
      `key ${luaToString(key)}`
    );
  }

  private newIndex(
    base: LuaValue,
    key: LuaValue,
    value: LuaValue,
    opcode: number
  ): void {
    if (base instanceof LuaTable) {
      base.set(key, value);
      return;
    }
    this.fail(
      `attempt to index a ${typeName(base)} value`,
      opcode,
      `key ${luaToString(key)}`
    );
  }

  // hks's per-type metatable lookup (getBinaryHandler): only strings carry
  // one here, and only when the host installed it.
  private metamethod(value: LuaValue, event: string): LuaValue {
    return typeof value === "string"
      ? this.vm.stringMetatable?.get(event)
      : undefined;
  }

  // operator_outofline<Opcode*>: both operands convert (numbers as they are,
  // strings through strtod) -> the float32 result.
  private arith(
    frame: LuaFrame,
    instruction: LuaInstruction,
    op: ArithmeticOp,
    left: LuaValue
  ): void {
    const right = this.rk(frame, instruction.c);
    const leftNumber = toNumber(left);
    const rightNumber = toNumber(right);
    if (leftNumber !== undefined && rightNumber !== undefined) {
      frame.registers[instruction.a] = op.apply(leftNumber, rightNumber);
      return;
    }
    const handler =
      this.metamethod(left, op.event) ?? this.metamethod(right, op.event);
    if (handler === undefined) {
      this.fail(unsupportedBinary(op, left, right), instruction.opcode);
    }
    this.callValue(
      frame,
      handler,
      [left, right],
      instruction.a,
      1,
      instruction.opcode
    );
  }

  private compare(
    frame: LuaFrame,
    step: LuaStep,
    left: LuaValue,
    apply: (l: LuaValue, r: LuaValue) => boolean
  ): void {
    const instruction = step.instruction;
    const right = this.rk(frame, instruction.c);
    let outcome: boolean;
    try {
      outcome = apply(left, right);
    } catch (error) {
      if (error instanceof LuaTypeError) {
        this.fail(error.message, instruction.opcode);
      }
      throw error;
    }
    this.branch(frame, step, outcome === (instruction.a !== 0));
  }

  // Every conditional opcode in this fork is "instruction, then a JMP that
  // the instruction either takes or steps over" - vanilla's layout.
  private branch(frame: LuaFrame, step: LuaStep, take: boolean): void {
    const jumpPc = step.nextPc;
    const jump = this.stepAt(frame, jumpPc);
    if (jump.instruction.opcode !== OP.JMP) {
      this.fail(
        `conditional at pc ${frame.currentPc} is not followed by a JMP`,
        step.instruction.opcode
      );
    }
    frame.pc = take ? jumpPc + 1 + jump.instruction.sbx : jump.nextPc;
  }

  private stepAt(frame: LuaFrame, pc: number): LuaStep {
    const step = stepsOf(frame.closure.prototype)[pc];
    if (step === undefined) {
      this.fail(
        `pc ${pc} is not an executable instruction (out of range, or an argument word)`
      );
    }
    return step;
  }

  private openUpvalue(frame: LuaFrame, register: number): LuaUpvalue {
    const existing = frame.openUpvalues.find(
      (upvalue) => upvalue.registerIndex === register
    );
    if (existing !== undefined) {
      return existing;
    }
    const created = LuaUpvalue.open(frame.registers, register);
    frame.openUpvalues.push(created);
    return created;
  }

  private closeUpvalues(frame: LuaFrame, from: number): void {
    frame.openUpvalues = frame.openUpvalues.filter((upvalue) => {
      if (upvalue.registerIndex < from) {
        return true;
      }
      upvalue.close();
      return false;
    });
  }

  // ---- calls -------------------------------------------------------------

  // Returns "pushed" when the callee is a Lua closure, in which case the
  // dispatch loop runs it; "done" when it was a native and has already run.
  private callValue(
    frame: LuaFrame,
    callee: LuaValue,
    args: readonly LuaValue[],
    resultRegister: number,
    resultCount: number,
    opcode: number
  ): "done" | "pushed" {
    if (!isFunction(callee)) {
      // vm_call_internal's text, capital A and all
      this.fail(`Attempt to call a ${typeName(callee)} value`, opcode);
    }
    if (callee instanceof LuaClosure) {
      this.pushFrame(callee, args, resultRegister, resultCount);
      return "pushed";
    }
    const values = this.callHost(callee, args, opcode);
    this.placeResults(frame, resultRegister, resultCount, values);
    return "done";
  }

  // A native's numbers come back as float32, as lua_pushnumber would store
  // them.
  private callHost(
    fn: LuaHostFunction,
    args: readonly LuaValue[],
    opcode: number
  ): readonly LuaValue[] {
    let wantsYield = false;
    const context: LuaHostCallContext = {
      name: fn.name,
      requestYield: () => {
        wantsYield = true;
      },
    };
    // biome-ignore lint/suspicious/noConfusingVoidType: mirrors LuaHostCallback's return type
    let values: readonly LuaValue[] | void;
    try {
      values = fn.callback(args, context);
    } catch (error) {
      if (error instanceof LuaRuntimeError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.fail(`host function "${fn.name}" failed: ${message}`, opcode);
    }
    if (wantsYield) {
      // one C level deep is the thread's own native; deeper is a native
      // reached through a host-driven call (LuaVm.call, a nested resume)
      if (this.hostCall || this.vm.activeResumes > 1) {
        this.fail(YIELD_ACROSS_C_BOUNDARY, opcode);
      }
      this.yieldRequested = true;
    }
    // a callback declared void may still return something; only an array
    // is a result list
    if (!Array.isArray(values)) {
      return [];
    }
    return values.map((value) =>
      typeof value === "number" ? fround(value) : value
    );
  }

  private finishForLoop(frame: LuaFrame, pending: LuaPendingForLoop): void {
    const control = frame.registers[pending.a + 3];
    const step = this.stepAt(frame, pending.pc);
    if (control === undefined) {
      this.branch(frame, step, false);
      return;
    }
    frame.registers[pending.a + 2] = control;
    this.branch(frame, step, true);
  }

  private fail(message: string, opcode?: number, detail?: string): never {
    const frame = this.frames.at(-1);
    if (frame === undefined) {
      throw new LuaRuntimeError(message);
    }
    throw new LuaRuntimeError(message, {
      chunkName: frame.closure.chunkName,
      prototypeOffset: frame.closure.prototype.offset,
      pc: frame.currentPc,
      opcode,
      detail,
    });
  }

  // ---- dispatch ----------------------------------------------------------

  private execute(): void {
    const frame = this.frame;
    const step = this.stepAt(frame, frame.pc);
    const instruction = step.instruction;
    const pc = frame.pc;
    const registers = frame.registers;
    const { a, b, c } = instruction;
    // default: fall through. Anything that branches overwrites frame.pc.
    frame.currentPc = pc;
    frame.pc = step.nextPc;

    switch (instruction.opcode) {
      case OP.GETFIELD:
      case OP.GETFIELD_R1:
        registers[a] = this.index(
          registers[b],
          this.constant(frame, c),
          instruction.opcode
        );
        break;

      case OP.TEST:
      case OP.TEST_R1:
        this.branch(frame, step, !isTruthy(registers[a]) !== (c !== 0));
        break;

      case OP.CALL: {
        const argCount = b === 0 ? frame.top - (a + 1) : b - 1;
        this.callValue(
          frame,
          registers[a],
          registers.slice(a + 1, a + 1 + argCount),
          a,
          c === 0 ? -1 : c - 1,
          instruction.opcode
        );
        break;
      }

      case OP.EQ:
        this.compare(frame, step, registers[b], luaEquals);
        break;

      case OP.EQ_K:
        this.compare(frame, step, this.constant(frame, b), luaEquals);
        break;

      case OP.MOVE:
        registers[a] = registers[b];
        break;

      case OP.SELF: {
        const base = registers[b];
        // read the key before writing A+1, which RK(C) could name
        const method = this.index(base, this.rk(frame, c), instruction.opcode);
        registers[a + 1] = base;
        registers[a] = method;
        break;
      }

      case OP.RETURN: {
        const values =
          b === 0
            ? registers.slice(a, frame.top)
            : registers.slice(a, a + b - 1);
        this.returnFrom(frame, values);
        break;
      }

      case OP.GETTABLE:
        registers[a] = this.index(
          registers[b],
          this.rk(frame, c),
          instruction.opcode
        );
        break;

      case OP.LOADBOOL:
        registers[a] = b !== 0;
        if (c !== 0) {
          frame.pc = this.stepAt(frame, frame.pc).nextPc;
        }
        break;

      case OP.TFORLOOP: {
        const outcome = this.callValue(
          frame,
          registers[a],
          [registers[a + 1], registers[a + 2]],
          a + 3,
          c,
          instruction.opcode
        );
        if (outcome === "done") {
          this.finishForLoop(frame, { pc, a });
        } else {
          frame.pending = { pc, a };
        }
        break;
      }

      case OP.SETFIELD:
      case OP.SETFIELD_R1:
        this.newIndex(
          registers[a],
          this.constant(frame, b),
          this.rk(frame, c),
          instruction.opcode
        );
        break;

      case OP.SETTABLE:
        this.newIndex(
          registers[a],
          registers[b],
          this.rk(frame, c),
          instruction.opcode
        );
        break;

      case OP.SETTABLE_K:
        this.newIndex(
          registers[a],
          this.constant(frame, b),
          this.rk(frame, c),
          instruction.opcode
        );
        break;

      case OP.TAILCALL:
      case OP.TAILCALL_I_R1: {
        // TAILCALL is always followed by RETURN B=0, so "call for all results, then
        // RETURN" is a tail call minus frame reuse.
        const next = this.stepAt(frame, step.nextPc).instruction;
        if (next.opcode !== OP.RETURN || next.b !== 0) {
          this.fail(
            "TAILCALL is not followed by RETURN with B=0",
            instruction.opcode
          );
        }
        const argCount = b === 0 ? frame.top - (a + 1) : b - 1;
        this.callValue(
          frame,
          registers[a],
          registers.slice(a + 1, a + 1 + argCount),
          a,
          -1,
          instruction.opcode
        );
        break;
      }

      case OP.LOADK:
        registers[a] = this.constant(frame, instruction.bx);
        break;

      case OP.LOADNIL:
        for (let i = a; i <= b; i++) {
          registers[i] = undefined;
        }
        break;

      case OP.JMP:
        frame.pc = pc + 1 + instruction.sbx;
        break;

      case OP.GETUPVAL:
        registers[a] = this.upvalue(frame, b).get();
        break;

      case OP.ADD:
        this.arith(frame, instruction, ARITHMETIC.add, registers[b]);
        break;

      case OP.ADD_K:
        this.arith(frame, instruction, ARITHMETIC.add, this.constant(frame, b));
        break;

      case OP.SUB:
        this.arith(frame, instruction, ARITHMETIC.sub, registers[b]);
        break;

      case OP.SUB_K:
        this.arith(frame, instruction, ARITHMETIC.sub, this.constant(frame, b));
        break;

      case OP.MUL:
        this.arith(frame, instruction, ARITHMETIC.mul, registers[b]);
        break;

      case OP.MUL_K:
        this.arith(frame, instruction, ARITHMETIC.mul, this.constant(frame, b));
        break;

      case OP.DIV:
        this.arith(frame, instruction, ARITHMETIC.div, registers[b]);
        break;

      case OP.DIV_K:
        this.arith(frame, instruction, ARITHMETIC.div, this.constant(frame, b));
        break;

      case OP.POW:
        // hks opcode 50 (hksc numbering). 4 corpus sites, all mathlib's
        // 'min + (max - min) * t ^ exp'.
        this.arith(frame, instruction, ARITHMETIC.pow, registers[b]);
        break;

      case OP.POW_K:
        this.arith(frame, instruction, ARITHMETIC.pow, this.constant(frame, b));
        break;

      case OP.MOD:
        this.arith(frame, instruction, ARITHMETIC.mod, registers[b]);
        break;

      case OP.MOD_K:
        this.arith(frame, instruction, ARITHMETIC.mod, this.constant(frame, b));
        break;

      case OP.NEWTABLE:
        // B and C are vanilla's size hints; our table grows on demand.
        registers[a] = new LuaTable();
        break;

      case OP.UNM: {
        // operator_outofline<OpcodeUnm>: the same coercion as the binary
        // ops, then __unm, else "operator - is not supported for - nil"
        const operand = registers[b];
        const value = toNumber(operand);
        if (value !== undefined) {
          registers[a] = fround(-value);
          break;
        }
        const handler = this.metamethod(operand, "__unm");
        if (handler === undefined) {
          this.fail(unsupportedUnary("-", operand), instruction.opcode);
        }
        this.callValue(
          frame,
          handler,
          [operand, operand],
          a,
          1,
          instruction.opcode
        );
        break;
      }

      case OP.NOT:
      case OP.NOT_R1:
        registers[a] = !isTruthy(registers[b]);
        break;

      case OP.LEN:
        registers[a] = this.length(registers[b], instruction.opcode);
        break;

      case OP.CONCAT:
        registers[a] = this.concat(
          registers.slice(b, c + 1),
          instruction.opcode
        );
        break;

      case OP.TESTSET: {
        const value = registers[b];
        const take = !isTruthy(value) !== (c !== 0);
        if (take) {
          registers[a] = value;
        }
        this.branch(frame, step, take);
        break;
      }

      case OP.SETLIST: {
        const table = registers[a];
        if (!(table instanceof LuaTable)) {
          this.fail("SETLIST on a non-table", instruction.opcode);
        }
        const count = b === 0 ? frame.top - a - 1 : b;
        const first = (c - 1) * FIELDS_PER_FLUSH;
        for (let i = 1; i <= count; i++) {
          table.set(first + i, registers[a + i]);
        }
        break;
      }

      case OP.VARARG: {
        const values = frame.varargs;
        const count = b === 0 ? values.length : b - 1;
        for (let i = 0; i < count; i++) {
          registers[a + i] = values[i];
        }
        if (b === 0) {
          frame.top = a + count;
        }
        break;
      }

      case OP.SETGLOBAL:
        this.vm.globals.set(this.constant(frame, instruction.bx), registers[a]);
        break;

      case OP.SETUPVAL:
      case OP.SETUPVAL_R1:
        this.upvalue(frame, b).set(registers[a]);
        break;

      case OP.LT:
        this.compare(frame, step, registers[b], luaLessThan);
        break;

      case OP.LT_K:
        this.compare(frame, step, this.constant(frame, b), luaLessThan);
        break;

      case OP.LE:
        this.compare(frame, step, registers[b], luaLessEqual);
        break;

      case OP.LE_K:
        this.compare(frame, step, this.constant(frame, b), luaLessEqual);
        break;

      case OP.FORPREP: {
        const initial = this.forNumber(frame, a, "initial value");
        const stepValue = this.forNumber(frame, a + 2, "step");
        this.forNumber(frame, a + 1, "limit");
        registers[a] = fround(initial - stepValue);
        frame.pc = pc + 1 + instruction.sbx;
        break;
      }

      case OP.FORLOOP: {
        const stepValue = this.forNumber(frame, a + 2, "step");
        const limit = this.forNumber(frame, a + 1, "limit");
        const next = fround(
          this.forNumber(frame, a, "initial value") + stepValue
        );
        if (stepValue > 0 ? next <= limit : next >= limit) {
          registers[a] = next;
          registers[a + 3] = next;
          frame.pc = pc + 1 + instruction.sbx;
        }
        break;
      }

      case OP.CLOSE:
        this.closeUpvalues(frame, a);
        break;

      case OP.CLOSURE:
        registers[a] = this.makeClosure(frame, step);
        break;

      case OP.CALL_I_R1: {
        // B=C=3 right after a SELF into the same register is SELF's companion word,
        // not a call; every other site is a real call.
        if (step.previous?.opcode === OP.SELF && step.previous.a === a) {
          break;
        }
        const argCount = b === 0 ? frame.top - (a + 1) : b - 1;
        this.callValue(
          frame,
          registers[a],
          registers.slice(a + 1, a + 1 + argCount),
          a,
          c === 0 ? -1 : c - 1,
          instruction.opcode
        );
        break;
      }

      case OP.GETGLOBAL:
        registers[a] = this.vm.globals.get(
          this.constant(frame, instruction.bx)
        );
        break;

      default:
        this.fail(
          `opcode ${instruction.opcode} (${opcodeName(instruction.opcode)}) is not implemented`,
          instruction.opcode
        );
    }
  }

  private upvalue(frame: LuaFrame, index: number): LuaUpvalue {
    const upvalue = frame.closure.upvalues[index];
    if (upvalue === undefined) {
      this.fail(`upvalue index ${index} is out of range`);
    }
    return upvalue;
  }

  // '#' (hks LEN): a string's byte length, a table's contiguous array
  // size; anything else would go to __len, which nothing here carries.
  private length(value: LuaValue, opcode: number): number {
    if (typeof value === "string") {
      return value.length;
    }
    if (value instanceof LuaTable) {
      return value.length();
    }
    this.fail(unsupportedUnary("#", value), opcode);
  }

  // '..' over a run of registers (hksi_lua_concat): strings and numbers,
  // numbers formatted "%0.8g".
  private concat(values: readonly LuaValue[], opcode: number): string {
    let text = "";
    for (const value of values) {
      if (typeof value !== "string" && typeof value !== "number") {
        this.fail(`attempt to concatenate a ${typeName(value)} value`, opcode);
      }
      text += luaToString(value);
    }
    return text;
  }

  private forNumber(frame: LuaFrame, register: number, what: string): number {
    const value = toNumber(frame.registers[register]);
    if (value === undefined) {
      this.fail(`'for' ${what} must be a number`);
    }
    return value;
  }

  private makeClosure(frame: LuaFrame, step: LuaStep): LuaClosure {
    const child = frame.closure.prototype.protos[step.instruction.bx];
    if (child === undefined) {
      this.fail(
        `prototype index ${step.instruction.bx} is out of range`,
        step.instruction.opcode
      );
    }
    if (step.trailing.length !== child.nups) {
      this.fail(
        `CLOSURE has ${step.trailing.length} capture words but the prototype declares ${child.nups} upvalues`,
        step.instruction.opcode
      );
    }
    const upvalues = step.trailing.map((word) => {
      if (word.a === CLOSURE_UPVALUE_FROM_REGISTER) {
        return this.openUpvalue(frame, word.bx);
      }
      if (word.a === CLOSURE_UPVALUE_FROM_UPVALUE) {
        return this.upvalue(frame, word.bx);
      }
      return this.fail(
        `CLOSURE capture word has kind ${word.a}, expected ${CLOSURE_UPVALUE_FROM_REGISTER} (parent register) or ${CLOSURE_UPVALUE_FROM_UPVALUE} (parent upvalue)`,
        step.instruction.opcode
      );
    });
    return new LuaClosure(child, upvalues, frame.closure.chunkName);
  }
}
