import { c } from "@craftycodie/cstruct";

// Inventory buckets (investment globals slot 11). Bucket names are not here;
// the client globals' inventory buckets (slot 22) hold them.
export const k_inventory_bucket_table_class = 0x80801aa0;

export const k_inventory_bucket_capacity = 32;
export const k_unequippable_bucket_capacity = 32;

// 16 bytes; unused rows are {0xFF, 0...}.
export const s_inventory_bucket = c.struct({
  id: c.u8({ padAfter: 3 }),
  first_slot: c.u32(),
  slot_count: c.u32(),
  unknown0c: c.u32(),
});

export type s_inventory_bucket = c.infer<typeof s_inventory_bucket>;

export const s_inventory_buckets = c.struct({
  size: c.u32(),
  unequippable_bucket_count: c.u32(),
  // Ids of the buckets with no equip slot, 0xFF padded.
  unequippable_buckets: c.array(c.u8(), k_unequippable_bucket_capacity),
  bucket_count: c.u32(),
  buckets: c.array(s_inventory_bucket, k_inventory_bucket_capacity),
  unknown22c: c.u32(),
});

export type s_inventory_buckets = c.infer<typeof s_inventory_buckets>;

// The bucket of each equip slot, from slot 1: an item's equip slot is its
// bucket's ordinal among the used rows once the unequippable buckets are
// dropped, plus one (slot 0 is unused).
export function equip_slot_buckets(table: s_inventory_buckets): number[] {
  const unequippable = new Set(
    table.unequippable_buckets.slice(0, table.unequippable_bucket_count)
  );
  return table.buckets
    .slice(0, table.bucket_count)
    .filter((bucket) => !unequippable.has(bucket.id))
    .map((bucket) => bucket.id);
}
