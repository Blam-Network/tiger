// Where Fukugen Daihon's build folders are for bullshcript's own tools and
// tests: FUKUGEN_DAIHON_DIR when set, else the folder beside this package in
// the monorepo (packages/fukugen-daihon/destiny1/<build>).
import { resolve } from "node:path";
import { fukugenDaihonDir } from "@blamnetwork/bullshcript/destiny1/v41375_14_07_03_1501_live";

export const ALPHA_BUILD = "v36735_13_12_02_1953_alpha";
export const TU0_BUILD = "v41375_14_07_03_1501_live";
export const EVIL_BUILD = "v56578_17_04_12_1251_evil";

// Resolved from this package's own entry module, the way a consumer's
// require.resolve result would be.
export function fukugenDaihonBuildDir(build: string): string {
  return fukugenDaihonDir(
    resolve(
      import.meta.dirname,
      "../../src/versions/destiny1",
      `${TU0_BUILD}.ts`
    ),
    build
  );
}
