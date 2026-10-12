# @blamnetwork/poodle

![](hero.png)

Decompresses the blocks early Destiny packages are stored in. Destiny 1 uses the LZH codec, which the open-source decoders don't cover. Pure TypeScript, no dependencies.

```ts
import { decompress } from "@blamnetwork/poodle";

const raw = decompress(compressed, 0x40000);
```

A package's last block is usually short, and its size isn't recorded anywhere: ask for 0x40000 and the result is cut to what the stream holds. Malformed or unsupported input throws `PoodleError`. Only LZH (variant 0) is implemented.

It decodes every compressed block of both builds' packages byte for byte, at around 150 MB/s on Node 24.

## What it decodes

Poodle decodes one LZH block at a time: a compressed buffer in, up to 256 KiB (0x40000) of raw bytes out. It knows nothing about the container the blocks come from; the caller finds each block, passes it to `decompress` and joins the results.

LZH is an LZ77 match finder whose literals and matches are all coded with a single Huffman alphabet (the "H"). The codec id in the block header is 7, which isn't the public `OodleLZ_Compressor` numbering (LZH is 0 there); the other names in `k_codec_names` are only recognised so they can be rejected, and some are inferred. Poodle is a from-scratch reimplementation, checked byte for byte against a native decoder.

## Block layout

Bit-packed data is read most significant bit first, and multi-byte integers outside it are big endian. A block is a header followed by quanta.

```
block (up to 0x40000 raw bytes)
+-- header      1 byte (e.g. 0xb7 or 0x32), or 2
+-- quantum 0   up to 0x4000 raw bytes
+-- quantum 1
+-- ...         16 quanta in a full block
```

### Header

The first byte packs a codec, a variant and three flags. Oodle changed its header layout over time, and poodle accepts the layouts it knows, picking one from the low two bits (a low nibble of 0xc marks a two-byte layout). The fields it reads:

| Field | Meaning |
| --- | --- |
| codec | 7 for LZH. Other ids are recognised by name but rejected. |
| variant | LZH comes in variants 0-3 (inferred to be separate decoder generations). Only 0 is implemented. |
| uncompressed | The block is stored: raw bytes follow the header, with no quantum headers. |
| restart | The block doesn't reach back into earlier ones. Parsed but unused, since each `decompress` call is one block. |
| checksums | Every quantum header is followed by a 3-byte checksum. Skipped, never verified. |

For example 0xb7 is LZH, restart, no checksums; 0x32 is an older layout of the same codec. The meanings of "restart" and "variant" are inferred from the field names and behaviour, not from documentation.

### Quanta

Each block is split into 16 KiB (0x4000) quanta. Quanta share the match window (a match may reach back into earlier quanta of the block) and the current Huffman table, but each one restarts the recent-offset list. Every quantum opens with a big endian 16-bit word.

| Word | Meaning |
| --- | --- |
| low 14 bits = 0x3fff | Escape. The top 2 bits say which: 0 copy, 1 fill, 2 stored. |
| anything else | Low 14 bits are the packed payload size minus 1. Bit 14 set means new Huffman tables open the payload. Bit 15 is ignored. |

| Escape | Payload |
| --- | --- |
| 0, copy | A varint, then the quantum repeats earlier output at distance value + 1. |
| 1, fill | One byte, repeated for the whole quantum. |
| 2, stored | Raw bytes (after the 3-byte checksum, if the header has them). |

The copy varint is 2 bytes big endian, stored plus 0x8000, when the value is under 0x8000. Bigger values keep their low 15 bits that way and continue in 7-bit groups, low first, until a byte with its top bit set.

A normal quantum is a packed payload: optionally the Huffman tables, then the Huffman coded token stream.

```
word (2) | [checksum (3)] | [Huffman tables, bit packed] | token stream, bit packed
```

If the packed size equals the quantum's raw size, the payload is stored raw (an encoder fallback when compression doesn't help). A payload that is only a Huffman table with a single symbol stands for a run of that byte.

### Huffman tables

One alphabet of 256 + 20 + 19 * 23 = 713 symbols covers everything:

- Symbols 0-255 are literal bytes.
- The next 20 are recent-offset packets: a length slot, with the offset taken from the recent list.
- The remaining 437 are match packets: one of 19 length slots crossed with one of 23 offset slots.

Code lengths are sent in one of two layouts, chosen by the first bit (`read_huffman_table` in `huffman.ts`):

- Sparse: a symbol count, then (symbol, length) pairs in ascending symbol order. A table of one symbol sends no codes at all.
- Runs: alternating runs of unused and used symbols (Elias-gamma style counts), each used length coded as a zigzag delta from a running average.

Codes are canonical and at most 16 bits, and the code space must be exactly full or the block is rejected.

### Packets

After a symbol come its extra bits, packed MSB first.

| Part | Coding |
| --- | --- |
| length | The slot gives a base and a number of extra bits (`k_match_lengths`, `k_rep_lengths`). The last slot (base 157) escapes to a longer length with a unary-prefixed width, reaching 1629 + 14 bits. |
| offset | One of 23 slots giving a base plus extra bits (`k_offsets`), so the window is 128 KiB. Slot 0 is a near offset (1-16) that isn't remembered. |
| recent offset | A 2-bit index into the four most recent offsets; a reused one moves to the front. |

The recent offsets start each quantum at 20, 24, 28, 32. A new offset enters in second place; the first only changes when a recent one is reused. The terms (slot, packet, quantum, "rep") follow poodle's source and are inferred from behaviour, not from Oodle documentation.

## Decompression outline

`decompress(compressed, raw_size)` in `decompress.ts` works like this.

1. Allocate `raw_size` bytes and loop while output remains. If the input ends at a block boundary or quantum boundary, return what was decoded (a container's last block is often short, and its raw size may not be stored).
2. `read_block_header` (`block_header.ts`) decodes the header. Anything that isn't LZH variant 0 throws `PoodleError`.
3. Walk the block's quanta, each up to 0x4000 bytes. A stored block just copies them.
4. Read the quantum word. Escape quanta copy, fill or store as above; the copy distance is checked against the output so far.
5. Otherwise skip the checksum if the header has them, and bound the payload by its packed size.
6. If the word asks for new tables, `read_huffman_table` reads them from a `c_bit_reader` (`bit_reader.ts`) and builds the lookup (`c_huffman_table`: an 11-bit fast table, with longer codes found by canonical-code limits). Tables carry over to later quanta until replaced.
7. `decode_lzh` (`lzh.ts`) runs the token loop over the rest of the payload. Each pass decodes a symbol. A literal writes one byte. Anything else is a packet: read the offset (recent index, near slot or far slot), then the length extra bits (or the escape length), then copy `length` bytes from `offset` back. Overlapping copies repeat their pattern, so short ones copy byte by byte forwards, and long non-overlapping ones use `copyWithin`.
8. Validate: a match can't reach before the output start or past the quantum end, and the payload must be consumed exactly (`LZH quantum size mismatch`). Reading past the payload only ever shifts in zeros.
9. Repeat until `raw_size` bytes are produced, then return the buffer.

## Limits and gotchas

- Only LZH variant 0 is implemented. Other variants and codecs throw `PoodleError`.
- Quantum checksums are skipped, not verified.
- The output is allocated at `raw_size` up front. Pass the block size (0x40000) when the real size isn't known.
- There is no streaming: each call decodes one whole block held in memory.
- `test/synthetic.ts` and `test/lzh_writer.ts` hand-build streams for rarer cases, such as copy quanta, the run-length table layout and the two-byte header forms.
