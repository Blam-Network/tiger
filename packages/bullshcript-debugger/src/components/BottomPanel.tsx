// Bottom panel: the console (trace stream and REPL), sent rows and the world.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TigerHit } from "../protocol";
import { type ConsoleLine, session, useSession } from "../session";
import { VarNode } from "./Inspect";
import { JsonTree, TabBar } from "./ui";

const TABS = ["Console", "Sent", "World"] as const;
type Tab = (typeof TABS)[number];
// Rendering every kept line is slow; the console shows the newest.
const SHOWN = 1500;
// A typed "/verb", and whether a space follows it.
const COMMAND_TYPED = /^\/(\S*)(\s?)/;

export function BottomPanel() {
  const [tab, setTab] = useState<Tab>("Console");
  return (
    <div className="panel bottom">
      <TabBar active={tab} onSelect={setTab} tabs={TABS} />
      <div className="panel-body flex-col">
        {tab === "Console" && <ConsoleTab />}
        {tab === "Sent" && <SentTab />}
        {tab === "World" && <WorldTab />}
      </div>
    </div>
  );
}

// Keeps a scroller pinned to the bottom unless the user scrolled up.
function useStickToBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && pinned.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [dep]);
  const onScroll = () => {
    const el = ref.current;
    if (el) {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    }
  };
  return { onScroll, ref };
}

function lineText(line: ConsoleLine): string {
  switch (line.kind) {
    case "trace":
      return `${line.entry.thread ?? ""} ${line.entry.text}`;
    case "hit":
      return `${line.hit.path ?? ""} ${Object.entries(line.hit.locals).join(" ")}`;
    default:
      return line.text;
  }
}

function ConsoleTab() {
  const lines = useSession((s) => s.console);
  const targetId = useSession((s) => s.targetId);
  const [filter, setFilter] = useState("");
  const [regex, setRegex] = useState(false);
  const [thread, setThread] = useState("");
  const threads = useMemo(() => {
    const names = new Set<string>();
    for (const line of lines) {
      if (line.kind === "trace" && line.entry.thread) {
        names.add(line.entry.thread);
      }
    }
    return [...names].sort();
  }, [lines]);
  const { matcher, bad } = useMemo(() => {
    if (!filter) {
      return { bad: false, matcher: undefined };
    }
    if (regex) {
      try {
        const re = new RegExp(filter, "i");
        return { bad: false, matcher: (text: string) => re.test(text) };
      } catch {
        return { bad: true, matcher: undefined };
      }
    }
    const needle = filter.toLowerCase();
    return { bad: false, matcher: (text: string) => text.toLowerCase().includes(needle) };
  }, [filter, regex]);
  const shown = useMemo(() => {
    const out = lines.filter((line) => {
      if (line.kind === "trace" || line.kind === "hit") {
        const target = line.kind === "trace" ? line.entry.targetId : line.hit.targetId;
        if (target !== targetId) {
          return false;
        }
      }
      if (thread && !(line.kind === "trace" && line.entry.thread === thread)) {
        return false;
      }
      return !matcher || matcher(lineText(line));
    });
    return out.slice(-SHOWN);
  }, [lines, targetId, thread, matcher]);
  const scroller = useStickToBottom(shown);
  return (
    <>
      <div className="panel-tools">
        <input
          className={bad ? "bad" : ""}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter"
          value={filter}
        />
        <label className="check">
          <input checked={regex} onChange={(e) => setRegex(e.target.checked)} type="checkbox" />
          regex
        </label>
        <select onChange={(e) => setThread(e.target.value)} value={thread}>
          <option value="">all threads</option>
          {threads.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button onClick={() => session.clearConsole()} type="button">
          Clear
        </button>
      </div>
      <div className="console-lines" onScroll={scroller.onScroll} ref={scroller.ref}>
        {shown.map((line) => (
          <ConsoleRow key={line.id} line={line} />
        ))}
      </div>
      <Repl />
    </>
  );
}

function ConsoleRow({ line }: { line: ConsoleLine }) {
  switch (line.kind) {
    case "trace": {
      const { entry } = line;
      const where = entry.path && entry.line ? { line: entry.line, path: entry.path } : undefined;
      const logpoint = entry.text.startsWith("logpoint ");
      return (
        <div
          className={`console-row ${logpoint ? "logpoint" : ""} ${where ? "clickable" : ""}`}
          onClick={() => where && void session.openSource(where.path, where.line)}
          title={where ? `${where.path}:${where.line}` : undefined}
        >
          <span className="tick">{entry.tick}</span>
          <span className="thread">{entry.thread ?? ""}</span>
          <span className="text">{entry.text}</span>
        </div>
      );
    }
    case "hit":
      return <HitRow hit={line.hit} />;
    case "input":
      return (
        <div className="console-row input">
          <span className="prompt">›</span>
          <span className="text">{line.text}</span>
        </div>
      );
    case "result":
      return (
        <div className="console-row result">
          {line.variablesReference > 0 ? (
            <VarNode
              depth={0}
              epoch={line.epoch}
              variable={{ name: "", value: line.text, variablesReference: line.variablesReference }}
            />
          ) : (
            <pre className="text">{line.text}</pre>
          )}
        </div>
      );
    case "error":
      return (
        <div className="console-row error">
          <pre className="text">{line.text}</pre>
        </div>
      );
    default:
      return null;
  }
}

function HitRow({ hit }: { hit: TigerHit }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="console-row hit">
      <div className="clickable" onClick={() => setOpen(!open)}>
        <span className="tick">{hit.tick}</span>
        <span className="twisty">{open ? "▾" : "▸"}</span>
        <span className="text">
          breakpoint met in a host call at{" "}
          <a
            draggable={false}
            onClick={(e) => {
              e.stopPropagation();
              if (hit.path && hit.line) {
                void session.openSource(hit.path, hit.line);
              }
            }}
          >
            {hit.path?.split("/").at(-1)}:{hit.line}
          </a>{" "}
          (not pausable)
        </span>
      </div>
      {open && (
        <div className="hit-detail">
          {Object.entries(hit.locals).map(([name, value]) => (
            <div key={name}>
              <span className="var-name">{name}</span> = <span className="var-value">{value}</span>
            </div>
          ))}
          {hit.frames.map((frame, i) => (
            <div className="dim" key={`${i}-${frame.name}`}>
              at {frame.name} {frame.path?.split("/").at(-1)}:{frame.line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Repl() {
  const [text, setText] = useState("");
  const history = useRef<string[]>([]);
  const at = useRef(0);
  const frameId = useSession((s) => s.selectedFrameId);
  const commands = useSession((s) => s.commands);
  // A "/" line: the commands whose verb fits what's typed so far.
  const hints = useMemo(() => {
    const match = text.match(COMMAND_TYPED);
    if (!match) {
      return [];
    }
    const [, verb = "", space] = match;
    return commands.filter((c) => (space ? c.verb === verb : c.verb.startsWith(verb)));
  }, [text, commands]);
  const complete = (verb: string) => setText(`/${verb} `);
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" && hints.length > 0) {
      e.preventDefault();
      const first = hints[0];
      if (first && !text.startsWith(`/${first.verb} `)) {
        complete(first.verb);
      }
    } else if (e.key === "Enter" && text.trim()) {
      history.current = [...history.current.filter((h) => h !== text), text].slice(-200);
      at.current = history.current.length;
      void session.repl(text);
      setText("");
    } else if (e.key === "ArrowUp" && at.current > 0) {
      e.preventDefault();
      at.current -= 1;
      setText(history.current[at.current] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      at.current = Math.min(history.current.length, at.current + 1);
      setText(history.current[at.current] ?? "");
    }
  };
  return (
    <div className="repl">
      {hints.length > 0 && (
        <div className="repl-hints">
          {hints.slice(0, 12).map((c) => (
            <div className="repl-hint" key={c.verb} onMouseDown={(e) => {
              e.preventDefault();
              complete(c.verb);
            }}>
              <span className="verb">/{c.verb}</span> <span className="dim">{c.usage}</span>
            </div>
          ))}
        </div>
      )}
      <span className="prompt">›</span>
      <input
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        placeholder={
          frameId === undefined
            ? "BungieScript expression, or /help"
            : "BungieScript expression in the selected frame, or /help"
        }
        spellCheck={false}
        value={text}
      />
    </div>
  );
}

function SentTab() {
  const sent = useSession((s) => s.sent);
  const targetId = useSession((s) => s.targetId);
  const [filter, setFilter] = useState("");
  const shown = useMemo(
    () =>
      sent
        .filter((e) => e.targetId === targetId)
        .filter((e) => !filter || `${e.key} ${e.thread ?? ""}`.includes(filter))
        .slice(-SHOWN),
    [sent, targetId, filter]
  );
  const scroller = useStickToBottom(shown);
  return (
    <>
      <div className="panel-tools">
        <input onChange={(e) => setFilter(e.target.value)} placeholder="Filter by key or thread" value={filter} />
        <button onClick={() => session.clearSent()} type="button">
          Clear
        </button>
      </div>
      <div className="console-lines" onScroll={scroller.onScroll} ref={scroller.ref}>
        {shown.length === 0 && <div className="empty">Nothing sent yet</div>}
        {shown.map((entry) => (
          <SentRow entry={entry} key={entry.seq} />
        ))}
      </div>
    </>
  );
}

function changeKind(change: unknown): string {
  if (change && typeof change === "object") {
    const record = change as Record<string, unknown>;
    for (const key of ["kind", "type", "change"]) {
      if (typeof record[key] === "string") {
        return record[key] as string;
      }
    }
    return Object.keys(record).filter((k) => k !== "item").join(",");
  }
  return String(change);
}

function SentRow({ entry }: { entry: { change: unknown; key: string; seq: number; thread: string | undefined; tick: number } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="console-row">
      <div className="clickable" onClick={() => setOpen(!open)}>
        <span className="tick">{entry.tick}</span>
        <span className="twisty">{open ? "▾" : "▸"}</span>
        <span className="mono key">{entry.key}</span>
        <span className="thread">{entry.thread ?? ""}</span>
        <span className="text dim">{changeKind(entry.change)}</span>
      </div>
      {open && (
        <div className="hit-detail">
          <JsonTree open={4} value={entry.change} />
        </div>
      )}
    </div>
  );
}

function WorldTab() {
  const targetId = useSession((s) => s.targetId);
  const [world, setWorld] = useState<Record<string, unknown>>();
  const [auto, setAuto] = useState(true);
  const refresh = async () => {
    if (!targetId) {
      setWorld(undefined);
      return;
    }
    try {
      setWorld(await session.call("tiger/world", { targetId }));
    } catch (error) {
      setWorld({ error: String(error) });
    }
  };
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    void refreshRef.current();
    if (!auto) {
      return;
    }
    const timer = setInterval(() => void refreshRef.current(), 1000);
    return () => clearInterval(timer);
  }, [auto, targetId]);
  return (
    <>
      <div className="panel-tools">
        <button onClick={() => void refresh()} type="button">
          Refresh
        </button>
        <label className="check">
          <input checked={auto} onChange={(e) => setAuto(e.target.checked)} type="checkbox" />
          auto (1 s)
        </label>
      </div>
      <div className="console-lines world">
        {!world && <div className="empty">No target</div>}
        {world && (
          <>
            <JsonTree name="reports" open={2} value={world.reports} />
            <JsonTree name="itemState" open={1} value={world.itemState} />
            <JsonTree name="objects" open={0} value={world.objects} />
            <JsonTree name="sentByRow" open={0} value={world.sentByRow} />
            {"error" in world && <div className="error">{String(world.error)}</div>}
          </>
        )}
      </div>
    </>
  );
}
