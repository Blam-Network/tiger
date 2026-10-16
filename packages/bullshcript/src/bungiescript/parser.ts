// Parser for BungieScript: declarations (members, threads, methods, delegates,
// command scripts) and Python 2 statements plus `switch`.

import { fnv1, parseHashLiteral } from "../host/tags/name_hash.ts";
import type {
  BsActivityBundle,
  BsBinaryOp,
  BsCase,
  BsDecl,
  BsDeclKind,
  BsEnumValue,
  BsExpr,
  BsFile,
  BsFileKind,
  BsIfBranch,
  BsMember,
  BsStmt,
  BsType,
} from "./ast.ts";
import { BsCompileError, type BsToken, tokenize } from "./lexer.ts";

const FILE_KINDS: readonly BsFileKind[] = ["bs", "es", "esp", "esu"];
const DECL_KINDS: readonly BsDeclKind[] = ["class", "struct", "enum"];
const COMPARISONS = new Set(["==", "!=", "<", "<=", ">", ">="]);
const TERM_OPERATORS = new Set(["*", "/", "%"]);

export function bsFileKind(path: string): BsFileKind | undefined {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return FILE_KINDS.find((kind) => kind === extension);
}

// "es/venus/x/enc_x_amb1.es" -> "enc_x_amb1", as is a chunk's source path
// "@es\venus\x\enc_x_amb1.es". A script's name: what other scripts, handles
// and its bundle hash know it by.
export function scriptStem(path: string): string {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  const base = path.slice(cut + 1);
  const name = base.startsWith("@") ? base.slice(1) : base;
  const dot = name.lastIndexOf(".");
  return dot < 0 ? name : name.slice(0, dot);
}

// Every class on the native c_encounter base carries this prefix, and no other
// class does. Only the class name has it: bundles, hosts and threads all know
// an encounter by its file stem.
export const ENCOUNTER_PREFIX = "c_encounter__";

// The class an encounter's file declares: implicit in a `.es` file, written
// out in a `.bs` file such as story_common.bs.
export function encounterDeclName(path: string): string {
  return `${ENCOUNTER_PREFIX}${scriptStem(path)}`;
}

// The one class an es-family file declares: `.es` files get the compiler's
// `c_encounter__` prefix, `.esp`/`.esu` are named after the file. The class
// name only; the script itself is still known by its stem.
export function implicitDeclName(path: string, kind: BsFileKind): string {
  return kind === "es" ? encounterDeclName(path) : scriptStem(path);
}

// A bundle whose name never cracked keeps its script as unknown_<hash> (true
// name unknown); every other file's name is the one that hashes to its bundle.
export const UNKNOWN_NAME = /^unknown_([0-9a-f]{8})$/;

// The fnv1 a script is known by: its file stem, or the hash an unknown_<hash>
// stem stands for.
export function bundleHashOf(stem: string): number {
  const unknown = UNKNOWN_NAME.exec(stem);
  return unknown ? Number.parseInt(unknown[1] ?? "", 16) >>> 0 : fnv1(stem);
}

export function parseBungieScript(source: string, path: string): BsFile {
  const normalized = path.replaceAll("\\", "/");
  const kind = bsFileKind(normalized);
  if (kind === undefined) {
    throw new BsCompileError(
      "not a BungieScript source (.bs/.es/.esp/.esu)",
      normalized,
      1
    );
  }
  const parser = new BsParser(source, normalized);
  const decls =
    kind === "bs"
      ? parser.bsFile()
      : [parser.implicitDecl(implicitDeclName(normalized, kind))];
  return { decls, kind, path: normalized };
}

class BsParser {
  private readonly path: string;
  private position = 0;
  private readonly source: string;
  private readonly tokens: BsToken[];

  constructor(source: string, path: string) {
    this.source = source;
    this.path = path;
    this.tokens = tokenize(source, path);
  }

  private get token(): BsToken {
    return this.tokens[this.position];
  }

  private peek(offset = 1): BsToken {
    return this.tokens[
      Math.min(this.position + offset, this.tokens.length - 1)
    ];
  }

  private next(): BsToken {
    const token = this.token;
    if (token.kind !== "eof") {
      this.position += 1;
    }
    return token;
  }

  private error(message: string, token: BsToken = this.token): never {
    throw new BsCompileError(
      `${message} near ${describe(token)}`,
      this.path,
      token.line
    );
  }

  private atOp(text: string): boolean {
    return this.token.kind === "op" && this.token.text === text;
  }

  private atWord(text: string): boolean {
    return this.token.kind === "name" && this.token.text === text;
  }

  private acceptOp(text: string): boolean {
    if (this.atOp(text)) {
      this.next();
      return true;
    }
    return false;
  }

  private acceptWord(text: string): boolean {
    if (this.atWord(text)) {
      this.next();
      return true;
    }
    return false;
  }

  private expectOp(text: string): BsToken {
    if (!this.atOp(text)) {
      this.error(`'${text}' expected`);
    }
    return this.next();
  }

  private expectWord(text: string): BsToken {
    if (!this.atWord(text)) {
      this.error(`'${text}' expected`);
    }
    return this.next();
  }

  private expectName(): BsToken {
    if (this.token.kind !== "name") {
      this.error("name expected");
    }
    return this.next();
  }

  private expectKind(kind: BsToken["kind"]): BsToken {
    if (this.token.kind !== kind) {
      this.error(`${kind} expected`);
    }
    return this.next();
  }

  private skipNewlines(): void {
    while (this.token.kind === "newline") {
      this.next();
    }
  }

  bsFile(): BsDecl[] {
    const decls: BsDecl[] = [];
    this.skipNewlines();
    while (this.token.kind !== "eof") {
      const activityBundle = this.decorator();
      const start = this.token;
      const kind = DECL_KINDS.find((k) => this.atWord(k));
      if (kind === undefined) {
        this.error("'class', 'struct' or 'enum' expected");
      }
      this.next();
      const name = this.expectName().text;
      const base =
        this.acceptOp(":") && !this.atKindNewline()
          ? this.expectName().text
          : undefined;
      if (base !== undefined) {
        this.expectOp(":");
      }
      if (activityBundle !== undefined && kind !== "class") {
        this.error("@activity_bundle decorates a class", start);
      }
      const members = this.declSuite(kind);
      decls.push({
        activityBundle,
        base,
        end: this.peek(-1).end,
        implicit: false,
        kind,
        line: start.line,
        members,
        name,
        start: start.start,
      });
      this.skipNewlines();
    }
    return decls;
  }

  // `@activity_bundle("name")` or `@activity_bundle(0x<hash>)` on its own
  // line, if there is one here
  private decorator(): BsActivityBundle | undefined {
    if (!this.acceptOp("@")) {
      return;
    }
    const name = this.expectName();
    if (name.text !== "activity_bundle") {
      this.error(`unknown decorator '@${name.text}'`, name);
    }
    this.expectOp("(");
    const arg = this.token;
    let hash: number | undefined;
    if (arg.kind === "string") {
      hash = fnv1(arg.text);
    } else if (arg.kind === "number") {
      hash = parseHashLiteral(arg.text);
    }
    if (hash === undefined) {
      this.error("@activity_bundle takes a bundle name or a 0x<hash>", arg);
    }
    this.next();
    this.expectOp(")");
    this.expectKind("newline");
    this.skipNewlines();
    return { hash, line: name.line, text: arg.text };
  }

  // after `class name :`, is this the block's own colon (followed by a
  // newline or a one-line body) rather than a base name?
  private atKindNewline(): boolean {
    return this.token.kind !== "name";
  }

  implicitDecl(name: string): BsDecl {
    const members: BsMember[] = [];
    this.skipNewlines();
    // an es-family file's decorator heads the file, as its class's would
    const activityBundle = this.decorator();
    while (this.token.kind !== "eof") {
      const member = this.member();
      if (member !== undefined) {
        members.push(member);
      }
      this.skipNewlines();
    }
    return {
      activityBundle,
      base: undefined,
      end: this.source.length,
      implicit: true,
      kind: "class",
      line: 1,
      members,
      name,
      start: 0,
    };
  }

  private declSuite(kind: BsDeclKind): BsMember[] {
    this.expectKind("newline");
    this.skipNewlines();
    this.expectKind("indent");
    const members: BsMember[] = [];
    let value = 0;
    while (!this.atBlockEnd()) {
      if (kind === "enum") {
        const entry = this.enumValue(value);
        if (entry !== undefined) {
          members.push(entry);
          value = entry.value + 1;
        }
      } else {
        const member = this.member();
        if (member !== undefined) {
          members.push(member);
        }
      }
      this.skipNewlines();
    }
    this.next();
    return members;
  }

  private enumValue(nextValue: number): BsEnumValue | undefined {
    if (this.acceptWord("pass")) {
      this.expectKind("newline");
      return;
    }
    const name = this.expectName();
    let value = nextValue;
    if (this.acceptOp("=")) {
      const negative = this.acceptOp("-");
      const number = this.expectKind("number").value;
      value = negative ? -number : number;
    }
    this.expectKind("newline");
    return {
      end: name.end,
      kind: "enum_value",
      line: name.line,
      name: name.text,
      start: name.start,
      value,
    };
  }

  private member(): BsMember | undefined {
    const start = this.token;
    if (this.acceptWord("pass")) {
      this.expectKind("newline");
      return;
    }
    if (this.atWord("startup") || this.atWord("thread")) {
      const startup = this.acceptWord("startup");
      this.expectWord("thread");
      const name = this.expectName().text;
      this.expectOp(":");
      const body = this.suite();
      return {
        body,
        end: this.peek(-1).end,
        kind: "thread",
        line: start.line,
        name,
        start: start.start,
        startup,
      };
    }
    if (this.atWord("delegate")) {
      this.next();
      const name = this.expectName().text;
      const params = this.paramList();
      this.expectKind("newline");
      return {
        end: this.peek(-1).end,
        kind: "delegate",
        line: start.line,
        name,
        params,
        start: start.start,
      };
    }
    if (this.atWord("command_script")) {
      this.next();
      const name = this.expectName().text;
      const params = this.paramList();
      this.expectOp(":");
      const body = this.suite();
      return {
        body,
        end: this.peek(-1).end,
        kind: "command_script",
        line: start.line,
        name,
        params,
        start: start.start,
      };
    }
    if (this.atWord("implements")) {
      this.next();
      const interfaceName = this.expectName().text;
      const name = this.expectName().text;
      this.expectKind("newline");
      return {
        end: this.peek(-1).end,
        interfaceName,
        kind: "implements",
        line: start.line,
        name,
        start: start.start,
      };
    }
    const isStatic = this.acceptWord("static");
    if (this.atWord("def")) {
      this.next();
      let name = this.expectName().text;
      let owner: string | undefined;
      if (this.acceptOp(".")) {
        owner = name;
        name = this.expectName().text;
      }
      const params = this.paramList();
      this.expectOp(":");
      const body = this.suite();
      return {
        body,
        end: this.peek(-1).end,
        isStatic,
        kind: "def",
        line: start.line,
        name,
        owner,
        params,
        start: start.start,
      };
    }
    const declared = this.type();
    const name = this.expectName().text;
    // `T name[N]` declares a C array as `T[N] name` does
    const type = this.atOp("[")
      ? {
          ...declared,
          count: this.arrayCount(),
          text: `${declared.text}[${this.peek(-2).text}]`,
        }
      : declared;
    const defaultValue = this.acceptOp("=") ? this.expr() : undefined;
    let bind: BsExpr[] | undefined;
    if (this.acceptWord("bind")) {
      this.expectOp("(");
      bind = this.atOp(")") ? [] : this.exprList();
      this.expectOp(")");
    }
    this.expectKind("newline");
    return {
      bind,
      default: defaultValue,
      end: this.peek(-1).end,
      isStatic,
      kind: "field",
      line: start.line,
      name,
      start: start.start,
      type,
    };
  }

  private type(): BsType {
    const start = this.token;
    const name = this.expectName().text;
    const args: (BsType | number)[] = [];
    if (this.acceptOp("<")) {
      do {
        if (this.token.kind === "number") {
          args.push(this.next().value);
        } else {
          args.push(this.type());
        }
      } while (this.acceptOp(","));
      this.expectOp(">");
    }
    const count = this.atOp("[") ? this.arrayCount() : undefined;
    return {
      args,
      count,
      name,
      text: this.source.slice(start.start, this.peek(-1).end),
    };
  }

  private arrayCount(): number {
    this.expectOp("[");
    const count = this.expectKind("number").value;
    this.expectOp("]");
    return count;
  }

  private paramList(): string[] {
    this.expectOp("(");
    const params: string[] = [];
    if (!this.atOp(")")) {
      do {
        params.push(this.expectName().text);
      } while (this.acceptOp(","));
    }
    this.expectOp(")");
    return params;
  }

  // ---- statements --------------------------------------------------------

  private atBlockEnd(): boolean {
    const kind = this.token.kind;
    return kind === "dedent" || kind === "eof";
  }

  private suite(): BsStmt[] {
    if (this.token.kind !== "newline") {
      return this.simpleStatements();
    }
    this.skipNewlines();
    this.expectKind("indent");
    const body: BsStmt[] = [];
    while (!this.atBlockEnd()) {
      body.push(...this.statement());
      this.skipNewlines();
    }
    this.next();
    return body;
  }

  // simple statements share a line with `;` between them
  private simpleStatements(): BsStmt[] {
    const statements = [this.simpleStatement()];
    while (this.acceptOp(";")) {
      if (this.token.kind === "newline") {
        break;
      }
      statements.push(this.simpleStatement());
    }
    this.expectKind("newline");
    return statements;
  }

  private statement(): BsStmt[] {
    const start = this.token;
    if (this.atWord("if")) {
      return [this.ifStatement()];
    }
    if (this.atWord("while")) {
      this.next();
      const cond = this.expr();
      this.expectOp(":");
      const body = this.suite();
      return [
        {
          body,
          cond,
          end: this.peek(-1).end,
          kind: "while",
          line: start.line,
          start: start.start,
        },
      ];
    }
    if (this.atWord("for")) {
      this.next();
      const targets = [this.expectName().text];
      while (this.acceptOp(",")) {
        targets.push(this.expectName().text);
      }
      this.expectWord("in");
      const iter = this.expr();
      this.expectOp(":");
      const body = this.suite();
      return [
        {
          body,
          end: this.peek(-1).end,
          iter,
          kind: "for",
          line: start.line,
          start: start.start,
          targets,
        },
      ];
    }
    if (this.atWord("switch")) {
      return [this.switchStatement()];
    }
    return this.simpleStatements();
  }

  private ifStatement(): BsStmt {
    const start = this.token;
    const branches: BsIfBranch[] = [];
    let orelse: BsStmt[] | undefined;
    this.expectWord("if");
    for (;;) {
      const line = this.peek(-1).line;
      const cond = this.expr();
      this.expectOp(":");
      branches.push({ body: this.suite(), cond, line });
      this.skipNewlines();
      if (this.acceptWord("elif")) {
        continue;
      }
      if (this.acceptWord("else")) {
        this.expectOp(":");
        orelse = this.suite();
      }
      break;
    }
    return {
      branches,
      end: this.peek(-1).end,
      kind: "if",
      line: start.line,
      orelse,
      start: start.start,
    };
  }

  private switchStatement(): BsStmt {
    const start = this.next();
    const subject = this.expr();
    this.expectOp(":");
    this.expectKind("newline");
    this.skipNewlines();
    this.expectKind("indent");
    const cases: BsCase[] = [];
    let defaultBody: BsStmt[] | undefined;
    while (!this.atBlockEnd()) {
      const line = this.token.line;
      if (this.acceptWord("case")) {
        const value = this.expr();
        this.expectOp(":");
        cases.push({ body: this.suite(), line, value });
      } else if (this.acceptWord("default")) {
        this.expectOp(":");
        defaultBody = this.suite();
      } else {
        this.error("'case' or 'default' expected");
      }
      this.skipNewlines();
    }
    this.next();
    return {
      cases,
      default: defaultBody,
      end: this.peek(-1).end,
      kind: "switch",
      line: start.line,
      start: start.start,
      subject,
    };
  }

  private simpleStatement(): BsStmt {
    const start = this.token;
    if (this.acceptWord("return")) {
      const values = this.token.kind === "newline" ? [] : this.exprList();
      return {
        end: this.peek(-1).end,
        kind: "return",
        line: start.line,
        start: start.start,
        values,
      };
    }
    if (this.acceptWord("break")) {
      return {
        end: start.end,
        kind: "break",
        line: start.line,
        start: start.start,
      };
    }
    if (this.acceptWord("pass")) {
      return {
        end: start.end,
        kind: "pass",
        line: start.line,
        start: start.start,
      };
    }
    if (this.acceptWord("local")) {
      const names = [this.expectName().text];
      while (this.acceptOp(",")) {
        names.push(this.expectName().text);
      }
      const value = this.acceptOp("=") ? this.expr() : undefined;
      return {
        end: this.peek(-1).end,
        kind: "local",
        line: start.line,
        names,
        start: start.start,
        value,
      };
    }
    const targets = this.exprList();
    if (this.acceptOp("=")) {
      const value = this.expr();
      return {
        end: value.end,
        kind: "assign",
        line: start.line,
        start: start.start,
        targets,
        value,
      };
    }
    if (targets.length !== 1) {
      this.error("'=' expected");
    }
    const expr = targets[0];
    if (expr.kind !== "call") {
      this.error("statement has no effect", start);
    }
    return {
      end: expr.end,
      expr,
      kind: "expr",
      line: start.line,
      start: start.start,
    };
  }

  // ---- expressions -------------------------------------------------------

  private exprList(): BsExpr[] {
    const list = [this.expr()];
    while (this.acceptOp(",")) {
      list.push(this.expr());
    }
    return list;
  }

  expr(): BsExpr {
    return this.orTest();
  }

  private binary(left: BsExpr, op: BsToken, right: BsExpr): BsExpr {
    return {
      end: right.end,
      kind: "binary",
      left,
      line: left.line,
      op: op.text as BsBinaryOp,
      opLine: op.line,
      right,
      start: left.start,
    };
  }

  private orTest(): BsExpr {
    let left = this.andTest();
    while (this.atWord("or")) {
      left = this.binary(left, this.next(), this.andTest());
    }
    return left;
  }

  private andTest(): BsExpr {
    let left = this.notTest();
    while (this.atWord("and")) {
      left = this.binary(left, this.next(), this.notTest());
    }
    return left;
  }

  private notTest(): BsExpr {
    const start = this.token;
    if (this.acceptWord("not")) {
      const operand = this.notTest();
      return {
        end: operand.end,
        kind: "unary",
        line: start.line,
        op: "not",
        operand,
        start: start.start,
      };
    }
    return this.comparison();
  }

  private comparison(): BsExpr {
    const left = this.arith();
    if (this.token.kind === "op" && COMPARISONS.has(this.token.text)) {
      const op = this.next();
      const right = this.arith();
      if (this.token.kind === "op" && COMPARISONS.has(this.token.text)) {
        this.error("chained comparisons are not supported");
      }
      return this.binary(left, op, right);
    }
    return left;
  }

  private arith(): BsExpr {
    let left = this.term();
    while (this.atOp("+") || this.atOp("-")) {
      left = this.binary(left, this.next(), this.term());
    }
    return left;
  }

  private term(): BsExpr {
    let left = this.factor();
    while (this.token.kind === "op" && TERM_OPERATORS.has(this.token.text)) {
      left = this.binary(left, this.next(), this.factor());
    }
    return left;
  }

  private factor(): BsExpr {
    const start = this.token;
    if (this.acceptOp("-")) {
      const operand = this.factor();
      return {
        end: operand.end,
        kind: "unary",
        line: start.line,
        op: "-",
        operand,
        start: start.start,
      };
    }
    if (this.acceptOp("+")) {
      return this.factor();
    }
    return this.power();
  }

  private power(): BsExpr {
    const base = this.postfix();
    if (this.atOp("**")) {
      return this.binary(base, this.next(), this.factor());
    }
    return base;
  }

  private postfix(): BsExpr {
    let expr = this.atom();
    for (;;) {
      if (this.acceptOp(".")) {
        const name = this.expectName();
        expr = {
          end: name.end,
          kind: "attr",
          line: expr.line,
          name: name.text,
          object: expr,
          start: expr.start,
        };
      } else if (this.acceptOp("[")) {
        const index = this.expr();
        const close = this.expectOp("]");
        expr = {
          end: close.end,
          index,
          kind: "index",
          line: expr.line,
          object: expr,
          start: expr.start,
        };
      } else if (this.acceptOp("(")) {
        const args = this.atOp(")") ? [] : this.exprList();
        const close = this.expectOp(")");
        expr = {
          args,
          callee: expr,
          end: close.end,
          kind: "call",
          line: expr.line,
          start: expr.start,
        };
      } else {
        return expr;
      }
    }
  }

  private atom(): BsExpr {
    const token = this.token;
    switch (token.kind) {
      case "number":
        this.next();
        return {
          end: token.end,
          kind: "number",
          line: token.line,
          start: token.start,
          text: token.text,
          value: token.value,
        };
      case "string":
        this.next();
        return {
          end: token.end,
          kind: "string",
          line: token.line,
          start: token.start,
          value: token.text,
        };
      case "name":
        this.next();
        if (token.text === "true" || token.text === "false") {
          return {
            end: token.end,
            kind: "bool",
            line: token.line,
            start: token.start,
            value: token.text === "true",
          };
        }
        if (token.text === "nil") {
          return {
            end: token.end,
            kind: "nil",
            line: token.line,
            start: token.start,
          };
        }
        return {
          end: token.end,
          kind: "name",
          line: token.line,
          name: token.text,
          start: token.start,
        };
      case "op":
        if (token.text === "(") {
          this.next();
          const items = this.exprList();
          const close = this.expectOp(")");
          if (items.length === 1) {
            return items[0];
          }
          return {
            end: close.end,
            items,
            kind: "tuple",
            line: token.line,
            start: token.start,
          };
        }
        if (token.text === "[") {
          this.next();
          const items: BsExpr[] = [];
          while (!this.atOp("]")) {
            items.push(this.expr());
            if (!this.acceptOp(",")) {
              break;
            }
          }
          const close = this.expectOp("]");
          return {
            end: close.end,
            items,
            kind: "list",
            line: token.line,
            start: token.start,
          };
        }
        break;
      default:
        break;
    }
    this.error("expression expected");
  }
}

function describe(token: BsToken): string {
  switch (token.kind) {
    case "name":
    case "op":
    case "number":
      return `'${token.text}'`;
    case "string":
      return `'"${token.text.slice(0, 40)}"'`;
    default:
      return token.kind;
  }
}
