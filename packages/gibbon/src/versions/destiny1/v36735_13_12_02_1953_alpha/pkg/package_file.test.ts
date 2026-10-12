import { c } from "@craftycodie/cstruct";
import { describe, expect, it } from "vitest";
import { memory_source } from "./byte_source.ts";
import {
  k_block_size,
  k_package_block_size,
  s_package_block,
} from "./package_block.ts";
import { c_package_file } from "./package_file.ts";
import { k_package_version, s_package_header } from "./package_header.ts";
import { s_package_named_tag } from "./package_named_tag.ts";
import { make_tag_hash, tag_hash_entry, tag_hash_package } from "./tag_hash.ts";

function write_entry(
  view: DataView,
  at: number,
  entry: { class_hash: number; block: number; offset: number; size: number }
) {
  view.setUint32(at, entry.class_hash);
  view.setUint32(at + 4, (8 << 18) | 1);
  view.setUint32(at + 8, Math.floor(entry.size / 16));
  view.setUint32(
    at + 12,
    (((entry.size & 0xf) << 28) | ((entry.offset >> 4) << 14) | entry.block) >>>
      0
  );
}

// Uncompressed blocks, two entries (the second crossing a block boundary) and
// one named tag.
function build_package(blocks: Buffer[]): Buffer {
  const entry_offset = 0x200;
  const block_offset = 0x300;
  const named_offset = 0x400;
  let data_offset = 0x1000;
  const out = Buffer.alloc(
    data_offset + blocks.reduce((n, b) => n + b.byteLength, 0)
  );
  const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
  const no_hash = Array.from({ length: 20 }, () => 0);
  c.write(
    s_package_header,
    {
      version: k_package_version,
      platform: 3,
      pkg_id: 0x2d4,
      patch: 0,
      unknown08: 0n,
      build_time: 0n,
      unknown18: 0,
      unknown1c: 0,
      language: 0,
      tool_string: "alpha tool test",
      entry2_table_size: 0,
      entry2_table_offset: 0,
      named_tag_table_size: 1,
      named_tag_table_offset: named_offset,
      entry2_table_hash: no_hash,
      entry_table_size: 2,
      entry_table_offset: entry_offset,
      entry_table_hash: no_hash,
      block_table_size: blocks.length,
      block_table_offset: block_offset,
      block_table_hash: no_hash,
    } as s_package_header,
    "big"
  ).copy(out, 0);
  write_entry(view, entry_offset, {
    class_hash: 0x80800533,
    block: 0,
    offset: 0x10,
    size: 0x20,
  });
  write_entry(view, entry_offset + 16, {
    class_hash: 0x80800b48,
    block: 0,
    offset: k_block_size - 0x10,
    size: 0x30,
  });
  blocks.forEach((block, i) => {
    c.write(
      s_package_block,
      {
        offset: data_offset,
        size: block.byteLength,
        flags: 0,
        patch_id: 0,
        hash: no_hash,
      } as s_package_block,
      "big"
    ).copy(out, block_offset + i * k_package_block_size);
    block.copy(out, data_offset);
    data_offset += block.byteLength;
  });
  c.write(
    s_package_named_tag,
    {
      hash: make_tag_hash(0x2d4, 1),
      class_hash: 0x80800b48,
      name: "action_mock_script",
    },
    "big"
  ).copy(out, named_offset);
  return out;
}

describe("c_package_file", () => {
  const first = Buffer.from(
    Array.from({ length: k_block_size }, (_, i) => i & 0xff)
  );
  const second = Buffer.alloc(0x100, 0xee);
  const file = new c_package_file(
    memory_source(build_package([first, second]))
  );

  it("reads the header and tables", () => {
    expect(file.pkg_id).toBe(0x2d4);
    expect(file.header.tool_string).toBe("alpha tool test");
    expect(file.entries).toHaveLength(2);
    expect(file.entries[0]).toEqual({
      class_hash: 0x80800533,
      type: 8,
      subtype: 1,
      starting_block: 0,
      starting_block_offset: 0x10,
      file_size: 0x20,
    });
    expect(file.named_tags).toEqual([
      {
        hash: make_tag_hash(0x2d4, 1),
        class_hash: 0x80800b48,
        name: "action_mock_script",
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

  it("rejects other package versions", () => {
    const bytes = build_package([first]);
    bytes.writeUInt16BE(12, 0);
    expect(() => new c_package_file(memory_source(bytes))).toThrow();
  });
});

describe("tag hashes", () => {
  it("pack a package id and entry index", () => {
    const hash = make_tag_hash(0x16f, 0x1234);
    expect(hash).toBe(0x80adf234);
    expect(tag_hash_package(hash)).toBe(0x16f);
    expect(tag_hash_entry(hash)).toBe(0x1234);
  });
});
