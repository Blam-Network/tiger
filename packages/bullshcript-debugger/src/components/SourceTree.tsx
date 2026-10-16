import { useEffect, useMemo, useRef, useState } from "react";
import type { DapSource } from "../protocol";
import { session, useSession } from "../session";

// The Sources pane: every script the server can run, as a folder tree.
// Loaded ones (a running activity has them) carry a green dot; a search
// narrows the tree to matching paths and opens every folder on the way.

interface Folder {
  files: DapSource[];
  folders: Map<string, Folder>;
  // How many files sit under it, and how many of those are loaded.
  loaded: number;
  total: number;
}

const OPEN_KEY = "bsdbg.sourceFolders";

// File kinds by extension: libraries, encounter scripts, mission phases,
// archetypes.
const KINDS: Readonly<Record<string, { label: string; tone: string }>> = {
  bs: { label: "bs", tone: "kind-bs" },
  es: { label: "es", tone: "kind-es" },
  esp: { label: "esp", tone: "kind-esp" },
  esu: { label: "esu", tone: "kind-esu" },
};

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, value: ReadonlySet<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...value]));
  } catch {
    // a private window: folders just start closed next time
  }
}

function buildTree(sources: readonly DapSource[]): Folder {
  const root: Folder = { files: [], folders: new Map(), loaded: 0, total: 0 };
  for (const source of sources) {
    const parts = source.path.split("/");
    parts.pop();
    let folder = root;
    const chain = [root];
    for (const part of parts) {
      let next = folder.folders.get(part);
      if (!next) {
        next = { files: [], folders: new Map(), loaded: 0, total: 0 };
        folder.folders.set(part, next);
      }
      folder = next;
      chain.push(folder);
    }
    folder.files.push(source);
    for (const link of chain) {
      link.total += 1;
      if (source.active) {
        link.loaded += 1;
      }
    }
  }
  return root;
}

// A folder with one subfolder and no files of its own shows as one row
// ("es/cosmo/dome_c"), the way editors compact them.
function compact(name: string, folder: Folder): [string, Folder] {
  let label = name;
  let at = folder;
  while (at.files.length === 0 && at.folders.size === 1) {
    const [childName, child] = [...at.folders][0];
    label = `${label}/${childName}`;
    at = child;
  }
  return [label, at];
}

function Highlight({ text, query }: { query: string; text: string }) {
  if (!query) {
    return <>{text}</>;
  }
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

function FileRow({
  depth,
  query,
  selected,
  source,
}: {
  depth: number;
  query: string;
  selected: boolean;
  source: DapSource;
}) {
  const ext = source.name.split(".").at(-1) ?? "";
  const kind = KINDS[ext];
  return (
    <div
      className={`src-row src-file${selected ? " selected" : ""}${source.active ? " loaded" : ""}`}
      onClick={() => void session.openSource(source.path)}
      style={{ "--depth": depth } as React.CSSProperties}
      title={source.active ? `${source.path}\nloaded by a running activity` : source.path}
    >
      <span className="src-guides" />
      <span className={`src-kind ${kind?.tone ?? ""}`}>{kind?.label ?? ext}</span>
      <span className="src-name">
        <Highlight query={query} text={source.name.replace(/\.[^.]+$/, "")} />
      </span>
      {source.active && <span className="src-loaded" title="loaded" />}
    </div>
  );
}

function FolderRows({
  depth,
  folder,
  open,
  path,
  query,
  selected,
  toggle,
}: {
  depth: number;
  folder: Folder;
  open: ReadonlySet<string>;
  path: string;
  query: string;
  selected: string | undefined;
  toggle: (path: string) => void;
}) {
  const folders = [...folder.folders].sort(([a], [b]) => a.localeCompare(b));
  const files = [...folder.files].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      {folders.map(([name, child]) => {
        const [label, shown] = compact(name, child);
        const full = path ? `${path}/${label}` : label;
        // a search opens everything it matched
        const isOpen = query !== "" || open.has(full);
        return (
          <div key={full}>
            <div
              className="src-row src-folder"
              onClick={() => toggle(full)}
              style={{ "--depth": depth } as React.CSSProperties}
              title={full}
            >
              <span className="src-guides" />
              <span className={`src-chevron${isOpen ? " open" : ""}`}>›</span>
              <span className="src-name">
                <Highlight query={query} text={label} />
              </span>
              <span className="src-count">
                {shown.loaded > 0 && <span className="src-count-loaded">{shown.loaded}</span>}
                {shown.total}
              </span>
            </div>
            {isOpen && (
              <FolderRows
                depth={depth + 1}
                folder={shown}
                open={open}
                path={full}
                query={query}
                selected={selected}
                toggle={toggle}
              />
            )}
          </div>
        );
      })}
      {files.map((source) => (
        <FileRow
          depth={depth}
          key={source.path}
          query={query}
          selected={source.path === selected}
          source={source}
        />
      ))}
    </>
  );
}

export function SourceTree() {
  const sources = useSession((s) => s.sources);
  const selected = useSession((s) => s.activeTab);
  const [query, setQuery] = useState("");
  // Off at every start: a remembered filter hid every script while nothing ran.
  const [loadedOnly, setLoadedOnly] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => readSet(OPEN_KEY));
  const search = useRef<HTMLInputElement>(null);

  // Ctrl+P jumps to the search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey && (event.key === "p" || event.key === "P")) {
        event.preventDefault();
        search.current?.focus();
        search.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter(
      (s) =>
        (!loadedOnly || s.active) && (q === "" || s.path.toLowerCase().includes(q))
    );
  }, [sources, query, loadedOnly]);
  const tree = useMemo(() => buildTree(shown), [shown]);
  const loadedCount = useMemo(
    () => sources.filter((s) => s.active).length,
    [sources]
  );

  const toggle = (path: string) => {
    setOpen((was) => {
      const next = new Set(was);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      writeSet(OPEN_KEY, next);
      return next;
    });
  };

  return (
    <div className="src-pane">
      <div className="src-tools">
        <div className="src-search">
          <span className="src-search-icon">⌕</span>
          <input
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
              } else if (e.key === "Enter" && shown.length > 0) {
                void session.openSource(shown[0].path);
              }
            }}
            placeholder="Search scripts  (Ctrl+P)"
            ref={search}
            spellCheck={false}
            value={query}
          />
          {query && (
            <button className="src-clear" onClick={() => setQuery("")} title="Clear" type="button">
              ×
            </button>
          )}
        </div>
        <div className="src-tool-row">
          <button
            className={`src-chip${loadedOnly ? " on" : ""}`}
            onClick={() => setLoadedOnly(!loadedOnly)}
            title="Only scripts a running activity has loaded"
            type="button"
          >
            <span className="src-loaded" /> Loaded {loadedCount}
          </button>
          <span className="src-total">
            {query ? `${shown.length} of ${sources.length}` : `${sources.length} scripts`}
          </span>
          <button
            className="src-icon-button"
            onClick={() => {
              setOpen(new Set());
              writeSet(OPEN_KEY, new Set());
            }}
            title="Collapse all"
            type="button"
          >
            ⊟
          </button>
          <button
            className="src-icon-button"
            onClick={() => void session.refreshSources()}
            title="Refresh"
            type="button"
          >
            ↻
          </button>
        </div>
      </div>
      <div className="src-tree">
        {sources.length === 0 && <div className="empty">No sources (not connected?)</div>}
        {sources.length > 0 && shown.length === 0 && (
          <div className="empty">Nothing matches "{query}"</div>
        )}
        <FolderRows
          depth={0}
          folder={tree}
          open={open}
          path=""
          query={query.trim()}
          selected={selected}
          toggle={toggle}
        />
      </div>
    </div>
  );
}
