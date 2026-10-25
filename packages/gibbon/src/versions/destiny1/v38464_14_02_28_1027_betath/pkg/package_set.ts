import { readdirSync } from "node:fs";
import { join } from "node:path";
import { c } from "@craftycodie/cstruct";
import { c_block_cache } from "../../v52553_16_09_28_1551_evil/pkg/block_cache.ts";
import { file_source } from "../../v52553_16_09_28_1551_evil/pkg/byte_source.ts";
import type { package_entry } from "../../v52553_16_09_28_1551_evil/pkg/package_entry.ts";
import type { s_package_named_tag } from "../../v52553_16_09_28_1551_evil/pkg/package_named_tag.ts";
import {
  format_tag_hash,
  make_tag_hash,
  tag_hash_entry,
  tag_hash_package,
} from "../../v52553_16_09_28_1551_evil/pkg/tag_hash.ts";
import { c_package_file, type decompressor } from "./package_file.ts";
import {
  e_package_language,
  k_package_header_size,
  s_package_header,
} from "./package_header.ts";

export interface package_set_options {
  cache_blocks?: number;
  decompress?: decompressor;
  // Which of a localized package's variants to read; packages without one
  // (language none) are always read. English by default.
  language?: number;
}

export interface tag_entry_ref {
  entry: package_entry;
  hash: number;
}

export interface package_path {
  language: number;
  path: string;
}

// Every package in a directory, keyed by the id in its header. Of a
// localized id's files the chosen language's wins, failing that English's.
// Packages are opened on first use.
export class c_package_set {
  private readonly paths: Map<number, package_path>;
  private readonly opened = new Map<number, c_package_file>();
  private readonly options: package_set_options;
  private readonly cache: c_block_cache;

  private constructor(
    paths: Map<number, package_path>,
    options: package_set_options
  ) {
    this.paths = paths;
    this.options = options;
    this.cache = new c_block_cache(options.cache_blocks ?? 32);
  }

  static open_directory(
    dir: string,
    options: package_set_options = {}
  ): c_package_set {
    const wanted = options.language ?? e_package_language.english;
    const rank = (language: number) => {
      if (language === wanted || language === e_package_language.none) {
        return 2;
      }
      return language === e_package_language.english ? 1 : 0;
    };
    const paths = new Map<number, package_path>();
    for (const name of readdirSync(dir)) {
      if (!name.toLowerCase().endsWith(".pkg")) {
        continue;
      }
      const path = join(dir, name);
      const source = file_source(path);
      const header = c.read(
        s_package_header,
        source.read(0, k_package_header_size),
        "little"
      );
      source.close();
      const found = { path, language: header.language };
      if (rank(found.language) === 0) {
        continue;
      }
      const known = paths.get(header.pkg_id);
      if (!known || rank(found.language) > rank(known.language)) {
        paths.set(header.pkg_id, found);
      }
    }
    return new c_package_set(paths, options);
  }

  get package_ids(): number[] {
    return [...this.paths.keys()].sort((a, b) => a - b);
  }

  package_info(pkg_id: number): package_path | undefined {
    return this.paths.get(pkg_id);
  }

  package(pkg_id: number): c_package_file | undefined {
    const open = this.opened.get(pkg_id);
    if (open) {
      return open;
    }
    const known = this.paths.get(pkg_id);
    if (!known) {
      return;
    }
    const file = c_package_file.open(known.path, {
      decompress: this.options.decompress,
      cache: this.cache,
    });
    this.opened.set(pkg_id, file);
    return file;
  }

  entry(hash: number): package_entry | undefined {
    return this.package(tag_hash_package(hash))?.entries[tag_hash_entry(hash)];
  }

  try_read_tag(hash: number): Buffer | undefined {
    const file = this.package(tag_hash_package(hash));
    const index = tag_hash_entry(hash);
    if (!file || index >= file.entries.length) {
      return;
    }
    return file.read_entry(index);
  }

  read_tag(hash: number): Buffer {
    const data = this.try_read_tag(hash);
    if (!data) {
      throw new Error(`no tag ${format_tag_hash(hash)}`);
    }
    return data;
  }

  entries_of_class(class_hash: number): tag_entry_ref[] {
    const found: tag_entry_ref[] = [];
    for (const pkg_id of this.package_ids) {
      const file = this.package(pkg_id);
      if (!file) {
        continue;
      }
      file.entries.forEach((entry, index) => {
        if (entry.class_hash === class_hash >>> 0) {
          found.push({ hash: make_tag_hash(pkg_id, index), entry });
        }
      });
    }
    return found;
  }

  named_tags(): s_package_named_tag[] {
    return this.package_ids.flatMap(
      (pkg_id) => this.package(pkg_id)?.named_tags ?? []
    );
  }

  find_named_tag(name: string): s_package_named_tag | undefined {
    for (const pkg_id of this.package_ids) {
      const found = this.package(pkg_id)?.named_tags.find(
        (tag) => tag.name === name
      );
      if (found) {
        return found;
      }
    }
    return;
  }

  close(): void {
    for (const file of this.opened.values()) {
      file.close();
    }
    this.opened.clear();
  }
}
