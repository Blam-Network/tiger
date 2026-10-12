import { c } from "@craftycodie/cstruct";

export const s_package_named_tag = c.struct({
  hash: c.u32(),
  class_hash: c.u32(),
  name: c.String(60),
});

export type s_package_named_tag = c.infer<typeof s_package_named_tag>;

export const k_package_named_tag_size = c.sizeof(s_package_named_tag);

export function read_package_named_tags(
  buffer: Buffer,
  count: number
): s_package_named_tag[] {
  const tags: s_package_named_tag[] = [];
  for (let i = 0; i < count; i++) {
    tags.push(
      c.read(s_package_named_tag, buffer, i * k_package_named_tag_size, "big")
    );
  }
  return tags;
}
