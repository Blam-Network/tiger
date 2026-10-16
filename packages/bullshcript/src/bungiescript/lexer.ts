// Lexer for BungieScript (LANGUAGE.md): Python 2 line structure with
// INDENT/DEDENT, `#` comments, continued lines, byte spans on every token.
// The source is a byte string, one char per byte.

export class BsCompileError extends Error {
  readonly line: number;
  readonly path: string;

  constructor(message: string, path: string, line: number) {
    super(`${path}:${line}: ${message}`);
    this.name = "BsCompileError";
    this.path = path;
    this.line = line;
  }
}

export type BsTokenKind =
  | "dedent"
  | "eof"
  | "indent"
  | "name"
  | "newline"
  | "number"
  | "op"
  | "string";

export interface BsToken {
  readonly end: number;
  readonly kind: BsTokenKind;
  readonly line: number;
  readonly start: number;
  // name, operator or number as written; a string's decoded bytes
  readonly text: string;
  // a number's value, rounded to the 4-byte float the chunk stores
  readonly value: number;
}

const SPACE = /[ \t\f]/;
const DIGIT = /[0-9]/;
const ALPHA = /[A-Za-z_]/;
const ALNUM = /[0-9A-Za-z_]/;
const HEX = /[0-9A-Fa-f]/;
const HEX_NUMBER = /^0[xX][0-9A-Fa-f]+$/;
const DECIMAL_NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const TAB_WIDTH = 8;
const MAX_ESCAPE_DIGITS = 3;
const BYTE_MAX = 255;

// longest first
const OPERATORS = ["**", "==", "!=", "<=", ">=", "<>"];
const SINGLE_OPERATORS = new Set([..."()[]{},:.;=+-*/%<>@"]);

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

export function tokenize(source: string, path: string): BsToken[] {
  return new BsLexer(source, path).all();
}

class BsLexer {
  private readonly indents: number[] = [0];
  private line = 1;
  private readonly out: BsToken[] = [];
  private readonly path: string;
  private position = 0;
  private readonly source: string;

  constructor(source: string, path: string) {
    this.source = source;
    this.path = path;
  }

  all(): BsToken[] {
    for (;;) {
      if (!this.logicalLine()) {
        break;
      }
    }
    while (this.indents.length > 1) {
      this.indents.pop();
      this.push("dedent", "", this.position, this.position);
    }
    this.push("eof", "", this.position, this.position);
    return this.out;
  }

  private error(message: string): never {
    throw new BsCompileError(message, this.path, this.line);
  }

  private get current(): string {
    return this.source[this.position] ?? "";
  }

  private at(offset: number): string {
    return this.source[this.position + offset] ?? "";
  }

  private push(
    kind: BsTokenKind,
    text: string,
    start: number,
    end: number,
    value = 0,
    line = this.line
  ): void {
    this.out.push({ kind, text, value, line, start, end });
  }

  private newline(): void {
    const first = this.current;
    this.position += 1;
    if (
      (this.current === "\n" || this.current === "\r") &&
      this.current !== first
    ) {
      this.position += 1;
    }
    this.line += 1;
  }

  private atLineEnd(): boolean {
    const c = this.current;
    return c === "" || c === "\n" || c === "\r";
  }

  // True when the line held no tokens.
  private skipBlankRest(): boolean {
    while (SPACE.test(this.current)) {
      this.position += 1;
    }
    if (this.current === "#") {
      while (!this.atLineEnd()) {
        this.position += 1;
      }
    }
    if (this.current === "") {
      return true;
    }
    if (this.atLineEnd()) {
      this.newline();
      return true;
    }
    return false;
  }

  // One logical line: indentation, tokens (brackets continue across line
  // breaks), NEWLINE. False at end of input.
  private logicalLine(): boolean {
    let column = 0;
    while (SPACE.test(this.current)) {
      column =
        this.current === "\t"
          ? (Math.floor(column / TAB_WIDTH) + 1) * TAB_WIDTH
          : column + 1;
      this.position += 1;
    }
    if (this.current === "") {
      return false;
    }
    if (
      this.current === "#" ||
      this.current === "\n" ||
      this.current === "\r"
    ) {
      this.skipBlankRest();
      return true;
    }
    this.indentation(column);
    let depth = 0;
    for (;;) {
      while (SPACE.test(this.current)) {
        this.position += 1;
      }
      const c = this.current;
      if (c === "" || c === "#" || c === "\n" || c === "\r") {
        if (depth > 0 && c !== "") {
          this.skipBlankRest();
          continue;
        }
        // the token belongs to the line it ends, not the one after the break
        const line = this.line;
        this.skipBlankRest();
        this.push("newline", "", this.position, this.position, 0, line);
        return true;
      }
      if (c === "\\" && (this.at(1) === "\n" || this.at(1) === "\r")) {
        this.position += 1;
        this.newline();
        continue;
      }
      depth += this.token();
    }
  }

  private indentation(column: number): void {
    const top = this.indents.at(-1) as number;
    if (column > top) {
      this.indents.push(column);
      this.push("indent", "", this.position, this.position);
      return;
    }
    while (column < (this.indents.at(-1) as number)) {
      this.indents.pop();
      this.push("dedent", "", this.position, this.position);
    }
    if (column !== this.indents.at(-1)) {
      this.error("unindent does not match any outer indentation level");
    }
  }

  // Reads one token; returns the change in bracket depth it causes.
  private token(): number {
    const c = this.current;
    const start = this.position;
    if (c === '"' || c === "'") {
      const text = this.quotedString(c);
      this.push("string", text, start, this.position);
      return 0;
    }
    if (DIGIT.test(c) || (c === "." && DIGIT.test(this.at(1)))) {
      this.numeral();
      return 0;
    }
    if (ALPHA.test(c)) {
      while (ALNUM.test(this.current)) {
        this.position += 1;
      }
      this.push(
        "name",
        this.source.slice(start, this.position),
        start,
        this.position
      );
      return 0;
    }
    for (const op of OPERATORS) {
      if (this.source.startsWith(op, this.position)) {
        this.position += op.length;
        this.push("op", op, start, this.position);
        return 0;
      }
    }
    if (SINGLE_OPERATORS.has(c)) {
      this.position += 1;
      this.push("op", c, start, this.position);
      if (c === "(" || c === "[" || c === "{") {
        return 1;
      }
      if (c === ")" || c === "]" || c === "}") {
        return -1;
      }
      return 0;
    }
    this.error(`unexpected character '${c}'`);
  }

  private numeral(): void {
    const start = this.position;
    if (this.current === "0" && (this.at(1) === "x" || this.at(1) === "X")) {
      this.position += 2;
      while (HEX.test(this.current)) {
        this.position += 1;
      }
    } else {
      while (DIGIT.test(this.current) || this.current === ".") {
        this.position += 1;
      }
      if (
        (this.current === "e" || this.current === "E") &&
        (DIGIT.test(this.at(1)) ||
          ((this.at(1) === "+" || this.at(1) === "-") &&
            DIGIT.test(this.at(2))))
      ) {
        this.position += 2;
        while (DIGIT.test(this.current)) {
          this.position += 1;
        }
      }
    }
    const text = this.source.slice(start, this.position);
    const value = parseBsNumber(text);
    if (value === undefined || ALNUM.test(this.current)) {
      this.error(`malformed number near '${text}'`);
    }
    this.push("number", text, start, this.position, value);
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

  // Python's escapes plus Lua's \ddd decimal byte (what the decompiler writes
  // for every byte above 0x7E).
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
    if (c === "x") {
      if (!(HEX.test(this.at(1)) && HEX.test(this.at(2)))) {
        this.error("invalid \\x escape");
      }
      const value = Number.parseInt(
        this.source.slice(this.position + 1, this.position + 3),
        16
      );
      this.position += 3;
      return String.fromCharCode(value);
    }
    if (DIGIT.test(c)) {
      let value = 0;
      for (let i = 0; i < MAX_ESCAPE_DIGITS && DIGIT.test(this.current); i++) {
        value = value * 10 + Number(this.current);
        this.position += 1;
      }
      if (value > BYTE_MAX) {
        this.error("escape sequence too large");
      }
      return String.fromCharCode(value);
    }
    // anything else stays as written
    this.position += 1;
    return `\\${c}`;
  }
}

// A decimal or hexadecimal literal's value, rounded as Lua's reader rounds
// it (lua_Number is a 4-byte float in this fork).
export function parseBsNumber(text: string): number | undefined {
  if (HEX_NUMBER.test(text)) {
    return Math.fround(Number.parseInt(text.slice(2), 16));
  }
  if (!DECIMAL_NUMBER.test(text)) {
    return;
  }
  return Math.fround(Number(text));
}
