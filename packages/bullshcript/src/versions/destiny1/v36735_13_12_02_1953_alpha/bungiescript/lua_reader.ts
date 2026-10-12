// Reader for the Lua the decompiler writes for an alpha chunk: the module
// prologue, `function _M.<side>:<name>(...)` bodies, the generated import() and
// upvalue_provider().

export interface LuaModule {
  readonly declName: string;
  readonly functions: readonly LuaFunction[];
  readonly imports: readonly LuaImport[];
}

interface LuaImport {
  readonly getter: string;
  readonly name: string;
  readonly path: string;
}

export interface LuaFunction {
  readonly body: readonly LuaStmt[];
  readonly line: number;
  readonly name: string;
  readonly params: readonly string[];
  readonly side: "definition" | "instance";
}

export type LuaStmt =
  | LuaAssign
  | LuaBreak
  | LuaCallStmt
  | LuaFor
  | LuaForIn
  | LuaIf
  | LuaLocal
  | LuaReturn
  | LuaWhile;

interface LuaLocal {
  readonly kind: "local";
  readonly line: number;
  readonly names: readonly string[];
  readonly value: LuaExpr | undefined;
}

interface LuaAssign {
  readonly kind: "assign";
  readonly line: number;
  readonly targets: readonly LuaExpr[];
  readonly values: readonly LuaExpr[];
}

interface LuaCallStmt {
  readonly call: LuaCall;
  readonly kind: "call";
  readonly line: number;
}

interface LuaIfClause {
  readonly body: readonly LuaStmt[];
  readonly cond: LuaExpr;
  readonly line: number;
}

export interface LuaIf {
  readonly clauses: readonly LuaIfClause[];
  readonly kind: "if";
  readonly line: number;
  readonly orelse: readonly LuaStmt[] | undefined;
}

interface LuaWhile {
  readonly body: readonly LuaStmt[];
  readonly cond: LuaExpr;
  readonly kind: "while";
  readonly line: number;
}

interface LuaFor {
  readonly body: readonly LuaStmt[];
  readonly kind: "for";
  readonly limit: LuaExpr;
  readonly line: number;
  readonly start: LuaExpr;
  readonly step: LuaExpr | undefined;
  readonly variable: string;
}

interface LuaForIn {
  readonly body: readonly LuaStmt[];
  readonly iterator: LuaExpr;
  readonly kind: "for_in";
  readonly line: number;
  readonly names: readonly string[];
}

interface LuaReturn {
  readonly kind: "return";
  readonly line: number;
  readonly values: readonly LuaExpr[];
}

interface LuaBreak {
  readonly kind: "break";
  readonly line: number;
}

export type LuaExpr =
  | LuaBinary
  | LuaBool
  | LuaCall
  | LuaClosure
  | LuaIndex
  | LuaName
  | LuaNil
  | LuaNumber
  | LuaString
  | LuaUnary;

interface LuaName {
  readonly kind: "name";
  readonly line: number;
  readonly name: string;
}

interface LuaNumber {
  readonly kind: "number";
  readonly line: number;
  readonly text: string;
}

interface LuaString {
  readonly kind: "string";
  readonly line: number;
  // decoded bytes, one char each
  readonly value: string;
}

interface LuaBool {
  readonly kind: "bool";
  readonly line: number;
  readonly value: boolean;
}

interface LuaNil {
  readonly kind: "nil";
  readonly line: number;
}

// `a.b` and `a[k]` both; `field` is set for the dotted form
interface LuaIndex {
  readonly field: string | undefined;
  readonly key: LuaExpr;
  readonly kind: "index";
  readonly line: number;
  readonly object: LuaExpr;
}

// `f(args)` or, with `method`, `obj:method(args)`
export interface LuaCall {
  readonly args: readonly LuaExpr[];
  readonly callee: LuaExpr;
  readonly kind: "call";
  readonly line: number;
  readonly method: string | undefined;
}

export interface LuaClosure {
  readonly body: readonly LuaStmt[];
  readonly kind: "closure";
  readonly line: number;
  readonly params: readonly string[];
}

interface LuaBinary {
  readonly kind: "binary";
  readonly left: LuaExpr;
  readonly line: number;
  readonly op: string;
  readonly right: LuaExpr;
}

interface LuaUnary {
  readonly kind: "unary";
  readonly line: number;
  readonly op: "-" | "not";
  readonly operand: LuaExpr;
}

type TokenKind = "eof" | "name" | "number" | "op" | "string";

interface Token {
  readonly kind: TokenKind;
  readonly line: number;
  readonly text: string;
}

export class LuaReadError extends Error {
  // the decompiled Lua line
  readonly line: number;

  constructor(message: string, line: number) {
    super(`decompiled Lua line ${line}: ${message}`);
    this.name = "LuaReadError";
    this.line = line;
  }
}

const KEYWORDS = new Set([
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

const OPERATORS = ["==", "~=", "<=", ">=", "..", "..."];
const SINGLE = new Set([..."+-*/%^#<>=(){}[];:,."]);
const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;
const HEX_DIGIT = /[0-9A-Fa-f]/;
const NUMBER_CHAR = /[0-9.]/;
const SPACE = /[ \t\r]/;
const DECL_NAME = /^_M\.decl_name = "([^"]*)"$/m;
const PROVIDER = /function _M\.upvalue_provider\(\)[\s\S]*?\nend/;
const PROVIDER_ENTRY =
  /(\w+) = (__class_definition_get|__enum_definition_get|__schema_get)\("([^"]+)"\)/g;
const MAX_ESCAPE_DIGITS = 3;

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  "'": "'",
  "\\": "\\",
  a: "\x07",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  v: "\v",
};

function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let line = 1;
  let i = 0;
  const push = (kind: TokenKind, text: string) =>
    out.push({ kind, line, text });
  while (i < source.length) {
    const c = source[i];
    if (c === "\n") {
      line++;
      i++;
    } else if (SPACE.test(c)) {
      i++;
    } else if (c === "-" && source[i + 1] === "-") {
      while (i < source.length && source[i] !== "\n") {
        i++;
      }
    } else if (NAME_START.test(c)) {
      let j = i;
      while (j < source.length && NAME_CHAR.test(source[j])) {
        j++;
      }
      push("name", source.slice(i, j));
      i = j;
    } else if (
      DIGIT.test(c) ||
      (c === "." && DIGIT.test(source[i + 1] ?? ""))
    ) {
      let j = i;
      if (c === "0" && (source[i + 1] === "x" || source[i + 1] === "X")) {
        j += 2;
        while (j < source.length && HEX_DIGIT.test(source[j])) {
          j++;
        }
      } else {
        while (j < source.length && NUMBER_CHAR.test(source[j])) {
          j++;
        }
        if (source[j] === "e" || source[j] === "E") {
          j++;
          if (source[j] === "+" || source[j] === "-") {
            j++;
          }
          while (j < source.length && DIGIT.test(source[j])) {
            j++;
          }
        }
      }
      push("number", source.slice(i, j));
      i = j;
    } else if (c === '"' || c === "'") {
      const [text, next] = readString(source, i, line);
      push("string", text);
      i = next;
    } else {
      const op = OPERATORS.find((o) => source.startsWith(o, i));
      if (op !== undefined) {
        push("op", op);
        i += op.length;
      } else if (SINGLE.has(c)) {
        push("op", c);
        i++;
      } else {
        throw new LuaReadError(`unexpected character '${c}'`, line);
      }
    }
  }
  push("eof", "");
  return out;
}

// a quoted string's decoded bytes and the index past its closing quote
function readString(
  source: string,
  start: number,
  line: number
): [string, number] {
  const quote = source[start];
  let i = start + 1;
  let text = "";
  for (;;) {
    const c = source[i];
    if (c === undefined || c === "\n") {
      throw new LuaReadError("unfinished string", line);
    }
    if (c === quote) {
      return [text, i + 1];
    }
    if (c !== "\\") {
      text += c;
      i++;
      continue;
    }
    const e = source[i + 1];
    const simple = SIMPLE_ESCAPES[e];
    if (simple !== undefined) {
      text += simple;
      i += 2;
    } else if (DIGIT.test(e)) {
      let value = 0;
      let j = i + 1;
      for (
        let n = 0;
        n < MAX_ESCAPE_DIGITS && DIGIT.test(source[j] ?? "");
        n++
      ) {
        value = value * 10 + Number(source[j]);
        j++;
      }
      text += String.fromCharCode(value);
      i = j;
    } else {
      throw new LuaReadError(`unknown escape \\${e}`, line);
    }
  }
}

export function readLuaModule(source: string): LuaModule {
  const declName = DECL_NAME.exec(source)?.[1];
  if (declName === undefined) {
    throw new LuaReadError("no _M.decl_name", 1);
  }
  const provider = PROVIDER.exec(source);
  const imports: LuaImport[] = [];
  if (provider !== null) {
    for (const m of provider[0].matchAll(PROVIDER_ENTRY)) {
      imports.push({ getter: m[2], name: m[1], path: m[3] });
    }
  }
  return {
    declName,
    functions: new LuaReader(source).functions(),
    imports,
  };
}

class LuaReader {
  private position = 0;
  private readonly tokens: Token[];

  constructor(source: string) {
    this.tokens = tokenize(source);
  }

  private get token(): Token {
    return this.tokens[this.position];
  }

  private peek(offset = 1): Token {
    return this.tokens[
      Math.min(this.position + offset, this.tokens.length - 1)
    ];
  }

  private next(): Token {
    const token = this.token;
    if (token.kind !== "eof") {
      this.position++;
    }
    return token;
  }

  private at(kind: TokenKind, text?: string): boolean {
    return (
      this.token.kind === kind &&
      (text === undefined || this.token.text === text)
    );
  }

  private atWord(text: string): boolean {
    return this.at("name", text);
  }

  private accept(kind: TokenKind, text: string): boolean {
    if (this.at(kind, text)) {
      this.next();
      return true;
    }
    return false;
  }

  private expect(kind: TokenKind, text?: string): Token {
    if (!this.at(kind, text)) {
      throw new LuaReadError(
        `expected ${text ?? kind}, found '${this.token.text}'`,
        this.token.line
      );
    }
    return this.next();
  }

  private name(): string {
    const token = this.expect("name");
    if (KEYWORDS.has(token.text)) {
      throw new LuaReadError(
        `name expected, found '${token.text}'`,
        token.line
      );
    }
    return token.text;
  }

  // the module's `function _M.<side>:<name>(...)` definitions, in order;
  // the prologue, upvalue_provider and `return _M` are skipped
  functions(): LuaFunction[] {
    const out: LuaFunction[] = [];
    while (!this.at("eof")) {
      if (
        this.atWord("function") &&
        this.peek().text === "_M" &&
        this.peek(2).text === "." &&
        (this.peek(3).text === "instance" ||
          this.peek(3).text === "definition") &&
        this.peek(4).text === ":"
      ) {
        const line = this.next().line;
        this.next();
        this.next();
        const side = this.next().text as LuaFunction["side"];
        this.next();
        const name = this.name();
        const params = this.paramList();
        const body = this.block();
        this.expect("name", "end");
        out.push({ body, line, name, params, side });
      } else {
        this.next();
      }
    }
    return out;
  }

  private paramList(): string[] {
    this.expect("op", "(");
    const params: string[] = [];
    if (!this.at("op", ")")) {
      do {
        params.push(this.name());
      } while (this.accept("op", ","));
    }
    this.expect("op", ")");
    return params;
  }

  private atBlockEnd(): boolean {
    return (
      this.at("eof") ||
      (this.token.kind === "name" &&
        ["end", "else", "elseif", "until"].includes(this.token.text))
    );
  }

  private block(): LuaStmt[] {
    const out: LuaStmt[] = [];
    while (!this.atBlockEnd()) {
      out.push(this.statement());
    }
    return out;
  }

  private statement(): LuaStmt {
    const token = this.token;
    const line = token.line;
    if (token.kind === "name") {
      switch (token.text) {
        case "local": {
          this.next();
          const names = [this.name()];
          while (this.accept("op", ",")) {
            names.push(this.name());
          }
          const value = this.accept("op", "=") ? this.expr() : undefined;
          return { kind: "local", line, names, value };
        }
        case "if": {
          this.next();
          const clauses: LuaIfClause[] = [];
          let clauseLine = line;
          for (;;) {
            const cond = this.expr();
            this.expect("name", "then");
            clauses.push({ body: this.block(), cond, line: clauseLine });
            if (this.atWord("elseif")) {
              clauseLine = this.next().line;
              continue;
            }
            break;
          }
          const orelse = this.accept("name", "else") ? this.block() : undefined;
          this.expect("name", "end");
          return { clauses, kind: "if", line, orelse };
        }
        case "while": {
          this.next();
          const cond = this.expr();
          this.expect("name", "do");
          const body = this.block();
          this.expect("name", "end");
          return { body, cond, kind: "while", line };
        }
        case "for":
          return this.forStatement();
        case "return": {
          this.next();
          const values: LuaExpr[] = [];
          if (!this.atBlockEnd()) {
            values.push(this.expr());
            while (this.accept("op", ",")) {
              values.push(this.expr());
            }
          }
          return { kind: "return", line, values };
        }
        case "break":
          this.next();
          return { kind: "break", line };
        default:
          break;
      }
    }
    const first = this.suffixedExpr();
    if (this.at("op", "=") || this.at("op", ",")) {
      const targets = [first];
      while (this.accept("op", ",")) {
        targets.push(this.suffixedExpr());
      }
      this.expect("op", "=");
      const values = [this.expr()];
      while (this.accept("op", ",")) {
        values.push(this.expr());
      }
      return { kind: "assign", line, targets, values };
    }
    if (first.kind !== "call") {
      throw new LuaReadError("statement expected", line);
    }
    return { call: first, kind: "call", line };
  }

  private forStatement(): LuaStmt {
    const line = this.next().line;
    const first = this.name();
    if (this.accept("op", "=")) {
      const start = this.expr();
      this.expect("op", ",");
      const limit = this.expr();
      const step = this.accept("op", ",") ? this.expr() : undefined;
      this.expect("name", "do");
      const body = this.block();
      this.expect("name", "end");
      return { body, kind: "for", limit, line, start, step, variable: first };
    }
    const names = [first];
    while (this.accept("op", ",")) {
      names.push(this.name());
    }
    this.expect("name", "in");
    const iterator = this.expr();
    this.expect("name", "do");
    const body = this.block();
    this.expect("name", "end");
    return { body, iterator, kind: "for_in", line, names };
  }

  // ---- expressions, Lua 5.1 precedence ------------------------------------

  expr(): LuaExpr {
    return this.binary(0);
  }

  private static readonly PRIORITY: Readonly<
    Record<string, readonly [number, number]>
  > = {
    or: [1, 1],
    and: [2, 2],
    "<": [3, 3],
    ">": [3, 3],
    "<=": [3, 3],
    ">=": [3, 3],
    "~=": [3, 3],
    "==": [3, 3],
    "..": [5, 4],
    "+": [6, 6],
    "-": [6, 6],
    "*": [7, 7],
    "/": [7, 7],
    "%": [7, 7],
    "^": [10, 9],
  };

  private static readonly UNARY_PRIORITY = 8;

  private binary(limit: number): LuaExpr {
    let left: LuaExpr;
    const token = this.token;
    if (this.atWord("not") || this.at("op", "-")) {
      this.next();
      const operand = this.binary(LuaReader.UNARY_PRIORITY);
      left = {
        kind: "unary",
        line: token.line,
        op: token.text === "not" ? "not" : "-",
        operand,
      };
    } else {
      left = this.simpleExpr();
    }
    for (;;) {
      const op = this.token.text;
      const priority = LuaReader.PRIORITY[op];
      if (
        priority === undefined ||
        (this.token.kind !== "op" && this.token.kind !== "name") ||
        priority[0] <= limit
      ) {
        return left;
      }
      const opToken = this.next();
      const right = this.binary(priority[1]);
      left = { kind: "binary", left, line: left.line, op: opToken.text, right };
    }
  }

  private simpleExpr(): LuaExpr {
    const token = this.token;
    switch (token.kind) {
      case "number":
        this.next();
        return { kind: "number", line: token.line, text: token.text };
      case "string":
        this.next();
        return { kind: "string", line: token.line, value: token.text };
      case "name":
        if (token.text === "nil") {
          this.next();
          return { kind: "nil", line: token.line };
        }
        if (token.text === "true" || token.text === "false") {
          this.next();
          return {
            kind: "bool",
            line: token.line,
            value: token.text === "true",
          };
        }
        if (token.text === "function") {
          this.next();
          const params = this.paramList();
          const body = this.block();
          this.expect("name", "end");
          return { body, kind: "closure", line: token.line, params };
        }
        break;
      default:
        break;
    }
    return this.suffixedExpr();
  }

  private primaryExpr(): LuaExpr {
    const token = this.token;
    if (this.accept("op", "(")) {
      const inner = this.expr();
      this.expect("op", ")");
      return inner;
    }
    return { kind: "name", line: token.line, name: this.name() };
  }

  private suffixedExpr(): LuaExpr {
    let expr = this.primaryExpr();
    for (;;) {
      const token = this.token;
      if (this.accept("op", ".")) {
        const field = this.name();
        expr = {
          field,
          key: { kind: "string", line: token.line, value: field },
          kind: "index",
          line: expr.line,
          object: expr,
        };
      } else if (this.accept("op", "[")) {
        const key = this.expr();
        this.expect("op", "]");
        expr = {
          field: undefined,
          key,
          kind: "index",
          line: expr.line,
          object: expr,
        };
      } else if (this.accept("op", ":")) {
        const method = this.name();
        const args = this.callArgs();
        expr = { args, callee: expr, kind: "call", line: expr.line, method };
      } else if (this.at("op", "(") || this.at("string")) {
        const args = this.callArgs();
        expr = {
          args,
          callee: expr,
          kind: "call",
          line: expr.line,
          method: undefined,
        };
      } else {
        return expr;
      }
    }
  }

  private callArgs(): LuaExpr[] {
    if (this.at("string")) {
      const token = this.next();
      return [{ kind: "string", line: token.line, value: token.text }];
    }
    this.expect("op", "(");
    const args: LuaExpr[] = [];
    if (!this.at("op", ")")) {
      args.push(this.expr());
      while (this.accept("op", ",")) {
        args.push(this.expr());
      }
    }
    this.expect("op", ")");
    return args;
  }
}
