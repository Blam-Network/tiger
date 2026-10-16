import { describe, expect, it } from "vitest";
import {
  date_from_filetime,
  filetime_from_date,
  report_timestamp_build,
  system_get_date_and_time,
} from "../../../src/blam/cseries/cseries_time.ts";

// Local constructor so the expectations hold in any time zone.
const local = new Date(2026, 8, 29, 16, 37, 50, 317);
const utc = new Date(Date.UTC(2026, 8, 29, 16, 37, 50, 317));

describe("system_get_date_and_time", () => {
  it.each([
    ["short", "09.29.26 16:37:50.317"],
    ["long", "09/29/2026 16:37:50.317"],
  ] as const)("formats the %s style, local or UTC", (style, expected) => {
    expect(system_get_date_and_time(local, style)).toBe(expected);
    expect(system_get_date_and_time(utc, style, true)).toBe(expected);
  });

  it("zero pads small fields", () => {
    expect(
      system_get_date_and_time(new Date(2005, 0, 2, 3, 4, 5, 6), "short")
    ).toBe("01.02.05 03:04:05.006");
  });
});

describe("report_timestamp_build", () => {
  it("builds the report folder prefix", () => {
    expect(report_timestamp_build(local)).toBe("20260929_163750");
    expect(report_timestamp_build(utc, true)).toBe("20260929_163750");
  });
});

describe("filetime", () => {
  it("counts 100 ns ticks from 1601, anchoring the unix epoch", () => {
    expect(filetime_from_date(new Date(0))).toBe(116_444_736_000_000_000n);
    expect(filetime_from_date(new Date(1))).toBe(116_444_736_000_010_000n);
    expect(date_from_filetime(0n).toISOString()).toBe(
      "1601-01-01T00:00:00.000Z"
    );
  });

  it("round trips", () => {
    expect(date_from_filetime(filetime_from_date(utc)).getTime()).toBe(
      utc.getTime()
    );
  });
});
