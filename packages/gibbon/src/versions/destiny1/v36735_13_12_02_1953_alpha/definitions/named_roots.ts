import { k_package_entry_type_manifest_root } from "../pkg/package_entry.ts";
import type { s_package_named_tag } from "../pkg/package_named_tag.ts";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition } from "../tag/tag_block.ts";
import { manifest_entries, s_manifest } from "./manifest.ts";

const named_tag_cache = new WeakMap<
  c_package_set,
  Map<string, s_package_named_tag>
>();

// A package's named tag by name; the first package that has it wins.
export function find_named_tag(
  set: c_package_set,
  name: string
): s_package_named_tag | undefined {
  let by_name = named_tag_cache.get(set);
  if (!by_name) {
    by_name = new Map();
    for (const named of set.named_tags()) {
      if (!by_name.has(named.name)) {
        by_name.set(named.name, named);
      }
    }
    named_tag_cache.set(set, by_name);
  }
  return by_name.get(name);
}

// The manifest behind a named root, whose `root` is the root's own data.
export function named_root_manifest(
  set: c_package_set,
  name: string
): s_manifest {
  const named = find_named_tag(set, name);
  if (!named) {
    throw new Error(`no named root "${name}"`);
  }
  const entry = set.entry(named.hash);
  if (
    entry === undefined ||
    entry.type !== k_package_entry_type_manifest_root
  ) {
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
