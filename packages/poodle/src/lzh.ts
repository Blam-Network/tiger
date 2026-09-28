import type { c_bit_reader } from "./bit_reader.js";
import type { c_huffman_table } from "./huffman.js";
import { PoodleError } from "./poodle_error.js";

// LZH: one Huffman alphabet covers literals and match packets. Symbols below
// 256 are literal bytes; the rest pick a length slot and, unless the packet
// reuses a recent offset, an offset slot. Extra bits follow the symbol.
export const k_literal_count = 256;
export const k_rep_packet_count = 20;
export const k_offset_slot_count = 23;

// Length slots as [base, extra bits]. A slot with base 157 and extra bits
// instead takes an escape-coded length.
export const k_rep_lengths = [
  [2, 0],
  [3, 0],
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [8, 0],
  [9, 1],
  [11, 1],
  [13, 1],
  [15, 1],
  [17, 2],
  [21, 2],
  [25, 2],
  [29, 3],
  [37, 3],
  [45, 4],
  [61, 5],
  [93, 6],
  [157, 6],
] as const;
export const k_match_lengths = [
  [3, 0],
  [4, 0],
  [5, 0],
  [6, 0],
  [7, 0],
  [8, 0],
  [9, 1],
  [11, 1],
  [13, 1],
  [15, 1],
  [17, 2],
  [21, 2],
  [25, 2],
  [29, 3],
  [37, 3],
  [45, 4],
  [61, 5],
  [93, 6],
  [157, 7],
] as const;
export const k_escape_length = 157;

// Offset slots as [base, extra bits]; an offset is base + extra + 1, so the
// window is 128 KiB. Slot 0 is a near offset (1..16) that, unlike the others,
// isn't remembered as a recent offset.
export const k_offsets = [
  [0, 4],
  [16, 4],
  [32, 5],
  [64, 6],
  [128, 7],
  [256, 8],
  [512, 8],
  [768, 8],
  [1024, 9],
  [1536, 9],
  [2048, 10],
  [3072, 10],
  [4096, 10],
  [5120, 10],
  [6144, 11],
  [8192, 12],
  [12_288, 12],
  [16_384, 13],
  [24_576, 13],
  [32_768, 14],
  [49_152, 14],
  [65_536, 15],
  [98_304, 15],
] as const;

export const k_lzh_symbol_count =
  k_literal_count +
  k_rep_packet_count +
  k_match_lengths.length * k_offset_slot_count;

// Symbol - 256 -> (length base << 12) | (length bits << 8) | offset slot,
// with k_rep_slot marking a recent-offset packet.
const k_rep_slot = 0xff;
const k_packets = (() => {
  const packets = new Int32Array(k_lzh_symbol_count - k_literal_count);
  k_rep_lengths.forEach(([base, bits], i) => {
    packets[i] = (base << 12) | (bits << 8) | k_rep_slot;
  });
  k_match_lengths.forEach(([base, bits], length_slot) => {
    for (
      let offset_slot = 0;
      offset_slot < k_offset_slot_count;
      offset_slot++
    ) {
      packets[
        k_rep_packet_count + length_slot * k_offset_slot_count + offset_slot
      ] = (base << 12) | (bits << 8) | offset_slot;
    }
  });
  return packets;
})();
const k_offset_bases = Int32Array.from(k_offsets, ([base]) => base);
const k_offset_bits = Int32Array.from(k_offsets, ([, bits]) => bits);

// Unary prefix picks the width: 0 -> 6 bits, 10 -> 7, 110 -> 8, 1110 -> 10,
// 1111 -> 14, each range starting where the last ended.
function read_escape_length(reader: c_bit_reader): number {
  if (reader.read(1) === 0) {
    return k_escape_length + reader.read(6);
  }
  if (reader.read(1) === 0) {
    return 221 + reader.read(7);
  }
  if (reader.read(1) === 0) {
    return 349 + reader.read(8);
  }
  if (reader.read(1) === 0) {
    return 605 + reader.read(10);
  }
  return 1629 + reader.read(14);
}

// Decodes out[start, end). Matches may reach back past start into earlier
// quanta of the block, but every quantum restarts the recent offsets.
export function decode_lzh(
  reader: c_bit_reader,
  table: c_huffman_table,
  out: Uint8Array,
  start: number,
  end: number
): void {
  // The hot loop keeps the reader's window in locals, handing it back for
  // escape-coded lengths and at the end.
  const data = reader.data;
  const data_end = reader.end;
  let pos = reader.pos;
  let bits = reader.bits;
  let count = reader.count;
  // Recent offsets, most recent first. A new offset goes in second place: the
  // first only changes when a recent offset is reused and moves to the front.
  let rep0 = 20;
  let rep1 = 24;
  let rep2 = 28;
  let rep3 = 32;
  let dst = start;
  while (dst < end) {
    // A code is at most 16 bits.
    if (count <= 16) {
      if (pos + 1 < data_end) {
        bits |= ((data[pos] << 8) | data[pos + 1]) << (16 - count);
        pos += 2;
        count += 16;
      } else {
        for (; count <= 24; count += 8) {
          bits |= (pos < data_end ? data[pos] : 0) << (24 - count);
          pos++;
        }
      }
    }
    const code = table.lookup(bits);
    bits <<= code & 31;
    count -= code & 31;
    const symbol = code >>> 5;
    if (symbol < k_literal_count) {
      out[dst++] = symbol;
      continue;
    }

    // Offset and length extra bits come to at most 22.
    for (; count <= 24; count += 8) {
      bits |= (pos < data_end ? data[pos] : 0) << (24 - count);
      pos++;
    }
    const packet = k_packets[symbol - k_literal_count];
    const slot = packet & 0xff;
    let length = packet >>> 12;
    const length_bits = (packet >>> 8) & 0xf;
    let offset: number;
    if (slot === k_rep_slot) {
      const index = bits >>> 30;
      bits <<= 2;
      count -= 2;
      switch (index) {
        case 0:
          offset = rep0;
          break;
        case 1:
          offset = rep1;
          rep1 = rep0;
          rep0 = offset;
          break;
        case 2:
          offset = rep2;
          rep2 = rep1;
          rep1 = rep0;
          rep0 = offset;
          break;
        default:
          offset = rep3;
          rep3 = rep2;
          rep2 = rep1;
          rep1 = rep0;
          rep0 = offset;
          break;
      }
    } else if (slot === 0) {
      offset = (bits >>> 28) + 1;
      bits <<= 4;
      count -= 4;
    } else {
      const n = k_offset_bits[slot];
      offset = k_offset_bases[slot] + (bits >>> (32 - n)) + 1;
      bits <<= n;
      count -= n;
      rep3 = rep2;
      rep2 = rep1;
      rep1 = offset;
    }
    if (length_bits && length === k_escape_length) {
      reader.pos = pos;
      reader.bits = bits;
      reader.count = count;
      length = read_escape_length(reader);
      pos = reader.pos;
      bits = reader.bits;
      count = reader.count;
    } else if (length_bits) {
      length += bits >>> (32 - length_bits);
      bits <<= length_bits;
      count -= length_bits;
    }

    if (offset > dst) {
      throw new PoodleError("LZH match reaches before the block");
    }
    if (length > end - dst) {
      throw new PoodleError("LZH match runs past the quantum");
    }
    if (offset >= length && length > 32) {
      out.copyWithin(dst, dst - offset, dst - offset + length);
      dst += length;
    } else {
      // Overlapping copies repeat the pattern, so this has to go forwards.
      for (let from = dst - offset, stop = dst + length; dst < stop; ) {
        out[dst++] = out[from++];
      }
    }
  }
  reader.pos = pos;
  reader.bits = bits;
  reader.count = count;
}
