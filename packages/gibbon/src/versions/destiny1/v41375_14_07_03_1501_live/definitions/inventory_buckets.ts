import { c } from "@craftycodie/cstruct";

// Inventory buckets (investment globals slot 11, 80A5803E). Bucket names are
// not in the data.
export const k_inventory_bucket_table_class = 0x80801766;

export const k_inventory_bucket_capacity = 127;
export const k_unequippable_bucket_capacity = 128;

// 20 bytes; unused rows are {0xFF, 0...}. The equip slot of an equippable
// bucket is its ordinal among the used rows once the unequippable buckets
// are dropped.
export const s_inventory_bucket = c.struct({
  id: c.u8({ padAfter: 3 }),
  first_slot: c.u32(),
  slot_count: c.u32(),
  // -1, or 1865 for buckets 16, 20 and 21.
  unknown0c: c.i16(),
  // 0, or 512.
  unknown0e: c.u16(),
  // [0] is 1 exactly for buckets 21..24 and 28; the rest unknown.
  flags: c.array(c.u8(), 4),
});

export type s_inventory_bucket = c.infer<typeof s_inventory_bucket>;

export const s_inventory_buckets = c.struct({
  size: c.u32(),
  unequippable_bucket_count: c.u32(),
  // Ids of the buckets with no equip slot, 0xFF padded.
  unequippable_buckets: c.array(c.u8(), k_unequippable_bucket_capacity),
  bucket_count: c.u32(),
  buckets: c.array(s_inventory_bucket, k_inventory_bucket_capacity),
});

export type s_inventory_buckets = c.infer<typeof s_inventory_buckets>;
