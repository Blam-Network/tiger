// Center: read-only BungieScript sources in tabs, the breakpoint gutter and
// the selected thread's line.
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/edcore.main";
import { useEffect, useRef, useState } from "react";
import { LANGUAGE_ID } from "../bungiescript";
import { THEME } from "../monaco-setup";
import {
  type BreakpointView,
  session,
  shownLine,
  useSession,
} from "../session";
import { activateOnKey, type DialogField, openDialog, openMenu } from "./ui";

function breakpointKind(bp: BreakpointView): string {
  if (bp.logMessage) {
    return "bp-log";
  }
  return bp.condition || bp.hitCondition ? "bp-cond" : "bp";
}

function breakpointClass(bp: BreakpointView): string {
  const kind = breakpointKind(bp);
  return bp.verified === false ? `${kind} bp-unverified` : kind;
}

function breakpointHover(bp: BreakpointView): string {
  const parts = [
    bp.condition && `condition: ${bp.condition}`,
    bp.hitCondition && `hit count: ${bp.hitCondition}`,
    bp.logMessage && `log: ${bp.logMessage}`,
    bp.verified === false && (bp.message ?? "unverified"),
    bp.verified && bp.resolvedLine !== bp.line && `requested line ${bp.line}`,
  ].filter(Boolean);
  return parts.join("\n\n") || "breakpoint";
}

type BreakpointEdit = "condition" | "edit" | "log";

const EDIT_TITLES: Record<BreakpointEdit, string> = {
  condition: "Conditional breakpoint",
  edit: "Edit breakpoint",
  log: "Logpoint",
};

function breakpointFields(
  kind: BreakpointEdit,
  bp: BreakpointView | undefined
): DialogField[] {
  const condition = {
    hint: "BungieScript, e.g. counter > 3",
    initial: bp?.condition,
    label: "Condition",
    name: "condition",
  };
  if (kind === "condition") {
    return [condition];
  }
  if (kind === "log") {
    return [
      {
        hint: "text with {expression} parts",
        initial: bp?.logMessage,
        label: "Log message",
        name: "logMessage",
      },
    ];
  }
  return [
    condition,
    {
      hint: "n, >n, ==n or %n",
      initial: bp?.hitCondition,
      label: "Hit count",
      name: "hitCondition",
    },
    {
      hint: "text with {expression} parts; blank = stop",
      initial: bp?.logMessage,
      label: "Log message",
      name: "logMessage",
    },
  ];
}

function editBreakpoint(
  path: string,
  line: number,
  kind: BreakpointEdit
): void {
  const bp = session.breakpointAt(path, line);
  const fields = breakpointFields(kind, bp);
  const title = EDIT_TITLES[kind];
  openDialog(`${title} · line ${line}`, fields, (values) => {
    const merged = {
      condition: bp?.condition,
      hitCondition: bp?.hitCondition,
      logMessage: bp?.logMessage,
      ...values,
    };
    session.setBreakpoint(path, {
      condition: merged.condition?.trim() || undefined,
      hitCondition: merged.hitCondition?.trim() || undefined,
      line,
      logMessage: merged.logMessage?.trim() || undefined,
    });
  });
}

export function EditorPane() {
  const tabs = useSession((s) => s.openTabs);
  const active = useSession((s) => s.activeTab);
  const content = useSession((s) =>
    s.activeTab ? s.contents[s.activeTab] : undefined
  );
  const breakpoints = useSession((s) =>
    s.activeTab ? s.breakpoints[s.activeTab] : undefined
  );
  const reveal = useSession((s) => s.reveal);
  const frames = useSession((s) => s.frames);
  const frameId = useSession((s) => s.selectedFrameId);
  const thread = useSession((s) =>
    s.activity?.threads.find((t) => t.id === s.selectedThreadId)
  );
  // Set once the editor mounts, so the effects below run against it.
  const [editor, setEditor] = useState<Monaco.editor.IStandaloneCodeEditor>();
  const decorations =
    useRef<Monaco.editor.IEditorDecorationsCollection>(undefined);
  const activeRef = useRef(active);
  activeRef.current = active;

  // Gutter, current line and frame line.
  useEffect(() => {
    if (!(editor && active && content !== undefined)) {
      return;
    }
    const list: Monaco.editor.IModelDeltaDecoration[] = [];
    for (const bp of breakpoints ?? []) {
      list.push({
        options: {
          glyphMarginClassName: breakpointClass(bp),
          glyphMarginHoverMessage: { value: breakpointHover(bp) },
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
        range: new monaco.Range(shownLine(bp), 1, shownLine(bp), 1),
      });
    }
    const top = frames[0];
    const topPath = top?.source?.path ?? thread?.path;
    const topLine = top?.line ?? thread?.line;
    if (thread && topPath === active && topLine) {
      list.push({
        options: {
          className: thread.stoppedHere ? "line-stopped" : "line-waiting",
          glyphMarginClassName: thread.stoppedHere
            ? "arrow-stopped"
            : "arrow-waiting",
          isWholeLine: true,
        },
        range: new monaco.Range(topLine, 1, topLine, 1),
      });
    }
    const frame = frames.find((f) => f.id === frameId);
    if (frame && frame !== top && frame.source?.path === active) {
      list.push({
        options: { className: "line-frame", isWholeLine: true },
        range: new monaco.Range(frame.line, 1, frame.line, 1),
      });
    }
    if (decorations.current) {
      decorations.current.set(list);
    } else {
      decorations.current = editor.createDecorationsCollection(list);
    }
  }, [active, content, breakpoints, frames, frameId, thread, editor]);

  useEffect(() => {
    if (
      !(editor && reveal && reveal.path === active && content !== undefined)
    ) {
      return;
    }
    editor.revealLineInCenterIfOutsideViewport(reveal.line);
    editor.setPosition({ column: 1, lineNumber: reveal.line });
  }, [reveal, active, content, editor]);

  const onMount = (mountedEditor: Monaco.editor.IStandaloneCodeEditor) => {
    decorations.current = undefined;
    const GLYPH = monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN;
    mountedEditor.onMouseDown((e) => {
      const path = activeRef.current;
      const line = e.target.position?.lineNumber;
      if (e.target.type === GLYPH && e.event.leftButton && path && line) {
        session.toggleBreakpoint(path, line);
      }
    });
    mountedEditor.onContextMenu((e) => {
      const path = activeRef.current;
      const line = e.target.position?.lineNumber;
      if (e.target.type !== GLYPH || !path || !line) {
        return;
      }
      e.event.preventDefault();
      const existing = session.breakpointAt(path, line);
      openMenu(
        e.event.browserEvent,
        existing
          ? [
              { label: "Edit…", run: () => editBreakpoint(path, line, "edit") },
              {
                label: "Remove",
                run: () => session.removeBreakpoint(path, line),
              },
            ]
          : [
              {
                label: "Add breakpoint",
                run: () => session.setBreakpoint(path, { line }),
              },
              {
                label: "Add conditional breakpoint…",
                run: () => editBreakpoint(path, line, "condition"),
              },
              {
                label: "Add logpoint…",
                run: () => editBreakpoint(path, line, "log"),
              },
            ]
      );
    });
    setEditor(mountedEditor);
  };

  return (
    <div className="panel editor-pane">
      <div className="tabbar editor-tabs" role="tablist">
        {tabs.map((path) => (
          <div
            aria-selected={path === active}
            className={path === active ? "tab active" : "tab"}
            key={path}
            onClick={() => session.setActiveTab(path)}
            onKeyDown={activateOnKey(() => session.setActiveTab(path))}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                session.closeTab(path);
              }
            }}
            role="tab"
            tabIndex={0}
            title={path}
          >
            {path.split("/").at(-1)}
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                session.closeTab(path);
              }}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="editor-host">
        {active ? (
          <Editor
            language={LANGUAGE_ID}
            onMount={onMount}
            options={{
              contextmenu: false,
              domReadOnly: true,
              fontSize: 13,
              glyphMargin: true,
              minimap: { enabled: true },
              readOnly: true,
              renderLineHighlight: "none",
              scrollBeyondLastLine: false,
            }}
            path={`bs:///${active}`}
            theme={THEME}
            value={content ?? "# loading…"}
          />
        ) : (
          <div className="empty center">
            Open a source from the Sources tab, or select a thread.
          </div>
        )}
      </div>
    </div>
  );
}
