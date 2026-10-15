// Lexer for the TU0 compiler.

export class LuaCompileError extends Error {
  readonly line: number;

  constructor(message: string, chunkName: string, line: number) {
    super(`${chunkName}:${line}: ${message}`);
    this.name = "LuaCompileError";
    this.line = line;
  }
}

const RESERVED_WORDS = [
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
] as const;

type LuaReservedWord = (typeof RESERVED_WORDS)[number];

// Single-char tokens are their own character; the rest are named.
export type LuaTokenKind =
  | LuaReservedWord
  | "<eof>"
  | "<name>"
  | "<number>"
  | "<string>"
  | ".."
  | "..."
  | "=="
  | ">="
  | "<="
  | "~="
  | string;

interface LuaToken {
  kind: LuaTokenKind;
  // number value, already rounded to a 4-byte float as the chunk stores it
  number: number;
  // name or string contents (a byte string)
  text: string;
}

const RESERVED = new Set<string>(RESERVED_WORDS);

// Lua 5.1 caps \ddd at 255 and reads at most three digits.
const MAX_ESCAPE_DIGITS = 3;
const UCHAR_MAX = 255;

const DIGIT = /[0-9]/;
const ALNUM = /[0-9A-Za-z_]/;
const ALPHA = /[A-Za-z_]/;
const SPACE = /[ \t\v\f]/;
const HEX_NUMBER = /^0[xX]([0-9A-Fa-f]+)$/;
const DECIMAL_NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  a: "\x07",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  v: "\v",
};

export class CompilerLexer {
  readonly chunkName: string;
  // line of the last token consumed; what lcode stamps on an instruction
  lastline = 1;
  linenumber = 1;
  lookahead: LuaToken | undefined;
  token: LuaToken = { kind: "<eof>", number: 0, text: "" };
  private readonly source: string;
  private position = 0;

  constructor(source: string, chunkName: string) {
    this.source = source;
    this.chunkName = chunkName;
    // a leading #! line is skipped, as lua.c's loader does
    if (source.startsWith("#")) {
      while (this.position < source.length && !this.atNewline()) {
        this.position += 1;
      }
    }
  }

  error(message: string, line = this.linenumber): never {
    throw new LuaCompileError(message, this.chunkName, line);
  }

  syntaxError(message: string): never {
    this.error(`${message} near '${describeToken(this.token)}'`);
  }

  next(): void {
    this.lastline = this.linenumber;
    if (this.lookahead === undefined) {
      this.token = this.scan();
    } else {
      this.token = this.lookahead;
      this.lookahead = undefined;
    }
  }

  peek(): LuaToken {
    this.lookahead ??= this.scan();
    return this.lookahead;
  }

  private get current(): string {
    return this.source[this.position] ?? "";
  }

  private at(offset: number): string {
    return this.source[this.position + offset] ?? "";
  }

  private atNewline(): boolean {
    return this.current === "\n" || this.current === "\r";
  }

  // \n, \r, \n\r or \r\n each count as one line.
  private newline(): void {
    const first = this.current;
    this.position += 1;
    if (this.atNewline() && this.current !== first) {
      this.position += 1;
    }
    this.linenumber += 1;
  }

  private scan(): LuaToken {
    for (;;) {
      const c = this.current;
      if (c === "") {
        return token("<eof>");
      }
      if (c === "\n" || c === "\r") {
        this.newline();
        continue;
      }
      if (SPACE.test(c)) {
        this.position += 1;
        continue;
      }
      if (c === "-") {
        if (this.at(1) !== "-") {
          this.position += 1;
          return token("-");
        }
        this.position += 2;
        this.skipComment();
        continue;
      }
      if (c === "[") {
        const level = this.longBracketLevel();
        if (level >= 0) {
          return { kind: "<string>", number: 0, text: this.longString(level) };
        }
        if (level === -1) {
          this.position += 1;
          return token("[");
        }
        this.error("invalid long string delimiter");
      }
      if (c === '"' || c === "'") {
        return { kind: "<string>", number: 0, text: this.quotedString(c) };
      }
      if (c === "." || DIGIT.test(c)) {
        if (c === "." && !DIGIT.test(this.at(1))) {
          return this.dots();
        }
        return this.numeral();
      }
      if (ALPHA.test(c)) {
        const start = this.position;
        while (ALNUM.test(this.current)) {
          this.position += 1;
        }
        const word = this.source.slice(start, this.position);
        return RESERVED.has(word)
          ? token(word)
          : { kind: "<name>", number: 0, text: word };
      }
      return this.operator(c);
    }
  }

  private operator(c: string): LuaToken {
    this.position += 1;
    if ("=<>~".includes(c) && this.current === "=") {
      this.position += 1;
      return token(`${c}=`);
    }
    return token(c);
  }

  private dots(): LuaToken {
    this.position += 1;
    if (this.current !== ".") {
      return token(".");
    }
    this.position += 1;
    if (this.current !== ".") {
      return token("..");
    }
    this.position += 1;
    return token("...");
  }

  // llex.c's read_numeral: "3x" is one malformed number, not a number and a
  // name.
  private numeral(): LuaToken {
    const start = this.position;
    while (DIGIT.test(this.current) || this.current === ".") {
      this.position += 1;
    }
    if (
      (this.current === "e" || this.current === "E") &&
      (this.at(1) === "+" || this.at(1) === "-")
    ) {
      this.position += 2;
    }
    while (ALNUM.test(this.current)) {
      this.position += 1;
    }
    const text = this.source.slice(start, this.position);
    const value = parseNumber(text);
    if (value === undefined) {
      this.error(`malformed number near '${text}'`);
    }
    // lua_Number is a 4-byte float in this fork
    return { kind: "<number>", number: Math.fround(value), text };
  }

  private skipComment(): void {
    if (this.current === "[") {
      const level = this.longBracketLevel();
      if (level >= 0) {
        this.longString(level);
        return;
      }
    }
    while (this.current !== "" && !this.atNewline()) {
      this.position += 1;
    }
  }

  // At a '[': the number of '=' in a long bracket "[==[", -1 for a lone
  // '[', and -2 for "[=" with no second '['. Leaves the position unchanged.
  private longBracketLevel(): number {
    let offset = 1;
    while (this.at(offset) === "=") {
      offset += 1;
    }
    if (this.at(offset) === "[") {
      return offset - 1;
    }
    return offset === 1 ? -1 : -2;
  }

  private longString(level: number): string {
    const startLine = this.linenumber;
    this.position += level + 2;
    // a newline straight after the opening bracket is not part of the text
    if (this.atNewline()) {
      this.newline();
    }
    let text = "";
    for (;;) {
      const c = this.current;
      if (c === "") {
        this.error("unfinished long string", startLine);
      }
      if (c === "]" && this.closesLongBracket(level)) {
        this.position += level + 2;
        return text;
      }
      if (c === "\n" || c === "\r") {
        this.newline();
        text += "\n";
        continue;
      }
      text += c;
      this.position += 1;
    }
  }

  private closesLongBracket(level: number): boolean {
    for (let i = 1; i <= level; i++) {
      if (this.at(i) !== "=") {
        return false;
      }
    }
    return this.at(level + 1) === "]";
  }

  private quotedString(delimiter: string): string {
    this.position += 1;
    let text = "";
    for (;;) {
      const c = this.current;
      if (c === delimiter) {
        this.position += 1;
        return text;
      }
      if (c === "" || c === "\n" || c === "\r") {
        this.error("unfinished string");
      }
      if (c !== "\\") {
        text += c;
        this.position += 1;
        continue;
      }
      this.position += 1;
      text += this.escape();
    }
  }

  private escape(): string {
    const c = this.current;
    if (c === "") {
      this.error("unfinished string");
    }
    if (c === "\n" || c === "\r") {
      this.newline();
      return "\n";
    }
    const simple = SIMPLE_ESCAPES[c];
    if (simple !== undefined) {
      this.position += 1;
      return simple;
    }
    if (!DIGIT.test(c)) {
      // Lua 5.1 keeps any other escaped character as itself: \\ \" \' ...
      this.position += 1;
      return c;
    }
    let value = 0;
    for (let i = 0; i < MAX_ESCAPE_DIGITS && DIGIT.test(this.current); i++) {
      value = value * 10 + Number(this.current);
      this.position += 1;
    }
    if (value > UCHAR_MAX) {
      this.error("escape sequence too large");
    }
    return String.fromCharCode(value);
  }
}

function token(kind: LuaTokenKind): LuaToken {
  return { kind, number: 0, text: "" };
}

// luaO_str2d: a decimal number, or a hexadecimal integer (0x...).
function parseNumber(text: string): number | undefined {
  const hex = HEX_NUMBER.exec(text);
  if (hex !== null) {
    return Number.parseInt(hex[1], 16);
  }
  if (!DECIMAL_NUMBER.test(text)) {
    return;
  }
  return Number(text);
}

function describeToken(t: LuaToken): string {
  switch (t.kind) {
    case "<name>":
    case "<string>":
    case "<number>":
      return t.kind === "<number>" ? t.text : t.text.slice(0, 40);
    default:
      return t.kind;
  }
}
