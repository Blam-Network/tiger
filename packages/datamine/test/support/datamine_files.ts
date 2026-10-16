import type { s_data_mine_config_options } from "../../src/config/data_mine_options.ts";
import type { s_datamine_file } from "../../src/data_mine_reader.ts";

// Halo 3's file and Destiny's, the two kinds of layout behaviour.
export const k_layout_1_1: s_data_mine_config_options = {
  layout: "1.1",
  byte_order: "little",
};
export const k_layout_3_1: s_data_mine_config_options = { layout: "3.1" };

export function occurrences(file: s_datamine_file) {
  return file.records.filter((entry) => entry.kind !== "definition");
}
