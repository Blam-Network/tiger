// Build identity, Bungie style: {seq}.{yy}.{mm}.{dd}.{hhmm}.{branch}, or
// "untracked version". vite.config.ts injects the value (from
// scripts/compute-build-string.mjs) as __BSDBG_BUILD__. Ported from Datamine
// Explorer.

export interface BuildInfo {
  branch: string;
  buildString: string;
  builtAt: string;
  commit: string;
  // 0.{seq}.0, or 0.0.1 when untracked
  packageVersion: string;
  seq: number;
  showWatermark: boolean;
}

declare const __BSDBG_BUILD__: BuildInfo | undefined;

export const UNTRACKED_BUILD_STRING = "untracked version";

// The monorepo's git tag for a build is this prefix and the build string.
export const BUILD_TAG_PREFIX = "bullshcript-debugger-v";

// stands in when vite did not define the build (vitest, other tools)
const untracked: BuildInfo = {
  branch: "unknown",
  buildString: UNTRACKED_BUILD_STRING,
  builtAt: "",
  commit: "",
  packageVersion: "0.0.1",
  seq: 0,
  showWatermark: true,
};

export const BUILD_INFO: BuildInfo =
  typeof __BSDBG_BUILD__ === "undefined" ? untracked : __BSDBG_BUILD__;

export const BUILD_STRING_RE =
  /^(\d+)\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{4})\.(.+)$/;

function parseBuild(
  buildString: string
): { branch: string; seq: number } | null {
  if (buildString === UNTRACKED_BUILD_STRING) {
    return null;
  }
  const match = BUILD_STRING_RE.exec(buildString.trim());
  if (!(match?.[1] && match[6])) {
    return null;
  }
  const seq = Number.parseInt(match[1], 10);
  return Number.isFinite(seq) ? { branch: match[6], seq } : null;
}

// The build string a monorepo tag names, or null for another package's tag.
export function buildStringFromTag(tag: string): string | null {
  if (!tag.startsWith(BUILD_TAG_PREFIX)) {
    return null;
  }
  const build = tag.slice(BUILD_TAG_PREFIX.length);
  return parseBuild(build) ? build : null;
}

export function parseBuildSeq(buildString: string): number | null {
  return parseBuild(buildString)?.seq ?? null;
}

// the branch suffix of a build string (main, release, ...)
export function parseBuildBranch(buildString: string): string | null {
  return parseBuild(buildString)?.branch ?? null;
}

// true only for builds whose string ends in .release
export function isReleaseBranchBuild(buildString: string): boolean {
  return parseBuildBranch(buildString) === "release";
}

export function isNewerBuild(candidate: string, current: string): boolean {
  const candidateSeq = parseBuildSeq(candidate);
  const currentSeq = parseBuildSeq(current);
  if (candidateSeq === null || currentSeq === null) {
    return false;
  }
  return candidateSeq > currentSeq;
}
