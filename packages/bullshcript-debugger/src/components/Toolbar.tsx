import { useEffect } from "react";
import appIcon from "../../src-tauri/app-icon.svg";
import { BUILD_INFO } from "../build-info";
import { IN_TAURI } from "../desktop";
import { session, useSession } from "../session";
import { playerName } from "./Sidebar";
import { cx, MenuButton, type MenuItem, openDialog } from "./ui";
import { useWindowState, WindowControls } from "./WindowControls";

// The connection state in the status bar; hovering it shows the server's
// build and data paths (tiger/server).
function ConnectionInfo() {
  const connection = useSession((s) => s.connection);
  const server = useSession((s) => s.server);
  return (
    <div className="server-info">
      <span>{connection}</span>
      {server && (
        <div className="popover">
          <table>
            <tbody>
              {Object.entries(server).map(([key, value]) => (
                <tr key={key}>
                  <td className="dim">{key}</td>
                  <td>{String(value ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// The run controls' icons, VS Code's debug toolbar shapes on a 16 px grid:
// a step's dot is the current statement, its arrow where the step goes.
const ICONS = {
  continue: (
    <>
      <rect fill="currentColor" height="10" rx="0.5" width="2" x="2.5" y="3" />
      <path d="M7 3v10l6.5-5z" fill="currentColor" />
    </>
  ),
  pause: (
    <>
      <rect fill="currentColor" height="10" rx="0.5" width="3" x="3.5" y="3" />
      <rect fill="currentColor" height="10" rx="0.5" width="3" x="9.5" y="3" />
    </>
  ),
  stepOver: (
    <>
      <path d="M2.5 9.5a5 5 0 0 1 10 0" />
      <path d="M10 7.25l2.5 2.5 2.5-2.5" />
      <circle cx="7.5" cy="13" fill="currentColor" r="1.75" stroke="none" />
    </>
  ),
  stepInto: (
    <>
      <path d="M8 1.5v7.5M4.75 6 8 9.25 11.25 6" />
      <circle cx="8" cy="13" fill="currentColor" r="1.75" stroke="none" />
    </>
  ),
  stepOut: (
    <>
      <path d="M8 9.5V2M4.75 5.25 8 2l3.25 3.25" />
      <circle cx="8" cy="13" fill="currentColor" r="1.75" stroke="none" />
    </>
  ),
  tick: (
    <>
      <path d="M2.5 3v10L9 8z" fill="currentColor" />
      <rect fill="currentColor" height="10" rx="0.5" width="2" x="11" y="3" />
    </>
  ),
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      aria-hidden="true"
      className={`run-icon ${name}`}
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 16 16"
      width="16"
    >
      {ICONS[name]}
    </svg>
  );
}

// The Server menu: connect by address or to a recent server, disconnect.
function serverMenu(): MenuItem[] {
  const { address, connection, recentAddresses } = session.state;
  const recent: MenuItem[] = recentAddresses.length
    ? recentAddresses.map((a) => ({
        checked: a === address && connection !== "disconnected",
        label: a,
        run: () => session.connectTo(a),
      }))
    : [{ disabled: true, label: "none" }];
  return [
    {
      label: "Connect…",
      run: () =>
        openDialog(
          "Connect to server",
          [{ initial: address, label: "Address", name: "address" }],
          (values) => session.connectTo(values.address ?? "")
        ),
    },
    {
      disabled: connection === "disconnected",
      label: "Disconnect",
      run: () => session.disconnect(),
    },
    { label: "", separator: true },
    { heading: true, label: "Recent" },
    ...recent,
    { label: "", separator: true },
    {
      disabled: recentAddresses.length === 0,
      label: "Clear recent",
      run: () => session.clearRecentAddresses(),
    },
  ];
}

// In the desktop app the window has no frame of its own: this bar is its
// title bar. Where the attribute is clicked itself it drags the window, and a
// double click maximizes it; "deep" also takes the clicks on what is inside,
// which the title needs.
const drag = IN_TAURI ? { "data-tauri-drag-region": "" } : {};
const dragDeep = IN_TAURI ? { "data-tauri-drag-region": "deep" } : {};

// The bar, after Datamine Explorer's: the app icon (opens About), the Server
// menu and the connection's dot on the left, the program's name centred, the run controls and
// the window's caption buttons on the right.
export function Toolbar({ onAbout }: { onAbout: () => void }) {
  const { focused, maximized } = useWindowState();
  const address = useSession((s) => s.address);
  const connection = useSession((s) => s.connection);
  const targets = useSession((s) => s.targets);
  const targetId = useSession((s) => s.targetId);
  const following = useSession((s) => s.following);
  const followed = useSession((s) =>
    s.players.find((p) => p.id === s.following)
  );
  const target = targets.find((t) => t.id === targetId);
  const live = connection === "connected" && target !== undefined;
  const paused = target?.paused ?? false;

  // VS Code's keys: F5 continue, F6 pause, F10/F11/Shift+F11 steps, F8 tick.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!session.client.connected) {
        return;
      }
      const keys: Record<string, () => void> = {
        F5: () => session.continue(),
        F6: () => session.pause(),
        F8: () => session.stepTick(),
        F10: () => session.step("next"),
        F11: () => session.step(e.shiftKey ? "stepOut" : "stepIn"),
      };
      const run = keys[e.key];
      if (run) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={cx(
        "toolbar",
        IN_TAURI && "desktop",
        IN_TAURI && !focused && "inactive"
      )}
      {...drag}
    >
      <div className="toolbar-group toolbar-left" {...drag}>
        <button
          aria-label="About bullshcript debugger"
          className="toolbar-brand"
          onClick={onAbout}
          title="About bullshcript debugger"
          type="button"
        >
          <img
            alt=""
            className="app-icon"
            draggable={false}
            height="22"
            src={appIcon}
            width="22"
          />
        </button>
        <MenuButton items={serverMenu} label="Server" />
        <span
          className={`status-dot ${connection}`}
          title={`${connection} · ${address}`}
        />
        {following && (
          <button
            className="badge-button"
            onClick={() => session.follow(undefined)}
            title="Click to stop following"
            type="button"
          >
            following {followed ? playerName(followed) : following}
          </button>
        )}
      </div>
      <div className="toolbar-title" {...dragDeep}>
        <span>bullshcript debugger</span>
      </div>
      <div className="toolbar-group toolbar-right" {...drag}>
        <div className="run-buttons">
          <button
            disabled={!(live && paused)}
            onClick={() => session.continue()}
            title="Continue (F5)"
            type="button"
          >
            <Icon name="continue" />
          </button>
          <button
            disabled={!live || paused}
            onClick={() => session.pause()}
            title="Pause (F6)"
            type="button"
          >
            <Icon name="pause" />
          </button>
          <button
            disabled={!live}
            onClick={() => session.step("next")}
            title="Step Over (F10)"
            type="button"
          >
            <Icon name="stepOver" />
          </button>
          <button
            disabled={!live}
            onClick={() => session.step("stepIn")}
            title="Step Into (F11)"
            type="button"
          >
            <Icon name="stepInto" />
          </button>
          <button
            disabled={!live}
            onClick={() => session.step("stepOut")}
            title="Step Out (Shift+F11)"
            type="button"
          >
            <Icon name="stepOut" />
          </button>
          <button
            disabled={!live}
            onClick={() => session.stepTick()}
            title="Run one tick, then hold (F8)"
            type="button"
          >
            <Icon name="tick" />
          </button>
        </div>
        {IN_TAURI && <WindowControls maximized={maximized} />}
      </div>
    </div>
  );
}

export function StatusBar({ onAbout }: { onAbout: () => void }) {
  const targets = useSession((s) => s.targets);
  const targetId = useSession((s) => s.targetId);
  const lastStop = useSession((s) => s.lastStop);
  const server = useSession((s) => s.server);
  const target = targets.find((t) => t.id === targetId);
  return (
    <div className={`statusbar ${target?.paused ? "paused" : ""}`}>
      <ConnectionInfo />
      {server && (
        <span title={server.build}>{server.buildLabel ?? server.build}</span>
      )}
      {target ? (
        <>
          <span>{target.label}</span>
          <span>tick {target.ticks}</span>
          <span>time {target.time.toFixed(1)} s</span>
          <span>{target.phase ?? "no phase"}</span>
          <span>
            {target.paused
              ? `paused (${target.stopReason ?? lastStop?.reason ?? "?"})`
              : "running"}
          </span>
          {lastStop?.description && target.paused && (
            <span>{lastStop.description}</span>
          )}
        </>
      ) : (
        <span>no target</span>
      )}
      <span className="grow" />
      <button
        className="statusbar-build"
        onClick={onAbout}
        title="About bullshcript debugger"
        type="button"
      >
        bullshcript debugger {BUILD_INFO.buildString}
      </button>
    </div>
  );
}
