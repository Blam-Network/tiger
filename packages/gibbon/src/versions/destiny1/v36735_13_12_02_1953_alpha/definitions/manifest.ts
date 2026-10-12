import { c } from "@craftycodie/cstruct";
import { make_tag_hash } from "../pkg/tag_hash.ts";
import { tag_block } from "../tag/tag_block.ts";

// Package entries of type 0x80 are manifest roots: their class word is the
// handle of a manifest tag, and the real class is the manifest's
// (sub_827DE180). The manifest lists everything the root loads, other roots
// aside, so the loader can union package bitmaps instead of walking
// references (sub_82839760, sub_8283AB40).
export const k_manifest_class = 0x808001ac;

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
  entry_bits: tag_block(s_manifest_entry_bits, 0x80800119),
  entries: tag_block(s_manifest_entry, 0x80800118),
});

export type s_manifest_package = c.infer<typeof s_manifest_package>;

export const s_manifest = c.struct({
  size: c.u32(),
  handle: c.u32(),
  contained_class: c.u32(),
  root: c.u32(),
  packages: tag_block(s_manifest_package, 0x808001aa),
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
