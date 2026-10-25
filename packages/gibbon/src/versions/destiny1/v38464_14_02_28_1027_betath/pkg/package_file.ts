import { decompress as oodle_decompress } from "@blamnetwork/poodle";
import { c } from "@craftycodie/cstruct";
import { c_block_cache } from "../../v52553_16_09_28_1551_evil/pkg/block_cache.ts";
import {
  type byte_source,
  file_source,
} from "../../v52553_16_09_28_1551_evil/pkg/byte_source.ts";
import {
  k_block_flag_compressed,
  k_block_size,
  k_package_block_size,
  read_package_blocks,
  type s_package_block,
} from "../../v52553_16_09_28_1551_evil/pkg/package_block.ts";
import {
  k_package_entry_size,
  type package_entry,
  read_package_entries,
} from "../../v52553_16_09_28_1551_evil/pkg/package_entry.ts";
import {
  k_package_named_tag_size,
  read_package_named_tags,
  type s_package_named_tag,
} from "../../v52553_16_09_28_1551_evil/pkg/package_named_tag.ts";
import { k_package_header_size, s_package_header } from "./package_header.ts";

// The last block of a package holds less than a full block; a decompressor
// returns however much the stream produced.
export type decompressor = (
  compressed: Uint8Array,
  raw_size: number
) => Uint8Array;

export interface package_file_options {
  cache?: c_block_cache;
  decompress?: decompressor;
}

// Entries, blocks and named tags are laid out as in version 24. The build
// ships a single generation of each package, so every block lives in its
// own file.
export class c_package_file {
  readonly header: s_package_header;
  readonly entries: readonly package_entry[];
  readonly blocks: readonly s_package_block[];
  readonly named_tags: readonly s_package_named_tag[];
  private readonly source: byte_source;
  private readonly decompress: decompressor;
  private readonly cache: c_block_cache;

  constructor(source: byte_source, options: package_file_options = {}) {
    this.source = source;
    this.decompress = options.decompress ?? oodle_decompress;
    this.cache = options.cache ?? new c_block_cache(4);
    const header = c.read(
      s_package_header,
      source.read(0, k_package_header_size),
      "little"
    );
    this.header = header;
    this.entries = read_package_entries(
      source.read(
        header.entry_table_offset,
        header.entry_table_size * k_package_entry_size
      ),
      header.entry_table_size
    );
    this.blocks = read_package_blocks(
      source.read(
        header.block_table_offset,
        header.block_table_size * k_package_block_size
      ),
      header.block_table_size
    );
    this.named_tags = read_package_named_tags(
      source.read(
        header.named_tag_table_offset,
        header.named_tag_table_size * k_package_named_tag_size
      ),
      header.named_tag_table_size
    );
  }

  static open(path: string, options?: package_file_options): c_package_file {
    return new c_package_file(file_source(path), options);
  }

  get pkg_id(): number {
    return this.header.pkg_id;
  }

  get patch(): number {
    return this.header.patch;
  }

  get language(): number {
    return this.header.language;
  }

  read_block(index: number): Buffer {
    const block = this.blocks[index];
    if (!block) {
      throw new Error(`package ${this.pkg_id}: no block ${index}`);
    }
    if (block.patch_id !== this.header.patch) {
      throw new Error(
        `package ${this.pkg_id}: block ${index} is in patch ${block.patch_id}`
      );
    }
    const key = `${this.pkg_id}:${this.language}:${index}`;
    return this.cache.get(key, () => {
      const raw = this.source.read(block.offset, block.size);
      if (!(block.flags & k_block_flag_compressed)) {
        return raw;
      }
      const data = this.decompress(raw, k_block_size);
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    });
  }

  read_entry(index: number): Buffer {
    const entry = this.entries[index];
    if (!entry) {
      throw new Error(`package ${this.pkg_id}: no entry ${index}`);
    }
    const out = Buffer.alloc(entry.file_size);
    let block_index = entry.starting_block;
    let offset = entry.starting_block_offset;
    let done = 0;
    while (done < entry.file_size) {
      const block = this.read_block(block_index);
      const take = Math.min(block.byteLength - offset, entry.file_size - done);
      if (take <= 0) {
        throw new Error(
          `package ${this.pkg_id}: entry ${index} runs past block ${block_index}`
        );
      }
      block.copy(out, done, offset, offset + take);
      done += take;
      block_index++;
      offset = 0;
    }
    return out;
  }

  close(): void {
    this.source.close();
  }
}
