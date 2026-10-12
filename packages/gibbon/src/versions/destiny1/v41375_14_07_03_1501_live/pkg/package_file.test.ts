import { describe, expect, it } from "vitest";
import { memory_source } from "./byte_source.ts";
import { k_block_flag_compressed, k_block_size } from "./package_block.ts";
import { k_package_entry_type_tag } from "./package_entry.ts";
import { c_package_file, package_patch_path } from "./package_file.ts";
import { e_package_language } from "./package_header.ts";
import { make_tag_hash } from "./tag_hash.ts";

interface test_block {
  bytes: Buffer;
  flags?: number;
  // A block of an earlier patch sits at `offset` in that patch's file.
  offset?: number;
  patch?: number;
}

function write_entry(
  view: DataView,
  at: number,
  entry: { class_hash: number; block: number; offset: number; size: number }
) {
  view.setUint32(at, entry.class_hash);
  view.setUint32(at + 4, (k_package_entry_type_tag << 16) | (0x19 << 8) | 2);
  view.setUint32(at + 8, Math.floor(entry.size / 16));
  view.setUint32(
    at + 12,
    (((entry.size & 0xf) << 28) | ((entry.offset >> 4) << 14) | entry.block) >>>
      0
  );
}

// Two entries (the second crossing a block boundary) and one named tag.
function build_package(blocks: test_block[], patch = 0): Buffer {
  const entry_offset = 0x200;
  const block_offset = 0x300;
  const named_offset = 0x400;
  let data_offset = 0x1000;
  const stored = blocks.filter((b) => (b.patch ?? patch) === patch);
  const out = Buffer.alloc(
    data_offset + stored.reduce((n, b) => n + b.bytes.byteLength, 0)
  );
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  view.setUint16(0, 24);
  view.setUint16(2, 3);
  view.setUint16(4, 0x151);
  view.setUint16(0x20, patch);
  view.setUint16(0x22, e_package_language.english);
  out.write("live tool test", 0x24, "latin1");
  view.setUint32(0xb4, 2);
  view.setUint32(0xb8, entry_offset);
  view.setUint32(0xd0, blocks.length);
  view.setUint32(0xd4, block_offset);
  view.setUint32(0xec, 1);
  view.setUint32(0xf0, named_offset);
  view.setUint32(0x13c, out.byteLength);
  write_entry(view, entry_offset, {
    class_hash: 0x80800341,
    block: 0,
    offset: 0x10,
    size: 0x20,
  });
  write_entry(view, entry_offset + 16, {
    class_hash: 0x80803389,
    block: 0,
    offset: k_block_size - 0x10,
    size: 0x30,
  });
  blocks.forEach((block, i) => {
    const at = block_offset + i * 32;
    const here = (block.patch ?? patch) === patch;
    view.setUint32(at, here ? data_offset : (block.offset ?? 0));
    view.setUint32(at + 4, block.bytes.byteLength);
    view.setUint16(at + 8, block.patch ?? patch);
    view.setUint16(at + 10, block.flags ?? 0);
    if (here) {
      block.bytes.copy(out, data_offset);
      data_offset += block.bytes.byteLength;
    }
  });
  view.setUint32(named_offset, make_tag_hash(0x151, 1));
  view.setUint32(named_offset + 4, 0x80803389);
  out.write("investment_globals", named_offset + 8, "latin1");
  return out;
}

describe("c_package_file", () => {
  const first = Buffer.from(
    Array.from({ length: k_block_size }, (_, i) => i & 0xff)
  );
  const second = Buffer.alloc(0x100, 0xee);
  const file = new c_package_file(
    memory_source(build_package([{ bytes: first }, { bytes: second }]))
  );

  it("reads the header and tables", () => {
    expect(file.pkg_id).toBe(0x151);
    expect(file.patch).toBe(0);
    expect(file.language).toBe(e_package_language.english);
    expect(file.header.tool_string).toBe("live tool test");
    expect(file.entries).toHaveLength(2);
    expect(file.entries[0]).toEqual({
      class_hash: 0x80800341,
      type: k_package_entry_type_tag,
      unknown_type_byte: 0x19,
      subtype: 2,
      starting_block: 0,
      starting_block_offset: 0x10,
      file_size: 0x20,
    });
    expect(file.named_tags).toEqual([
      {
        hash: make_tag_hash(0x151, 1),
        class_hash: 0x80803389,
        name: "investment_globals",
      },
    ]);
  });

  it("reads an entry inside one block", () => {
    expect(file.read_entry(0)).toEqual(first.subarray(0x10, 0x30));
  });

  it("reads an entry across a block boundary", () => {
    const data = file.read_entry(1);
    expect(data.subarray(0, 0x10)).toEqual(first.subarray(k_block_size - 0x10));
    expect(data.subarray(0x10)).toEqual(Buffer.alloc(0x20, 0xee));
  });

  it("decompresses flagged blocks", () => {
    const seen: number[] = [];
    const packed = new c_package_file(
      memory_source(
        build_package([
          { bytes: Buffer.from([7]), flags: k_block_flag_compressed },
        ])
      ),
      {
        decompress: (compressed, raw_size) => {
          seen.push(compressed[0], raw_size);
          return new Uint8Array(0x40).fill(0x5a);
        },
      }
    );
    expect(packed.read_entry(0)).toEqual(Buffer.alloc(0x20, 0x5a));
    expect(seen).toEqual([7, k_block_size]);
  });

  it("reads earlier patches' blocks from their own files", () => {
    const old = Buffer.alloc(0x2000 + k_block_size);
    first.copy(old, 0x2000);
    const bytes = build_package(
      [{ bytes: first, patch: 0, offset: 0x2000 }, { bytes: second }],
      1
    );
    const opened: number[] = [];
    const patched = new c_package_file(memory_source(bytes), {
      open_patch: (patch) => {
        opened.push(patch);
        return patch === 0 ? memory_source(old) : undefined;
      },
    });
    expect(patched.read_entry(1)).toEqual(
      Buffer.concat([
        first.subarray(k_block_size - 0x10),
        Buffer.alloc(0x20, 0xee),
      ])
    );
    expect(patched.read_entry(0)).toEqual(first.subarray(0x10, 0x30));
    expect(opened).toEqual([0]);
    const missing = new c_package_file(
      memory_source(build_package([{ bytes: first, patch: 2 }], 3))
    );
    expect(() => missing.read_entry(0)).toThrow("no patch 2");
  });

  it("rejects other package versions", () => {
    const bytes = build_package([{ bytes: first }]);
    bytes.writeUInt16BE(11, 0);
    expect(() => new c_package_file(memory_source(bytes))).toThrow();
  });

  it("names patch files", () => {
    expect(package_patch_path("d/360_globals_0151_0.pkg", 2)).toBe(
      "d/360_globals_0151_2.pkg"
    );
  });
});
