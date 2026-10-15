// Code generator for the TU0 compiler: Lua 5.1's lcode.c, function for
// function, with the alpha fork's (Havok Script's) changes folded in.

import type { CompilerLexer } from "./lexer.ts";

export const OP = {
  GETFIELD: 0,
  TEST: 1,
  CALL: 2,
  EQ: 4,
  EQ_BK: 5,
  MOVE: 7,
  SELF: 8,
  RETURN: 9,
  GETTABLE: 10,
  LOADBOOL: 13,
  TFORLOOP: 14,
  SETFIELD: 15,
  SETTABLE: 16,
  SETTABLE_BK: 17,
  TAILCALL: 22,
  LOADK: 25,
  LOADNIL: 26,
  SETGLOBAL: 27,
  JMP: 28,
  GETUPVAL: 38,
  SETUPVAL: 39,
  ADD: 40,
  ADD_BK: 41,
  SUB: 42,
  SUB_BK: 43,
  MUL: 44,
  MUL_BK: 45,
  DIV: 46,
  DIV_BK: 47,
  MOD: 48,
  MOD_BK: 49,
  POW: 50,
  POW_BK: 51,
  NEWTABLE: 52,
  UNM: 53,
  NOT: 54,
  LEN: 55,
  LT: 56,
  LT_BK: 57,
  LE: 58,
  LE_BK: 59,
  CONCAT: 60,
  TESTSET: 61,
  FORPREP: 62,
  FORLOOP: 63,
  SETLIST: 64,
  CLOSE: 65,
  CLOSURE: 66,
  VARARG: 67,
  TAILCALL_R1: 68,
  CALL_R1: 69,
  SETUPVAL_R1: 70,
  TEST_R1: 71,
  NOT_R1: 72,
  GETFIELD_R1: 73,
  SETFIELD_R1: 74,
  DATA: 76,
  GETGLOBAL: 91,
} as const;

export const NO_JUMP = -1;
const NO_REG = 0xff;
export const MULTRET = -1;

const MAXARG_A = 0xff;
const MAXARG_B = 0xff;
const MAXARG_C = 0x1ff;
const MAXARG_BX = 0x1_ffff;
const MAXARG_SBX = 0xffff;
// C keeps vanilla's 9-bit RK slot: 256 and up names constant (C - 256)
const BITRK = 256;
const MAXINDEXRK = BITRK - 1;
const MAXSTACK = 250;
export const FIELDS_PER_FLUSH = 50;

// DATA word tags, see opcodes.ts
const DATA_CAPTURE_REGISTER = 1;
const DATA_CAPTURE_UPVALUE = 2;
const DATA_GLOBAL_CACHE = 20;
// SELF's companion word, CALL_R1 A 3 3 after every SELF in the corpus
const SELF_COMPANION_COUNT = 3;
const SELF_STACK_SLOTS = 3;
// field reads carry two zeroed inline-cache words
const FIELD_CACHE_WORDS = 2;

export const VARARG_ISVARARG = 2;

function isK(x: number): boolean {
  return (x & BITRK) !== 0;
}

function rkAsK(index: number): number {
  return index | BITRK;
}

export interface HksInstruction {
  a: number;
  b: number;
  c: number;
  op: number;
}

function getBx(i: HksInstruction): number {
  return (i.b << 9) | i.c;
}

function setBx(i: HksInstruction, bx: number): void {
  i.b = (bx >>> 9) & 0xff;
  i.c = bx & 0x1ff;
}

function getSBx(i: HksInstruction): number {
  return getBx(i) - MAXARG_SBX;
}

function setSBx(i: HksInstruction, sbx: number): void {
  setBx(i, sbx + MAXARG_SBX);
}

type ExpKind =
  | "void"
  | "nil"
  | "true"
  | "false"
  | "k"
  | "knum"
  | "local"
  | "upval"
  | "global"
  | "indexed"
  | "jmp"
  | "relocable"
  | "nonreloc"
  | "call"
  | "vararg";

export interface ExpDesc {
  // indexed: the key's RK operand
  aux: number;
  // exit when false
  f: number;
  // register, constant index, pc or upvalue index, depending on k
  info: number;
  k: ExpKind;
  nval: number;
  // exit when true
  t: number;
}

export function expDesc(k: ExpKind = "void", info = 0): ExpDesc {
  return { k, info, aux: 0, nval: 0, t: NO_JUMP, f: NO_JUMP };
}

export function hasMultRet(k: ExpKind): boolean {
  return k === "call" || k === "vararg";
}

function hasJumps(e: ExpDesc): boolean {
  return e.t !== e.f;
}

function isNumeral(e: ExpDesc): boolean {
  return e.k === "knum" && e.t === NO_JUMP && e.f === NO_JUMP;
}

type LuaConstantValue =
  | { kind: "nil" }
  | { kind: "boolean"; value: boolean }
  | { kind: "number"; value: number }
  | { kind: "string"; value: string };

interface LocVar {
  endPc: number;
  name: string;
  startPc: number;
}

export interface BlockCnt {
  breaklist: number;
  isbreakable: boolean;
  nactvar: number;
  previous: BlockCnt | undefined;
  upval: boolean;
}

interface UpvalDesc {
  info: number;
  k: "local" | "upval";
}

// What a finished function hands its parent: lparser's Proto.
export interface CompiledProto {
  code: HksInstruction[];
  constants: LuaConstantValue[];
  isVararg: number;
  lastLineDefined: number;
  lineDefined: number;
  lineInfo: number[];
  locVars: LocVar[];
  maxStackSize: number;
  numParams: number;
  protos: CompiledProto[];
  upvalueNames: string[];
}

export type BinOpr =
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "mod"
  | "pow"
  | "concat"
  | "ne"
  | "eq"
  | "lt"
  | "le"
  | "gt"
  | "ge"
  | "and"
  | "or";

export type UnOpr = "minus" | "not" | "len";

const ARITH_OPS: Readonly<Record<string, readonly [number, number]>> = {
  // [register-B opcode, constant-B opcode]
  add: [OP.ADD, OP.ADD_BK],
  sub: [OP.SUB, OP.SUB_BK],
  mul: [OP.MUL, OP.MUL_BK],
  div: [OP.DIV, OP.DIV_BK],
  mod: [OP.MOD, OP.MOD_BK],
  pow: [OP.POW, OP.POW_BK],
};

const COMPARE_OPS: Readonly<Record<string, readonly [number, number]>> = {
  eq: [OP.EQ, OP.EQ_BK],
  lt: [OP.LT, OP.LT_BK],
  le: [OP.LE, OP.LE_BK],
};

// Ops lcode's testTMode is true for: a conditional followed by its JMP.
const TEST_MODE_OPS = new Set<number>([
  OP.EQ,
  OP.EQ_BK,
  OP.LT,
  OP.LT_BK,
  OP.LE,
  OP.LE_BK,
  OP.TEST,
  OP.TESTSET,
  OP.TFORLOOP,
]);

// luai_nummod: a - floor(a/b)*b
function luaMod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

export class FuncState {
  bl: BlockCnt | undefined;
  readonly code: HksInstruction[] = [];
  readonly constants: LuaConstantValue[] = [];
  freereg = 0;
  isVararg = 0;
  jpc = NO_JUMP;
  lastLineDefined = 0;
  lasttarget = -1;
  lineDefined = 0;
  readonly lineInfo: number[] = [];
  readonly locVars: LocVar[] = [];
  readonly ls: CompilerLexer;
  maxStackSize = 2;
  // indices into locVars of the active locals, by register
  readonly actvar: number[] = [];
  nactvar = 0;
  numParams = 0;
  readonly prev: FuncState | undefined;
  readonly protos: CompiledProto[] = [];
  readonly upvalueNames: string[] = [];
  readonly upvalues: UpvalDesc[] = [];
  private readonly booleanKeys = new Map<boolean, number>();
  // name -> index of the first of the two nil cache slots
  private readonly globalCaches = new Map<string, number>();
  private nilKey: number | undefined;
  private readonly numberKeys = new Map<number, number>();
  private readonly stringKeys = new Map<string, number>();

  constructor(ls: CompilerLexer, prev: FuncState | undefined) {
    this.ls = ls;
    this.prev = prev;
  }

  get pc(): number {
    return this.code.length;
  }

  // ---- constants ---------------------------------------------------------

  private addK(value: LuaConstantValue): number {
    this.constants.push(value);
    return this.constants.length - 1;
  }

  stringK(s: string): number {
    let index = this.stringKeys.get(s);
    if (index === undefined) {
      index = this.addK({ kind: "string", value: s });
      this.stringKeys.set(s, index);
    }
    return index;
  }

  numberK(n: number): number {
    // Map keys compare -0 and 0 equal, as Lua's table keys do
    let index = this.numberKeys.get(n);
    if (index === undefined) {
      index = this.addK({ kind: "number", value: n });
      this.numberKeys.set(n, index);
    }
    return index;
  }

  private boolK(b: boolean): number {
    let index = this.booleanKeys.get(b);
    if (index === undefined) {
      index = this.addK({ kind: "boolean", value: b });
      this.booleanKeys.set(b, index);
    }
    return index;
  }

  private nilK(): number {
    this.nilKey ??= this.addK({ kind: "nil" });
    return this.nilKey;
  }

  // The two nil slots a GETGLOBAL's DATA word names. Not shared with nilK:
  // `x == nil` gets its own nil in the corpus.
  private globalCache(name: string): number {
    let index = this.globalCaches.get(name);
    if (index === undefined) {
      index = this.addK({ kind: "nil" });
      this.addK({ kind: "nil" });
      this.globalCaches.set(name, index);
    }
    return index;
  }

  // ---- emission ----------------------------------------------------------

  private emit(i: HksInstruction, line: number): number {
    this.dischargejpc();
    this.code.push(i);
    this.lineInfo.push(line);
    return this.code.length - 1;
  }

  codeABC(op: number, a: number, b: number, c: number): number {
    if (a > MAXARG_A || b > MAXARG_B || c > MAXARG_C) {
      this.ls.error("function or expression too complex");
    }
    return this.emit({ op, a, b, c }, this.ls.lastline);
  }

  codeABx(op: number, a: number, bx: number): number {
    if (bx > MAXARG_BX) {
      this.ls.error("function or expression too complex");
    }
    const i: HksInstruction = { op, a, b: 0, c: 0 };
    setBx(i, bx);
    return this.emit(i, this.ls.lastline);
  }

  codeAsBx(op: number, a: number, sbx: number): number {
    return this.codeABx(op, a, sbx + MAXARG_SBX);
  }

  private codeData(a: number, bx: number): void {
    this.codeABx(OP.DATA, a, bx);
  }

  private codeFieldRead(op: number, b: number, c: number): number {
    const pc = this.codeABC(op, 0, b, c);
    for (let i = 0; i < FIELD_CACHE_WORDS; i++) {
      this.codeData(0, 0);
    }
    return pc;
  }

  fixline(line: number): void {
    this.lineInfo[this.pc - 1] = line;
  }

  checkstack(n: number): void {
    const newstack = this.freereg + n;
    if (newstack > this.maxStackSize) {
      if (newstack >= MAXSTACK) {
        this.ls.error("function or expression too complex");
      }
      this.maxStackSize = newstack;
    }
  }

  reserveregs(n: number): void {
    this.checkstack(n);
    this.freereg += n;
  }

  private freeRegister(reg: number): void {
    if (!isK(reg) && reg >= this.nactvar) {
      this.freereg -= 1;
      if (reg !== this.freereg) {
        this.ls.error(`internal error: freed register ${reg} out of order`);
      }
    }
  }

  private freeexp(e: ExpDesc): void {
    if (e.k === "nonreloc") {
      this.freeRegister(e.info);
    }
  }

  // ---- jumps -------------------------------------------------------------

  nil(from: number, n: number): void {
    // lcode.c also skips a LOADNIL at pc 0 whose registers are fresh; the
    // fork does not (186 corpus prototypes open with one)
    if (this.pc > this.lasttarget && this.pc > 0) {
      const previous = this.code[this.pc - 1];
      if (previous.op === OP.LOADNIL) {
        const pfrom = previous.a;
        const pto = previous.b;
        if (pfrom <= from && from <= pto + 1) {
          if (from + n - 1 > pto) {
            previous.b = from + n - 1;
          }
          return;
        }
      }
    }
    this.codeABC(OP.LOADNIL, from, from + n - 1, 0);
  }

  jump(): number {
    const jpc = this.jpc;
    this.jpc = NO_JUMP;
    const j = { list: this.codeAsBx(OP.JMP, 0, NO_JUMP) };
    this.concat(j, jpc);
    return j.list;
  }

  ret(first: number, nret: number): void {
    this.codeABC(OP.RETURN, first, nret + 1, 0);
  }

  private condjump(op: number, a: number, b: number, c: number): number {
    this.codeABC(op, a, b, c);
    return this.jump();
  }

  private fixjump(pc: number, dest: number): void {
    const offset = dest - (pc + 1);
    if (Math.abs(offset) > MAXARG_SBX) {
      this.ls.error("control structure too long");
    }
    setSBx(this.code[pc], offset);
  }

  getlabel(): number {
    this.lasttarget = this.pc;
    return this.pc;
  }

  private getjump(pc: number): number {
    const offset = getSBx(this.code[pc]);
    return offset === NO_JUMP ? NO_JUMP : pc + 1 + offset;
  }

  private getjumpcontrol(pc: number): HksInstruction {
    if (pc >= 1 && TEST_MODE_OPS.has(this.code[pc - 1].op)) {
      return this.code[pc - 1];
    }
    return this.code[pc];
  }

  private needValue(list: number): boolean {
    for (; list !== NO_JUMP; list = this.getjump(list)) {
      if (this.getjumpcontrol(list).op !== OP.TESTSET) {
        return true;
      }
    }
    return false;
  }

  private patchtestreg(node: number, reg: number): boolean {
    const i = this.getjumpcontrol(node);
    if (i.op !== OP.TESTSET) {
      return false;
    }
    if (reg !== NO_REG && reg !== i.b) {
      i.a = reg;
    } else {
      // no register to put the value in, or it is there already
      const source = i.b;
      i.op = OP.TEST;
      i.a = source;
      i.b = 0;
    }
    return true;
  }

  private removevalues(list: number): void {
    for (; list !== NO_JUMP; list = this.getjump(list)) {
      this.patchtestreg(list, NO_REG);
    }
  }

  private patchlistaux(
    list: number,
    vtarget: number,
    reg: number,
    dtarget: number
  ): void {
    while (list !== NO_JUMP) {
      const next = this.getjump(list);
      if (this.patchtestreg(list, reg)) {
        this.fixjump(list, vtarget);
      } else {
        this.fixjump(list, dtarget);
      }
      list = next;
    }
  }

  private dischargejpc(): void {
    const jpc = this.jpc;
    this.jpc = NO_JUMP;
    this.patchlistaux(jpc, this.pc, NO_REG, this.pc);
  }

  patchlist(list: number, target: number): void {
    if (target === this.pc) {
      this.patchtohere(list);
    } else {
      this.patchlistaux(list, target, NO_REG, target);
    }
  }

  patchtohere(list: number): void {
    this.getlabel();
    const holder = { list: this.jpc };
    this.concat(holder, list);
    this.jpc = holder.list;
  }

  concat(holder: { list: number }, l2: number): void {
    if (l2 === NO_JUMP) {
      return;
    }
    if (holder.list === NO_JUMP) {
      holder.list = l2;
      return;
    }
    let list = holder.list;
    for (let next = this.getjump(list); next !== NO_JUMP; ) {
      list = next;
      next = this.getjump(list);
    }
    this.fixjump(list, l2);
  }

  concatT(e: ExpDesc, l2: number): void {
    const holder = { list: e.t };
    this.concat(holder, l2);
    e.t = holder.list;
  }

  concatF(e: ExpDesc, l2: number): void {
    const holder = { list: e.f };
    this.concat(holder, l2);
    e.f = holder.list;
  }

  // ---- expressions -------------------------------------------------------

  setreturns(e: ExpDesc, nresults: number): void {
    if (e.k === "call") {
      this.code[e.info].c = nresults + 1;
    } else if (e.k === "vararg") {
      const i = this.code[e.info];
      i.b = nresults + 1;
      i.a = this.freereg;
      this.reserveregs(1);
    }
  }

  setmultret(e: ExpDesc): void {
    this.setreturns(e, MULTRET);
  }

  setoneret(e: ExpDesc): void {
    if (e.k === "call") {
      e.k = "nonreloc";
      e.info = this.code[e.info].a;
    } else if (e.k === "vararg") {
      this.code[e.info].b = 2;
      e.k = "relocable";
    }
  }

  dischargevars(e: ExpDesc): void {
    switch (e.k) {
      case "local":
        e.k = "nonreloc";
        break;
      case "upval":
        e.info = this.codeABC(OP.GETUPVAL, 0, e.info, 0);
        e.k = "relocable";
        break;
      case "global": {
        const name = this.constants[e.info];
        const cache = this.globalCache(
          name.kind === "string" ? name.value : ""
        );
        const pc = this.codeABx(OP.GETGLOBAL, 0, e.info);
        this.codeData(DATA_GLOBAL_CACHE, cache);
        e.info = pc;
        e.k = "relocable";
        break;
      }
      case "indexed": {
        this.freeRegister(e.aux);
        this.freeRegister(e.info);
        const key = e.aux;
        const constant = isK(key) ? this.constants[key - BITRK] : undefined;
        e.info =
          constant?.kind === "string"
            ? this.codeFieldRead(OP.GETFIELD, e.info, key - BITRK)
            : this.codeFieldRead(OP.GETTABLE, e.info, key);
        e.k = "relocable";
        break;
      }
      case "vararg":
      case "call":
        this.setoneret(e);
        break;
      default:
        break;
    }
  }

  private codeLabel(a: number, b: number, jump: number): number {
    this.getlabel();
    return this.codeABC(OP.LOADBOOL, a, b, jump);
  }

  private discharge2reg(e: ExpDesc, reg: number): void {
    this.dischargevars(e);
    switch (e.k) {
      case "nil":
        this.nil(reg, 1);
        break;
      case "false":
      case "true":
        this.codeABC(OP.LOADBOOL, reg, e.k === "true" ? 1 : 0, 0);
        break;
      case "k":
        this.codeABx(OP.LOADK, reg, e.info);
        break;
      case "knum":
        this.codeABx(OP.LOADK, reg, this.numberK(e.nval));
        break;
      case "relocable":
        this.code[e.info].a = reg;
        break;
      case "nonreloc":
        if (reg !== e.info) {
          this.codeABC(OP.MOVE, reg, e.info, 0);
        }
        break;
      default:
        return;
    }
    e.info = reg;
    e.k = "nonreloc";
  }

  private discharge2anyreg(e: ExpDesc): void {
    if (e.k !== "nonreloc") {
      this.reserveregs(1);
      this.discharge2reg(e, this.freereg - 1);
    }
  }

  private exp2reg(e: ExpDesc, reg: number): void {
    this.discharge2reg(e, reg);
    if (e.k === "jmp") {
      this.concatT(e, e.info);
    }
    if (hasJumps(e)) {
      let pf = NO_JUMP;
      let pt = NO_JUMP;
      if (this.needValue(e.t) || this.needValue(e.f)) {
        const fj = e.k === "jmp" ? NO_JUMP : this.jump();
        pf = this.codeLabel(reg, 0, 1);
        pt = this.codeLabel(reg, 1, 0);
        this.patchtohere(fj);
      }
      const final = this.getlabel();
      this.patchlistaux(e.f, final, reg, pf);
      this.patchlistaux(e.t, final, reg, pt);
    }
    e.f = NO_JUMP;
    e.t = NO_JUMP;
    e.info = reg;
    e.k = "nonreloc";
  }

  exp2nextreg(e: ExpDesc): void {
    this.dischargevars(e);
    this.freeexp(e);
    this.reserveregs(1);
    this.exp2reg(e, this.freereg - 1);
  }

  exp2anyreg(e: ExpDesc): number {
    this.dischargevars(e);
    if (e.k === "nonreloc") {
      if (!hasJumps(e)) {
        return e.info;
      }
      if (e.info >= this.nactvar) {
        this.exp2reg(e, e.info);
        return e.info;
      }
    }
    this.exp2nextreg(e);
    return e.info;
  }

  exp2val(e: ExpDesc): void {
    if (hasJumps(e)) {
      this.exp2anyreg(e);
    } else {
      this.dischargevars(e);
    }
  }

  exp2RK(e: ExpDesc): number {
    this.exp2val(e);
    switch (e.k) {
      case "knum":
      case "true":
      case "false":
      case "nil":
        if (this.constants.length <= MAXINDEXRK) {
          if (e.k === "nil") {
            e.info = this.nilK();
          } else if (e.k === "knum") {
            e.info = this.numberK(e.nval);
          } else {
            e.info = this.boolK(e.k === "true");
          }
          e.k = "k";
          return rkAsK(e.info);
        }
        break;
      case "k":
        if (e.info <= MAXINDEXRK) {
          return rkAsK(e.info);
        }
        break;
      default:
        break;
    }
    return this.exp2anyreg(e);
  }

  storevar(v: ExpDesc, ex: ExpDesc): void {
    switch (v.k) {
      case "local":
        this.freeexp(ex);
        this.exp2reg(ex, v.info);
        return;
      case "upval": {
        const e = this.exp2anyreg(ex);
        this.codeABC(OP.SETUPVAL, e, v.info, 0);
        break;
      }
      case "global": {
        const e = this.exp2anyreg(ex);
        this.codeABx(OP.SETGLOBAL, e, v.info);
        break;
      }
      case "indexed": {
        const e = this.exp2RK(ex);
        this.codeStore(v.info, v.aux, e);
        break;
      }
      default:
        this.ls.error("internal error: invalid assignment target");
    }
    this.freeexp(ex);
  }

  // R(table)[key] := RK(value): SETFIELD for a string constant, SETTABLE_BK for
  // another constant, SETTABLE for a register.
  codeStore(table: number, key: number, value: number): void {
    if (!isK(key)) {
      this.codeABC(OP.SETTABLE, table, key, value);
      return;
    }
    const index = key - BITRK;
    const op =
      this.constants[index].kind === "string" ? OP.SETFIELD : OP.SETTABLE_BK;
    this.codeABC(op, table, index, value);
  }

  self(e: ExpDesc, key: ExpDesc): void {
    this.exp2anyreg(e);
    this.freeexp(e);
    const func = this.freereg;
    // the fork's SELF wants a third slot above self (every corpus
    // prototype with a SELF at the stack top has maxstacksize func+3)
    this.checkstack(SELF_STACK_SLOTS);
    this.reserveregs(2);
    this.codeABC(OP.SELF, func, e.info, this.exp2RK(key));
    this.codeABC(OP.CALL_R1, func, SELF_COMPANION_COUNT, SELF_COMPANION_COUNT);
    this.freeexp(key);
    e.info = func;
    e.k = "nonreloc";
  }

  private invertjump(e: ExpDesc): void {
    const i = this.getjumpcontrol(e.info);
    i.a = i.a === 0 ? 1 : 0;
  }

  private jumponcond(e: ExpDesc, cond: number): number {
    if (e.k === "relocable") {
      const ie = this.code[e.info];
      if (ie.op === OP.NOT) {
        this.code.pop();
        this.lineInfo.pop();
        return this.condjump(OP.TEST, ie.b, 0, cond === 0 ? 1 : 0);
      }
    }
    this.discharge2anyreg(e);
    this.freeexp(e);
    return this.condjump(OP.TESTSET, NO_REG, e.info, cond);
  }

  goiftrue(e: ExpDesc): void {
    let pc: number;
    this.dischargevars(e);
    switch (e.k) {
      case "k":
      case "knum":
      case "true":
        pc = NO_JUMP;
        break;
      case "false":
        pc = this.jump();
        break;
      case "jmp":
        this.invertjump(e);
        pc = e.info;
        break;
      default:
        pc = this.jumponcond(e, 0);
        break;
    }
    this.concatF(e, pc);
    this.patchtohere(e.t);
    e.t = NO_JUMP;
  }

  private goiffalse(e: ExpDesc): void {
    let pc: number;
    this.dischargevars(e);
    switch (e.k) {
      case "nil":
      case "false":
        pc = NO_JUMP;
        break;
      case "true":
        pc = this.jump();
        break;
      case "jmp":
        pc = e.info;
        break;
      default:
        pc = this.jumponcond(e, 1);
        break;
    }
    this.concatT(e, pc);
    this.patchtohere(e.f);
    e.f = NO_JUMP;
  }

  private codenot(e: ExpDesc): void {
    this.dischargevars(e);
    switch (e.k) {
      case "nil":
      case "false":
        e.k = "true";
        break;
      case "k":
      case "knum":
      case "true":
        e.k = "false";
        break;
      case "jmp":
        this.invertjump(e);
        break;
      case "relocable":
      case "nonreloc":
        this.discharge2anyreg(e);
        this.freeexp(e);
        e.info = this.codeABC(OP.NOT, 0, e.info, 0);
        e.k = "relocable";
        break;
      default:
        this.ls.error("internal error: cannot negate expression");
    }
    const temp = e.f;
    e.f = e.t;
    e.t = temp;
    this.removevalues(e.f);
    this.removevalues(e.t);
  }

  indexed(t: ExpDesc, k: ExpDesc): void {
    t.aux = this.exp2RK(k);
    t.k = "indexed";
  }

  private constfolding(op: string, e1: ExpDesc, e2: ExpDesc): boolean {
    if (!(isNumeral(e1) && isNumeral(e2))) {
      return false;
    }
    const v1 = e1.nval;
    const v2 = e2.nval;
    let r: number;
    switch (op) {
      case "add":
        r = v1 + v2;
        break;
      case "sub":
        r = v1 - v2;
        break;
      case "mul":
        r = v1 * v2;
        break;
      case "div":
        if (v2 === 0) {
          return false;
        }
        r = v1 / v2;
        break;
      case "mod":
        if (v2 === 0) {
          return false;
        }
        r = luaMod(v1, v2);
        break;
      case "pow":
        r = v1 ** v2;
        break;
      case "unm":
        r = -v1;
        break;
      default:
        // len is never folded
        return false;
    }
    if (Number.isNaN(r)) {
      return false;
    }
    // lua_Number is a 4-byte float in this fork
    e1.nval = Math.fround(r);
    return true;
  }

  // lcode's codearith. `op` names the operation; the opcode is picked from
  // whether RK(B) came out a register or a constant.
  private codearith(op: string, e1: ExpDesc, e2: ExpDesc): void {
    if (this.constfolding(op, e1, e2)) {
      return;
    }
    const unary = op === "unm" || op === "len";
    const o2 = unary ? 0 : this.exp2RK(e2);
    const o1 = this.exp2RK(e1);
    if (o1 > o2) {
      this.freeexp(e1);
      this.freeexp(e2);
    } else {
      this.freeexp(e2);
      this.freeexp(e1);
    }
    let opcode: number;
    let b = o1;
    if (op === "unm") {
      opcode = OP.UNM;
    } else if (op === "len") {
      opcode = OP.LEN;
    } else if (op === "concat") {
      opcode = OP.CONCAT;
    } else {
      const [registerOp, constantOp] = ARITH_OPS[op];
      opcode = isK(o1) ? constantOp : registerOp;
      b = isK(o1) ? o1 - BITRK : o1;
    }
    if (isK(b) && (opcode === OP.UNM || opcode === OP.LEN)) {
      this.ls.error("internal error: unary operand is a constant");
    }
    e1.info = this.codeABC(opcode, 0, b, o2);
    e1.k = "relocable";
  }

  private codecomp(op: string, cond: number, e1: ExpDesc, e2: ExpDesc): void {
    let o1 = this.exp2RK(e1);
    let o2 = this.exp2RK(e2);
    this.freeexp(e2);
    this.freeexp(e1);
    if (cond === 0 && op !== "eq") {
      // a > b is b < a
      const temp = o1;
      o1 = o2;
      o2 = temp;
      cond = 1;
    }
    const [registerOp, constantOp] = COMPARE_OPS[op];
    const opcode = isK(o1) ? constantOp : registerOp;
    e1.info = this.condjump(opcode, cond, isK(o1) ? o1 - BITRK : o1, o2);
    e1.k = "jmp";
  }

  prefix(op: UnOpr, e: ExpDesc): void {
    const e2 = expDesc("knum");
    switch (op) {
      case "minus":
        if (!isNumeral(e)) {
          this.exp2anyreg(e);
        }
        this.codearith("unm", e, e2);
        break;
      case "not":
        this.codenot(e);
        break;
      default:
        this.exp2anyreg(e);
        this.codearith("len", e, e2);
        break;
    }
  }

  infix(op: BinOpr, v: ExpDesc): void {
    switch (op) {
      case "and":
        this.goiftrue(v);
        break;
      case "or":
        this.goiffalse(v);
        break;
      case "concat":
        this.exp2nextreg(v);
        break;
      case "add":
      case "sub":
      case "mul":
      case "div":
      case "mod":
      case "pow":
        if (!isNumeral(v)) {
          this.exp2RK(v);
        }
        break;
      default:
        this.exp2RK(v);
        break;
    }
  }

  posfix(op: BinOpr, e1: ExpDesc, e2: ExpDesc): void {
    switch (op) {
      case "and":
        this.dischargevars(e2);
        this.concatF(e2, e1.f);
        Object.assign(e1, e2);
        break;
      case "or":
        this.dischargevars(e2);
        this.concatT(e2, e1.t);
        Object.assign(e1, e2);
        break;
      case "concat": {
        this.exp2val(e2);
        const last = e2.k === "relocable" ? this.code[e2.info] : undefined;
        if (last?.op === OP.CONCAT) {
          this.freeexp(e1);
          last.b = e1.info;
          e1.k = "relocable";
          e1.info = e2.info;
        } else {
          this.exp2nextreg(e2);
          this.codearith("concat", e1, e2);
        }
        break;
      }
      case "eq":
        this.codecomp("eq", 1, e1, e2);
        break;
      case "ne":
        this.codecomp("eq", 0, e1, e2);
        break;
      case "lt":
        this.codecomp("lt", 1, e1, e2);
        break;
      case "le":
        this.codecomp("le", 1, e1, e2);
        break;
      case "gt":
        this.codecomp("lt", 0, e1, e2);
        break;
      case "ge":
        this.codecomp("le", 0, e1, e2);
        break;
      default:
        this.codearith(op, e1, e2);
        break;
    }
  }

  setlist(base: number, nelems: number, tostore: number): void {
    const c = Math.floor((nelems - 1) / FIELDS_PER_FLUSH) + 1;
    const b = tostore === MULTRET ? 0 : tostore;
    if (c > MAXARG_C) {
      // vanilla spills C into an extra word; the fork's form of that word
      // is unknown, so refuse rather than guess
      this.ls.error("table constructor has too many array items");
    }
    this.codeABC(OP.SETLIST, base, b, c);
    this.freereg = base + 1;
  }

  // CLOSURE for the child function just closed, then one DATA word per
  // upvalue it captures.
  closure(child: FuncState, proto: CompiledProto): number {
    this.protos.push(proto);
    const pc = this.codeABx(OP.CLOSURE, 0, this.protos.length - 1);
    for (const upvalue of child.upvalues) {
      this.codeData(
        upvalue.k === "local" ? DATA_CAPTURE_REGISTER : DATA_CAPTURE_UPVALUE,
        upvalue.info
      );
    }
    return pc;
  }

  finish(): CompiledProto {
    applyR1(this.code);
    return {
      code: this.code,
      constants: this.constants,
      isVararg: this.isVararg,
      lastLineDefined: this.lastLineDefined,
      lineDefined: this.lineDefined,
      lineInfo: this.lineInfo,
      locVars: this.locVars,
      maxStackSize: this.maxStackSize,
      numParams: this.numParams,
      protos: this.protos,
      upvalueNames: this.upvalueNames,
    };
  }
}

// hks's _R1 ops repeat an operation on a register the previous instruction just wrote. In the alpha chunks
// the writers that count are GETFIELD, GETFIELD_R1, GETUPVAL, MOVE, NEWTABLE and GETGLOBAL; CALL, LOADBOOL
// and GETTABLE never do, and a jump target is never an _R1. Writers the chunks never show are left out.

const R1_SOURCES = new Set<number>([
  OP.GETFIELD,
  OP.GETFIELD_R1,
  OP.GETUPVAL,
  OP.MOVE,
  OP.NEWTABLE,
  OP.GETGLOBAL,
]);

// base op -> [its _R1 twin, the operand that must have been written]
const R1_TWINS: ReadonlyMap<number, readonly [number, "a" | "b"]> = new Map([
  [OP.GETFIELD, [OP.GETFIELD_R1, "b"]],
  [OP.SETFIELD, [OP.SETFIELD_R1, "a"]],
  [OP.TEST, [OP.TEST_R1, "a"]],
  [OP.CALL, [OP.CALL_R1, "a"]],
  [OP.TAILCALL, [OP.TAILCALL_R1, "a"]],
  [OP.NOT, [OP.NOT_R1, "b"]],
  [OP.SETUPVAL, [OP.SETUPVAL_R1, "a"]],
] as const);

function jumpTargets(code: readonly HksInstruction[]): Set<number> {
  const targets = new Set<number>();
  for (let pc = 0; pc < code.length; pc++) {
    const i = code[pc];
    if (i.op === OP.JMP || i.op === OP.FORPREP || i.op === OP.FORLOOP) {
      targets.add(pc + 1 + getSBx(i));
    }
  }
  return targets;
}

function applyR1(code: HksInstruction[]): void {
  const targets = jumpTargets(code);
  let previous: HksInstruction | undefined;
  for (let pc = 0; pc < code.length; pc++) {
    const i = code[pc];
    if (i.op === OP.DATA) {
      continue;
    }
    const twin = R1_TWINS.get(i.op);
    if (
      twin !== undefined &&
      previous !== undefined &&
      !targets.has(pc) &&
      R1_SOURCES.has(previous.op) &&
      previous.a === i[twin[1]] &&
      // GETFIELD_R1 is only ever the in-place read (A == B)
      (i.op !== OP.GETFIELD || i.a === i.b)
    ) {
      i.op = twin[0];
    }
    previous = i;
  }
}
