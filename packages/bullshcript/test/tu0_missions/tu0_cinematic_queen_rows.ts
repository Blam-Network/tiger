// The TU0 rows the Queen's cinematic activities run against, at their TU0
// type ids and row indices (read off the TU0 disc packages): tag 80C02F18,
// enc_cinematic_queen_101 as bubble 2's state 1 loads it, tag 80C02F1D,
// enc_cinematic_queen_102 as bubble 0's state 1 loads it, and the binder's
// 80C1402B.

import type { ActivityBundleRow } from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { CINE_REVEAL_ROWS } from "./tu0_act_cosmo_m0_highway_rows.ts";

type Row = [
  name: string,
  typeId: number,
  typeIndex: number,
  extra?: Partial<ActivityBundleRow>,
];

const MIDMISSION = { childScript: "cinematic_midmission" };

export const CINEMATIC_QUEEN_ROWS: Readonly<Record<string, readonly Row[]>> = {
  // the destination's own binder tag, with the same rows as cine_reveal's
  STORY_COMMON: CINE_REVEAL_ROWS.STORY_COMMON ?? [],
  QUEEN_101: [
    ["phase_cine_1.pf_115_rfr._cinematic", 6, 0],
    ["phase_cine_2.pf_116_cro._cinematic", 6, 1],
    ["phase_cine_1", 60, 2],
    ["phase_cine_2", 60, 3],
    ["phase_cine_2.pf_116_cro", 59, 4, MIDMISSION],
    ["phase_cine_1.pf_115_rfr", 59, 5, MIDMISSION],
  ],
  QUEEN_102: [
    ["phase_cine.pf_117_que._cinematic", 6, 0],
    ["phase_cine.pf_117_que", 59, 1, MIDMISSION],
    ["phase_cine", 60, 2],
  ],
};
