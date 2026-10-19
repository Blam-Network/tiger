import { c } from "@craftycodie/cstruct";
import type { c_package_set } from "../pkg/package_set.ts";
import { read_definition, tag_block } from "../tag/tag_block.ts";
import { s_activity_table } from "./activity_definition.ts";
import {
  s_material_requirement_table,
  s_progression_table,
  s_tag_table_entry,
  s_talent_grid_table,
  s_vendor_table,
} from "./investment.ts";
import {
  e_investment_global,
  investment_global_tag,
} from "./investment_globals.ts";

// Readers for the tables whose structs live in investment.ts and
// activity_definition.ts, reached through the investment globals instead of
// their tag ids.

// Item definitions, one tag per definition index.
export const k_item_table_class = 0x808017ed;
export const k_item_table_entry_class = 0x808017e7;

export const s_item_table_entry = s_tag_table_entry;

export type s_item_table_entry = s_tag_table_entry;

export const s_item_table = c.struct({
  size: c.u32(),
  items: tag_block(s_item_table_entry, k_item_table_entry_class),
});

export type s_item_table = c.infer<typeof s_item_table>;

// Item definition tags by definition index, from the item table's rows.
export function item_definition_tags(set: c_package_set): number[] {
  const table = read_definition(
    set.read_tag(investment_global_tag(set, e_investment_global.items)),
    s_item_table
  );
  return table.items.map((item) => item.tag);
}

export function read_activity_table(set: c_package_set): s_activity_table {
  return read_definition(
    set.read_tag(investment_global_tag(set, e_investment_global.activities)),
    s_activity_table
  );
}

export function read_progression_table(
  set: c_package_set
): s_progression_table {
  return read_definition(
    set.read_tag(investment_global_tag(set, e_investment_global.progressions)),
    s_progression_table
  );
}

export function read_vendor_table(set: c_package_set): s_vendor_table {
  return read_definition(
    set.read_tag(investment_global_tag(set, e_investment_global.vendors)),
    s_vendor_table
  );
}

export function read_talent_grid_table(
  set: c_package_set
): s_talent_grid_table {
  return read_definition(
    set.read_tag(investment_global_tag(set, e_investment_global.talent_grids)),
    s_talent_grid_table
  );
}

export function read_material_requirement_table(
  set: c_package_set
): s_material_requirement_table {
  return read_definition(
    set.read_tag(
      investment_global_tag(set, e_investment_global.material_requirements)
    ),
    s_material_requirement_table
  );
}
