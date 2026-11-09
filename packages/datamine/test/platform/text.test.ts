import { describe, expect, it } from "vitest";
import { text_decode, text_encode } from "../../src/platform/text.ts";

const k_samples = [
  "",
  "plain ascii",
  "é ü ß",
  "日本語 and 🐯",
  "﻿byte order mark",
  "lone \uD800 surrogate",
  "trailing \uDC00",
  "Ā above latin1 ￿",
];

const k_bad_utf8 = [
  [0xef, 0xbb, 0xbf, 0x41],
  [0xff, 0x41],
  [0xc3],
  [0xe6, 0x97, 0x41],
  [0xf0, 0x9f, 0x90],
  [0xed, 0xa0, 0x80],
  [0xc0, 0x80],
];

describe("text codec", () => {
  it("encodes as Buffer.from does", () => {
    for (const encoding of ["utf8", "latin1"] as const) {
      for (const text of k_samples) {
        expect([...text_encode(text, encoding)], `${encoding} ${text}`).toEqual(
          [...Buffer.from(text, encoding)]
        );
      }
    }
  });

  it("decodes as buffer.toString does", () => {
    const inputs = [
      ...k_bad_utf8,
      ...k_samples.map((text) => [...Buffer.from(text, "utf8")]),
      Array.from({ length: 256 }, (_, index) => index),
    ];
    for (const encoding of ["utf8", "latin1"] as const) {
      for (const input of inputs) {
        expect(
          text_decode(new Uint8Array(input), encoding),
          `${encoding} ${input}`
        ).toBe(Buffer.from(input).toString(encoding));
      }
    }
  });

  it("decodes latin1 longer than one slice", () => {
    const bytes = Buffer.alloc(20_000, 0xe9);
    expect(text_decode(bytes, "latin1")).toBe(bytes.toString("latin1"));
  });
});
