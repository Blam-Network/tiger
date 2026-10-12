// The TU0 rows the Tower's scripts run against (city_tower_default1), at their
// TU0 type ids and row indices (read off the TU0 disc packages), only the
// rows the scripts name.

import {
  ActivityBundleItemType,
  type ActivityBundleRow,
} from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";

type Row = [
  name: string,
  typeId: number,
  typeIndex: number,
  extra?: Partial<ActivityBundleRow>,
];

const {
  Actor,
  Cinematic,
  Fireteam,
  Lifetime,
  Player,
  Scoreboard,
  Squad,
  Timer,
} = ActivityBundleItemType;

// The vendor squads the plaza script places, at their TU0 row indices;
// each squad's one member is the row after it.
export const TOWER_VENDORS: readonly [string, number][] = [
  ["sq_underwatch_vendor_guardian_mentor", 2],
  ["sq_underwatch_vendor_hunter_mentor", 4],
  ["sq_underwatch_vendor_warlock_mentor", 6],
  ["sq_underwatch_shaxx", 27],
  ["sq_underwatch_artcite", 30],
  ["sq_plaza_vendor_cryptarch", 34],
  ["sq_plaza_vendor_postmaster", 36],
  ["sq_plaza_vendor_gunsmith", 38],
  ["sq_plaza_vendor_mtx", 40],
  ["sq_plaza_vendor_city_bounty", 42],
];

export const TOWER_ROWS: Readonly<Record<string, readonly Row[]>> = {
  BINDER: [
    ["scoreboard", Scoreboard, 0],
    ["lifetime_timer", Timer, 1],
    ["lifetime", Lifetime, 2],
    ...Array.from(
      { length: 30 },
      (_, i): Row => [`players[${i}]`, Player, 4 + i]
    ),
  ],
  PLAZA: TOWER_VENDORS.flatMap(([name, index]): Row[] => [
    [name, Squad, index, { cells: [1], memberCount: 1 }],
    [`${name}__vendor1`, Actor, index + 1],
  ]),
  ROOT: [
    ["cine_hanger_a_landing", Cinematic, 0],
    ["cine_hanger_b_landing", Cinematic, 1],
    ["host", Fireteam, 2],
  ],
};
