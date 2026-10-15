// References inside tag bodies are raw tag hashes: the package id and entry
// index packed as 0x80800000 + (pkg_id << 13) + entry, as on the 360.
const k_tag_hash_base = 0x80800000;
const k_entry_bits = 13;

export function tag_hash_package(hash: number): number {
  return ((hash >>> 0) - k_tag_hash_base) >>> k_entry_bits;
}

export function tag_hash_entry(hash: number): number {
  return hash & ((1 << k_entry_bits) - 1);
}

export function make_tag_hash(pkg_id: number, entry: number): number {
  return (k_tag_hash_base + pkg_id * (1 << k_entry_bits) + entry) >>> 0;
}

export function format_tag_hash(hash: number): string {
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0");
}
