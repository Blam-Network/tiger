import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { make_tag_hash } from "../pkg/tag_hash.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";

// Package entries of type 0x80 are manifest roots: their class word is the
// handle of a manifest tag, and the real class is the manifest's. The
// manifest lists everything the root loads, other roots aside.
export const k_manifest_class = 0x80800148;
export const k_manifest_package_class = 0x80800188;
export const k_manifest_entry_bits_class = 0x8080000b;
export const k_manifest_entry_class = 0x8080000a;

export const s_manifest_entry_bits = c.struct({
  bits: c.u32(),
});

export type s_manifest_entry_bits = c.infer<typeof s_manifest_entry_bits>;

export const s_manifest_entry = c.struct({
  entry: c.u16(),
});

export type s_manifest_entry = c.infer<typeof s_manifest_entry>;

// One package's entries, as a bitmap or a sorted list, whichever is
// smaller; never both.
export const s_manifest_package = c.struct({
  package_id: c.u16({ padAfter: 2 }),
  entry_bits: tag_block(s_manifest_entry_bits, k_manifest_entry_bits_class),
  entries: tag_block(s_manifest_entry, k_manifest_entry_class),
});

export type s_manifest_package = c.infer<typeof s_manifest_package>;

export const s_manifest = c.struct({
  size: c.u32(),
  handle: c.u32(),
  contained_class: c.u32(),
  root: c.u32(),
  packages: tag_block(s_manifest_package, k_manifest_package_class),
});

export type s_manifest = c.infer<typeof s_manifest>;

export function manifest_entries(manifest: s_manifest): number[] {
  const hashes: number[] = [];
  for (const { package_id, entry_bits, entries } of manifest.packages) {
    for (const { entry } of entries) {
      hashes.push(make_tag_hash(package_id, entry));
    }
    for (const [word, { bits }] of entry_bits.entries()) {
      for (let bit = 0; bit < 32; bit++) {
        if (bits & (1 << bit)) {
          hashes.push(make_tag_hash(package_id, word * 32 + bit));
        }
      }
    }
  }
  return hashes;
}

// The manifest behind a named root, whose `root` is the root's own data.
export function named_root_manifest(
  set: c_package_set,
  name: string
): s_manifest {
  const named = set.find_named_tag(name);
  if (!named) {
    throw new Error(`no named root "${name}"`);
  }
  const entry = set.entry(named.hash);
  if (entry === undefined || entry.type !== 0x80) {
    throw new Error(`named tag "${name}" is not a manifest root`);
  }
  return read_definition(set.read_tag(entry.class_hash), s_manifest);
}

const root_tag_cache = new WeakMap<c_package_set, Map<string, number[]>>();

// The tags a named manifest root loads. Consumers start here rather than
// at tag ids, which move between builds.
export function named_root_tags(set: c_package_set, name: string): number[] {
  let by_name = root_tag_cache.get(set);
  if (!by_name) {
    by_name = new Map();
    root_tag_cache.set(set, by_name);
  }
  const cached = by_name.get(name);
  if (cached) {
    return cached;
  }
  const tags = manifest_entries(named_root_manifest(set, name));
  by_name.set(name, tags);
  return tags;
}

export function named_root_tags_of_class(
  set: c_package_set,
  name: string,
  class_hash: number
): number[] {
  return named_root_tags(set, name).filter(
    (tag) => set.entry(tag)?.class_hash === class_hash >>> 0
  );
}

// The one tag of `class_hash` under a named root; anything else is an error.
export function named_root_tag(
  set: c_package_set,
  name: string,
  class_hash: number
): number {
  const tags = named_root_tags_of_class(set, name, class_hash);
  if (tags.length !== 1) {
    throw new Error(
      `root "${name}" holds ${tags.length} tags of class ${class_hash.toString(16)}, expected 1`
    );
  }
  return tags[0];
}
