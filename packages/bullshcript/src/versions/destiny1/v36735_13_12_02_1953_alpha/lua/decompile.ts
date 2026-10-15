// Decompiler for Destiny's forked Lua 5.1 bytecode (the alpha's script tag
// class 80800B48).

import {
  HKS_OPCODES,
  isTrailingWord,
  opcodeName,
  trailingWordCount,
} from "../../../../hks/bytecode/opcodes.ts";
import type {
  HksBytecode,
  HksInstruction,
  LocVar,
  LuaConstant,
  Method,
} from "../../../../hks/bytecode/proto.ts";

const OP = {
  ADD: 40,
  ADD_K: 41,
  CALL: 2,
  CALL_I_R1: 69,
  CLOSE: 65,
  CLOSURE: 66,
  DIV: 46,
  DIV_K: 47,
  EQ: 4,
  EQ_K: 5,
  FORLOOP: 63,
  FORPREP: 62,
  GETFIELD: 0,
  GETFIELD_R1: 73,
  GETGLOBAL: 91,
  GETTABLE: 10,
  GETUPVAL: 38,
  JMP: 28,
  LE: 58,
  LE_K: 59,
  LOADBOOL: 13,
  LOADK: 25,
  LOADNIL: 26,
  LT: 56,
  LT_K: 57,
  MOVE: 7,
  MUL: 44,
  MUL_K: 45,
  NEWTABLE: 52,
  NOT: 54,
  POW: 50,
  RETURN: 9,
  SELF: 8,
  SETFIELD: 15,
  SETFIELD_R1: 74,
  SETTABLE: 16,
  SETTABLE_K: 17,
  SUB: 42,
  SUB_K: 43,
  TAILCALL: 22,
  TEST: 1,
  TEST_R1: 71,
  TFORLOOP: 14,
  UNM: 53,
} as const;

// C keeps vanilla's 9-bit RK slot: >= 256 means constant C-256.
const RK_CONSTANT_BIAS = 256;

// CALL_I_R1's two observed forms, by B (== C at every site).
const OP_69_AFTER_SELF = 3;
const OP_69_BARE_CALL = 1;

// Lua operator precedence, low to high. Used only to place parentheses.
const PREC = {
  AND: 2,
  ATOM: 9,
  COMPARE: 3,
  OR: 1,
  POW: 8,
  PRODUCT: 6,
  SUM: 5,
  UNARY: 7,
} as const;

const LUA_KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);

// Instructions that only compute a value into a register.
const PURE_OPCODES = new Set<number>([
  OP.ADD,
  OP.ADD_K,
  OP.DIV,
  OP.DIV_K,
  OP.GETFIELD,
  OP.GETFIELD_R1,
  OP.GETGLOBAL,
  OP.GETTABLE,
  OP.GETUPVAL,
  OP.LOADBOOL,
  OP.LOADK,
  OP.MOVE,
  OP.MUL,
  OP.MUL_K,
  OP.NOT,
  OP.POW,
  OP.SELF,
  OP.SUB,
  OP.SUB_K,
  OP.UNM,
]);

const CONDITIONAL_OPCODES = new Set<number>([
  OP.EQ,
  OP.EQ_K,
  OP.LE,
  OP.LE_K,
  OP.LT,
  OP.LT_K,
  OP.TEST,
  OP.TEST_R1,
]);

// How far a short-circuit chain will be followed across value-only
// instructions. The corpus maximum is far below this.
const SCAN_LIMIT = 128;

// Longest table constructor rendered on one line before it breaks up.
const INLINE_TABLE_WIDTH = 72;

export interface LuaDecompileGap {
  // dotted prototype path within the chunk, e.g. "0.3"
  readonly functionPath: string;
  readonly pc: number;
  readonly reason: string;
}

export interface LuaDecompileResult {
  readonly gaps: readonly LuaDecompileGap[];
  readonly source: string;
  // the chunk's source path, '@' stripped, backslashes as written
  readonly sourcePath: string;
  readonly tagId: string;
}

// sourcePath when the chunk's debug info carries no source at all
export const SOURCE_PATH_ABSENT = "(source path absent)";

export interface LuaDecompileOptions {
  // append the compiler's line number to every statement
  readonly lineNumbers?: boolean;
}

interface Expr {
  // an open table constructor: later stores into the register fold into it
  readonly fields?: TableField[];
  // set by SELF, so the CALL that follows renders receiver:name(...)
  readonly method?: boolean;
  // a call left at MULTRET, which a following B=0 / C=0 operand consumes
  readonly multi?: boolean;
  readonly prec: number;
  readonly text: string;
}

interface TableField {
  readonly key: string;
  readonly value: string;
}

interface Condition {
  readonly negative: Expr;
  readonly positive: Expr;
}

// One `conditional + JMP` pair of a short-circuit chain, with the pc its
// operand computation starts at - an inner `or` group jumps to exactly that.
interface ConditionLink {
  readonly condPc: number;
  readonly jumpPc: number;
  readonly regionStart: number;
  readonly target: number;
}

interface ConditionPlan {
  // pc of the first instruction of the guarded block
  readonly end: number;
  // where control goes when the whole condition is false
  readonly falseTarget: number;
  readonly links: readonly ConditionLink[];
}

interface Line {
  readonly indent: number;
  text: string;
}

interface LogicalBlock {
  readonly end: number;
  readonly start: number;
}

interface BooleanConstants {
  readonly falsePc: number;
  readonly truePc: number;
}

interface LogicalRegion {
  // the run computing the final operand; absent when the link chain is the
  // whole expression
  readonly block: LogicalBlock | undefined;
  // the LOADBOOL pair comparison-based leaves funnel through, if any
  readonly constants: BooleanConstants | undefined;
  // where control resumes once the value is in place
  readonly end: number;
  readonly links: readonly ConditionLink[];
  readonly register: number;
}

interface BackEdge {
  readonly header: number;
  readonly latch: number;
}

const IDENTIFIER = /^[A-Za-z_]\w*$/;
const QUOTED_IDENTIFIER = /^"([A-Za-z_]\w*)"$/;
// a chunk's source path is stored with Lua's leading '@'
const SOURCE_PREFIX = /^@/;

function isIdentifier(name: string): boolean {
  return IDENTIFIER.test(name) && !LUA_KEYWORDS.has(name);
}

function quoteLuaString(value: string): string {
  let out = '"';
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === '"') {
      out += '\\"';
    } else if (ch === "\\") {
      out += "\\\\";
    } else if (ch === "\n") {
      out += "\\n";
    } else if (ch === "\r") {
      out += "\\r";
    } else if (ch === "\t") {
      out += "\\t";
    } else if (code < 0x20 || code >= 0x7f) {
      // constants are bytes: a high byte stays a three-digit escape
      out += `\\${code.toString().padStart(3, "0")}`;
    } else {
      out += ch;
    }
  }
  return `${out}"`;
}

// Only a name or a parenthesised expression can be indexed or called:
// `("%s"):format(x)`, not `"%s":format(x)`.
const NOT_A_PREFIX = /^(?:["'{\d]|\.\d|(?:nil|true|false)$)/;

function prefix(expr: Expr): string {
  const text = wrap(expr, PREC.ATOM);
  return NOT_A_PREFIX.test(text) ? `(${text})` : text;
}

function atom(text: string): Expr {
  return { prec: PREC.ATOM, text };
}

function wrap(expr: Expr, minimum: number): string {
  return expr.prec < minimum ? `(${expr.text})` : expr.text;
}

// Everything this emits is left-associative, so the right operand takes one
// more precedence level to keep its own grouping.
function binary(left: Expr, operator: string, right: Expr, prec: number): Expr {
  return {
    prec,
    text: `${wrap(left, prec)} ${operator} ${wrap(right, prec + 1)}`,
  };
}

// `and` and `or` are associative, so the right operand keeps the parent's
// own level: `a or b and c` needs no parentheses, `(a or b) and c` does.
function joinCondition(left: Expr, operator: "and" | "or", right: Expr): Expr {
  const prec = operator === "and" ? PREC.AND : PREC.OR;
  return {
    prec,
    text: `${wrap(left, prec)} ${operator} ${wrap(right, prec)}`,
  };
}

function notExpr(expr: Expr): Expr {
  return { prec: PREC.UNARY, text: `not ${wrap(expr, PREC.UNARY + 1)}` };
}

const NEGATED_COMPARISON = new Map([
  ["<", ">="],
  ["<=", ">"],
  ["==", "~="],
  [">", "<="],
  [">=", "<"],
]);

function comparison(left: Expr, operator: string, right: Expr): Condition {
  const negated = NEGATED_COMPARISON.get(operator) ?? "==";
  return {
    negative: binary(left, negated, right, PREC.COMPARE),
    positive: binary(left, operator, right, PREC.COMPARE),
  };
}

function constantExpr(constant: LuaConstant | undefined): Expr {
  if (constant === undefined) {
    return atom("nil");
  }
  switch (constant.kind) {
    case "nil":
      return atom("nil");
    case "boolean":
      return atom(constant.value ? "true" : "false");
    case "number": {
      const text = String(constant.value);
      return text.startsWith("-") ? { prec: PREC.UNARY, text } : atom(text);
    }
    case "string":
      return atom(quoteLuaString(constant.value));
    // no source spelling exists for these two; the corpus has none
    case "lightuserdata":
      return atom(`0x${constant.value.toString(16).padStart(8, "0")}`);
    default:
      return atom(`0x${constant.value.toString(16).padStart(16, "0")}`);
  }
}

function constantString(constant: LuaConstant | undefined): string | undefined {
  return constant?.kind === "string" ? constant.value : undefined;
}

function renderTable(fields: readonly TableField[]): string {
  if (fields.length === 0) {
    return "{}";
  }
  const parts = fields.map((entry) =>
    isIdentifier(entry.key)
      ? `${entry.key} = ${entry.value}`
      : `[${entry.key}] = ${entry.value}`
  );
  const inline = `{ ${parts.join(", ")} }`;
  return inline.length <= INLINE_TABLE_WIDTH
    ? inline
    : `{\n${parts.map((part) => `  ${part}`).join(",\n")}\n}`;
}

// Collects the emitted lines and the per-chunk findings. One instance per
// chunk; every prototype writes into it.
class ChunkWriter {
  readonly gaps: LuaDecompileGap[] = [];
  indent = 0;
  readonly lines: Line[] = [];
  private readonly showLines: boolean;

  constructor(options: LuaDecompileOptions) {
    this.showLines = options.lineNumbers === true;
  }

  write(text: string, line?: number, note?: string): void {
    const parts = text.split("\n");
    for (const part of parts) {
      this.lines.push({ indent: this.indent, text: part });
    }
    const last = this.lines.at(-1);
    if (last === undefined) {
      return;
    }
    const comments: string[] = [];
    if (note !== undefined) {
      comments.push(note);
    }
    if (this.showLines && line !== undefined) {
      comments.push(`line ${line}`);
    }
    if (comments.length > 0) {
      last.text += ` -- ${comments.join("; ")}`;
    }
  }

  gap(functionPath: string, pc: number, reason: string): void {
    this.gaps.push({ functionPath, pc, reason });
  }
}

// Decompiles one prototype, recursing into every closure it creates.
class PrototypeDecompiler {
  private readonly backEdges = new Map<number, BackEdge>();
  private readonly handledLocals = new Set<number>();
  // exits of the loops currently being emitted, innermost last
  private readonly loopExits: number[] = [];
  // headers of those same loops; a back jump to one ends an iteration
  private readonly loopHeaders: number[] = [];
  // and where each loop's body ends, which is where such a jump really goes
  private readonly loopLatches: number[] = [];
  private multiTop: number | undefined;
  private readonly nextPcOf = new Map<number, number>();
  private readonly order: number[] = [];
  private readonly path: string;
  private readonly proto: Method;
  private readonly registers: (Expr | undefined)[];
  private readonly slotOfPc = new Map<number, number>();
  private readonly writer: ChunkWriter;

  constructor(writer: ChunkWriter, proto: Method, path: string) {
    this.writer = writer;
    this.proto = proto;
    this.path = path;
    this.registers = new Array<Expr | undefined>(
      Math.max(proto.maxStackSize, 1)
    ).fill(undefined);
    this.indexCode();
    this.findBackEdges();
  }

  // ---- code index --------------------------------------------------------

  private indexCode(): void {
    let pc = 0;
    while (pc < this.proto.code.length) {
      const instruction = this.proto.code[pc];
      if (isTrailingWord(instruction.opcode)) {
        pc += 1;
        continue;
      }
      const words = trailingWordCount(instruction, this.proto);
      this.slotOfPc.set(pc, this.order.length);
      this.order.push(pc);
      this.nextPcOf.set(pc, pc + 1 + words);
      pc += 1 + words;
    }
  }

  // Plain backward jumps are loop latches.
  private findBackEdges(): void {
    for (const pc of this.order) {
      const instruction = this.at(pc);
      if (instruction.opcode !== OP.JMP) {
        continue;
      }
      const target = pc + 1 + instruction.sbx;
      if (target > pc) {
        continue;
      }
      const previous = this.previousPc(pc);
      if (previous !== undefined && this.at(previous).opcode === OP.TFORLOOP) {
        continue;
      }
      const existing = this.backEdges.get(target);
      if (existing === undefined || existing.latch < pc) {
        this.backEdges.set(target, { header: target, latch: pc });
      }
    }
  }

  private at(pc: number): HksInstruction {
    return this.proto.code[pc];
  }

  private isExecutable(pc: number): boolean {
    return this.slotOfPc.has(pc);
  }

  private opcodeAt(pc: number): number | undefined {
    return this.isExecutable(pc) ? this.at(pc).opcode : undefined;
  }

  private next(pc: number): number {
    return this.nextPcOf.get(pc) ?? pc + 1;
  }

  private previousPc(pc: number): number | undefined {
    const slot = this.slotOfPc.get(pc);
    return slot === undefined || slot === 0 ? undefined : this.order[slot - 1];
  }

  private lastPcBefore(limit: number): number | undefined {
    let found: number | undefined;
    for (const pc of this.order) {
      if (pc >= limit) {
        break;
      }
      found = pc;
    }
    return found;
  }

  private jumpTarget(pc: number): number {
    return pc + 1 + this.at(pc).sbx;
  }

  private line(pc: number): number | undefined {
    return this.proto.lineInfo[pc];
  }

  private write(text: string, pc: number, note?: string): void {
    this.writer.write(text, this.line(pc), note);
  }

  // Locals are listed in activation order and occupy registers in that same
  // order, so the n-th one active at a pc lives in register n.
  private activeLocals(pc: number): LocVar[] {
    return this.proto.locals.filter(
      (local) => local.startPc <= pc && pc < local.endPc
    );
  }

  private localNameAt(register: number, pc: number): string | undefined {
    const name = this.activeLocals(pc)[register]?.name;
    // "(for index)" and friends are compiler-generated, not source names
    return name === undefined || name.startsWith("(") ? undefined : name;
  }

  // Everything that becomes a named local exactly at this pc, declared from
  // whatever its register already holds.
  private declareLocalsAt(pc: number): void {
    const starting: LocVar[] = [];
    this.proto.locals.forEach((local, index) => {
      if (local.startPc === pc && !this.handledLocals.has(index)) {
        starting.push(local);
        this.handledLocals.add(index);
      }
    });
    if (starting.length === 0) {
      return;
    }
    const active = this.activeLocals(pc);
    const names: string[] = [];
    const values: string[] = [];
    for (const local of starting) {
      const register = active.indexOf(local);
      if (local.name.startsWith("(")) {
        continue;
      }
      // a parameter is bound on entry; that is not a declaration
      if (pc === 0 && register >= 0 && register < this.proto.numParams) {
        continue;
      }
      names.push(local.name);
      const held = register < 0 ? undefined : this.registers[register];
      values.push(held === undefined ? "nil" : this.settle(held).text);
      if (register >= 0) {
        this.registers[register] = atom(local.name);
      }
    }
    if (names.length === 0) {
      return;
    }
    const bare = values.every((value) => value === "nil");
    this.write(
      bare
        ? `local ${names.join(", ")}`
        : `local ${names.join(", ")} = ${values.join(", ")}`,
      pc
    );
  }

  private reg(register: number, pc: number): Expr {
    const name = this.localNameAt(register, pc);
    if (name !== undefined) {
      return atom(name);
    }
    const held = this.registers[register];
    if (held === undefined) {
      this.writer.gap(
        this.path,
        pc,
        `register R${register} is read before this decompiler saw a value put in it`
      );
      return atom(`nil --[[unrecovered R${register}]]`);
    }
    return this.settle(held);
  }

  // A table constructor stops taking fields the moment its value is used.
  private settle(expr: Expr): Expr {
    return expr.fields === undefined ? expr : atom(renderTable(expr.fields));
  }

  private rk(operand: number, pc: number): Expr {
    return operand >= RK_CONSTANT_BIAS
      ? this.constant(operand - RK_CONSTANT_BIAS)
      : this.reg(operand, pc);
  }

  private constant(index: number): Expr {
    return constantExpr(this.proto.constants[index]);
  }

  private constantKey(index: number, pc: number): string {
    const key = constantString(this.proto.constants[index]);
    if (key !== undefined) {
      return key;
    }
    this.writer.gap(
      this.path,
      pc,
      `field key K[${index}] is not a string, which every corpus site is`
    );
    return "unrecovered_key";
  }

  private assign(register: number, expr: Expr, pc: number): void {
    const name = this.localNameAt(register, pc);
    if (name === undefined) {
      this.registers[register] = expr;
      return;
    }
    this.write(`${name} = ${this.settle(expr).text}`, pc);
    this.registers[register] = atom(name);
  }

  private field(base: Expr, key: string): Expr {
    return isIdentifier(key)
      ? atom(`${prefix(base)}.${key}`)
      : atom(`${prefix(base)}[${quoteLuaString(key)}]`);
  }

  private upvalueName(index: number): string {
    const name = this.proto.upvalues[index];
    return name === undefined || name === "" ? `upvalue_${index}` : name;
  }

  run(): void {
    const last = this.order.at(-1);
    // every prototype ends with the compiler's implicit `return`
    const implicit =
      last !== undefined &&
      this.at(last).opcode === OP.RETURN &&
      this.at(last).a === 0 &&
      this.at(last).b === 1;
    this.structure(
      0,
      implicit && last !== undefined ? last : this.proto.code.length
    );
  }

  // ---- structuring -------------------------------------------------------

  private structure(start: number, stop: number): void {
    let pc = start;
    while (pc < stop) {
      if (!this.isExecutable(pc)) {
        this.writer.gap(
          this.path,
          pc,
          "control reaches a trailing argument word rather than an instruction"
        );
        this.emitRaw(pc, stop, "a jump lands in the middle of an instruction");
        return;
      }
      this.declareLocalsAt(pc);
      const before = pc;
      pc = this.step(pc, stop);
      if (pc <= before) {
        this.emitRaw(before, stop, "the decompiler made no progress here");
        return;
      }
    }
  }

  private step(pc: number, stop: number): number {
    const loop = this.backEdges.get(pc);
    if (loop !== undefined && loop.latch < stop) {
      return this.emitLoop(loop);
    }
    const opcode = this.at(pc).opcode;
    if (opcode === OP.FORPREP) {
      return this.emitNumericFor(pc);
    }
    if (opcode === OP.JMP) {
      return this.emitJump(pc, stop);
    }
    if (opcode === OP.RETURN) {
      return this.emitReturn(pc);
    }
    if (opcode === OP.TAILCALL) {
      return this.emitTailCall(pc);
    }
    if (CONDITIONAL_OPCODES.has(opcode)) {
      // a conditional is a statement's `if` or the machinery of a value; value
      // forms fold first, or they structure into an `if` nothing reads
      return this.tryLogicalExpression(pc) ?? this.emitIf(pc, stop);
    }
    return this.emitInstruction(pc);
  }

  // A while loop carries its condition at the header, and that condition's
  // false branch is the instruction after the latch.
  private emitLoop(loop: BackEdge): number {
    const exit = this.next(loop.latch);
    const plan = this.planCondition(loop.header);
    // the exit may be threaded through a jump that directly follows the
    // loop (the escape of an enclosing if), landing where that one goes
    const threadedExit =
      this.opcodeAt(exit) === OP.JMP ? this.jumpTarget(exit) : undefined;
    if (
      plan !== undefined &&
      (plan.falseTarget === exit || plan.falseTarget === threadedExit)
    ) {
      const text = this.materialize(loop.header, plan);
      this.write(`while ${text} do`, loop.header);
      this.runLoopBody(exit, plan.end, loop.latch, loop.header);
      this.write("end", loop.latch);
      return exit;
    }
    const tailPc = this.previousPc(loop.latch);
    if (
      tailPc !== undefined &&
      tailPc >= loop.header &&
      CONDITIONAL_OPCODES.has(this.at(tailPc).opcode) &&
      this.next(tailPc) === loop.latch
    ) {
      // repeat: falling through the conditional leaves the loop, so the
      // until-condition is the fall-through condition
      this.write("repeat", loop.header);
      this.writer.indent += 1;
      this.loopExits.push(exit);
      this.loopHeaders.push(loop.header);
      this.loopLatches.push(tailPc);
      this.structure(loop.header, tailPc);
      const condition = this.buildCondition(tailPc);
      this.loopLatches.pop();
      this.loopHeaders.pop();
      this.loopExits.pop();
      this.writer.indent -= 1;
      this.write(`until ${condition.positive.text}`, tailPc);
      this.forgetTemporaries(exit);
      return exit;
    }
    this.write("while true do", loop.header);
    this.runLoopBody(exit, loop.header, loop.latch, loop.header);
    this.write("end", loop.latch);
    return exit;
  }

  private runLoopBody(
    exit: number,
    start: number,
    stop: number,
    header: number
  ): void {
    this.writer.indent += 1;
    this.loopExits.push(exit);
    this.loopHeaders.push(header);
    this.loopLatches.push(stop);
    this.structure(start, stop);
    this.loopLatches.pop();
    this.loopHeaders.pop();
    this.loopExits.pop();
    this.writer.indent -= 1;
    this.forgetTemporaries(exit);
  }

  private emitNumericFor(pc: number): number {
    const base = this.at(pc).a;
    const loopPc = this.jumpTarget(pc);
    if (this.opcodeAt(loopPc) !== OP.FORLOOP) {
      this.writer.gap(this.path, pc, "FORPREP does not land on a FORLOOP");
      return this.emitRaw(pc, this.proto.code.length, "malformed numeric for");
    }
    const bodyStart = this.next(pc);
    const initial = this.registers[base];
    const limit = this.registers[base + 1];
    const stepValue = this.registers[base + 2];
    const variable =
      this.activeLocals(bodyStart)[base + 3]?.name ?? `for_var_${base + 3}`;
    this.markControlLocals(bodyStart, base, 4);
    const parts = [
      initial === undefined ? "nil" : this.settle(initial).text,
      limit === undefined ? "nil" : this.settle(limit).text,
    ];
    const stepText =
      stepValue === undefined ? "1" : this.settle(stepValue).text;
    if (stepText !== "1") {
      parts.push(stepText);
    }
    this.write(`for ${variable} = ${parts.join(", ")} do`, pc);
    this.registers[base + 3] = atom(variable);
    const exit = this.next(loopPc);
    this.runLoopBody(exit, bodyStart, loopPc, bodyStart);
    this.write("end", loopPc);
    return exit;
  }

  private emitGenericFor(pc: number, tforPc: number): number {
    const instruction = this.at(tforPc);
    const base = instruction.a;
    const bodyStart = this.next(pc);
    const latch = this.next(tforPc);
    if (this.opcodeAt(latch) !== OP.JMP) {
      this.writer.gap(this.path, tforPc, "TFORLOOP is not followed by a JMP");
      return this.emitRaw(pc, this.proto.code.length, "malformed generic for");
    }
    const exit = this.next(latch);
    const explist: string[] = [];
    for (let i = 0; i < 3; i++) {
      const held = this.registers[base + i];
      if (held === undefined) {
        break;
      }
      explist.push(this.settle(held).text);
      if (held.multi === true) {
        break;
      }
    }
    const active = this.activeLocals(bodyStart);
    const names: string[] = [];
    for (let i = 0; i < Math.max(1, instruction.c); i++) {
      names.push(active[base + 3 + i]?.name ?? `for_var_${base + 3 + i}`);
    }
    this.markControlLocals(bodyStart, base, 3 + names.length);
    this.write(
      `for ${names.join(", ")} in ${explist.length === 0 ? "nil" : explist.join(", ")} do`,
      pc
    );
    names.forEach((name, index) => {
      this.registers[base + 3 + index] = atom(name);
    });
    this.runLoopBody(exit, bodyStart, tforPc, bodyStart);
    this.write("end", tforPc);
    return exit;
  }

  // The `(for index)` triple and the loop variables are bound by the loop
  // header, so the body must not re-declare them.
  private markControlLocals(pc: number, base: number, count: number): void {
    const active = this.activeLocals(pc);
    for (let i = 0; i < count; i++) {
      const local = active[base + i];
      if (local === undefined) {
        continue;
      }
      const index = this.proto.locals.indexOf(local);
      if (index >= 0) {
        this.handledLocals.add(index);
      }
    }
  }

  private emitJump(pc: number, stop: number): number {
    const raw = this.jumpTarget(pc);
    if (raw > pc && this.opcodeAt(raw) === OP.TFORLOOP) {
      return this.emitGenericFor(pc, raw);
    }
    const target = this.endOfIteration(raw, pc) ?? raw;
    if (target === stop) {
      // goes exactly where control was going anyway
      return this.next(pc);
    }
    if (target === this.loopExits.at(-1)) {
      this.write("break", pc);
      return this.next(pc);
    }
    // Lua 5.1 has no `goto`, so a forward jump that lands on a RETURN is the
    // compiler sharing one exit between several `return`s.
    if (target > pc && this.returnsOnlyLocals(target)) {
      this.emitReturn(target);
      return this.next(pc);
    }

    this.writer.gap(
      this.path,
      pc,
      `unconditional jump to pc ${target} is neither a loop exit nor the end of the enclosing block`
    );
    return this.emitRaw(pc, stop, "unstructured jump");
  }

  private emitIf(start: number, stop: number): number {
    const plan = this.planCondition(start);
    if (plan === undefined) {
      this.writer.gap(
        this.path,
        start,
        "conditional is not followed by a JMP, or its short-circuit chain mixes `and` and `or` in a shape this decompiler will not guess at"
      );
      return this.emitRaw(start, stop, "condition could not be recovered");
    }
    const falseTarget = this.clampToBlock(plan.falseTarget, stop);
    if (falseTarget <= start || falseTarget > stop) {
      this.writer.gap(
        this.path,
        start,
        `conditional jumps to pc ${falseTarget}, outside the block being structured`
      );
      return this.emitRaw(start, stop, "condition leaves its own block");
    }
    const text = this.materialize(start, plan);
    const elseEnd = this.findElseEnd(plan.end, falseTarget, stop);
    const bodyStop =
      elseEnd === undefined
        ? falseTarget
        : (this.lastPcBefore(falseTarget) ?? falseTarget);
    this.write(`if ${text} then`, start);
    this.writer.indent += 1;
    this.structure(plan.end, bodyStop);
    this.writer.indent -= 1;
    if (elseEnd === undefined) {
      this.write("end", falseTarget);
      this.forgetTemporaries(falseTarget);
      return falseTarget;
    }
    this.write("else", falseTarget);
    this.writer.indent += 1;
    this.forgetTemporaries(falseTarget);
    this.structure(falseTarget, elseEnd);
    this.writer.indent -= 1;
    this.write("end", elseEnd);
    this.forgetTemporaries(elseEnd);
    return elseEnd;
  }

  // A conditional inside a nested block can short-circuit straight to the join
  // the whole block feeds into.
  private clampToBlock(target: number, stop: number): number {
    if (target <= stop || this.opcodeAt(stop) !== OP.JMP) {
      return target;
    }
    const raw = this.jumpTarget(stop);
    const exit = this.endOfIteration(raw, stop) ?? raw;
    return exit === target ? stop : target;
  }

  // an `else` exists when the then-block ends in a forward jump past the false
  // target - unless that jump is a `break`
  private findElseEnd(
    bodyStart: number,
    falseTarget: number,
    stop: number
  ): number | undefined {
    const tailPc = this.lastPcBefore(falseTarget);
    if (
      tailPc === undefined ||
      tailPc < bodyStart ||
      this.at(tailPc).opcode !== OP.JMP
    ) {
      return;
    }
    const target = this.jumpTarget(tailPc);
    if (target === this.loopHeaders.at(-1)) {
      // the then-block ends the iteration, so everything left is the else
      return stop;
    }
    if (target === falseTarget) {
      // a jump to where it already is: an empty else (a bs switch's empty default)
      // - unless it is the escape of a nested if
      return this.jumpsReach(bodyStart, tailPc, falseTarget) ||
        this.loopExits.includes(target)
        ? undefined
        : falseTarget;
    }
    if (
      target > stop &&
      this.opcodeAt(stop) === OP.JMP &&
      this.jumpTarget(stop) === target
    ) {
      // the enclosing block's own escape follows: Lua threads a jump to a
      // jump straight through, so this else runs to the end of the block
      return this.loopExits.includes(target) ? undefined : stop;
    }
    if (target <= falseTarget || target > stop) {
      return;
    }
    return this.loopExits.includes(target) ? undefined : target;
  }

  // Whether any JMP in [start, stop) goes to `target` or past it.
  private jumpsReach(start: number, stop: number, target: number): boolean {
    return this.order.some(
      (pc) =>
        pc >= start &&
        pc < stop &&
        this.at(pc).opcode === OP.JMP &&
        this.jumpTarget(pc) >= target
    );
  }

  private returnsOnlyLocals(pc: number): boolean {
    if (this.opcodeAt(pc) !== OP.RETURN) {
      return false;
    }
    const instruction = this.at(pc);
    if (instruction.b === 0) {
      // a MULTRET return depends on a call window that is not in scope here
      return false;
    }
    for (let r = instruction.a; r < instruction.a + instruction.b - 1; r++) {
      if (this.localNameAt(r, pc) === undefined) {
        return false;
      }
    }
    return true;
  }

  private emitReturn(pc: number): number {
    const instruction = this.at(pc);
    const values = this.valueWindow(instruction.a, instruction.b, pc);
    this.write(
      values.length === 0 ? "return" : `return ${values.join(", ")}`,
      pc
    );
    return this.next(pc);
  }

  private emitTailCall(pc: number): number {
    const instruction = this.at(pc);
    this.write(
      `return ${this.buildCall(pc, instruction.a, instruction.b)}`,
      pc
    );
    const after = this.next(pc);
    // the RETURN that follows every TAILCALL only forwards its results
    return this.opcodeAt(after) === OP.RETURN ? this.next(after) : after;
  }

  // The register window an operand with vanilla's MULTRET convention names.
  // count is the raw B/C field: 0 means "up to the stack top".
  private valueWindow(base: number, count: number, pc: number): string[] {
    if (count !== 0) {
      const fixed: string[] = [];
      for (let r = base; r < base + count - 1; r++) {
        fixed.push(this.reg(r, pc).text);
      }
      return fixed;
    }
    const top = this.multiTop;
    if (top === undefined || top < base) {
      this.writer.gap(
        this.path,
        pc,
        "an operand asks for every value up to the stack top, but no multiple-result call precedes it"
      );
      return ["nil --[[unrecovered multret window]]"];
    }
    const values: string[] = [];
    for (let r = base; r < top; r++) {
      values.push(this.reg(r, pc).text);
    }
    const multi = this.registers[top];
    values.push(multi === undefined ? "nil" : this.settle(multi).text);
    return values;
  }

  // ---- conditions --------------------------------------------------------

  // Plans a short-circuit chain without touching any state, so a caller can
  // test the shape (a while head, say) before committing to it.
  private planCondition(start: number): ConditionPlan | undefined {
    const opcode = this.opcodeAt(start);
    // a while head opens with the instructions that compute its condition, so
    // the first conditional can sit a few value-only instructions in
    const first =
      opcode !== undefined && CONDITIONAL_OPCODES.has(opcode)
        ? start
        : this.skipPureRun(start, true);
    if (first === undefined) {
      return;
    }
    const links = this.scanLinks(first);
    for (let length = links.length; length >= 1; length--) {
      const slice = links.slice(0, length);
      const last = slice.at(-1) as ConditionLink;
      const after = this.next(last.jumpPc);
      // a shape-only fold: if the chain cannot be grouped, nothing is emitted
      const shape = this.foldCondition(
        slice,
        0,
        length - 1,
        (link) => link.target === last.target,
        (link) => link.target === after,
        () => atom("")
      );
      if (shape !== undefined) {
        return { end: after, falseTarget: last.target, links: slice };
      }
    }
    return;
  }

  private scanLinks(start: number): ConditionLink[] {
    const links: ConditionLink[] = [];
    let pc = start;
    let regionStart = start;
    for (let guard = 0; guard < SCAN_LIMIT; guard++) {
      const opcode = this.opcodeAt(pc);
      if (opcode === undefined || !CONDITIONAL_OPCODES.has(opcode)) {
        break;
      }
      const jumpPc = this.next(pc);
      if (this.opcodeAt(jumpPc) !== OP.JMP) {
        break;
      }
      const target = this.endOfIteration(this.jumpTarget(jumpPc), pc);
      if (target === undefined) {
        break;
      }
      links.push({ condPc: pc, jumpPc, regionStart, target });
      const after = this.next(jumpPc);
      const following = this.opcodeAt(after);
      // the next link either follows straight on, or after the instructions
      // that compute its operand
      const resumed =
        following !== undefined && CONDITIONAL_OPCODES.has(following)
          ? after
          : this.skipPureRun(after);
      if (resumed === undefined) {
        break;
      }
      regionStart = after;
      pc = resumed;
    }
    return links;
  }

  // A branch out of a condition is normally forward.
  private endOfIteration(target: number, pc: number): number | undefined {
    if (target > pc) {
      return target;
    }
    const latch = this.loopLatches.at(-1);
    if (
      target !== this.loopHeaders.at(-1) ||
      latch === undefined ||
      latch <= pc
    ) {
      return;
    }
    return latch;
  }

  // Walks forward while every instruction only computes a value and no local
  // is declared, returning the pc of the next conditional.
  private skipPureRun(
    start: number,
    fromBlockStart = false
  ): number | undefined {
    let pc = start;
    for (let guard = 0; guard < SCAN_LIMIT; guard++) {
      const opcode = this.opcodeAt(pc);
      if (opcode === undefined) {
        return;
      }
      if (CONDITIONAL_OPCODES.has(opcode)) {
        return pc === start ? undefined : pc;
      }
      // a local declared inside the run means the run is a statement block.
      if (
        !(fromBlockStart && pc === start) &&
        this.proto.locals.some((local) => local.startPc === pc)
      ) {
        return;
      }
      if (!this.isPure(this.at(pc))) {
        return;
      }
      pc = this.next(pc);
    }
    return;
  }

  private isPure(instruction: HksInstruction): boolean {
    if (PURE_OPCODES.has(instruction.opcode)) {
      return true;
    }
    if (instruction.opcode === OP.CALL_I_R1) {
      return instruction.b === OP_69_AFTER_SELF;
    }
    // a call whose results are dropped is a statement, not an operand
    return instruction.opcode === OP.CALL && instruction.c !== 1;
  }

  private foldCondition(
    links: readonly ConditionLink[],
    first: number,
    last: number,
    exitsFalse: (link: ConditionLink) => boolean,
    exitsTrue: (link: ConditionLink) => boolean,
    term: (index: number, taken: boolean) => Expr
  ): Expr | undefined {
    if (first > last) {
      return;
    }
    const link = links[first];
    if (first === last) {
      if (exitsFalse(link)) {
        return term(first, false);
      }
      return exitsTrue(link) ? term(first, true) : undefined;
    }
    if (exitsFalse(link) || exitsTrue(link)) {
      const rest = this.foldCondition(
        links,
        first + 1,
        last,
        exitsFalse,
        exitsTrue,
        term
      );
      if (rest === undefined) {
        return;
      }
      return exitsFalse(link)
        ? joinCondition(term(first, false), "and", rest)
        : joinCondition(term(first, true), "or", rest);
    }
    const split = links.findIndex(
      (candidate, index) =>
        index > first && candidate.regionStart === link.target
    );
    if (split < first + 2 || split > last) {
      return;
    }
    const inner = this.foldCondition(
      links,
      first + 1,
      split - 1,
      exitsFalse,
      exitsTrue,
      term
    );
    const outer = this.foldCondition(
      links,
      split,
      last,
      exitsFalse,
      exitsTrue,
      term
    );
    if (inner === undefined || outer === undefined) {
      return;
    }
    // Which way the group and outer combine depends on which sense of `first`
    // reaches the split, not on which caller this is.
    return this.jumpsOnTrue(link)
      ? joinCondition(
          joinCondition(term(first, true), "or", inner),
          "and",
          outer
        )
      : joinCondition(
          joinCondition(term(first, false), "and", inner),
          "or",
          outer
        );
  }

  // True when the jump is taken on a true operand (or-shaped), false when on
  // false (and-shaped); only meaningful in the split case.
  private jumpsOnTrue(link: ConditionLink): boolean {
    const instruction = this.at(link.condPc);
    if (instruction.opcode === OP.TEST || instruction.opcode === OP.TEST_R1) {
      return instruction.c !== 0;
    }
    return instruction.a !== 0;
  }

  // Builds the condition text for real.
  private materialize(start: number, plan: ConditionPlan): string {
    const conditions: Condition[] = [];
    let pc = start;
    for (const link of plan.links) {
      while (pc < link.condPc) {
        pc = this.emitInstruction(pc);
      }
      conditions.push(this.buildCondition(link.condPc));
      pc = this.next(link.jumpPc);
    }
    const last = plan.links.at(-1) as ConditionLink;
    const after = this.next(last.jumpPc);
    const tree = this.foldCondition(
      plan.links,
      0,
      plan.links.length - 1,
      (link) => link.target === last.target,
      (link) => link.target === after,
      (index, taken) =>
        taken ? conditions[index].negative : conditions[index].positive
    );
    return tree?.text ?? "true --[[unrecovered condition]]";
  }

  // The condition under which control falls through the JMP that follows -
  // `positive` - and its negation.
  private buildCondition(pc: number): Condition {
    const instruction = this.at(pc);
    const { a, b, c } = instruction;
    const invert = a !== 0;
    switch (instruction.opcode) {
      case OP.TEST:
      case OP.TEST_R1:
        return this.testCondition(a, c, pc);
      case OP.EQ:
        return this.flip(
          comparison(this.reg(b, pc), "==", this.rk(c, pc)),
          invert
        );
      // a constant B is the left operand: `1 == x` (lcode only puts a
      // constant there when the source did)
      case OP.EQ_K:
        return this.flip(
          comparison(this.constant(b), "==", this.rk(c, pc)),
          invert
        );
      case OP.LT:
        return this.flip(
          this.swappedOperands(b, c, pc)
            ? comparison(this.reg(c, pc), ">", this.reg(b, pc))
            : comparison(this.reg(b, pc), "<", this.rk(c, pc)),
          invert
        );
      // Lua compiles `a > b` by swapping the operands, so a constant on the
      // left of LT is a constant on the right of `>` in the source.
      case OP.LT_K:
        return this.flip(
          comparison(this.rk(c, pc), ">", this.constant(b)),
          invert
        );
      case OP.LE:
        return this.flip(
          this.swappedOperands(b, c, pc)
            ? comparison(this.reg(c, pc), ">=", this.reg(b, pc))
            : comparison(this.reg(b, pc), "<=", this.rk(c, pc)),
          invert
        );
      case OP.LE_K:
        return this.flip(
          comparison(this.rk(c, pc), ">=", this.constant(b)),
          invert
        );
      default:
        this.writer.gap(
          this.path,
          pc,
          `${opcodeName(instruction.opcode)} is not a conditional this decompiler knows`
        );
        return {
          negative: atom("false --[[unrecovered condition]]"),
          positive: atom("true --[[unrecovered condition]]"),
        };
    }
  }

  // `a > b` compiles to LT b a.
  private swappedOperands(b: number, c: number, pc: number): boolean {
    const locals = this.activeLocals(pc).length;
    return c < RK_CONSTANT_BIAS && c >= locals && b > c;
  }

  private testCondition(a: number, c: number, pc: number): Condition {
    const value = this.reg(a, pc);
    return c === 0
      ? { negative: notExpr(value), positive: value }
      : { negative: value, positive: notExpr(value) };
  }

  private flip(condition: Condition, invert: boolean): Condition {
    return invert
      ? { negative: condition.positive, positive: condition.negative }
      : condition;
  }

  // A logical expression compiles to the same machinery an `if` does: a chain
  // of conditional/JMP links, an optional tail block and an optional LOADBOOL pair.
  private tryLogicalExpression(pc: number): number | undefined {
    const links = this.scanLinks(pc);
    for (let length = links.length; length >= 1; length--) {
      const region = this.planLogicalRegion(links.slice(0, length));
      if (region !== undefined) {
        this.emitLogicalExpression(pc, region);
        return region.end;
      }
    }
    return;
  }

  private planLogicalRegion(
    links: readonly ConditionLink[]
  ): LogicalRegion | undefined {
    const last = links.at(-1) as ConditionLink;
    const blockStart = this.next(last.jumpPc);
    let block: LogicalBlock | undefined;
    let end: number;
    let register: number;
    if (this.isBooleanPair(last.target, blockStart)) {
      // the chain ends on the constants themselves: no final operand
      register = this.at(last.target).a;
      end = this.next(last.target);
    } else {
      const planned = this.planLogicalBlock(blockStart, last.target);
      if (planned === undefined) {
        return;
      }
      block = planned.block;
      end = planned.end;
      register = planned.register;
    }
    const constants = this.booleanConstantsBefore(end, register);
    // A leaf's jump lands on the LOADBOOL pair or the merge point; the trailing
    // block is one more entry whose target is `end`.
    const entries =
      block === undefined ? links : [...links, this.blockAsLink(block, end)];
    const shape = this.foldCondition(
      entries,
      0,
      entries.length - 1,
      (link) => this.valueExitsFalse(link, constants, end),
      (link) => this.valueExitsTrue(link, constants, end),
      () => atom("")
    );
    if (shape === undefined) {
      return;
    }
    return { block, constants, end, links, register };
  }

  // In a value, a raw-value leaf that jumps straight to the merge point keeps
  // its own value there.
  private keepsValueOnFalse(link: ConditionLink, end: number): boolean {
    if (link.target !== end || link.condPc < 0) {
      return false;
    }
    const opcode = this.at(link.condPc).opcode;
    return (
      (opcode === OP.TEST || opcode === OP.TEST_R1) && !this.jumpsOnTrue(link)
    );
  }

  private valueExitsFalse(
    link: ConditionLink,
    constants: BooleanConstants | undefined,
    end: number
  ): boolean {
    return (
      link.target === constants?.falsePc || this.keepsValueOnFalse(link, end)
    );
  }

  private valueExitsTrue(
    link: ConditionLink,
    constants: BooleanConstants | undefined,
    end: number
  ): boolean {
    return (
      link.target === constants?.truePc ||
      (link.target === end && !this.keepsValueOnFalse(link, end))
    );
  }

  // The trailing block shaped as one more link; condPc/jumpPc are never read.
  private blockAsLink(block: LogicalBlock, end: number): ConditionLink {
    return { condPc: -1, jumpPc: -1, regionStart: block.start, target: end };
  }

  // The tail block runs from the last link's fall-through to the merge point,
  // and may end in a jump over the boolean constants.
  private planLogicalBlock(
    blockStart: number,
    target: number
  ): { block: LogicalBlock; end: number; register: number } | undefined {
    if (target <= blockStart) {
      return;
    }
    // when the link short-circuits to a boolean constant, the block runs up
    // to that pair rather than up to the link's own target
    const pair = this.booleanPairAt(target);
    let blockEnd = pair === undefined ? target : pair.falsePc;
    let end = pair === undefined ? target : this.next(pair.truePc);
    const tailPc = this.lastPcBefore(blockEnd);
    if (tailPc !== undefined && this.at(tailPc).opcode === OP.JMP) {
      const beyond = this.jumpTarget(tailPc);
      if (beyond <= blockEnd || (pair !== undefined && beyond !== end)) {
        return;
      }
      end = beyond;
      blockEnd = tailPc;
    }
    if (blockEnd <= blockStart) {
      return;
    }
    const lastWrite = this.operandRunEnd(blockStart, blockEnd);
    if (lastWrite === undefined) {
      return;
    }
    const register = this.at(lastWrite).a;
    if (HKS_OPCODES.get(this.at(lastWrite).opcode)?.writesA !== true) {
      return;
    }
    return { block: { end: blockEnd, start: blockStart }, end, register };
  }

  // Every instruction in [start, stop) must compute a value, declare no local
  // and write no named local; the pc of the last one comes back.
  private operandRunEnd(start: number, stop: number): number | undefined {
    let last: number | undefined;
    let pc = start;
    while (pc < stop) {
      const opcode = this.opcodeAt(pc);
      if (
        opcode === undefined ||
        CONDITIONAL_OPCODES.has(opcode) ||
        !this.isPure(this.at(pc)) ||
        this.proto.locals.some((local) => local.startPc === pc) ||
        this.writesNamedLocal(pc)
      ) {
        return;
      }
      last = pc;
      pc = this.next(pc);
    }
    return pc === stop ? last : undefined;
  }

  private writesNamedLocal(pc: number): boolean {
    const instruction = this.at(pc);
    return (
      HKS_OPCODES.get(instruction.opcode)?.writesA === true &&
      this.localNameAt(instruction.a, pc) !== undefined
    );
  }

  // The LOADBOOL pair immediately before a merge point, when it is there and
  // it feeds the register the expression produces.
  private booleanConstantsBefore(
    end: number,
    register: number
  ): BooleanConstants | undefined {
    const truePc = this.lastPcBefore(end);
    if (truePc === undefined || this.next(truePc) !== end) {
      return;
    }
    const falsePc = this.previousPc(truePc);
    if (
      falsePc === undefined ||
      !this.isBooleanPair(truePc, falsePc) ||
      this.at(truePc).a !== register
    ) {
      return;
    }
    return { falsePc, truePc };
  }

  // The LOADBOOL pair a pc belongs to, named from either half.
  private booleanPairAt(pc: number): BooleanConstants | undefined {
    const previous = this.previousPc(pc);
    if (previous !== undefined && this.isBooleanPair(pc, previous)) {
      return { falsePc: previous, truePc: pc };
    }
    const following = this.next(pc);
    return this.isBooleanPair(following, pc)
      ? { falsePc: pc, truePc: following }
      : undefined;
  }

  private isBooleanPair(truePc: number, falsePc: number): boolean {
    if (
      this.opcodeAt(truePc) !== OP.LOADBOOL ||
      this.opcodeAt(falsePc) !== OP.LOADBOOL
    ) {
      return false;
    }
    const truthy = this.at(truePc);
    const falsy = this.at(falsePc);
    return (
      truthy.a === falsy.a &&
      truthy.b === 1 &&
      truthy.c === 0 &&
      falsy.b === 0 &&
      falsy.c === 1 &&
      this.next(falsePc) === truePc
    );
  }

  // Builds the value as `materialize` does: operands in program order, then
  // foldCondition over the same shape, so mixed and/or chains come out nested.
  private emitLogicalExpression(start: number, region: LogicalRegion): void {
    const conditions: Condition[] = [];
    let pc = start;
    for (const link of region.links) {
      while (pc < link.condPc) {
        pc = this.emitInstruction(pc);
      }
      conditions.push(this.buildCondition(link.condPc));
      pc = this.next(link.jumpPc);
    }
    let blockValue: Expr | undefined;
    if (region.block !== undefined) {
      let blockPc = region.block.start;
      while (blockPc < region.block.end) {
        blockPc = this.emitInstruction(blockPc);
      }
      blockValue = this.registers[region.register] ?? atom("nil");
    }
    const entries =
      region.block === undefined
        ? region.links
        : [...region.links, this.blockAsLink(region.block, region.end)];
    const term = (index: number, taken: boolean): Expr => {
      if (index === region.links.length) {
        return blockValue as Expr;
      }
      return taken ? conditions[index].negative : conditions[index].positive;
    };
    const value =
      this.foldCondition(
        entries,
        0,
        entries.length - 1,
        (link) => this.valueExitsFalse(link, region.constants, region.end),
        (link) => this.valueExitsTrue(link, region.constants, region.end),
        term
      ) ?? atom("true --[[unrecovered logical expression]]");
    this.assign(region.register, value, start);
  }

  // ---- instructions ------------------------------------------------------

  private emitInstruction(pc: number): number {
    const instruction = this.at(pc);
    const { a, b, c } = instruction;
    switch (instruction.opcode) {
      case OP.GETFIELD:
      case OP.GETFIELD_R1:
        this.assign(
          a,
          this.field(this.reg(b, pc), this.constantKey(c, pc)),
          pc
        );
        break;

      case OP.GETTABLE:
        this.assign(
          a,
          atom(`${prefix(this.reg(b, pc))}[${this.rk(c, pc).text}]`),
          pc
        );
        break;

      case OP.CALL:
        return this.emitCall(pc);

      case OP.MOVE:
        this.assign(a, this.reg(b, pc), pc);
        break;

      case OP.SELF: {
        const receiver = this.reg(b, pc);
        const name = this.methodName(c, pc);
        this.registers[a] =
          name === undefined
            ? // no `:` sugar exists for a computed method name, so this stays
              // the explicit form - the CALL window already holds the
              // receiver as the first argument
              atom(`${prefix(receiver)}[${this.rk(c, pc).text}]`)
            : {
                method: true,
                prec: PREC.ATOM,
                text: `${prefix(receiver)}:${name}`,
              };
        this.registers[a + 1] = receiver;
        break;
      }

      case OP.LOADBOOL:
        this.assign(a, atom(b === 0 ? "false" : "true"), pc);
        if (c !== 0) {
          this.writer.gap(
            this.path,
            pc,
            "LOADBOOL with C ~= 0 outside the comparison-as-a-value idiom skips the next instruction"
          );
        }
        break;

      case OP.SETFIELD:
      case OP.SETFIELD_R1:
        this.storeField(pc, a, this.constantKey(b, pc), this.rk(c, pc));
        break;

      case OP.SETTABLE:
        this.storeIndex(pc, a, this.reg(b, pc), this.rk(c, pc));
        break;

      case OP.SETTABLE_K:
        this.storeIndex(pc, a, this.constant(b), this.rk(c, pc));
        break;

      case OP.LOADK:
        this.assign(a, this.constant(instruction.bx), pc);
        break;

      case OP.LOADNIL:
        for (let r = a; r <= b; r++) {
          this.assign(r, atom("nil"), pc);
        }
        break;

      case OP.GETUPVAL:
        this.assign(a, atom(this.upvalueName(b)), pc);
        break;

      case OP.NOT:
        this.assign(a, notExpr(this.reg(b, pc)), pc);
        break;

      case OP.ADD:
        this.arith(pc, this.reg(b, pc), "+", PREC.SUM);
        break;
      case OP.ADD_K:
        this.arith(pc, this.constant(b), "+", PREC.SUM);
        break;
      case OP.SUB:
        this.arith(pc, this.reg(b, pc), "-", PREC.SUM);
        break;
      case OP.SUB_K:
        this.arith(pc, this.constant(b), "-", PREC.SUM);
        break;
      case OP.MUL:
        this.arith(pc, this.reg(b, pc), "*", PREC.PRODUCT);
        break;
      case OP.MUL_K:
        this.arith(pc, this.constant(b), "*", PREC.PRODUCT);
        break;
      case OP.DIV:
        this.arith(pc, this.reg(b, pc), "/", PREC.PRODUCT);
        break;
      case OP.DIV_K:
        this.arith(pc, this.constant(b), "/", PREC.PRODUCT);
        break;
      case OP.POW:
        this.arith(pc, this.reg(b, pc), "^", PREC.POW);
        break;

      case OP.NEWTABLE:
        this.registers[a] = { fields: [], prec: PREC.ATOM, text: "{}" };
        break;

      case OP.UNM:
        this.assign(
          a,
          {
            prec: PREC.UNARY,
            text: `-${wrap(this.reg(b, pc), PREC.UNARY + 1)}`,
          },
          pc
        );
        break;

      case OP.CLOSE:
        // a scope ending; nothing to say in source terms
        break;

      case OP.CLOSURE:
        return this.emitClosure(pc);

      case OP.CALL_I_R1:
        return this.emitCallR1(pc);

      case OP.GETGLOBAL:
        this.assign(a, atom(this.globalName(instruction.bx, pc)), pc);
        break;

      default:
        this.writer.gap(
          this.path,
          pc,
          `${opcodeName(instruction.opcode)} has no decompilation`
        );
        this.write(
          `-- DECOMPILER GAP: ${opcodeName(instruction.opcode)} A=${a} B=${b} C=${c}`,
          pc
        );
        break;
    }
    return this.next(pc);
  }

  private arith(pc: number, left: Expr, operator: string, prec: number): void {
    const instruction = this.at(pc);
    this.assign(
      instruction.a,
      binary(left, operator, this.rk(instruction.c, pc), prec),
      pc
    );
  }

  // The method name a SELF can be written with `:` sugar, or undefined when
  // the key is computed rather than a constant identifier.
  private methodName(operand: number, pc: number): string | undefined {
    if (operand < RK_CONSTANT_BIAS) {
      // past constant 255 the name can't be an RK operand, so lcode loads it
      // into a temporary first; `a:name()` still compiles to exactly that
      const held = this.registers[operand];
      const literal =
        this.localNameAt(operand, pc) === undefined && held !== undefined
          ? QUOTED_IDENTIFIER.exec(held.text)
          : null;
      return literal !== null && isIdentifier(literal[1])
        ? literal[1]
        : undefined;
    }
    const key = constantString(
      this.proto.constants[operand - RK_CONSTANT_BIAS]
    );
    return key !== undefined && isIdentifier(key) ? key : undefined;
  }

  private globalName(index: number, pc: number): string {
    const name = constantString(this.proto.constants[index]);
    if (name === undefined) {
      this.writer.gap(this.path, pc, "GETGLOBAL names a non-string constant");
      return "unrecovered_global";
    }
    return isIdentifier(name) ? name : `_G[${quoteLuaString(name)}]`;
  }

  // A store into a register that still holds an open table constructor is
  // part of that constructor, not a statement of its own.
  private storeField(
    pc: number,
    register: number,
    key: string,
    value: Expr
  ): void {
    const held = this.registers[register];
    if (
      held?.fields !== undefined &&
      this.localNameAt(register, pc) === undefined
    ) {
      held.fields.push({
        key: isIdentifier(key) ? key : quoteLuaString(key),
        value: this.settle(value).text,
      });
      return;
    }
    this.write(
      `${this.field(this.reg(register, pc), key).text} = ${this.settle(value).text}`,
      pc
    );
  }

  private storeIndex(
    pc: number,
    register: number,
    key: Expr,
    value: Expr
  ): void {
    const held = this.registers[register];
    if (
      held?.fields !== undefined &&
      this.localNameAt(register, pc) === undefined
    ) {
      held.fields.push({ key: key.text, value: this.settle(value).text });
      return;
    }
    this.write(
      `${prefix(this.reg(register, pc))}[${key.text}] = ${this.settle(value).text}`,
      pc
    );
  }

  private buildCall(pc: number, base: number, argCount: number): string {
    const callee = this.registers[base];
    const isMethod = callee?.method === true;
    const firstArg = isMethod ? base + 2 : base + 1;
    const methodWindow = isMethod ? argCount - 1 : argCount;
    const window = argCount === 0 ? 0 : methodWindow;
    const args = this.valueWindow(firstArg, window, pc);
    const target =
      callee === undefined ? this.reg(base, pc) : this.settle(callee);
    return `${prefix(target)}(${args.join(", ")})`;
  }

  private emitCall(pc: number): number {
    const instruction = this.at(pc);
    const { a, b, c } = instruction;
    const call = this.buildCall(pc, a, b);
    this.registers[a + 1] = undefined;
    if (c === 1) {
      this.write(call, pc);
      this.registers[a] = undefined;
      return this.next(pc);
    }
    if (c === 0) {
      this.registers[a] = { multi: true, prec: PREC.ATOM, text: call };
      this.multiTop = a;
      return this.next(pc);
    }
    if (c === 2) {
      this.assign(a, atom(call), pc);
      return this.next(pc);
    }
    const fanOut = this.tryResultFanOut(pc, a, c - 1, call);
    if (fanOut !== undefined) {
      return fanOut;
    }
    this.emitMultipleResults(pc, a, c - 1, call);
    return this.next(pc);
  }

  // A multiple assignment to locals that already exist lands its results in
  // scratch registers above them and then copies each one down, topmost first.
  private tryResultFanOut(
    pc: number,
    base: number,
    count: number,
    call: string
  ): number | undefined {
    const targets: number[] = new Array(count).fill(-1);
    let p = this.next(pc);
    for (let i = count - 1; i >= 0; i--) {
      if (this.opcodeAt(p) !== OP.MOVE) {
        return;
      }
      const move = this.at(p);
      if (move.b !== base + i) {
        return;
      }
      targets[i] = move.a;
      p = this.next(p);
    }
    const names = targets.map((register) => this.localNameAt(register, pc));
    if (names.some((name) => name === undefined)) {
      return;
    }
    this.write(`${names.join(", ")} = ${call}`, pc);
    targets.forEach((register, index) => {
      this.registers[register] = atom(names[index] as string);
    });
    for (let i = 0; i < count; i++) {
      this.registers[base + i] = undefined;
    }
    return p;
  }

  // A call with results in several registers is an assignment statement.
  private emitMultipleResults(
    pc: number,
    base: number,
    count: number,
    call: string
  ): void {
    const after = this.next(pc);
    const declared = this.activeLocals(after);
    // a generic for opens with one call filling the `(for generator)` triple;
    // the loop header is what names those, so nothing is written out here
    if (declared[base]?.name.startsWith("(") === true) {
      this.registers[base] = { multi: true, prec: PREC.ATOM, text: call };
      this.multiTop = base;
      for (let i = 1; i < count; i++) {
        this.registers[base + i] = undefined;
      }
      return;
    }
    const names: string[] = [];
    let allNew = true;
    for (let i = 0; i < count; i++) {
      const local = declared[base + i];
      if (local === undefined || local.name.startsWith("(")) {
        allNew = false;
        break;
      }
      names.push(local.name);
      allNew &&= local.startPc === after;
    }
    if (names.length !== count) {
      this.writer.gap(
        this.path,
        pc,
        `a call returns ${count} values into registers with no names, so the targets cannot be written out`
      );
      this.write(
        `-- DECOMPILER GAP: ${count} results of ${call} are dropped`,
        pc
      );
      for (let i = 0; i < count; i++) {
        this.registers[base + i] = undefined;
      }
      return;
    }
    this.write(`${allNew ? "local " : ""}${names.join(", ")} = ${call}`, pc);
    names.forEach((name, index) => {
      this.registers[base + index] = atom(name);
      const local = declared[base + index];
      const localIndex = this.proto.locals.indexOf(local);
      if (allNew && localIndex >= 0) {
        this.handledLocals.add(localIndex);
      }
    });
  }

  private emitCallR1(pc: number): number {
    const instruction = this.at(pc);
    if (instruction.b === OP_69_AFTER_SELF) {
      // the dispatch hint attached to a SELF; the CALL after it does the work
      return this.next(pc);
    }
    if (instruction.b === OP_69_BARE_CALL) {
      const callee = this.registers[instruction.a];
      this.write(
        `${callee === undefined ? this.reg(instruction.a, pc).text : this.settle(callee).text}()`,
        pc
      );
      this.registers[instruction.a] = undefined;
      return this.next(pc);
    }
    this.writer.gap(
      this.path,
      pc,
      `CALL_I_R1 with B=${instruction.b} C=${instruction.c} is a form the corpus never shows`
    );
    this.write(
      `-- DECOMPILER GAP: CALL_I_R1 B=${instruction.b} C=${instruction.c}`,
      pc
    );
    return this.next(pc);
  }

  private emitClosure(pc: number): number {
    const instruction = this.at(pc);
    const child = this.proto.protos[instruction.bx];
    if (child === undefined) {
      this.writer.gap(
        this.path,
        pc,
        "CLOSURE names a prototype that is absent"
      );
      this.write(`-- DECOMPILER GAP: CLOSURE Bx=${instruction.bx}`, pc);
      return this.next(pc);
    }
    const childPath = `${this.path}.${instruction.bx}`;
    const store = this.closureStore(pc, instruction.a, child);
    if (store !== undefined) {
      this.emitFunction(child, childPath, store.header, store.hasSelf, pc);
      this.registers[instruction.a] = undefined;
      return this.next(store.storePc);
    }
    // stored into a local declared right after it: `local function name`
    const after = this.next(pc);
    const localIndex = this.proto.locals.findIndex(
      (local, index) =>
        local.startPc === after &&
        !this.handledLocals.has(index) &&
        this.activeLocals(after).indexOf(local) === instruction.a
    );
    const local = this.proto.locals[localIndex];
    if (local !== undefined && !local.name.startsWith("(")) {
      this.handledLocals.add(localIndex);
      this.emitFunction(
        child,
        childPath,
        `local function ${local.name}`,
        false,
        pc
      );
      this.registers[instruction.a] = atom(local.name);
      return after;
    }
    // anything else is an anonymous function wherever it is consumed - the
    // `predicate_pack(function() ... end)` shape.
    this.registers[instruction.a] = this.functionExpression(
      child,
      childPath,
      pc
    );
    return after;
  }

  // A closure as an expression, its body rendered to lines that the
  // statement consuming it carries along.
  private functionExpression(child: Method, path: string, pc: number): Expr {
    const start = this.writer.lines.length;
    const indent = this.writer.indent;
    this.writer.indent = 0;
    this.emitFunction(child, path, "function", false, pc);
    this.writer.indent = indent;
    const lines = collapseElseIf(this.writer.lines.splice(start));
    return {
      prec: PREC.POW,
      text: lines
        .map((line) => `${"  ".repeat(line.indent)}${line.text}`)
        .join("\n"),
    };
  }

  // CLOSURE followed by a field store of that exact register is a function or
  // method declaration; render it with Lua's `function t:k()` sugar.
  private closureStore(
    pc: number,
    register: number,
    child: Method
  ): { hasSelf: boolean; header: string; storePc: number } | undefined {
    const storePc = this.next(pc);
    const opcode = this.opcodeAt(storePc);
    if (opcode !== OP.SETFIELD && opcode !== OP.SETFIELD_R1) {
      return;
    }
    const store = this.at(storePc);
    if (store.c !== register) {
      return;
    }
    const key = constantString(this.proto.constants[store.b]);
    if (key === undefined || !isIdentifier(key)) {
      return;
    }
    if (this.registers[store.a]?.fields !== undefined) {
      // still an open table constructor: keep it a constructor field
      return;
    }
    const base = this.reg(store.a, storePc);
    if (base.text.includes("unrecovered")) {
      return;
    }
    const hasSelf =
      child.numParams >= 1 &&
      child.locals.find((local) => local.startPc === 0)?.name === "self";
    return {
      hasSelf,
      header: `function ${wrap(base, PREC.ATOM)}${hasSelf ? ":" : "."}${key}`,
      storePc,
    };
  }

  private emitFunction(
    child: Method,
    path: string,
    header: string,
    hasSelf: boolean,
    pc: number
  ): void {
    const entry = child.locals.filter((local) => local.startPc === 0);
    const params: string[] = [];
    for (let i = 0; i < child.numParams; i++) {
      params.push(entry[i]?.name ?? `param_${i}`);
    }
    const shown = hasSelf ? params.slice(1) : params;
    if (child.isVararg !== 0) {
      shown.push("...");
    }
    this.write(
      `${header}(${shown.join(", ")})`,
      pc,
      `lines ${child.lineDefined}-${child.lastLineDefined}`
    );
    this.writer.indent += 1;
    new PrototypeDecompiler(this.writer, child, path).run();
    this.writer.indent -= 1;
    this.writer.write("end");
  }

  // At a join every temporary is dead: Lua never carries one across a block
  // boundary. Locals keep their names, which is where the readability lives.
  private forgetTemporaries(pc: number): void {
    const active = this.activeLocals(pc).length;
    for (let r = active; r < this.registers.length; r++) {
      this.registers[r] = undefined;
    }
    this.multiTop = undefined;
  }

  private emitRaw(start: number, stop: number, reason: string): number {
    this.write(`-- DECOMPILER GAP: ${reason}`, start);
    this.write(
      `-- pc ${start}..${stop - 1} of this function follows as raw instructions`,
      start
    );
    for (const pc of this.order) {
      if (pc < start || pc >= stop) {
        continue;
      }
      const instruction = this.at(pc);
      this.write(
        `-- ${String(pc).padStart(4)}  ${opcodeName(instruction.opcode).padEnd(9)} A=${instruction.a} B=${instruction.b} C=${instruction.c} Bx=${instruction.bx} sBx=${instruction.sbx}`,
        pc
      );
    }
    return stop;
  }
}

// `else` wrapping a single `if` that owns the whole block is an `elseif`.
function collapseElseIf(lines: readonly Line[]): Line[] {
  const out = lines.map((line) => ({ ...line }));
  let index = 0;
  while (index < out.length) {
    const collapsed = tryCollapseAt(out, index);
    index = collapsed ? Math.max(0, index - 1) : index + 1;
  }
  return out;
}

function tryCollapseAt(out: Line[], index: number): boolean {
  if (out[index].text !== "else") {
    return false;
  }
  const depth = out[index].indent;
  let close = -1;
  for (let j = index + 1; j < out.length; j++) {
    if (out[j].indent < depth) {
      break;
    }
    if (out[j].indent === depth && out[j].text === "end") {
      close = j;
      break;
    }
  }
  const head = out[index + 1];
  if (
    close < 0 ||
    head === undefined ||
    head.indent !== depth + 1 ||
    !(head.text.startsWith("if ") && head.text.includes(" then")) ||
    out[close - 1]?.indent !== depth + 1 ||
    out[close - 1]?.text !== "end"
  ) {
    return false;
  }
  for (let j = index + 2; j < close - 1; j++) {
    if (out[j].indent <= depth + 1) {
      return false;
    }
  }
  out[index] = { indent: depth, text: `else${head.text}` };
  out.splice(close - 1, 1);
  out.splice(index + 1, 1);
  for (let j = index + 1; j < close - 2; j++) {
    out[j] = { indent: out[j].indent - 1, text: out[j].text };
  }
  return true;
}

export function decompile(
  chunk: HksBytecode,
  options: LuaDecompileOptions = {}
): LuaDecompileResult {
  const writer = new ChunkWriter(options);
  const sourcePath = (chunk.root.source ?? SOURCE_PATH_ABSENT).replace(
    SOURCE_PREFIX,
    ""
  );
  writer.write(`-- ${chunk.tagId}  ${sourcePath}`);
  writer.write("-- Decompiled by @blamnetwork/bullshcript.");
  writer.write(
    "-- Local, upvalue and global names are the chunk's own debug info."
  );
  const headerEnd = writer.lines.length;
  new PrototypeDecompiler(writer, chunk.root, "0").run();
  writer.lines.splice(headerEnd, 0, { indent: 0, text: "" });
  const text = collapseElseIf(writer.lines)
    .map((line) =>
      line.text === "" ? "" : "  ".repeat(line.indent) + line.text
    )
    .join("\n");
  return {
    gaps: writer.gaps,
    source: `${text}\n`,
    sourcePath,
    tagId: chunk.tagId,
  };
}
