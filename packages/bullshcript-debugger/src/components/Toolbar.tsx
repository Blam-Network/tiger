// Top toolbar (connection, target, run control, incidents) and the status bar.
import { useEffect, useRef, useState } from "react";
import { session, useSession } from "../session";
import { playerName } from "./Sidebar";
import { openDialog, openMenu } from "./ui";

function sendIncidentMenu(event: React.MouseEvent): void {
  const kinds = session.state.incidentKinds;
  openMenu(
    event,
    kinds.length
      ? kinds.map((kind) => ({
          label: kind.params.length ? `${kind.label}…` : kind.label,
          run: () => {
            if (kind.params.length === 0) {
              session.run(session.incident(kind.name, {}));
              return;
            }
            openDialog(
              `Incident: ${kind.label}`,
              kind.params.map((p) => ({
                hint: p.hint ?? p.type,
                label: p.name,
                name: p.name,
              })),
              (values) => {
                const params: Record<string, unknown> = {};
                for (const p of kind.params) {
                  const value = values[p.name]?.trim() ?? "";
                  if (value !== "") {
                    params[p.name] =
                      p.type === "number" ? Number(value) : value;
                  }
                }
                session.run(session.incident(kind.name, params));
              }
            );
          },
        }))
      : [{ disabled: true, label: "not connected", run: () => undefined }]
  );
}

// The server's build and data paths (tiger/server), on a click.
function ServerInfo() {
  const server = useSession((s) => s.server);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="server-info" ref={ref}>
      <button
        disabled={!server}
        onClick={() => setOpen(!open)}
        title={server?.buildLabel}
        type="button"
      >
        Server
      </button>
      {open && server && (
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

export function Toolbar() {
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
    <div className="toolbar">
      <span className={`status-dot ${connection}`} title={connection} />
      <input
        className="address"
        disabled={connection !== "disconnected"}
        onChange={(e) => session.setAddress(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && session.connect()}
        spellCheck={false}
        value={address}
      />
      {connection === "disconnected" ? (
        <button
          className="primary"
          onClick={() => session.connect()}
          type="button"
        >
          Connect
        </button>
      ) : (
        <button onClick={() => session.disconnect()} type="button">
          {connection === "connecting" ? "Cancel" : "Disconnect"}
        </button>
      )}
      <select
        className="target"
        disabled={targets.length === 0}
        onChange={(e) => session.run(session.selectTarget(e.target.value))}
        value={targetId ?? ""}
      >
        {targets.length === 0 && <option value="">no activity</option>}
        {targets.map((t) => (
          <option key={t.id} title={t.meta?.activity} value={t.id}>
            {t.paused ? "⏸ " : "▶ "}
            {t.label} · {t.phase ?? "no phase"} · tick {t.ticks}
          </option>
        ))}
      </select>
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
      <div className="run-buttons">
        <button
          disabled={!(live && paused)}
          onClick={() => session.continue()}
          title="Continue (F5)"
          type="button"
        >
          ▶ Continue
        </button>
        <button
          disabled={!live || paused}
          onClick={() => session.pause()}
          title="Pause (F6)"
          type="button"
        >
          ⏸ Pause
        </button>
        <button
          disabled={!live}
          onClick={() => session.step("next")}
          title="Step Over (F10)"
          type="button"
        >
          ↷ Over
        </button>
        <button
          disabled={!live}
          onClick={() => session.step("stepIn")}
          title="Step Into (F11)"
          type="button"
        >
          ↓ Into
        </button>
        <button
          disabled={!live}
          onClick={() => session.step("stepOut")}
          title="Step Out (Shift+F11)"
          type="button"
        >
          ↑ Out
        </button>
        <button
          disabled={!live}
          onClick={() => session.stepTick()}
          title="Run one tick, then hold (F8)"
          type="button"
        >
          ⏭ Tick
        </button>
      </div>
      <button disabled={!live} onClick={sendIncidentMenu} type="button">
        Send incident ▾
      </button>
      <button
        disabled={!live}
        onClick={() => session.run(session.kick(session.state.targetId))}
        title="Drop the activity's host connections: its players go back to orbit"
        type="button"
      >
        Kick to orbit
      </button>
      <div className="toolbar-spacer" />
      <ServerInfo />
    </div>
  );
}

export function StatusBar() {
  const connection = useSession((s) => s.connection);
  const targets = useSession((s) => s.targets);
  const targetId = useSession((s) => s.targetId);
  const lastStop = useSession((s) => s.lastStop);
  const server = useSession((s) => s.server);
  const target = targets.find((t) => t.id === targetId);
  return (
    <div className={`statusbar ${target?.paused ? "paused" : ""}`}>
      <span>{connection}</span>
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
    </div>
  );
}
