import { c } from "@craftycodie/cstruct";

// Inventory buckets (investment globals slot 11, 808F6084). Room for 32
// buckets, not the Alpha Trial's 127, and 16-byte rows without its two
// halfwords. Bucket names are not in the data.
export const k_inventory_bucket_table_class = 0x80801748;

export const k_inventory_bucket_capacity = 32;
export const k_unequippable_bucket_capacity = 32;

// Unused rows are {0xFF, 0...}. The equip slot of an equippable bucket is
// its ordinal among the used rows once the unequippable buckets are
// dropped.
export const s_inventory_bucket = c.struct({
  id: c.u8({ padAfter: 3 }),
  first_slot: c.u32(),
  slot_count: c.u32(),
  flags: c.array(c.u8(), 4),
});

export type s_inventory_bucket = c.infer<typeof s_inventory_bucket>;

export const s_inventory_buckets = c.struct({
  size: c.u64(),
  unequippable_bucket_count: c.u32(),
  // Ids of the buckets with no equip slot, 0xFF padded.
  unequippable_buckets: c.array(c.u8(), k_unequippable_bucket_capacity),
  bucket_count: c.u32(),
  buckets: c.array(s_inventory_bucket, k_inventory_bucket_capacity),
});

export type s_inventory_buckets = c.infer<typeof s_inventory_buckets>;
