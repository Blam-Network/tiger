// CPython 2.7's dict iteration order: bsc kept a chunk's globals in one, and
// upvalue_provider lists imports in that order. String keys and inserts only.

const MIN_SIZE = 8;
const PERTURB_SHIFT = 5;
const HASH_MULTIPLIER = 1_000_003;
// used > 50000 would switch the growth factor to 2; no chunk gets near it
const GROWTH = 4;

// string_hash() from stringobject.c, on a 32-bit long. The 64-bit variant
// differs only in deep probe chains the corpus never reaches.
export function py2StringHash(key: string): number {
  if (key.length === 0) {
    return 0;
  }
  let x = (key.charCodeAt(0) << 7) >>> 0;
  for (let i = 0; i < key.length; i++) {
    x = (Math.imul(HASH_MULTIPLIER, x) ^ key.charCodeAt(i)) >>> 0;
  }
  x = (x ^ key.length) >>> 0;
  // -1 is reserved for errors
  return x === 0xffff_ffff ? 0xffff_fffe : x;
}

interface Slot {
  readonly hash: number;
  readonly key: string;
}

function insert(table: (Slot | undefined)[], slot: Slot): void {
  const mask = table.length - 1;
  let i = (slot.hash & mask) >>> 0;
  let perturb = slot.hash;
  while (table[i & mask] !== undefined) {
    i = (((i << 2) >>> 0) + i + perturb + 1) >>> 0;
    perturb >>>= PERTURB_SHIFT;
  }
  table[i & mask] = slot;
}

// Iteration order of a dict built by inserting `keys` in order (repeats are
// ignored, as a dict's are).
export function py2DictOrder(keys: readonly string[]): string[] {
  let table: (Slot | undefined)[] = new Array(MIN_SIZE).fill(undefined);
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    insert(table, { hash: py2StringHash(key), key });
    // dictresize when fill*3 >= (mask+1)*2, to the smallest power of two
    // above 4*used; entries are re-inserted in old slot order
    if (seen.size * 3 >= table.length * 2) {
      let size = MIN_SIZE;
      while (size <= seen.size * GROWTH) {
        size <<= 1;
      }
      const old = table;
      table = new Array(size).fill(undefined);
      for (const slot of old) {
        if (slot !== undefined) {
          insert(table, slot);
        }
      }
    }
  }
  return table.flatMap((slot) => (slot === undefined ? [] : [slot.key]));
}
