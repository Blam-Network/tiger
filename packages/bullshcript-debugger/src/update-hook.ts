import { useCallback, useEffect, useState } from "react";
import { BUILD_INFO } from "./build-info";
import { DESKTOP_BUILD, IN_TAURI, openExternal } from "./desktop";
import {
  checkForUpdate,
  type ReleaseInfo,
  skippedUpdateGet,
  skippedUpdateSet,
  type UpdateCheckOptions,
  type UpdateOutcome,
} from "./update-check";

// How long after start-up the automatic check waits, so it never competes
// with connecting.
const STARTUP_DELAY_MS = 4000;

type Check = (options: UpdateCheckOptions) => Promise<UpdateOutcome>;

// The update prompt. Checks once after start-up, in the desktop app only,
// and again whenever `checkNow` is called. `release` is the update the
// dialog is showing, if any.
function useUpdateCheckDesktop(check: Check = checkForUpdate) {
  const [release, setRelease] = useState<ReleaseInfo>();

  useEffect(() => {
    if (!IN_TAURI) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      check({
        currentBuild: BUILD_INFO.buildString,
        manual: false,
        skipped: skippedUpdateGet(),
      }).then((outcome) => {
        if (!cancelled && outcome.kind === "available") {
          setRelease(outcome.release);
        }
      });
    }, STARTUP_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [check]);

  const checkNow = useCallback(async () => {
    const outcome = await check({
      currentBuild: BUILD_INFO.buildString,
      manual: true,
      skipped: null,
    });
    if (outcome.kind === "available") {
      setRelease(outcome.release);
    }
    return outcome;
  }, [check]);

  const download = useCallback(() => {
    if (release) {
      openExternal(release.htmlUrl).catch(() => undefined);
    }
    setRelease(undefined);
  }, [release]);

  const skip = useCallback(() => {
    if (release) {
      skippedUpdateSet(release.tagName);
    }
    setRelease(undefined);
  }, [release]);

  // "Later": closed until the next start
  const later = useCallback(() => setRelease(undefined), []);

  return { checkNow, download, later, release, skip };
}

const noUpdate = {
  checkNow: (): Promise<UpdateOutcome> =>
    Promise.resolve({ kind: "untracked" }),
  download: () => undefined,
  later: () => undefined,
  release: undefined as ReleaseInfo | undefined,
  skip: () => undefined,
};

// A browser build never checks: with DESKTOP_BUILD replaced by false the
// desktop hook and the release fetching it pulls in are dropped from it.
export const useUpdateCheck: (
  check?: Check
) => ReturnType<typeof useUpdateCheckDesktop> = DESKTOP_BUILD
  ? useUpdateCheckDesktop
  : () => noUpdate;
