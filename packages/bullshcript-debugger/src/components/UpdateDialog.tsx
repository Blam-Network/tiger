import { useEffect, useRef } from "react";
import { BUILD_INFO } from "../build-info";
import type { ReleaseInfo } from "../update-check";

function dateText(publishedAt: string): string {
  const date = new Date(publishedAt);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

// Offers a newer build found on GitHub. Ported from Datamine Explorer. The
// release notes are shown as plain text, never as HTML.
export function UpdateDialog({
  currentBuild = BUILD_INFO.buildString,
  onDownload,
  onLater,
  onSkip,
  release,
}: {
  currentBuild?: string;
  onDownload: () => void;
  onLater: () => void;
  onSkip: () => void;
  release: ReleaseInfo;
}) {
  const download = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    download.current?.focus();
  }, []);
  const date = dateText(release.publishedAt);
  return (
    <div
      className="backdrop"
      // Escape from anywhere in the dialog
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onLater();
        }
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onLater()}
      role="none"
    >
      <div
        aria-label="Update available"
        aria-modal="true"
        className="dialog update"
        role="dialog"
      >
        <div className="dialog-title">Update available</div>
        <dl className="about-fields">
          <dt>Current</dt>
          <dd>{currentBuild}</dd>
          <dt>New</dt>
          <dd>{release.tagName}</dd>
        </dl>
        <div className="update-release">
          {release.name}
          {date && <span className="dim"> · {date}</span>}
          {release.prerelease && <span className="dim"> · pre-release</span>}
        </div>
        <pre className="update-notes">
          {release.body || "No release notes."}
        </pre>
        <div className="dialog-buttons">
          <button
            className="primary"
            onClick={onDownload}
            ref={download}
            type="button"
          >
            Download
          </button>
          <button onClick={onSkip} type="button">
            Skip this version
          </button>
          <button onClick={onLater} type="button">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
