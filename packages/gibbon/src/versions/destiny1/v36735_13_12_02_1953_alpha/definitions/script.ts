import { c } from "@craftycodie/cstruct";
import { tag_block, tag_bytes } from "../tag/tag_block.ts";
import { tag_relative_string } from "../tag/tag_string.ts";

// Compiled host scripts (80800B48). The client never runs them (it has no
// Lua VM) but tracks them as tags: sub_828A9F80 walks their references.
export const k_script_class = 0x80800b48;

export const s_script_method = c.struct({
  name: tag_relative_string(),
  // Relative offset back to the owning s_script_type.
  owner: c.i32(),
});

export type s_script_method = c.infer<typeof s_script_method>;

// The functions the chunk defines on one of its types.
export const s_script_type = c.struct({
  schema: c.u32(),
  methods: tag_block(s_script_method, 0x80800b40),
  // Relative offset back to the start of the script.
  script: c.i32(),
});

export type s_script_type = c.infer<typeof s_script_type>;

// An imported class that has a class tag (808004C5).
export const s_script_class_import = c.struct({
  // The class tag's definition schema (its +0x20).
  definition_schema: c.u32(),
  class_tag: c.u32(),
});

export type s_script_class_import = c.infer<typeof s_script_class_import>;

// An imported bare type, such as an enum.
export const s_script_type_import = c.struct({
  type: c.u32(),
});

export type s_script_type_import = c.infer<typeof s_script_type_import>;

// A script this one reaches: its compiled path and its tag.
export const s_script_reference = c.struct({
  path: tag_relative_string(),
  script: c.u32(),
});

export type s_script_reference = c.infer<typeof s_script_reference>;

export const s_script = c.struct({
  size: c.u32(),
  // Written at runtime; zero on disk.
  runtime_state: c.u32(),
  // A tag reference, never set.
  unknown08: c.u32(),
  // `_M.definition`, then `_M.instance`.
  types: tag_block(s_script_type, 0x80800b43),
  decl_name: tag_relative_string(),
  source_path: tag_relative_string(),
  unknown1c: tag_relative_string(),
  unknown20: tag_relative_string(),
  // The Lua chunk itself; empty for stub scripts.
  chunk: tag_bytes(0x8080011b),
  // Set only on importable libraries: the script's own class, whose tag
  // points back here. -1 otherwise.
  library_definition_schema: c.u32(),
  library_class_tag: c.u32(),
  class_imports: tag_block(s_script_class_import, 0x808004b2),
  type_imports: tag_block(s_script_type_import, 0x80800030),
  references: tag_block(s_script_reference, 0x8080013b),
  // Bit 0 is asserted set (sub_828AA580).
  flags: c.u8(),
});

export type s_script = c.infer<typeof s_script>;
