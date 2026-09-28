import { PoodleError } from "./poodle_error.js";

// The codec ids block headers carry, which aren't the public
// OodleLZ_Compressor values (LZH is 0 there).
export const k_codec_names: Record<number, string> = {
  0: "LZHLW",
  1: "LZNIB",
  2: "LZB16",
  3: "LZBLW",
  4: "LZA",
  5: "LZNA",
  6: "Kraken",
  7: "LZH",
  10: "Mermaid",
  11: "BitKnit",
};
export const k_codec_lzh = 7;

export interface block_header {
  // Each quantum header carries a 3-byte checksum.
  checksums: boolean;
  codec: number;
  // The block doesn't reach back into earlier ones.
  restart: boolean;
  size: number;
  // The block is stored: raw bytes follow the header.
  uncompressed: boolean;
  // LZH comes in variants 0-3; each has its own decoder.
  variant: number;
}

function header(
  codec: number,
  variant: number,
  uncompressed: boolean,
  restart: boolean,
  checksums: boolean,
  size = 1
): block_header {
  return { codec, variant, uncompressed, restart, checksums, size };
}

function bad(byte: number): never {
  throw new PoodleError(
    `unknown Oodle block header 0x${byte.toString(16).padStart(2, "0")}`
  );
}

// Every 256 KiB block opens with this. The low two bits of the first byte
// pick one of four one-byte layouts from Oodle's history; a low nibble of
// 0xc marks the later two-byte layout.
export function read_block_header(data: Uint8Array, pos: number): block_header {
  if (pos >= data.length) {
    throw new PoodleError("missing block header");
  }
  const b = data[pos];
  const bit7 = b >>> 7;
  const bit6 = (b >>> 6) & 1;
  if ((b & 0xf) === 0xc) {
    if (pos + 1 >= data.length || (b >>> 4) & 3) {
      bad(b);
    }
    const second = data[pos + 1];
    const id = second & 0x3f;
    if (id >= 7 && id <= 9) {
      return header(
        k_codec_lzh,
        id - 7,
        bit6 === 1,
        bit7 === 1,
        second >>> 7 === 1,
        2
      );
    }
    if (id >= 12) {
      bad(b);
    }
    return header(id, 0, bit6 === 1, bit7 === 1, second >>> 7 === 1, 2);
  }
  switch (b & 3) {
    case 0: {
      const variant = (b >>> 4) & 3;
      switch ((b >>> 2) & 3) {
        case 0:
          return header(k_codec_lzh, variant, true, bit6 === 1, bit7 === 1);
        case 1:
          return header(k_codec_lzh, variant, false, bit6 === 1, bit7 === 1);
        case 2:
          // This layout never sets the stored flag.
          return header(0, variant, false, bit6 === 1, bit7 === 1);
        default:
          return bad(b);
      }
    }
    case 1: {
      const id = (b >>> 2) & 7;
      const stored = ((b >>> 5) & 1) === 1;
      if (id < 4) {
        return header(k_codec_lzh, id, stored, bit6 === 1, bit7 === 1);
      }
      if (id === 4 || id === 5) {
        return header(id - 4, 0, stored, bit6 === 1, bit7 === 1);
      }
      return bad(b);
    }
    case 2: {
      let c = b >>> 2;
      let stored = true;
      let restart = true;
      let checksums = false;
      if (c >= 12) {
        c -= 12;
        stored = false;
        restart = (c & 1) === 1;
        checksums = ((c >>> 1) & 1) === 1;
        c >>>= 2;
      }
      if (c < 4) {
        return header(k_codec_lzh, c, stored, restart, checksums);
      }
      if (c < 8) {
        return header(c - 4, 0, stored, restart, checksums);
      }
      return bad(b);
    }
    default: {
      let c = b >>> 2;
      if (c < 16) {
        return header(c & 7, 0, true, c >= 8, false);
      }
      c -= 16;
      const restart = (c & 1) === 1;
      const checksums = ((c >>> 1) & 1) === 1;
      const id = c >>> 2;
      if (id > 10) {
        bad(b);
      }
      // Ids 7-10 all decode as LZH, with the variant dropped.
      return header(id >= 7 ? k_codec_lzh : id, 0, false, restart, checksums);
    }
  }
}
