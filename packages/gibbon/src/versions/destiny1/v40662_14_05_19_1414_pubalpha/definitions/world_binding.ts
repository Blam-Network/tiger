import { read_tag_string } from "../../v52553_16_09_28_1551_evil/tag/tag_string.ts";

// scenario_client bubble state -> slice descriptor -> client blueprint set
// -> activity bundles (8080076E), laid out as patch 01.29's.
export * from "../../v52553_16_09_28_1551_evil/definitions/world_binding.ts";

// The name's length-prefixed string, class 80800065 just before it.
export const k_slice_descriptor_name_offset = 0x28;

export function read_slice_descriptor_name(buffer: Buffer): string {
  return read_tag_string(buffer, k_slice_descriptor_name_offset);
}
