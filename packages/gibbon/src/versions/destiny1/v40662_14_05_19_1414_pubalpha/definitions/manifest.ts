import {
  manifest_entries,
  s_manifest,
} from "../../v52553_16_09_28_1551_evil/definitions/manifest.ts";
import type { c_package_set } from "../../v52553_16_09_28_1551_evil/pkg/package_set.ts";
import { read_definition } from "../../v52553_16_09_28_1551_evil/tag/tag_block.ts";

// Manifests are laid out as patch 01.29's. Package entries of type 0x80 are
// manifest roots: their class word is the handle of a manifest tag, and the
// real class is the manifest's.
export * from "../../v52553_16_09_28_1551_evil/definitions/manifest.ts";

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
