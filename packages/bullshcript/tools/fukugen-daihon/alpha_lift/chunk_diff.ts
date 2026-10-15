// Comparing compiled chunks, for the alpha checks (checks.ts), and the
// decompiler's text without its header, for tools that show a chunk's Lua.
import type {
  HksBytecode,
  Method,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";

// Decompiler output without its own three-line header and the blank after
// it.
export function stripDecompilerHeader(source: string): string {
  return source.split("\n").slice(4).join("\n").trimEnd();
}

export interface ChunkDiffOptions {
  // also compare line info (lineInfo, lineDefined, lastLineDefined)
  readonly lines?: boolean;
}

const LINE_FIELDS = new Set(["lastLineDefined", "lineDefined", "lineInfo"]);
// byte positions follow from everything else
const IGNORED_FIELDS = new Set(["endOffset", "offset", "protos"]);

function diffPrototype(
  expected: Method,
  actual: Method,
  path: string,
  options: ChunkDiffOptions,
  out: string[]
): void {
  for (const key of Object.keys(expected) as (keyof Method)[]) {
    if (IGNORED_FIELDS.has(key) || (!options.lines && LINE_FIELDS.has(key))) {
      continue;
    }
    if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
      out.push(`${path}.${key}`);
    }
  }
  if (expected.protos.length !== actual.protos.length) {
    out.push(`${path}.protos.length`);
    return;
  }
  expected.protos.forEach((child, i) => {
    diffPrototype(child, actual.protos[i], `${path}.${i}`, options, out);
  });
}

// What differs between two chunks, as dotted prototype paths ("0.3.code");
// empty when they match.
export function diffChunks(
  expected: HksBytecode,
  actual: HksBytecode,
  options: ChunkDiffOptions = {}
): string[] {
  const out: string[] = [];
  if (JSON.stringify(expected.header) !== JSON.stringify(actual.header)) {
    out.push("header");
  }
  const types = (chunk: HksBytecode) => [...chunk.typeTable.names];
  if (JSON.stringify(types(expected)) !== JSON.stringify(types(actual))) {
    out.push("typeTable");
  }
  diffPrototype(expected.root, actual.root, "0", options, out);
  return out;
}
