// The TU0 rows cine_end's scripts run against, at their TU0 type ids and row
// indices (read off the TU0 disc packages: tag 80C3E018, the bundle as
// bubble 2's state 1 loads it, and the binder's 80C4E00A).

import type { ActivityBundleRow } from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { CINE_REVEAL_ROWS } from "./tu0_act_cosmo_m0_highway_rows.ts";

type Row = [
  name: string,
  typeId: number,
  typeIndex: number,
  extra?: Partial<ActivityBundleRow>,
];

export const CINE_END_ROWS: Readonly<Record<string, readonly Row[]>> = {
  // the same binder tag as cine_reveal's
  STORY_COMMON: CINE_REVEAL_ROWS.STORY_COMMON ?? [],
  CINE_END: [
    ["cine_123a_end_phase.cine_123a_end._cinematic", 6, 0],
    [
      "cine_123a_end_phase.cine_123a_end",
      59,
      1,
      { childScript: "cinematic_midmission" },
    ],
    ["cine_123a_end_phase", 60, 2],
  ],
};
