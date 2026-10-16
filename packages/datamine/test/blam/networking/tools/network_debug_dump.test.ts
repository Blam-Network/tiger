import { describe, expect, it } from "vitest";
import {
  netdebug_build_sessionid,
  netdebug_build_system_id,
} from "../../../../src/blam/networking/tools/network_debug_dump.ts";

describe("netdebug_build_system_id", () => {
  it("joins the parts with at signs", () => {
    expect(
      netdebug_build_system_id({
        arch: "x64",
        vendor: "pc",
        os: "win",
        machine: "buildbox",
      })
    ).toBe("x64@pc@win@buildbox");
  });

  it("cuts the machine name to 31 bytes", () => {
    const id = netdebug_build_system_id({
      arch: "x64",
      vendor: "pc",
      os: "win",
      machine: "m".repeat(40),
    });
    expect(id).toBe(`x64@pc@win@${"m".repeat(31)}`);
  });

  it("falls back to unknown_system without a machine name", () => {
    expect(
      netdebug_build_system_id({ arch: "x64", vendor: "pc", os: "win" })
    ).toBe("unknown_system");
  });
});

describe("netdebug_build_sessionid", () => {
  const system_id = "x64@pc@win@box";

  it.each([
    [new Date(2026, 8, 29, 16, 37, 42), "Tue_09292026_163742@x64@pc@win@box"],
    // Single digit fields are zero padded.
    [new Date(2026, 0, 5, 3, 4, 5), "Mon_01052026_030405@x64@pc@win@box"],
  ])("builds the form without a sequence for %s", (date, expected) => {
    expect(netdebug_build_sessionid(date, system_id)).toBe(expected);
  });

  it("adds the sequence", () => {
    const date = new Date(2026, 8, 29, 16, 37, 42);
    expect(netdebug_build_sessionid(date, "xe@pn-someone@ABC", 1)).toBe(
      "Tue_09292026_163742_000001@xe@pn-someone@ABC"
    );
    expect(netdebug_build_sessionid(date, "xe@pn-someone@ABC", 42)).toBe(
      "Tue_09292026_163742_000042@xe@pn-someone@ABC"
    );
  });

  it("keeps the id inside its 128 byte field", () => {
    const date = new Date(2026, 8, 29, 16, 37, 42);
    const id = netdebug_build_sessionid(date, "s".repeat(200));
    expect(Buffer.byteLength(id)).toBe(127);
  });
});
