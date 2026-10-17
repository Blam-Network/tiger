// Ported from Datamine Explorer's build-info and update-check tests, with the
// monorepo's bullshcript-debugger-v tag prefix.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BUILD_INFO,
  buildStringFromTag,
  isNewerBuild,
  isReleaseBranchBuild,
  parseBuildBranch,
  parseBuildSeq,
} from "../src/build-info";
import {
  checkForUpdate,
  fetchReleases,
  manualCheckMessage,
  type ReleaseInfo,
  releaseFromResponse,
  selectUpdateRelease,
} from "../src/update-check";

const script = fileURLToPath(
  new URL("../scripts/compute-build-string.mjs", import.meta.url)
);

function compute(env: Record<string, string>) {
  const stdout = execFileSync(process.execPath, [script], {
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", ...env },
  });
  return JSON.parse(stdout);
}

const release = (tagName: string, prerelease = false): ReleaseInfo => ({
  body: "",
  htmlUrl: `https://github.com/Blam-Network/tiger/releases/tag/bullshcript-debugger-v${tagName}`,
  name: tagName,
  prerelease,
  publishedAt: "2026-08-17T18:10:00Z",
  tagName,
});

const olderStable = release("00020.26.08.10.1200.release");
const currentMain = "00023.26.08.16.1810.main";
const newerPrerelease = release("00024.26.08.17.1810.main", true);
const newerStable = release("00025.26.08.18.0900.release");

describe("build strings", () => {
  it("reads seq and branch", () => {
    expect(parseBuildSeq("00030.26.08.20.0200.main")).toBe(30);
    expect(parseBuildBranch("00030.26.08.20.0200.feature-x.1")).toBe(
      "feature-x.1"
    );
    expect(parseBuildSeq("untracked version")).toBeNull();
    expect(parseBuildSeq("00030.26.08.20.main")).toBeNull();
  });

  it("takes this app's tags only", () => {
    expect(
      buildStringFromTag("bullshcript-debugger-v00030.26.08.20.0200.main")
    ).toBe("00030.26.08.20.0200.main");
    expect(buildStringFromTag("datamine-v0.1.0")).toBeNull();
    expect(buildStringFromTag("00030.26.08.20.0200.main")).toBeNull();
    expect(buildStringFromTag("bullshcript-debugger-v0.1.0")).toBeNull();
  });

  it("spots release builds and compares by seq", () => {
    expect(isReleaseBranchBuild("00031.26.08.21.1200.release")).toBe(true);
    expect(isReleaseBranchBuild("00031.26.08.21.1200.main")).toBe(false);
    expect(
      isNewerBuild("00031.26.08.21.1200.main", "00030.26.08.20.0200.main")
    ).toBe(true);
    expect(isNewerBuild("00031.26.08.21.1200.main", "untracked version")).toBe(
      false
    );
    expect(
      isNewerBuild("100.26.08.18.0900.main", "99.26.08.16.1810.main")
    ).toBe(true);
  });

  it("is untracked when vite did not define the build", () => {
    expect(BUILD_INFO.buildString).toBe("untracked version");
    expect(BUILD_INFO.showWatermark).toBe(true);
  });
});

describe("compute-build-string", () => {
  it("builds the string from seq and branch", () => {
    const info = compute({ BSDBG_BRANCH: "feature/x", BSDBG_SEQ: "30" });
    expect(info.buildString).toMatch(
      /^00030\.\d{2}\.\d{2}\.\d{2}\.\d{4}\.feature-x$/
    );
    expect(info.packageVersion).toBe("0.30.0");
    expect(info.showWatermark).toBe(true);
  });

  it("drops the watermark on the release branch", () => {
    expect(
      compute({ BSDBG_BRANCH: "release", BSDBG_SEQ: "31" }).showWatermark
    ).toBe(false);
  });

  it("is untracked when asked", () => {
    const info = compute({ BSDBG_UNTRACKED: "1" });
    expect(info.buildString).toBe("untracked version");
    expect(info.packageVersion).toBe("0.0.1");
  });
});

describe("selectUpdateRelease", () => {
  it("offers a newer pre-release to a non-release build", () => {
    expect(
      selectUpdateRelease([olderStable, newerPrerelease], currentMain)
    ).toEqual(newerPrerelease);
  });

  it("ignores pre-releases for a release-branch build", () => {
    const current = "00023.26.08.16.1810.release";
    expect(selectUpdateRelease([newerPrerelease], current)).toBeNull();
    expect(
      selectUpdateRelease([newerPrerelease, newerStable], current)
    ).toEqual(newerStable);
  });

  it("takes the highest seq, not the list order", () => {
    expect(
      selectUpdateRelease(
        [newerStable, newerPrerelease, olderStable],
        currentMain
      )
    ).toEqual(newerStable);
  });

  it("returns nothing when the build is already the newest", () => {
    expect(
      selectUpdateRelease(
        [olderStable, newerPrerelease],
        newerPrerelease.tagName
      )
    ).toBeNull();
    expect(selectUpdateRelease([], currentMain)).toBeNull();
  });
});

describe("releaseFromResponse", () => {
  const base = {
    html_url: "https://example.test/r",
    tag_name: "bullshcript-debugger-v00024.26.08.17.1810.main",
  };

  it("maps a release to its build string", () => {
    expect(
      releaseFromResponse({
        ...base,
        body: " notes \n",
        name: " Name ",
        prerelease: true,
        published_at: "2026-08-17T18:10:00Z",
      })
    ).toEqual({
      body: "notes",
      htmlUrl: "https://example.test/r",
      name: "Name",
      prerelease: true,
      publishedAt: "2026-08-17T18:10:00Z",
      tagName: "00024.26.08.17.1810.main",
    });
  });

  it("falls back to the build for a missing name", () => {
    expect(releaseFromResponse({ ...base, name: null })?.name).toBe(
      "00024.26.08.17.1810.main"
    );
  });

  it("drops drafts, other packages' tags and missing fields", () => {
    expect(releaseFromResponse({ ...base, draft: true })).toBeNull();
    expect(
      releaseFromResponse({ ...base, tag_name: "datamine-v0.1.0" })
    ).toBeNull();
    expect(
      releaseFromResponse({ ...base, tag_name: "00024.26.08.17.1810.main" })
    ).toBeNull();
    expect(releaseFromResponse({ tag_name: base.tag_name })).toBeNull();
    expect(releaseFromResponse({ html_url: base.html_url })).toBeNull();
  });
});

describe("fetchReleases", () => {
  const answer = (body: unknown, status = 200) =>
    (async () =>
      new Response(JSON.stringify(body), { status })) as typeof fetch;

  it("keeps only this app's releases", async () => {
    const list = await fetchReleases(
      answer([
        {
          html_url: "https://example.test/a",
          tag_name: "bullshcript-debugger-v00024.26.08.17.1810.main",
        },
        { html_url: "https://example.test/b", tag_name: "datamine-v0.1.0" },
        {
          draft: true,
          html_url: "https://example.test/c",
          tag_name: "bullshcript-debugger-v00025.26.08.18.0900.main",
        },
      ])
    );
    expect(list.map((r) => r.tagName)).toEqual(["00024.26.08.17.1810.main"]);
  });

  it("throws on an error status and on a non-list answer", async () => {
    await expect(
      fetchReleases(answer({ message: "rate limit" }, 403))
    ).rejects.toThrow("403");
    await expect(fetchReleases(answer({}))).rejects.toThrow();
  });
});

describe("checkForUpdate", () => {
  const list = async () => [olderStable, newerPrerelease];

  it("reports an available update", async () => {
    expect(
      await checkForUpdate({
        currentBuild: currentMain,
        fetchList: list,
        manual: false,
        skipped: null,
      })
    ).toEqual({ kind: "available", release: newerPrerelease });
  });

  it("stays quiet about a skipped build on the automatic check only", async () => {
    const skipped = newerPrerelease.tagName;
    const options = { currentBuild: currentMain, fetchList: list, skipped };
    expect(await checkForUpdate({ ...options, manual: false })).toEqual({
      kind: "current",
    });
    expect(await checkForUpdate({ ...options, manual: true })).toEqual({
      kind: "available",
      release: newerPrerelease,
    });
  });

  it("does not fetch for an untracked build", async () => {
    let fetched = false;
    const fetchList = () => {
      fetched = true;
      return Promise.resolve([newerStable]);
    };
    expect(
      await checkForUpdate({
        currentBuild: "untracked version",
        fetchList,
        manual: true,
        skipped: null,
      })
    ).toEqual({ kind: "untracked" });
    expect(fetched).toBe(false);
  });

  it("turns a failed fetch into an error outcome", async () => {
    const fetchList = (): Promise<ReleaseInfo[]> =>
      Promise.reject(new Error("offline"));
    expect(
      await checkForUpdate({
        currentBuild: currentMain,
        fetchList,
        manual: false,
        skipped: null,
      })
    ).toEqual({ kind: "error", message: "offline" });
  });
});

describe("manualCheckMessage", () => {
  it("words each outcome", () => {
    expect(manualCheckMessage({ kind: "current" })).toBe("You're up to date");
    expect(manualCheckMessage({ kind: "error", message: "offline" })).toContain(
      "offline"
    );
    expect(
      manualCheckMessage({ kind: "available", release: newerStable })
    ).toContain(newerStable.tagName);
    expect(manualCheckMessage({ kind: "untracked" })).toContain("untracked");
  });
});
