// Every TU0 row the tests' tables know (read off the TU0 disc), flat: the
// names a script uses bare and the archetype an Encounter row runs, for the
// declared-members check in test/fukugen_daihon_TU0.test.ts.

import type { ActivityBundleRow } from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";
import {
  ACT_COSMO_M0_HIGHWAY_ROWS,
  CINE_REVEAL_ROWS,
} from "./tu0_act_cosmo_m0_highway_rows.ts";
import { ACT_COSMO_M6_RASPUTIN_ROWS } from "./tu0_act_cosmo_m6_rasputin_rows.ts";
import { ACT_VENUS_M02_SOUTHERN_TIDES_ROWS } from "./tu0_act_venus_m02_southern_tides_rows.ts";
import { COSMO_PORTAL_1_ROWS } from "./tu0_cosmo_portal_1_rows.ts";
import { COSMO_PORTAL_2_ROWS } from "./tu0_cosmo_portal_2_rows.ts";
import { TOWER_ROWS } from "./tu0_tower_rows.ts";
import { VENUS_PORTAL_1_ROWS } from "./tu0_venus_portal_1_rows.ts";

type Row = readonly [
  name: string,
  typeId: number,
  typeIndex: number,
  extra?: Partial<ActivityBundleRow>,
];

const ARRAY_INDEX = /\[\d+\]$/;

export interface Tu0Row {
  readonly activity: string;
  readonly childScript?: string;
  readonly name: string;
  readonly typeId: number;
}

const TABLES: Readonly<
  Record<string, Readonly<Record<string, readonly Row[]>>>
> = {
  act_cosmo_m0_highway: ACT_COSMO_M0_HIGHWAY_ROWS,
  act_cosmo_m6_rasputin: ACT_COSMO_M6_RASPUTIN_ROWS,
  act_venus_m02_southern_tides: ACT_VENUS_M02_SOUTHERN_TIDES_ROWS,
  cine_reveal: CINE_REVEAL_ROWS,
  city_tower_default1: TOWER_ROWS,
  cosmo_portal_1: COSMO_PORTAL_1_ROWS,
  cosmo_portal_2: COSMO_PORTAL_2_ROWS,
  venus_portal_1: VENUS_PORTAL_1_ROWS,
};

export function tu0Rows(): Tu0Row[] {
  return Object.entries(TABLES).flatMap(([activity, table]) =>
    Object.values(table).flatMap((rows) =>
      rows.map(([name, typeId, , extra]) => ({
        activity,
        childScript: extra?.childScript,
        name,
        typeId,
      }))
    )
  );
}

// A row's name as a script uses it: the last segment.
export function rowMemberName(name: string): string {
  const last = name.slice(name.lastIndexOf(".") + 1);
  return last.replace(ARRAY_INDEX, "");
}

export function tu0RowNames(): Set<string> {
  return new Set(tu0Rows().map((row) => rowMemberName(row.name)));
}
