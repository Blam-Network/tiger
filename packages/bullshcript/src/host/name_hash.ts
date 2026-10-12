// FNV-1 (multiply, then xor), which every row name, incident name and
// identifier in this build is stored as.
const OFFSET_BASIS = 0x811c9dc5;
const PRIME = 0x01000193;
const ASCII_MAX = 0x7f;
const encoder = new TextEncoder();

export const FNV1_EMPTY = OFFSET_BASIS;

// A hash a script spells out because its name is not known: "0x9B1D6A71" (the
// breach Ghost's performance).
const HASH_LITERAL = /^0x[0-9a-f]{1,8}$/i;

export function parseHashLiteral(text: string): number | undefined {
  return HASH_LITERAL.test(text) ? Number.parseInt(text, 16) >>> 0 : undefined;
}

// Names repeat constantly: every field read hashes a few candidates.
const hashes = new Map<string, number>();
const MAX_CACHED = 65_536;

function hashBytes(name: string): number {
  let hash = OFFSET_BASIS;
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i);
    if (code > ASCII_MAX) {
      hash = OFFSET_BASIS;
      for (const byte of encoder.encode(name)) {
        hash = (Math.imul(hash, PRIME) ^ byte) >>> 0;
      }
      return hash;
    }
    hash = (Math.imul(hash, PRIME) ^ code) >>> 0;
  }
  return hash;
}

export function fnv1(name: string): number {
  let hash = hashes.get(name);
  if (hash === undefined) {
    hash = hashBytes(name);
    if (hashes.size >= MAX_CACHED) {
      hashes.clear();
    }
    hashes.set(name, hash);
  }
  return hash;
}
