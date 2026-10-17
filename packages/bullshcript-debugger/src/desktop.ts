// True only in the desktop app's build. vite.config.ts replaces the name with
// a literal, so code behind `if (DESKTOP_BUILD)` is dropped from a plain vite
// build rather than just hidden.
declare const __BSDBG_DESKTOP__: boolean;

export const DESKTOP_BUILD: boolean = __BSDBG_DESKTOP__;

// Running inside the Tauri window (not a browser tab on the dev server).
export const IN_TAURI = "__TAURI_INTERNALS__" in window;

// Opens a link in the system's browser: through the opener plugin in the
// desktop app, in a new tab in a browser.
export async function openExternal(url: string): Promise<void> {
  if (IN_TAURI) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
