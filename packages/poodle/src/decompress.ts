import { c_bit_reader } from "./bit_reader.ts";
import {
  k_codec_lzh,
  k_codec_names,
  read_block_header,
} from "./block_header.ts";
import { type c_huffman_table, read_huffman_table } from "./huffman.ts";
import { decode_lzh, k_lzh_symbol_count } from "./lzh.ts";
import { PoodleError } from "./poodle_error.ts";

const k_block_size = 0x4_0000;
// LZH codes each block as independent 16 KiB quanta, apart from sharing the
// Huffman tables and the match window.
const k_quantum_size = 0x4000;

// Quantum headers use 0x3fff in the size field as an escape.
const k_quantum_escape = 0x3fff;
const k_escape_copy = 0;
const k_escape_fill = 1;
const k_escape_stored = 2;

// Values under 0x8000 take 2 bytes, big endian, stored + 0x8000. Bigger ones
// store their low 15 bits that way minus the 0x8000, then the rest in 7-bit
// groups, low first, until a byte with its top bit set. A byte without the
// top bit counts as byte + 0x80, not byte.
function read_varint(data: Uint8Array, pos: number): [number, number] {
  if (pos + 2 > data.length) {
    throw new PoodleError("truncated varint");
  }
  const low = (data[pos] << 8) | data[pos + 1];
  pos += 2;
  if (low >= 0x8000) {
    return [low - 0x8000, pos];
  }
  let high = 0;
  let scale = 1;
  while (pos < data.length) {
    const byte = data[pos++];
    if (byte >= 0x80) {
      high += (byte - 0x80) * scale;
      return [low + 0x8000 + high * 0x8000, pos];
    }
    high += (byte + 0x80) * scale;
    scale *= 0x80;
  }
  throw new PoodleError("truncated varint");
}

// Decodes `compressed` into raw_size bytes. The last block of a package is
// usually shorter than the size it's read with; its stream just stops at a
// quantum boundary, and the result is cut to what was decoded.
export function decompress(
  compressed: Uint8Array,
  raw_size: number
): Uint8Array {
  const out = new Uint8Array(raw_size);
  let pos = 0;
  let dst = 0;
  while (dst < raw_size) {
    if (pos === compressed.length) {
      return out.subarray(0, dst);
    }
    const header = read_block_header(compressed, pos);
    pos += header.size;
    if (header.codec !== k_codec_lzh || header.variant !== 0) {
      const name = k_codec_names[header.codec] ?? `codec ${header.codec}`;
      throw new PoodleError(
        header.codec === k_codec_lzh
          ? `unsupported LZH variant ${header.variant}`
          : `unsupported codec ${name}`
      );
    }
    const block_start = dst;
    const block_end = Math.min(dst + k_block_size, raw_size);
    let table: c_huffman_table | undefined;
    while (dst < block_end) {
      if (pos === compressed.length && dst > block_start) {
        return out.subarray(0, dst);
      }
      const quantum_end = Math.min(dst + k_quantum_size, block_end);
      const size = quantum_end - dst;
      if (header.uncompressed) {
        if (pos + size > compressed.length) {
          throw new PoodleError("truncated stored block");
        }
        out.set(compressed.subarray(pos, pos + size), dst);
        pos += size;
        dst = quantum_end;
        continue;
      }

      if (pos + 2 > compressed.length) {
        throw new PoodleError("truncated quantum header");
      }
      const word = (compressed[pos] << 8) | compressed[pos + 1];
      pos += 2;
      if ((word & k_quantum_escape) === k_quantum_escape) {
        switch (word >>> 14) {
          case k_escape_copy: {
            // A repeat of earlier output.
            const [value, next] = read_varint(compressed, pos);
            pos = next;
            const offset = value + 1;
            if (offset < 2 || offset > dst) {
              throw new PoodleError("bad quantum copy offset");
            }
            for (let from = dst - offset; dst < quantum_end; ) {
              out[dst++] = out[from++];
            }
            break;
          }
          case k_escape_fill:
            if (pos >= compressed.length) {
              throw new PoodleError("truncated quantum header");
            }
            out.fill(compressed[pos++], dst, quantum_end);
            break;
          case k_escape_stored:
            if (header.checksums) {
              pos += 3;
            }
            if (pos + size > compressed.length) {
              throw new PoodleError("truncated stored quantum");
            }
            out.set(compressed.subarray(pos, pos + size), dst);
            pos += size;
            break;
          default:
            throw new PoodleError("bad quantum header");
        }
        dst = quantum_end;
        continue;
      }

      // The low 14 bits are the packed size - 1; bit 14 says new Huffman
      // tables open the payload, and bit 15 is unused by the decoder.
      const packed = (word & k_quantum_escape) + 1;
      const new_table = ((word >>> 14) & 1) === 1;
      if (header.checksums) {
        pos += 3;
      }
      const payload_end = pos + packed;
      if (payload_end > compressed.length) {
        throw new PoodleError("truncated quantum");
      }
      let lz_start = pos;
      if (new_table) {
        const reader = new c_bit_reader(compressed, pos, payload_end);
        table = read_huffman_table(reader, k_lzh_symbol_count);
        lz_start += reader.consumed_bytes();
        if (lz_start > payload_end) {
          throw new PoodleError("Huffman tables overrun their quantum");
        }
      }
      if (packed === size) {
        if (new_table) {
          throw new PoodleError("stored quantum with Huffman tables");
        }
        out.set(compressed.subarray(pos, payload_end), dst);
      } else if (lz_start === payload_end) {
        // Tables and no codes: a table with one symbol stands for a run.
        if (table?.used !== 1) {
          throw new PoodleError("empty LZH quantum");
        }
        out.fill(table.lone_symbol & 0xff, dst, quantum_end);
      } else {
        if (!table) {
          throw new PoodleError("LZH quantum before any Huffman tables");
        }
        const reader = new c_bit_reader(compressed, lz_start, payload_end);
        decode_lzh(reader, table, out, dst, quantum_end);
        if (lz_start + reader.consumed_bytes() !== payload_end) {
          throw new PoodleError("LZH quantum size mismatch");
        }
      }
      pos = payload_end;
      dst = quantum_end;
    }
  }
  return out;
}
