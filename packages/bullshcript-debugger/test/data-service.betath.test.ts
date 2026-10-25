import { describe, expect, it } from "vitest";
import { readSlices } from "../scripts/data-service.mjs";

// The data service's slice reads on the PS4 pre-alpha, as the debugger asks
// for them: the build folder and packages from tiger/server, the scenario
// from the target. The build's packages aren't redistributable, so this only
// runs locally.
const packages = process.env.TIGER_PS4_BETATH_PACKAGES_DIR;
const build = "v38464_14_02_28_1027_betath";

// city_tower_default1 and cosmo_portal_1.
const k_tower_scenario = "0x80cfa003";
const k_portal_scenario = "0x80baa004";
const k_default = "0x2ea8fb98";

describe.skipIf(!packages)("PS4 pre-alpha slices", { timeout: 60_000 }, () => {
  const slices = (scenario: string) =>
    readSlices({ build, dictionary: "", packages: packages ?? "", scenario });

  it("lists the Tower's bubbles with their spawn points", () => {
    const tower = slices(k_tower_scenario);
    expect(tower.map((slice) => slice.handle)).toEqual([
      "0.0",
      "1.0",
      "2.0",
      "3.0",
      "4.0",
    ]);
    expect(tower.every((slice) => !slice.public)).toBe(true);
    const [boulevard] = tower;
    expect(boulevard.regionHash).toBe("0xf28fc859");
    expect(boulevard.bundles).toEqual({
      authoritative: ["0x80cfa332"],
      global: ["0x80cfa44d", "0x80cfa44e"],
      private: [],
    });
    expect(boulevard.spawnPoints).toEqual([
      {
        count: 1,
        hash: k_default,
        name: k_default,
        position: [-83.39, 32.3, -6.46],
      },
      {
        count: 3,
        hash: "0xd1640aff",
        name: "0xd1640aff",
        position: [-60.78, 23.68, -2.55],
      },
    ]);
    expect(tower[3].spawnPoints).toHaveLength(4);
  });

  it("marks cosmo_portal_1's public bubbles", () => {
    const portal = slices(k_portal_scenario);
    expect(portal).toHaveLength(19);
    expect(
      portal.filter((slice) => slice.public).map((slice) => slice.handle)
    ).toEqual(["0.0", "4.0", "5.0", "9.0", "10.0", "17.0"]);
    expect(portal.some((slice) => !slice.spawnPoints?.length)).toBe(false);
  });
});
