import { useEffect, useRef, useState } from "react";
import appIcon from "../../src-tauri/app-icon.svg";
import { BUILD_INFO } from "../build-info";
import { DESKTOP_BUILD, openExternal } from "../desktop";
import { manualCheckMessage, type UpdateOutcome } from "../update-check";
import { GIBBON_VERSION, ISSUES_URL, PACKAGE_URL } from "../versions";

function builtText(builtAt: string): string {
  const date = new Date(builtAt);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleString();
}

// The clipboard API, or the old copy command where the webview refuses it.
async function clipboardWrite(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // fall through to the copy command
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(area);
  area.select();
  const done = document.execCommand("copy");
  area.remove();
  if (!done) {
    throw new Error("copying was refused");
  }
}

// What this build is, and where to find the project. Ported from Datamine
// Explorer. `onCheckUpdates` is only given in the desktop app.
export function AboutDialog({
  onCheckUpdates,
  onClose,
}: {
  onCheckUpdates?: () => Promise<UpdateOutcome>;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    checking: boolean;
    text: string;
  }>();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
  }, []);
  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    clipboardWrite(BUILD_INFO.buildString).then(
      () => setCopied(true),
      () => undefined
    );
  };
  const checkUpdates = async () => {
    if (!onCheckUpdates) {
      return;
    }
    setUpdateStatus({ checking: true, text: "Checking for updates..." });
    const outcome = await onCheckUpdates();
    setUpdateStatus({ checking: false, text: manualCheckMessage(outcome) });
  };
  // links are buttons, so the webview never navigates away from the app
  const link = (url: string, label: string) => (
    <button
      className="link"
      onClick={() => openExternal(url).catch(() => undefined)}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div
      className="backdrop"
      // Escape from anywhere in the dialog
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="none"
    >
      <div
        aria-label="About bullshcript debugger"
        aria-modal="true"
        className="dialog about"
        role="dialog"
      >
        <div className="about-head">
          <img
            alt=""
            className="about-icon"
            draggable={false}
            height="64"
            src={appIcon}
            width="64"
          />
          <div>
            <div className="about-name">bullshcript debugger</div>
            <button
              className="about-build"
              onClick={copy}
              title="Copy the build string"
              type="button"
            >
              {BUILD_INFO.buildString}
              <span className="about-copied">{copied ? "copied" : ""}</span>
            </button>
          </div>
        </div>
        <dl className="about-fields">
          <dt>Branch</dt>
          <dd>{BUILD_INFO.branch}</dd>
          <dt>Commit</dt>
          <dd>
            {BUILD_INFO.commit ? BUILD_INFO.commit.slice(0, 7) : "unknown"}
          </dd>
          <dt>Built</dt>
          <dd>
            {BUILD_INFO.builtAt ? builtText(BUILD_INFO.builtAt) : "unknown"}
          </dd>
          <dt>@blamnetwork/gibbon</dt>
          <dd>{GIBBON_VERSION}</dd>
        </dl>
        <div className="about-links">
          {link(PACKAGE_URL, "GitHub")}
          {link(ISSUES_URL, "Report a bug")}
        </div>
        {DESKTOP_BUILD && onCheckUpdates && (
          <div className="about-update">
            <button
              disabled={updateStatus?.checking}
              onClick={() => checkUpdates()}
              type="button"
            >
              Check for updates
            </button>
            {updateStatus && <span className="dim">{updateStatus.text}</span>}
          </div>
        )}
        <div className="about-foot">
          <span className="dim">Made by @craftycodie</span>
          <button
            className="primary"
            onClick={onClose}
            ref={close}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
