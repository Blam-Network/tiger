// Stand-in lines. A decorator (@activity_bundle, @member_counts, @activity and
// the rest) writes down host-only data Bungie's source never held, so the line
// it sits on is not a line of Bungie's script: the lines of a compiled chunk
// are numbered as if the stand-in lines were absent (LANGUAGE.md, "Line
// numbers"). Source positions, diagnostics included, stay the file's real
// lines.

import type { BsToken, BsTokenKind } from "./lexer.ts";

// a decorator's tokens, `@` through its closing `)`, by index
export interface BsTokenSpan {
  readonly first: number;
  readonly last: number;
}

const LINE_BREAK = /\r\n|\n\r|\n|\r/;
const NOT_CODE = new Set<BsTokenKind>(["dedent", "eof", "indent", "newline"]);

// The file's stand-in lines, ascending: a line that holds decorators and
// nothing else (one may span lines), and the whole-line comments directly
// above such a line, which are the decorator's own. A blank line, or a
// comment with a blank line between it and the decorator, is the script's
// and counts. A decorator sharing its line with code (`@member_counts(...)
// c_squad_sensor_host sq`) leaves the line, which holds code, in the count.
export function standInLinesOf(
  source: string,
  tokens: readonly BsToken[],
  decorators: readonly BsTokenSpan[]
): number[] {
  if (decorators.length === 0) {
    return [];
  }
  const covered = new Set<number>();
  const inside = new Set<number>();
  for (const { first, last } of decorators) {
    for (let i = first; i <= last; i++) {
      inside.add(i);
    }
    for (let line = tokens[first].line; line <= tokens[last].line; line++) {
      covered.add(line);
    }
  }
  const shared = new Set<number>();
  tokens.forEach((token, i) => {
    if (!(NOT_CODE.has(token.kind) || inside.has(i))) {
      shared.add(token.line);
    }
  });
  const lines = new Set([...covered].filter((line) => !shared.has(line)));
  const text = source.split(LINE_BREAK);
  for (const line of [...lines]) {
    for (
      let above = line - 1;
      above >= 1 && text[above - 1].trimStart().startsWith("#");
      above--
    ) {
      lines.add(above);
    }
  }
  return [...lines].sort((a, b) => a - b);
}

// A file line's number in the chunk: the stand-in lines above it do not count.
// A stand-in line itself takes the number of the next line that does.
export function chunkLineOf(
  standInLines: readonly number[],
  line: number
): number {
  let above = 0;
  for (const standIn of standInLines) {
    if (standIn >= line) {
      break;
    }
    above++;
  }
  return line - above;
}

// The file line behind a chunk's line number (the inverse of chunkLineOf, for
// the lines that count).
export function fileLineOf(
  standInLines: readonly number[],
  chunkLine: number
): number {
  let line = chunkLine;
  for (const standIn of standInLines) {
    if (standIn > line) {
      break;
    }
    line++;
  }
  return line;
}
