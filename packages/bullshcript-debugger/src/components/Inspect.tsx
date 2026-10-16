// Right sidebar: the selected thread's call stack, its frame's variables and
// the watch list. Also the lazy variable tree the console reuses.
import { useEffect, useRef, useState } from "react";
import type { Bundle, BundleRow, DapScope, DapVariable } from "../protocol";
import { session, useSession } from "../session";
import { rowMenu } from "./Sidebar";

// Children are fetched on expand; references die with the epoch, so a tree
// from an older epoch can't expand any more.
export function VarNode({
  depth,
  epoch,
  variable,
}: {
  depth: number;
  epoch: number;
  variable: DapVariable;
}) {
  const current = useSession((s) => s.epoch);
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<DapVariable[] | string>();
  const live = current === epoch && variable.variablesReference > 0;
  const toggle = async () => {
    if (!live) {
      return;
    }
    if (!open && children === undefined) {
      try {
        const { variables } = await session.call<{ variables: DapVariable[] }>(
          "variables",
          { variablesReference: variable.variablesReference }
        );
        setChildren(variables);
      } catch (error) {
        setChildren(String(error));
      }
    }
    setOpen(!open);
  };
  return (
    <>
      <div
        className={live ? "tree-row clickable" : "tree-row"}
        onClick={toggle}
        style={{ paddingLeft: depth * 12 }}
        title={variable.type}
      >
        <span className="twisty">{live ? (open ? "▾" : "▸") : ""}</span>
        <span className="var-name">{variable.name}</span>
        <span className="dim"> = </span>
        <span className="var-value">{variable.value}</span>
      </div>
      {open && typeof children === "string" && (
        <div className="tree-row error" style={{ paddingLeft: depth * 12 + 26 }}>
          {children}
        </div>
      )}
      {open &&
        Array.isArray(children) &&
        children.map((child) => (
          <VarNode depth={depth + 1} epoch={epoch} key={child.name} variable={child} />
        ))}
    </>
  );
}

function Section({
  children,
  title,
  extra,
}: {
  children: React.ReactNode;
  extra?: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={open ? "section open" : "section"}>
      <div className="section-head" onClick={() => setOpen(!open)}>
        <span className="twisty">{open ? "▾" : "▸"}</span>
        {title}
        <span className="section-extra" onClick={(e) => e.stopPropagation()}>
          {extra}
        </span>
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

function CallStack() {
  const frames = useSession((s) => s.frames);
  const selected = useSession((s) => s.selectedFrameId);
  const threadId = useSession((s) => s.selectedThreadId);
  const thread = useSession((s) =>
    s.activity?.threads.find((t) => t.id === s.selectedThreadId)
  );
  if (threadId === undefined) {
    return <div className="empty">Select a thread</div>;
  }
  return (
    <>
      {thread && (
        <div className="stack-thread dim">
          {thread.name} · {thread.state}
          {thread.waitingOn ? ` · ${thread.waitingOn}` : ""}
        </div>
      )}
      {frames.length === 0 && <div className="empty">No frames</div>}
      {frames.map((frame) => (
        <div
          className={frame.id === selected ? "list-row selected" : "list-row"}
          key={frame.id}
          onClick={() => session.selectFrame(frame.id)}
        >
          <span className="frame-name">{frame.name}</span>
          <span className="dim right">
            {frame.source?.name ?? "?"}:{frame.line}
          </span>
        </div>
      ))}
    </>
  );
}

function Variables() {
  const frameId = useSession((s) => s.selectedFrameId);
  const epoch = useSession((s) => s.epoch);
  const [scopes, setScopes] = useState<{ scope: DapScope; vars: DapVariable[] }[]>([]);
  useEffect(() => {
    setScopes([]);
    if (frameId === undefined) {
      return;
    }
    let gone = false;
    (async () => {
      try {
        const { scopes: list } = await session.call<{ scopes: DapScope[] }>(
          "scopes",
          { frameId }
        );
        const filled = await Promise.all(
          list.map(async (scope) => ({
            scope,
            vars: (
              await session.call<{ variables: DapVariable[] }>("variables", {
                variablesReference: scope.variablesReference,
              })
            ).variables,
          }))
        );
        if (!gone) {
          setScopes(filled);
        }
      } catch {
        // frame gone with a stop or continue; the next selection refetches
      }
    })();
    return () => {
      gone = true;
    };
  }, [frameId]);
  if (frameId === undefined) {
    return <div className="empty">No frame</div>;
  }
  return (
    <>
      {scopes.map(({ scope, vars }) => (
        <ScopeTree epoch={epoch} key={scope.name} name={scope.name} vars={vars} />
      ))}
    </>
  );
}

function ScopeTree({
  epoch,
  name,
  vars,
}: {
  epoch: number;
  name: string;
  vars: DapVariable[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div className="tree-row clickable scope" onClick={() => setOpen(!open)}>
        <span className="twisty">{open ? "▾" : "▸"}</span>
        {name}
        <span className="dim"> ({vars.length})</span>
      </div>
      {open &&
        vars.map((v) => <VarNode depth={1} epoch={epoch} key={v.name} variable={v} />)}
    </>
  );
}

function Watch() {
  const watches = useSession((s) => s.watches);
  const results = useSession((s) => s.watchResults);
  const epoch = useSession((s) => s.epoch);
  const [text, setText] = useState("");
  return (
    <>
      {watches.map((expression) => {
        const result = results[expression];
        return (
          <div className="watch-row" key={expression}>
            {result && "result" in result ? (
              <VarNode
                depth={0}
                epoch={epoch}
                variable={{
                  name: expression,
                  value: result.result,
                  variablesReference: result.variablesReference,
                }}
              />
            ) : (
              <div className="tree-row">
                <span className="twisty" />
                <span className="var-name">{expression}</span>
                <span className="dim"> = </span>
                <span className="error">{result ? result.error : "…"}</span>
              </div>
            )}
            <button
              className="icon-button watch-remove"
              onClick={() => session.removeWatch(expression)}
              title="Remove"
              type="button"
            >
              ×
            </button>
          </div>
        );
      })}
      <input
        className="watch-input"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            session.addWatch(text);
            setText("");
          }
        }}
        placeholder="Add BungieScript expression…"
        value={text}
      />
    </>
  );
}

const asNumber = (value: unknown) => (typeof value === "number" ? value : undefined);
const field = (value: unknown, key: string) =>
  value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;

const BUNDLES_POLL_MS = 2000;

// The one fetch loop for session.bundles (the Bundles tab and Squads read it):
// on target and stop/continue changes, and while the scripts run.
function useBundlePolling(): void {
  const targetId = useSession((s) => s.targetId);
  const epoch = useSession((s) => s.epoch);
  useEffect(() => {
    void session.refreshBundles();
  }, [targetId, epoch]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!session.target?.paused) {
        void session.refreshBundles();
      }
    }, BUNDLES_POLL_MS);
    return () => clearInterval(timer);
  }, []);
}

// The squads of the active (current slice) bundles, with the client's report
// of how many are alive. Right-click is the Bundles tab's row menu.
function Squads() {
  const targetId = useSession((s) => s.targetId);
  const bundles = useSession((s) => s.bundles);
  // Squads that were seen alive, so a later zero reads as cleared.
  const seenAlive = useRef(new Set<string>());
  if (!targetId) {
    return <div className="empty">No target</div>;
  }
  const squads: { bundle: Bundle; key: string; row: BundleRow }[] = [];
  for (const bundle of bundles) {
    if (!bundle.active) {
      continue;
    }
    for (const row of bundle.rows) {
      const key = `${targetId}:${bundle.bundle}:t${row.typeId}#${row.typeIndex}`;
      if (row.type === "Squad" && !squads.some((s) => s.key === key)) {
        squads.push({ bundle, key, row });
      }
    }
  }
  return (
    <>
      {squads.length === 0 && <div className="empty">No squads</div>}
      {squads.map(({ bundle, key, row }) => {
        const alive = asNumber(row.sense?.squadsAlive);
        const bodies = asNumber(field(row.state, "bodies"));
        if (alive !== undefined && alive > 0) {
          seenAlive.current.add(key);
        }
        const cleared =
          (alive === 0 && seenAlive.current.has(key)) || Boolean(field(row.state, "killed"));
        const [status, badge] =
          alive !== undefined && alive > 0
            ? [`alive ${alive}`, "state-active"]
            : cleared
              ? ["cleared", "state-dead"]
              : ["not spawned", "state-inactive"];
        return (
          <div
            className="list-row"
            key={key}
            onContextMenu={(e) => rowMenu(e, bundle, row)}
            title={`${bundle.bundle} · Squad t${row.typeId}#${row.typeIndex}`}
          >
            <span className="grow">{row.name ?? `${bundle.bundle}:${row.typeIndex}`}</span>
            {bodies !== undefined && <span className="dim">bodies {bodies}</span>}
            <span className={`badge ${badge}`}>{status}</span>
          </div>
        );
      })}
    </>
  );
}

export function InspectPanel() {
  useBundlePolling();
  return (
    <div className="panel inspect">
      <Section title="Call Stack">
        <CallStack />
      </Section>
      <Section title="Variables">
        <Variables />
      </Section>
      <Section
        extra={
          <button
            className="icon-button"
            onClick={() => void session.evaluateWatches()}
            title="Re-evaluate"
            type="button"
          >
            ⟳
          </button>
        }
        title="Watch"
      >
        <Watch />
      </Section>
      <Section title="Squads">
        <Squads />
      </Section>
    </div>
  );
}
