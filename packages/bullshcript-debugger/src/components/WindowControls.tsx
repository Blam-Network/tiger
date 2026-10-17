import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { IN_TAURI } from "../desktop";

// Whether the desktop window is maximized and has focus. A browser tab is
// neither, so it reads as focused and not maximized. Ported from Datamine
// Explorer.
export function useWindowState(): { focused: boolean; maximized: boolean } {
  const [focused, setFocused] = useState(true);
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!IN_TAURI) {
      return;
    }
    const win = getCurrentWindow();
    let gone = false;
    const offs: (() => void)[] = [];
    const keep = (off: () => void) => (gone ? off() : offs.push(off));
    const maximizedRead = () => {
      win.isMaximized().then(
        (on) => !gone && setMaximized(on),
        () => undefined
      );
    };
    maximizedRead();
    win.isFocused().then(
      (on) => !gone && setFocused(on),
      () => undefined
    );
    win.onResized(maximizedRead).then(keep, () => undefined);
    win
      .onFocusChanged((event) => setFocused(event.payload))
      .then(keep, () => undefined);
    return () => {
      gone = true;
      for (const off of offs) {
        off();
      }
    };
  }, []);
  return { focused, maximized };
}

// Windows 11 style caption glyphs, 10px on a 46px wide button.
function Glyph({
  kind,
}: {
  kind: "close" | "maximize" | "minimize" | "restore";
}) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1 };
  return (
    <svg aria-hidden="true" height="10" viewBox="0 0 10 10" width="10">
      {kind === "minimize" && <path d="M0 5.5h10" {...line} />}
      {kind === "maximize" && (
        <rect height="9" rx="1.5" width="9" x="0.5" y="0.5" {...line} />
      )}
      {kind === "restore" && (
        <>
          <path
            d="M2.5 2.5v-0.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-0.5"
            {...line}
          />
          <rect height="6.5" rx="1.5" width="6.5" x="0.5" y="3" {...line} />
        </>
      )}
      {kind === "close" && <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" {...line} />}
    </svg>
  );
}

// The window has no OS title bar (tauri.conf.json decorations: false): these
// are its caption buttons, flush in the toolbar's top right corner.
export function WindowControls({ maximized }: { maximized: boolean }) {
  const win = getCurrentWindow();
  return (
    <div className="window-controls">
      <button
        aria-label="Minimize"
        className="caption"
        onClick={() => win.minimize()}
        tabIndex={-1}
        title="Minimize"
        type="button"
      >
        <Glyph kind="minimize" />
      </button>
      <button
        aria-label={maximized ? "Restore" : "Maximize"}
        className="caption"
        onClick={() => win.toggleMaximize()}
        tabIndex={-1}
        title={maximized ? "Restore" : "Maximize"}
        type="button"
      >
        <Glyph kind={maximized ? "restore" : "maximize"} />
      </button>
      <button
        aria-label="Close"
        className="caption close"
        onClick={() => win.close()}
        tabIndex={-1}
        title="Close"
        type="button"
      >
        <Glyph kind="close" />
      </button>
    </div>
  );
}
