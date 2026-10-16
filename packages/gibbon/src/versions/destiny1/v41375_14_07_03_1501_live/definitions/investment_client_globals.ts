import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition } from "../tag/tag_block.ts";
import {
  k_investment_globals_root_name,
  s_investment_global,
} from "./investment_globals.ts";
import { named_root_manifest } from "./manifest.ts";

// The investment_globals manifest's own root data (80A58000): the tables the
// client loads, by class 0x80803xxx. Slot 0 is the investment globals
// (80A58001) again.
export const k_investment_client_globals_class = 0x80803389;

export const k_investment_client_global_count = 51;

export const s_investment_client_globals = c.struct({
  size: c.u32(),
  // Same {unknown00, tag} rows as the investment globals.
  globals: c.array(s_investment_global, k_investment_client_global_count),
});

export type s_investment_client_globals = c.infer<
  typeof s_investment_client_globals
>;

// Slot indices, by the root offset their tag sits at: 0x08 + 8 * index.
// Slot 12 (bucket display rows) and 42 (a table parallel to the abilities)
// are known to exist but not read yet.
export const e_investment_client_global = {
  investment_globals: 0,
  destinations: 5,
  item_displays: 26,
  string_lists: 45,
} as const;

const client_globals_cache = new WeakMap<
  c_package_set,
  s_investment_client_globals
>();

function find_investment_client_globals(
  set: c_package_set
): s_investment_client_globals {
  let found = client_globals_cache.get(set);
  if (!found) {
    const { root } = named_root_manifest(set, k_investment_globals_root_name);
    found = read_definition(set.read_tag(root), s_investment_client_globals);
    client_globals_cache.set(set, found);
  }
  return found;
}

// The tag a client globals slot points at (an e_investment_client_global
// value).
export function investment_client_global_tag(
  set: c_package_set,
  slot: number
): number {
  const entry = find_investment_client_globals(set).globals[slot];
  if (entry === undefined || entry.tag === 0xffffffff) {
    throw new Error(`investment client globals slot ${slot} is empty`);
  }
  return entry.tag;
}
