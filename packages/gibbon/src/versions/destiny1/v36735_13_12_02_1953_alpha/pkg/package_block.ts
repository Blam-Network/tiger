import { c } from "@craftycodie/cstruct";

export const k_block_size = 0x40000;

export const k_block_flag_compressed = 1;

export const s_package_block = c.struct({
  offset: c.u32(),
  size: c.u32(),
  flags: c.u16(),
  patch_id: c.u16(),
  hash: c.array(c.u8(), 20),
});

export type s_package_block = c.infer<typeof s_package_block>;

export const k_package_block_size = c.sizeof(s_package_block);

export function read_package_blocks(
  buffer: Buffer,
  count: number
): s_package_block[] {
  const blocks: s_package_block[] = [];
  for (let i = 0; i < count; i++) {
    blocks.push(
      c.read(s_package_block, buffer, i * k_package_block_size, "big")
    );
  }
  return blocks;
}
