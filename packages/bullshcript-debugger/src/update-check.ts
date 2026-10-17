// Looks for a newer build among the monorepo's GitHub releases. Ported from
// Datamine Explorer (itself from MegaCrow's update check). The monorepo
// releases every package; only bullshcript-debugger-v tags are builds.
import {
  buildStringFromTag,
  isNewerBuild,
  isReleaseBranchBuild,
  parseBuildSeq,
} from "./build-info";

const RELEASES_URL =
  "https://api.github.com/repos/Blam-Network/tiger/releases?per_page=100";
export const SKIPPED_UPDATE_KEY = "bsdbg.skippedUpdate";

export interface ReleaseInfo {
  // the release notes, markdown source shown as plain text
  body: string;
  htmlUrl: string;
  name: string;
  prerelease: boolean;
  publishedAt: string;
  // the build string, without the monorepo's tag prefix
  tagName: string;
}

interface ReleaseResponse {
  body?: string | null;
  created_at?: string | null;
  draft?: boolean;
  html_url?: string;
  name?: string | null;
  prerelease?: boolean;
  published_at?: string | null;
  tag_name?: string;
}

// Drafts and tags that are not this app's builds are not updates.
export function releaseFromResponse(data: ReleaseResponse): ReleaseInfo | null {
  const build = data.tag_name ? buildStringFromTag(data.tag_name) : null;
  if (!(build && data.html_url) || data.draft) {
    return null;
  }
  return {
    body: data.body?.trim() ?? "",
    htmlUrl: data.html_url,
    name: data.name?.trim() || build,
    prerelease: Boolean(data.prerelease),
    publishedAt: data.published_at ?? data.created_at ?? "",
    tagName: build,
  };
}

// Throws when GitHub cannot be reached or answers with an error (rate limits
// included); the caller decides whether anyone hears about it. Only the
// Accept header is sent, so the request needs no CORS preflight.
export async function fetchReleases(
  fetchImpl: typeof fetch = fetch
): Promise<ReleaseInfo[]> {
  const response = await fetchImpl(RELEASES_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("GitHub gave an unexpected answer");
  }
  return data.flatMap(
    (item) => releaseFromResponse(item as ReleaseResponse) ?? []
  );
}

// The newest release above the current build. Pre-releases count unless the
// current build is a release-branch one.
export function selectUpdateRelease(
  releases: readonly ReleaseInfo[],
  currentBuild: string
): ReleaseInfo | null {
  const fullOnly = isReleaseBranchBuild(currentBuild);
  let best: ReleaseInfo | null = null;
  for (const release of releases) {
    if (
      (release.prerelease && fullOnly) ||
      !isNewerBuild(release.tagName, currentBuild)
    ) {
      continue;
    }
    if (!best || isNewerBuild(release.tagName, best.tagName)) {
      best = release;
    }
  }
  return best;
}

export type UpdateOutcome =
  | { kind: "available"; release: ReleaseInfo }
  | { kind: "current" }
  | { kind: "untracked" }
  | { kind: "error"; message: string };

export interface UpdateCheckOptions {
  currentBuild: string;
  // swapped out by tests
  fetchList?: () => Promise<ReleaseInfo[]>;
  manual: boolean;
  // the build the user chose to skip; only the automatic check honours it
  skipped: string | null;
}

export async function checkForUpdate({
  currentBuild,
  skipped,
  manual,
  fetchList = fetchReleases,
}: UpdateCheckOptions): Promise<UpdateOutcome> {
  if (parseBuildSeq(currentBuild) === null) {
    return { kind: "untracked" };
  }
  let releases: ReleaseInfo[];
  try {
    releases = await fetchList();
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  const release = selectUpdateRelease(releases, currentBuild);
  if (!release || (!manual && skipped === release.tagName)) {
    return { kind: "current" };
  }
  return { kind: "available", release };
}

export function skippedUpdateGet(): string | null {
  try {
    return localStorage.getItem(SKIPPED_UPDATE_KEY);
  } catch {
    return null;
  }
}

export function skippedUpdateSet(build: string): void {
  try {
    localStorage.setItem(SKIPPED_UPDATE_KEY, build);
  } catch {
    // not kept
  }
}

// What the About dialog says after a manual check; the update itself opens
// its own dialog.
export function manualCheckMessage(outcome: UpdateOutcome): string {
  switch (outcome.kind) {
    case "available":
      return `${outcome.release.tagName} is available`;
    case "current":
      return "You're up to date";
    case "untracked":
      return "This is an untracked build, so there is nothing to compare";
    case "error":
      return `Could not check for updates: ${outcome.message}`;
  }
}
