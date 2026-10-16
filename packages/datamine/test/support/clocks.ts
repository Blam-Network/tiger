import type { s_clock } from "../../src/blam/cseries/cseries_time.ts";

// A clock that never moves.
export function fixed_clock(date: Date, milliseconds = 0): s_clock {
  return { now: () => date, milliseconds: () => milliseconds };
}
