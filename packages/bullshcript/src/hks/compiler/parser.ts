// Parser for the TU0 compiler: Lua 5.1's lparser.c.

import {
  type BinOpr,
  type BlockCnt,
  type CompiledProto,
  type ExpDesc,
  expDesc,
  FIELDS_PER_FLUSH,
  FuncState,
  hasMultRet,
  MULTRET,
  NO_JUMP,
  OP,
  type UnOpr,
  VARARG_ISVARARG,
} from "./codegen.ts";
import { CompilerLexer, type LuaTokenKind } from "./lexer.ts";

const MAX_VARS = 200;
const MAX_UPVALUES = 60;
const MAX_NESTING = 200;
const UNARY_PRIORITY = 8;

const BINARY_OPERATORS: Readonly<Record<string, BinOpr>> = {
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "%": "mod",
  "^": "pow",
  "..": "concat",
  "~=": "ne",
  "==": "eq",
  "<": "lt",
  "<=": "le",
  ">": "gt",
  ">=": "ge",
  and: "and",
  or: "or",
};

// [left, right] priority; right < left makes an operator right-associative
const PRIORITY: Readonly<Record<BinOpr, readonly [number, number]>> = {
  add: [6, 6],
  sub: [6, 6],
  mul: [7, 7],
  div: [7, 7],
  mod: [7, 7],
  pow: [10, 9],
  concat: [5, 4],
  ne: [3, 3],
  eq: [3, 3],
  lt: [3, 3],
  le: [3, 3],
  gt: [3, 3],
  ge: [3, 3],
  and: [2, 2],
  or: [1, 1],
};

const UNARY_OPERATORS: Readonly<Record<string, UnOpr>> = {
  not: "not",
  "-": "minus",
  "#": "len",
};

interface ConsControl {
  na: number;
  nh: number;
  t: ExpDesc;
  tostore: number;
  v: ExpDesc;
}

interface LhsAssign {
  prev: LhsAssign | undefined;
  v: ExpDesc;
}

export class Parser {
  private fs!: FuncState;
  private readonly ls: CompilerLexer;
  private nesting = 0;

  constructor(source: string, chunkName: string) {
    this.ls = new CompilerLexer(source, chunkName);
  }

  parseChunk(): CompiledProto {
    const fs = this.openFunc();
    fs.isVararg = VARARG_ISVARARG;
    this.ls.next();
    this.chunk();
    this.check("<eof>");
    return this.closeFunc();
  }

  private get token(): LuaTokenKind {
    return this.ls.token.kind;
  }

  private error(message: string): never {
    this.ls.syntaxError(message);
  }

  private check(kind: LuaTokenKind): void {
    if (this.token !== kind) {
      this.error(`'${kind}' expected`);
    }
  }

  private checknext(kind: LuaTokenKind): void {
    this.check(kind);
    this.ls.next();
  }

  private testnext(kind: LuaTokenKind): boolean {
    if (this.token === kind) {
      this.ls.next();
      return true;
    }
    return false;
  }

  private checkMatch(what: LuaTokenKind, who: LuaTokenKind, where: number) {
    if (this.testnext(what)) {
      return;
    }
    if (where === this.ls.linenumber) {
      this.error(`'${what}' expected`);
    }
    this.error(`'${what}' expected (to close '${who}' at line ${where})`);
  }

  private strCheckname(): string {
    this.check("<name>");
    const name = this.ls.token.text;
    this.ls.next();
    return name;
  }

  private codestring(e: ExpDesc, s: string): void {
    e.k = "k";
    e.info = this.fs.stringK(s);
    e.t = NO_JUMP;
    e.f = NO_JUMP;
  }

  private checkname(e: ExpDesc): void {
    this.codestring(e, this.strCheckname());
  }

  private enterlevel(): void {
    this.nesting += 1;
    if (this.nesting > MAX_NESTING) {
      this.ls.error("chunk has too many syntax levels");
    }
  }

  private leavelevel(): void {
    this.nesting -= 1;
  }

  // ---- variables ---------------------------------------------------------

  private registerlocalvar(name: string): number {
    this.fs.locVars.push({ name, startPc: 0, endPc: 0 });
    return this.fs.locVars.length - 1;
  }

  private newLocalvar(name: string, n: number): void {
    const fs = this.fs;
    if (fs.nactvar + n + 1 > MAX_VARS) {
      this.ls.error(`too many local variables (limit is ${MAX_VARS})`);
    }
    fs.actvar[fs.nactvar + n] = this.registerlocalvar(name);
  }

  private getlocvar(fs: FuncState, i: number) {
    return fs.locVars[fs.actvar[i]];
  }

  private adjustlocalvars(nvars: number): void {
    const fs = this.fs;
    fs.nactvar += nvars;
    for (; nvars > 0; nvars--) {
      this.getlocvar(fs, fs.nactvar - nvars).startPc = fs.pc;
    }
  }

  private removevars(tolevel: number): void {
    const fs = this.fs;
    while (fs.nactvar > tolevel) {
      fs.nactvar -= 1;
      this.getlocvar(fs, fs.nactvar).endPc = fs.pc;
    }
  }

  private indexupvalue(fs: FuncState, name: string, v: ExpDesc): number {
    const kind = v.k === "local" ? "local" : "upval";
    for (let i = 0; i < fs.upvalues.length; i++) {
      const upvalue = fs.upvalues[i];
      if (upvalue.k === kind && upvalue.info === v.info) {
        return i;
      }
    }
    if (fs.upvalues.length + 1 > MAX_UPVALUES) {
      this.ls.error(`too many upvalues (limit is ${MAX_UPVALUES})`);
    }
    fs.upvalueNames.push(name);
    fs.upvalues.push({ k: kind, info: v.info });
    return fs.upvalues.length - 1;
  }

  private searchvar(fs: FuncState, name: string): number {
    for (let i = fs.nactvar - 1; i >= 0; i--) {
      if (this.getlocvar(fs, i).name === name) {
        return i;
      }
    }
    return -1;
  }

  private markupval(fs: FuncState, level: number): void {
    let bl = fs.bl;
    while (bl !== undefined && bl.nactvar > level) {
      bl = bl.previous;
    }
    if (bl !== undefined) {
      bl.upval = true;
    }
  }

  private singlevaraux(
    fs: FuncState | undefined,
    name: string,
    v: ExpDesc,
    base: boolean
  ): "global" | "local" | "upval" {
    if (fs === undefined) {
      Object.assign(v, expDesc("global"));
      return "global";
    }
    const index = this.searchvar(fs, name);
    if (index >= 0) {
      Object.assign(v, expDesc("local", index));
      if (!base) {
        this.markupval(fs, index);
      }
      return "local";
    }
    if (this.singlevaraux(fs.prev, name, v, false) === "global") {
      return "global";
    }
    v.info = this.indexupvalue(fs, name, v);
    v.k = "upval";
    return "upval";
  }

  private singlevar(v: ExpDesc): void {
    const name = this.strCheckname();
    if (this.singlevaraux(this.fs, name, v, true) === "global") {
      v.info = this.fs.stringK(name);
    }
  }

  private adjustAssign(nvars: number, nexps: number, e: ExpDesc): void {
    const fs = this.fs;
    let extra = nvars - nexps;
    if (hasMultRet(e.k)) {
      extra += 1;
      if (extra < 0) {
        extra = 0;
      }
      fs.setreturns(e, extra);
      if (extra > 1) {
        fs.reserveregs(extra - 1);
      }
    } else {
      if (e.k !== "void") {
        fs.exp2nextreg(e);
      }
      if (extra > 0) {
        const reg = fs.freereg;
        fs.reserveregs(extra);
        fs.nil(reg, extra);
      }
    }
  }

  private enterblock(bl: BlockCnt, isbreakable: boolean): void {
    const fs = this.fs;
    bl.breaklist = NO_JUMP;
    bl.isbreakable = isbreakable;
    bl.nactvar = fs.nactvar;
    bl.upval = false;
    bl.previous = fs.bl;
    fs.bl = bl;
  }

  private leaveblock(): void {
    const fs = this.fs;
    const bl = fs.bl as BlockCnt;
    fs.bl = bl.previous;
    this.removevars(bl.nactvar);
    if (bl.upval) {
      fs.codeABC(OP.CLOSE, bl.nactvar, 0, 0);
    }
    fs.freereg = fs.nactvar;
    fs.patchtohere(bl.breaklist);
  }

  private newBlock(): BlockCnt {
    return {
      breaklist: NO_JUMP,
      isbreakable: false,
      nactvar: 0,
      previous: undefined,
      upval: false,
    };
  }

  private openFunc(): FuncState {
    const fs = new FuncState(this.ls, this.fs);
    this.fs = fs;
    return fs;
  }

  private closeFunc(): CompiledProto {
    const fs = this.fs;
    this.removevars(0);
    fs.ret(0, 0);
    const proto = fs.finish();
    this.fs = fs.prev as FuncState;
    return proto;
  }

  private pushclosure(child: FuncState, proto: CompiledProto, v: ExpDesc) {
    Object.assign(v, expDesc("relocable", this.fs.closure(child, proto)));
  }

  // ---- expressions -------------------------------------------------------

  private field(v: ExpDesc): void {
    const key = expDesc();
    this.fs.exp2anyreg(v);
    this.ls.next();
    this.checkname(key);
    this.fs.indexed(v, key);
  }

  private yindex(v: ExpDesc): void {
    this.ls.next();
    this.expr(v);
    this.fs.exp2val(v);
    this.checknext("]");
  }

  private recfield(cc: ConsControl): void {
    const fs = this.fs;
    const reg = fs.freereg;
    const key = expDesc();
    const val = expDesc();
    if (this.token === "<name>") {
      this.checkname(key);
    } else {
      this.yindex(key);
    }
    cc.nh += 1;
    this.checknext("=");
    const rkkey = fs.exp2RK(key);
    this.expr(val);
    fs.codeStore(cc.t.info, rkkey, fs.exp2RK(val));
    fs.freereg = reg;
  }

  private closelistfield(cc: ConsControl): void {
    if (cc.v.k === "void") {
      return;
    }
    this.fs.exp2nextreg(cc.v);
    cc.v.k = "void";
    if (cc.tostore === FIELDS_PER_FLUSH) {
      this.fs.setlist(cc.t.info, cc.na, cc.tostore);
      cc.tostore = 0;
    }
  }

  private lastlistfield(cc: ConsControl): void {
    if (cc.tostore === 0) {
      return;
    }
    if (hasMultRet(cc.v.k)) {
      this.fs.setmultret(cc.v);
      this.fs.setlist(cc.t.info, cc.na, MULTRET);
      cc.na -= 1;
    } else {
      if (cc.v.k !== "void") {
        this.fs.exp2nextreg(cc.v);
      }
      this.fs.setlist(cc.t.info, cc.na, cc.tostore);
    }
  }

  private listfield(cc: ConsControl): void {
    this.expr(cc.v);
    cc.na += 1;
    cc.tostore += 1;
  }

  private constructor_(t: ExpDesc): void {
    const fs = this.fs;
    const line = this.ls.linenumber;
    const pc = fs.codeABC(OP.NEWTABLE, 0, 0, 0);
    const cc: ConsControl = { na: 0, nh: 0, tostore: 0, t, v: expDesc() };
    Object.assign(t, expDesc("relocable", pc));
    fs.exp2nextreg(t);
    this.checknext("{");
    do {
      if (this.token === "}") {
        break;
      }
      this.closelistfield(cc);
      if (this.token === "<name>") {
        if (this.ls.peek().kind === "=") {
          this.recfield(cc);
        } else {
          this.listfield(cc);
        }
      } else if (this.token === "[") {
        this.recfield(cc);
      } else {
        this.listfield(cc);
      }
    } while (this.testnext(",") || this.testnext(";"));
    this.checkMatch("}", "{", line);
    this.lastlistfield(cc);
    fs.code[pc].b = int2fb(cc.na);
    fs.code[pc].c = int2fb(cc.nh);
  }

  private parlist(): void {
    const fs = this.fs;
    let nparams = 0;
    fs.isVararg = 0;
    if (this.token !== ")") {
      do {
        if (this.token === "<name>") {
          this.newLocalvar(this.strCheckname(), nparams);
          nparams += 1;
        } else if (this.token === "...") {
          this.ls.next();
          fs.isVararg |= VARARG_ISVARARG;
        } else {
          this.error("<name> or '...' expected");
        }
      } while (fs.isVararg === 0 && this.testnext(","));
    }
    this.adjustlocalvars(nparams);
    fs.numParams = fs.nactvar;
    fs.reserveregs(fs.nactvar);
  }

  private body(e: ExpDesc, needself: boolean, line: number): void {
    const child = this.openFunc();
    child.lineDefined = line;
    this.checknext("(");
    if (needself) {
      this.newLocalvar("self", 0);
      this.adjustlocalvars(1);
    }
    this.parlist();
    this.checknext(")");
    this.chunk();
    child.lastLineDefined = this.ls.linenumber;
    this.checkMatch("end", "function", line);
    const proto = this.closeFunc();
    this.pushclosure(child, proto, e);
  }

  private explist1(v: ExpDesc): number {
    let n = 1;
    this.expr(v);
    while (this.testnext(",")) {
      this.fs.exp2nextreg(v);
      this.expr(v);
      n += 1;
    }
    return n;
  }

  private funcargs(f: ExpDesc): void {
    const fs = this.fs;
    const args = expDesc();
    const line = this.ls.linenumber;
    if (this.token === "(") {
      if (line !== this.ls.lastline) {
        this.error("ambiguous syntax (function call x new statement)");
      }
      this.ls.next();
      // re-read: next() moved on from the "(" narrowed above
      if (this.ls.token.kind === ")") {
        args.k = "void";
      } else {
        this.explist1(args);
        fs.setmultret(args);
      }
      this.checkMatch(")", "(", line);
    } else if (this.token === "{") {
      this.constructor_(args);
    } else if (this.token === "<string>") {
      this.codestring(args, this.ls.token.text);
      this.ls.next();
    } else {
      this.error("function arguments expected");
    }
    const base = f.info;
    let nparams: number;
    if (hasMultRet(args.k)) {
      nparams = MULTRET;
    } else {
      if (args.k !== "void") {
        fs.exp2nextreg(args);
      }
      nparams = fs.freereg - (base + 1);
    }
    Object.assign(
      f,
      expDesc("call", fs.codeABC(OP.CALL, base, nparams + 1, 2))
    );
    fs.fixline(line);
    fs.freereg = base + 1;
  }

  private prefixexp(v: ExpDesc): void {
    if (this.token === "(") {
      const line = this.ls.linenumber;
      this.ls.next();
      this.expr(v);
      this.checkMatch(")", "(", line);
      this.fs.dischargevars(v);
      return;
    }
    if (this.token === "<name>") {
      this.singlevar(v);
      return;
    }
    this.error("unexpected symbol");
  }

  private primaryexp(v: ExpDesc): void {
    const fs = this.fs;
    this.prefixexp(v);
    for (;;) {
      switch (this.token) {
        case ".":
          this.field(v);
          break;
        case "[": {
          const key = expDesc();
          fs.exp2anyreg(v);
          this.yindex(key);
          fs.indexed(v, key);
          break;
        }
        case ":": {
          const key = expDesc();
          this.ls.next();
          this.checkname(key);
          fs.self(v, key);
          this.funcargs(v);
          break;
        }
        case "(":
        case "<string>":
        case "{":
          fs.exp2nextreg(v);
          this.funcargs(v);
          break;
        default:
          return;
      }
    }
  }

  private simpleexp(v: ExpDesc): void {
    const t = this.ls.token;
    switch (t.kind) {
      case "<number>":
        Object.assign(v, expDesc("knum"));
        v.nval = t.number;
        break;
      case "<string>":
        this.codestring(v, t.text);
        break;
      case "nil":
        Object.assign(v, expDesc("nil"));
        break;
      case "true":
        Object.assign(v, expDesc("true"));
        break;
      case "false":
        Object.assign(v, expDesc("false"));
        break;
      case "...": {
        const fs = this.fs;
        if (fs.isVararg === 0) {
          this.error("cannot use '...' outside a vararg function");
        }
        Object.assign(v, expDesc("vararg", fs.codeABC(OP.VARARG, 0, 1, 0)));
        break;
      }
      case "{":
        this.constructor_(v);
        return;
      case "function":
        this.ls.next();
        this.body(v, false, this.ls.linenumber);
        return;
      default:
        this.primaryexp(v);
        return;
    }
    this.ls.next();
  }

  private subexpr(v: ExpDesc, limit: number): BinOpr | undefined {
    this.enterlevel();
    const uop = UNARY_OPERATORS[this.token];
    if (uop === undefined) {
      this.simpleexp(v);
    } else {
      this.ls.next();
      this.subexpr(v, UNARY_PRIORITY);
      this.fs.prefix(uop, v);
    }
    let op: BinOpr | undefined = BINARY_OPERATORS[this.token];
    while (op !== undefined && PRIORITY[op][0] > limit) {
      const v2 = expDesc();
      this.ls.next();
      this.fs.infix(op, v);
      const nextop = this.subexpr(v2, PRIORITY[op][1]);
      this.fs.posfix(op, v, v2);
      op = nextop;
    }
    this.leavelevel();
    return op;
  }

  private expr(v: ExpDesc): void {
    this.subexpr(v, 0);
  }

  // ---- statements --------------------------------------------------------

  private blockFollow(): boolean {
    switch (this.token) {
      case "else":
      case "elseif":
      case "end":
      case "until":
      case "<eof>":
        return true;
      default:
        return false;
    }
  }

  private block(): void {
    const bl = this.newBlock();
    this.enterblock(bl, false);
    this.chunk();
    this.leaveblock();
  }

  private checkConflict(lh: LhsAssign | undefined, v: ExpDesc): void {
    const fs = this.fs;
    const extra = fs.freereg;
    let conflict = false;
    for (; lh !== undefined; lh = lh.prev) {
      if (lh.v.k === "indexed") {
        if (lh.v.info === v.info) {
          conflict = true;
          lh.v.info = extra;
        }
        if (lh.v.aux === v.info) {
          conflict = true;
          lh.v.aux = extra;
        }
      }
    }
    if (conflict) {
      fs.codeABC(OP.MOVE, fs.freereg, v.info, 0);
      fs.reserveregs(1);
    }
  }

  private assignment(lh: LhsAssign, nvars: number): void {
    const fs = this.fs;
    const e = expDesc();
    if (!["local", "upval", "global", "indexed"].includes(lh.v.k)) {
      this.error("syntax error");
    }
    if (this.testnext(",")) {
      const nv: LhsAssign = { prev: lh, v: expDesc() };
      this.primaryexp(nv.v);
      if (nv.v.k === "local") {
        this.checkConflict(lh, nv.v);
      }
      this.assignment(nv, nvars + 1);
    } else {
      this.checknext("=");
      const nexps = this.explist1(e);
      if (nexps === nvars) {
        fs.setoneret(e);
        fs.storevar(lh.v, e);
        return;
      }
      this.adjustAssign(nvars, nexps, e);
      if (nexps > nvars) {
        fs.freereg -= nexps - nvars;
      }
    }
    fs.storevar(lh.v, expDesc("nonreloc", fs.freereg - 1));
  }

  private cond(): number {
    const v = expDesc();
    this.expr(v);
    if (v.k === "nil") {
      v.k = "false";
    }
    this.fs.goiftrue(v);
    return v.f;
  }

  private breakstat(): void {
    const fs = this.fs;
    let bl = fs.bl;
    let upval = false;
    while (bl !== undefined && !bl.isbreakable) {
      upval ||= bl.upval;
      bl = bl.previous;
    }
    if (bl === undefined) {
      this.error("no loop to break");
    }
    if (upval) {
      fs.codeABC(OP.CLOSE, bl.nactvar, 0, 0);
    }
    const holder = { list: bl.breaklist };
    fs.concat(holder, fs.jump());
    bl.breaklist = holder.list;
  }

  private whilestat(line: number): void {
    const fs = this.fs;
    const bl = this.newBlock();
    this.ls.next();
    const whileinit = fs.getlabel();
    const condexit = this.cond();
    this.enterblock(bl, true);
    this.checknext("do");
    this.block();
    fs.patchlist(fs.jump(), whileinit);
    // the fork files the back jump under the `while` line
    fs.fixline(line);
    this.checkMatch("end", "while", line);
    this.leaveblock();
    fs.patchtohere(condexit);
  }

  private repeatstat(line: number): void {
    const fs = this.fs;
    const repeatInit = fs.getlabel();
    const bl1 = this.newBlock();
    const bl2 = this.newBlock();
    this.enterblock(bl1, true);
    this.enterblock(bl2, false);
    this.ls.next();
    this.chunk();
    this.checkMatch("until", "repeat", line);
    const condexit = this.cond();
    if (bl2.upval) {
      this.breakstat();
      fs.patchtohere(condexit);
      this.leaveblock();
      fs.patchlist(fs.jump(), repeatInit);
    } else {
      this.leaveblock();
      fs.patchlist(condexit, repeatInit);
    }
    this.leaveblock();
  }

  private exp1(): void {
    const e = expDesc();
    this.expr(e);
    this.fs.exp2nextreg(e);
  }

  private forbody(base: number, line: number, nvars: number, isnum: boolean) {
    const fs = this.fs;
    const bl = this.newBlock();
    this.adjustlocalvars(3);
    this.checknext("do");
    const prep = isnum ? fs.codeAsBx(OP.FORPREP, base, NO_JUMP) : fs.jump();
    this.enterblock(bl, false);
    this.adjustlocalvars(nvars);
    fs.reserveregs(nvars);
    this.block();
    this.leaveblock();
    fs.patchtohere(prep);
    const endfor = isnum
      ? fs.codeAsBx(OP.FORLOOP, base, NO_JUMP)
      : fs.codeABC(OP.TFORLOOP, base, 0, nvars);
    fs.fixline(line);
    fs.patchlist(isnum ? endfor : fs.jump(), prep + 1);
  }

  private fornum(varname: string, line: number): void {
    const fs = this.fs;
    const base = fs.freereg;
    this.newLocalvar("(for index)", 0);
    this.newLocalvar("(for limit)", 1);
    this.newLocalvar("(for step)", 2);
    this.newLocalvar(varname, 3);
    this.checknext("=");
    this.exp1();
    this.checknext(",");
    this.exp1();
    if (this.testnext(",")) {
      this.exp1();
    } else {
      fs.codeABx(OP.LOADK, fs.freereg, fs.numberK(1));
      fs.reserveregs(1);
    }
    this.forbody(base, line, 1, true);
  }

  private forlist(indexname: string): void {
    const fs = this.fs;
    const e = expDesc();
    let nvars = 0;
    const base = fs.freereg;
    this.newLocalvar("(for generator)", nvars++);
    this.newLocalvar("(for state)", nvars++);
    this.newLocalvar("(for control)", nvars++);
    this.newLocalvar(indexname, nvars++);
    while (this.testnext(",")) {
      this.newLocalvar(this.strCheckname(), nvars++);
    }
    this.checknext("in");
    const line = this.ls.linenumber;
    this.adjustAssign(3, this.explist1(e), e);
    fs.checkstack(3);
    this.forbody(base, line, nvars - 3, false);
  }

  private forstat(line: number): void {
    const bl = this.newBlock();
    this.enterblock(bl, true);
    this.ls.next();
    const varname = this.strCheckname();
    if (this.token === "=") {
      this.fornum(varname, line);
    } else if (this.token === "," || this.token === "in") {
      this.forlist(varname);
    } else {
      this.error("'=' or 'in' expected");
    }
    this.checkMatch("end", "for", line);
    this.leaveblock();
  }

  private testThenBlock(): number {
    this.ls.next();
    const condexit = this.cond();
    this.checknext("then");
    this.block();
    return condexit;
  }

  private ifstat(line: number): void {
    const fs = this.fs;
    const escapes = { list: NO_JUMP };
    let flist = this.testThenBlock();
    while (this.token === "elseif") {
      fs.concat(escapes, fs.jump());
      fs.patchtohere(flist);
      flist = this.testThenBlock();
    }
    if (this.token === "else") {
      fs.concat(escapes, fs.jump());
      fs.patchtohere(flist);
      this.ls.next();
      this.block();
    } else {
      fs.concat(escapes, flist);
    }
    fs.patchtohere(escapes.list);
    this.checkMatch("end", "if", line);
  }

  private localfunc(): void {
    const fs = this.fs;
    const b = expDesc();
    this.newLocalvar(this.strCheckname(), 0);
    const v = expDesc("local", fs.freereg);
    fs.reserveregs(1);
    this.adjustlocalvars(1);
    this.body(b, false, this.ls.linenumber);
    fs.storevar(v, b);
    // debug info only sees the variable after this point
    this.getlocvar(fs, fs.nactvar - 1).startPc = fs.pc;
  }

  private localstat(): void {
    const e = expDesc();
    let nvars = 0;
    let nexps: number;
    do {
      this.newLocalvar(this.strCheckname(), nvars++);
    } while (this.testnext(","));
    if (this.testnext("=")) {
      nexps = this.explist1(e);
    } else {
      e.k = "void";
      nexps = 0;
    }
    this.adjustAssign(nvars, nexps, e);
    this.adjustlocalvars(nvars);
  }

  private funcname(v: ExpDesc): boolean {
    let needself = false;
    this.singlevar(v);
    while (this.token === ".") {
      this.field(v);
    }
    if (this.token === ":") {
      needself = true;
      this.field(v);
    }
    return needself;
  }

  private funcstat(line: number): void {
    const v = expDesc();
    const b = expDesc();
    this.ls.next();
    const needself = this.funcname(v);
    this.body(b, needself, line);
    // lparser.c moves the store to the `function` line; the fork leaves it
    // on the `end` line with its CLOSURE
    this.fs.storevar(v, b);
  }

  private exprstat(): void {
    const fs = this.fs;
    const v: LhsAssign = { prev: undefined, v: expDesc() };
    this.primaryexp(v.v);
    if (v.v.k === "call") {
      fs.code[v.v.info].c = 1;
    } else {
      this.assignment(v, 1);
    }
  }

  private retstat(): void {
    const fs = this.fs;
    const e = expDesc();
    let first: number;
    let nret: number;
    this.ls.next();
    if (this.blockFollow() || this.token === ";") {
      first = 0;
      nret = 0;
    } else {
      nret = this.explist1(e);
      if (hasMultRet(e.k)) {
        fs.setmultret(e);
        if (e.k === "call" && nret === 1) {
          fs.code[e.info].op = OP.TAILCALL;
        }
        first = fs.nactvar;
        nret = MULTRET;
      } else if (nret === 1) {
        first = fs.exp2anyreg(e);
      } else {
        fs.exp2nextreg(e);
        first = fs.nactvar;
      }
    }
    fs.ret(first, nret);
  }

  // true when the statement must be the last in its block
  private statement(): boolean {
    const line = this.ls.linenumber;
    switch (this.token) {
      case "if":
        this.ifstat(line);
        return false;
      case "while":
        this.whilestat(line);
        return false;
      case "do":
        this.ls.next();
        this.block();
        this.checkMatch("end", "do", line);
        return false;
      case "for":
        this.forstat(line);
        return false;
      case "repeat":
        this.repeatstat(line);
        return false;
      case "function":
        this.funcstat(line);
        return false;
      case "local":
        this.ls.next();
        if (this.testnext("function")) {
          this.localfunc();
        } else {
          this.localstat();
        }
        return false;
      case "return":
        this.retstat();
        return true;
      case "break":
        this.ls.next();
        this.breakstat();
        return true;
      default:
        this.exprstat();
        return false;
    }
  }

  private chunk(): void {
    let islast = false;
    this.enterlevel();
    while (!(islast || this.blockFollow())) {
      islast = this.statement();
      this.testnext(";");
      this.fs.freereg = this.fs.nactvar;
    }
    this.leavelevel();
  }
}

// luaO_int2fb: a table size hint as a "floating point byte", eeeeexxx
function int2fb(x: number): number {
  let e = 0;
  while (x >= 16) {
    x = (x + 1) >> 1;
    e += 1;
  }
  if (x < 8) {
    return x;
  }
  return ((e + 1) << 3) | (x - 8);
}
