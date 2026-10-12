// Hand-built streams covering what the alpha's packages don't (they only use
// sparse and run tables, fill and stored quanta, and the 0x32 header), with
// the output each should decode to.
import { readFileSync } from "node:fs";
import { c_lzh_quantum } from "./lzh_writer.ts";

export interface synthetic_case {
  compressed: Uint8Array;
  expected: Uint8Array;
  name: string;
  raw_size: number;
}

// LZH, no checksums, compressed.
const k_header_lzh = 0x32;

type part = string | Uint8Array | { length: number; offset: number };

// The output a list of literals and (length, offset) copies stands for.
function expand(size: number, parts: part[]): Uint8Array {
  const out = new Uint8Array(size);
  let dst = 0;
  for (const p of parts) {
    if (typeof p === "string") {
      for (const c of p) {
        out[dst++] = c.charCodeAt(0);
      }
    } else if (p instanceof Uint8Array) {
      out.set(p, dst);
      dst += p.length;
    } else {
      for (let i = 0; i < p.length; i++, dst++) {
        out[dst] = out[dst - p.offset];
      }
    }
  }
  if (dst !== size) {
    throw new Error(`expected output is ${dst} bytes, not ${size}`);
  }
  return out;
}

// A 32-bit LCG; its products stay exact in doubles.
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1_664_525 + 1_013_904_223) % 2 ** 32;
    return s;
  };
}

// Bytes that don't compress.
export function noise(size: number, seed = 0x2545_f491): Uint8Array {
  const out = new Uint8Array(size);
  const next = lcg(seed);
  for (let i = 0; i < size; i++) {
    out[i] = Math.floor(next() / 2 ** 24);
  }
  return out;
}

const k_words =
  "tiger engine destiny alpha oodle block quantum huffman match offset literal length window guardian traveler speaker".split(
    " "
  );

// Word salad; test/fixtures/text.lzh is an LZH compression (level 4) of
// synthetic_text(20000).
export function synthetic_text(size: number): Uint8Array {
  const out: number[] = [];
  const next = lcg(0x1234_5678);
  while (out.length < size) {
    const s = next();
    for (const c of k_words[Math.floor(s / 2 ** 16) % k_words.length]) {
      out.push(c.charCodeAt(0));
    }
    out.push(Math.floor(s / 2 ** 8) % 11 === 0 ? 0x0a : 0x20);
  }
  return Uint8Array.from(out.slice(0, size));
}

function lz_case(): synthetic_case {
  // Recent offsets start as 20, 24, 28, 32; the comments track them.
  const quantum = new c_lzh_quantum()
    .literal("0123456789abcdefghijklmnopqrstuvwxyz")
    .match(5, 30) // 20 30 24 28: new offsets go second
    .rep(1, 3) // 30 20 24 28
    .rep(0, 2)
    .rep(3, 4) // 28 30 20 24
    .rep(2, 2) // 20 28 30 24
    .match(6, 2) // near offsets aren't remembered
    .match(9, 1)
    .match(300, 67) // 20 67 28 30, escape-coded length
    .rep(0, 157)
    .match(76, 524) // 20 524 67 28
    .match(700, 1)
    .match(2000, 600) // 20 600 524 67
    .match(400, 3300) // 20 3300 600 524
    .literal("!")
    .rep(2, 395);
  return {
    name: "literals, matches and recent offsets",
    compressed: Uint8Array.from([k_header_lzh, ...quantum.bytes()]),
    raw_size: 4096,
    expected: expand(4096, [
      "0123456789abcdefghijklmnopqrstuvwxyz",
      { length: 5, offset: 30 },
      { length: 3, offset: 30 },
      { length: 2, offset: 30 },
      { length: 4, offset: 28 },
      { length: 2, offset: 20 },
      { length: 6, offset: 2 },
      { length: 9, offset: 1 },
      { length: 300, offset: 67 },
      { length: 157, offset: 20 },
      { length: 76, offset: 524 },
      { length: 700, offset: 1 },
      { length: 2000, offset: 600 },
      { length: 400, offset: 3300 },
      "!",
      { length: 395, offset: 600 },
    ]),
  };
}

function quantum_kinds_case(): synthetic_case {
  const q = 0x4000;
  const tiger = new c_lzh_quantum().literal("tiger").match(q - 5, 5);
  const stored = noise(q);
  const compressed = [
    k_header_lzh,
    ...tiger.bytes(),
    // Escape 1: fill with one byte.
    0x7f,
    0xff,
    0x5a,
    // Escape 2: stored.
    0xbf,
    0xff,
    ...stored,
    // Escape 0: copy from 16384 back (a varint of offset - 1).
    0x3f,
    0xff,
    0xbf,
    0xff,
    // The same from 40000 back, with the varint's long form.
    0x3f,
    0xff,
    0x1c,
    0x3f,
    0x80,
    // LZH again, with the first quantum's tables.
    ...tiger.bytes(tiger.lengths()),
  ];
  return {
    name: "fill, stored and copy quanta, and tables carried over",
    compressed: Uint8Array.from(compressed),
    raw_size: 6 * q,
    expected: expand(6 * q, [
      "tiger",
      { length: q - 5, offset: 5 },
      new Uint8Array(q).fill(0x5a),
      stored,
      { length: q, offset: q },
      { length: q, offset: 40_000 },
      "tiger",
      { length: q - 5, offset: 5 },
    ]),
  };
}

function lone_symbol_case(): synthetic_case {
  return {
    name: "a one-symbol table and nothing else fills the quantum",
    compressed: Uint8Array.from([
      k_header_lzh,
      ...new c_lzh_quantum().literal("A").bytes(),
    ]),
    raw_size: 0x4000,
    expected: new Uint8Array(0x4000).fill(0x41),
  };
}

function stored_block_case(): synthetic_case {
  const raw = noise(100, 7);
  return {
    name: "a stored block",
    compressed: Uint8Array.from([0x02, ...raw]),
    raw_size: raw.length,
    expected: raw,
  };
}

function checksum_case(): synthetic_case {
  const quantum = new c_lzh_quantum().literal("checksum").match(92, 8).bytes();
  return {
    name: "quantum checksums (skipped, not verified)",
    // 0x3a: LZH with a 3-byte checksum after each quantum header.
    compressed: Uint8Array.from([
      0x3a,
      ...quantum.slice(0, 2),
      0x12,
      0x34,
      0x56,
      ...quantum.slice(2),
    ]),
    raw_size: 100,
    expected: expand(100, ["checksum", { length: 92, offset: 8 }]),
  };
}

function encoder_case(): synthetic_case {
  return {
    name: "encoder output: run-coded tables, two-byte header, short last quantum",
    compressed: readFileSync(new URL("fixtures/text.lzh", import.meta.url)),
    raw_size: 20_000,
    expected: synthetic_text(20_000),
  };
}

export function synthetic_cases(): synthetic_case[] {
  return [
    lz_case(),
    quantum_kinds_case(),
    lone_symbol_case(),
    stored_block_case(),
    checksum_case(),
    encoder_case(),
  ];
}
