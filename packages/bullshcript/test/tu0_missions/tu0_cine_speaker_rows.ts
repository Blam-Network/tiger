// The TU0 rows cine_speaker's scripts run against, at their TU0 type ids and
// row indices (read off the TU0 disc packages: tag 80C3E9A5, the bundle as
// bubble 0's state 1 loads it, and the binder's 80C4E00A).

import type { ActivityBundleRow } from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import { CINE_REVEAL_ROWS } from "./tu0_act_cosmo_m0_highway_rows.ts";

type Row = [
  name: string,
  typeId: number,
  typeIndex: number,
  extra?: Partial<ActivityBundleRow>,
];

export const CINE_SPEAKER_ROWS: Readonly<Record<string, readonly Row[]>> = {
  // the same binder tag as cine_reveal's
  STORY_COMMON: CINE_REVEAL_ROWS.STORY_COMMON ?? [],
  CINE_SPEAKER: [
    ["cine_108_spk_phase.cine_108_spk._cinematic", 6, 0],
    [
      "cine_108_spk_phase.cine_108_spk",
      59,
      1,
      { childScript: "cinematic_midmission" },
    ],
    ["cine_108_spk_phase", 60, 2],
  ],
};
