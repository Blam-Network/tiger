// vite.config.ts reads gibbon's version from disk at build time: its exports
// do not let its package.json be imported.
declare const __BSDBG_GIBBON_VERSION__: string | undefined;

export const GIBBON_VERSION =
  typeof __BSDBG_GIBBON_VERSION__ === "undefined"
    ? "unknown"
    : __BSDBG_GIBBON_VERSION__;

export const REPOSITORY_URL = "https://github.com/Blam-Network/tiger";
export const PACKAGE_URL = `${REPOSITORY_URL}/tree/main/packages/bullshcript-debugger`;
export const ISSUES_URL = `${REPOSITORY_URL}/issues/new`;
