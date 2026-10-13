// Left sidebar: the activity (phases, encounters, threads), loaded sources and
// the bundle rows.
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Bundle, BundleRow, RowAction, TigerPlayer, TigerSlice, TigerThread } from "../protocol";
import { currentSlice, loadsInSlice } from "../current-slice";
import { session, useSession } from "../session";
import { SourceTree } from "./SourceTree";
import { JsonTree, type MenuItem, openDialog, openMenu, TabBar } from "./ui";

const TABS = ["Activity", "Players", "Sources", "Bundles"] as const;
type Tab = (typeof TABS)[number];

const WORLDS = ["all", "activity", "private", "public"] as const;
type World = (typeof WORLDS)[number];

function loadWorld(): World {
  try {
    const saved = localStorage.getItem("bsdbg.world");
    return WORLDS.includes(saved as World) ? (saved as World) : "all";
  } catch {
    return "all";
  }
}

// Which script world a thread or bundle belongs to, shared by both tabs.
function useWorldFilter() {
  const [world, setWorld] = useState<World>(loadWorld);
  const select = (next: World) => {
    setWorld(next);
    try {
      localStorage.setItem("bsdbg.world", next);
    } catch {
      // not kept
    }
  };
  const shows = (of: string | undefined) => world === "all" || of === world;
  return { select, shows, world };
}

function WorldFilter({ select, world }: { select: (w: World) => void; world: World }) {
  return (
    <div className="segmented">
      {WORLDS.map((w) => (
        <button className={w === world ? "on" : ""} key={w} onClick={() => select(w)} type="button">
          {w[0]?.toUpperCase()}
          {w.slice(1)}
        </button>
      ))}
    </div>
  );
}

const WorldBadge = ({ world }: { world: string | undefined }) =>
  world ? <span className={`badge world-${world}`}>{world}</span> : null;

export function Sidebar() {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem("bsdbg.sidebarTab");
    return TABS.includes(saved as Tab) ? (saved as Tab) : "Activity";
  });
  const select = (next: Tab) => {
    setTab(next);
    localStorage.setItem("bsdbg.sidebarTab", next);
  };
  return (
    <div className="panel sidebar">
      <TabBar active={tab} onSelect={select} tabs={TABS} />
      <div className="panel-body">
        {tab === "Activity" && <ActivityTab />}
        {tab === "Players" && <PlayersTab />}
        {tab === "Sources" && <SourcesTab />}
        {tab === "Bundles" && <BundlesTab />}
      </div>
    </div>
  );
}

const fileOf = (path: string | undefined) => path?.split("/").at(-1);

function threadMenu(event: React.MouseEvent, thread: TigerThread): void {
  event.preventDefault();
  const id = thread.id;
  openMenu(event, [
    { label: "Wake", run: () => void session.threadCommand("tiger/wake", id) },
    { label: "Kill", run: () => void session.threadCommand("tiger/kill", id) },
    { label: "Restart", run: () => void session.threadCommand("tiger/restart", id) },
    { label: "Step Over", run: () => session.step("next", id) },
    { label: "Step Into", run: () => session.step("stepIn", id) },
    { label: "Step Out", run: () => session.step("stepOut", id) },
  ]);
}

function ActivityTab() {
  const activity = useSession((s) => s.activity);
  const selected = useSession((s) => s.selectedThreadId);
  const targetId = useSession((s) => s.targetId);
  const worlds = useWorldFilter();
  const groups = useMemo(() => {
    const byOwner = new Map<string, TigerThread[]>();
    for (const thread of activity?.threads ?? []) {
      if (!worlds.shows(thread.world)) {
        continue;
      }
      const owner = thread.owner ?? "(no owner)";
      byOwner.set(owner, [...(byOwner.get(owner) ?? []), thread]);
    }
    return [...byOwner];
  }, [activity, worlds.shows]);
  if (!targetId) {
    return <div className="empty">No activity. Waiting for a target…</div>;
  }
  if (!activity) {
    return <div className="empty">Loading…</div>;
  }
  const { snapshot } = activity;
  return (
    <>
      <div className="group-head">Phases</div>
      {snapshot.phases.length === 0 && <div className="empty">none</div>}
      {snapshot.phases.map((phase, index) => (
        <div
          className={phase === snapshot.phase ? "list-row current" : "list-row"}
          key={phase}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu(e, [
              { label: "Activate phase", run: () => void session.activatePhase(index) },
            ]);
          }}
          title="Right-click to activate"
        >
          <span className="grow">
            {phase === snapshot.phase ? "▶ " : ""}
            {phase}
          </span>
          {phase === snapshot.phase && <span className="badge state-active">current</span>}
        </div>
      ))}
      <div className="group-head">Encounters</div>
      {snapshot.encounters.length === 0 && <div className="empty">none</div>}
      {snapshot.encounters.map((e) => (
        <div className="list-row" key={`${e.owner}/${e.name}`} title={e.owner}>
          <span className={`badge state-${e.state}`}>{e.state}</span>
          <span className="grow">{e.name}</span>
          <span className="dim">
            {e.kind} · wait {e.wait} · {e.cost}/{e.budget}
          </span>
        </div>
      ))}
      <div className="group-head with-tools">
        Threads
        <WorldFilter select={worlds.select} world={worlds.world} />
      </div>
      {groups.length === 0 && <div className="empty">none</div>}
      {groups.map(([owner, threads]) => (
        <div key={owner}>
          <div className="owner-head">{owner}</div>
          {threads.map((thread) => (
            <div
              className={thread.id === selected ? "thread-row selected" : "thread-row"}
              key={thread.id}
              onClick={() => void session.selectThread(thread.id)}
              onContextMenu={(e) => threadMenu(e, thread)}
              title={thread.path}
            >
              <div className="thread-line">
                <span className={`badge state-${thread.state}`}>{thread.state}</span>
                <span className="grow">{thread.name}</span>
                <WorldBadge world={thread.world} />
                <span className="dim">
                  {fileOf(thread.path) ?? ""}
                  {thread.line ? `:${thread.line}` : ""}
                </span>
              </div>
              {thread.waitingOn && <div className="thread-wait dim">{thread.waitingOn}</div>}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// What a player is called in the list, the badge and the menus.
export const playerName = (player: TigerPlayer) => player.name || player.character || player.id;

function spawnPointDialog(player: TigerPlayer): void {
  openDialog(
    `Teleport ${playerName(player)}`,
    [
      { hint: "bubble.state, e.g. 14.2", initial: player.bubble, label: "Bubble", name: "bubble" },
      { hint: "optional spawn point name", label: "Spawn point", name: "spawn" },
    ],
    (values) => {
      const bubble = values.bubble?.trim();
      if (bubble) {
        void session.teleport(player, `${bubble} ${values.spawn?.trim() ?? ""}`);
      }
    }
  );
}

// fnv1 of "": a spawn point with no name, which the client treats as default.
const UNNAMED_SPAWN_POINT = "0x811c9dc5";

// Teleport ▸: one entry per bubble, its states nested when it has several,
// then a custom spawn point and clear. A slice goes to its default spawn;
// one with named spawn points lists them too.
function teleportItems(player: TigerPlayer, slices: TigerSlice[]): MenuItem[] {
  const byBubble = new Map<string, TigerSlice[]>();
  for (const slice of slices) {
    const key = String(slice.bubble);
    byBubble.set(key, [...(byBubble.get(key) ?? []), slice]);
  }
  const go = (args: string) => () => void session.teleport(player, args);
  const sliceItem = (slice: TigerSlice, label: string, badge: string | undefined, checked: boolean): MenuItem => {
    const points = slice.spawnPoints ?? [];
    if (points.length === 0) {
      return { badge, checked, label, run: go(slice.handle) };
    }
    // clicking the slice itself goes to its default spawn
    return {
      badge,
      checked,
      run: go(slice.handle),
      items: [
        ...points.map((p) => ({
          label: `${p.name === UNNAMED_SPAWN_POINT ? "(no name)" : p.name}${p.count > 1 ? ` ×${p.count}` : ""}`,
          run: go(`${slice.handle} ${p.name}`),
        })),
      ],
      label,
    };
  };
  const items: MenuItem[] = [...byBubble].map(([bubble, states]) => {
    const first = states[0];
    const label = `${bubble} ${first?.region ?? ""}`.trim();
    const badge = states.some((s) => s.public) ? "public" : undefined;
    const here = states.some((s) => s.handle === player.bubble);
    if (first && states.length === 1 && first.state === 0) {
      return sliceItem(first, label, badge, here);
    }
    // clicking the bubble goes to its base state's default spawn
    const base = states.find((s) => s.state === 0);
    return {
      badge,
      checked: here,
      run: base ? go(base.handle) : undefined,
      items: states.map((s) =>
        sliceItem(
          s,
          s.phase || s.phaseHash ? `${s.handle} ${s.phase ?? s.phaseHash}` : s.handle,
          s.public ? "public" : undefined,
          s.handle === player.bubble
        )
      ),
      label,
    };
  });
  if (items.length === 0) {
    items.push({ disabled: true, label: "no slices" });
  }
  items.push(
    { label: "Spawn point…", run: () => spawnPointDialog(player) },
    { label: "Clear teleport", run: go("clear") }
  );
  return items;
}

async function playerMenu(event: React.MouseEvent, player: TigerPlayer, followed: boolean): Promise<void> {
  event.preventDefault();
  const at = { clientX: event.clientX, clientY: event.clientY };
  let teleport: MenuItem = { disabled: true, label: "Teleport (not in an activity)" };
  if (player.targetId !== undefined) {
    try {
      teleport = { items: teleportItems(player, await session.slices(player.targetId)), label: "Teleport" };
    } catch (error) {
      // no slices (no scenario, no data service): still the custom dialog and clear
      teleport = { items: teleportItems(player, []), label: "Teleport" };
      session.toast(`slices: ${error instanceof Error ? error.message : String(error)}`, true);
    }
  }
  openMenu(at, [
    followed
      ? { label: "Unfollow", run: () => session.follow(undefined) }
      : { label: "Follow", run: () => session.follow(player.id) },
    teleport,
    {
      disabled: player.targetId === undefined,
      label: "Kick to orbit",
      run: () => void session.kick(player.targetId),
    },
  ]);
}

function PlayersTab() {
  const players = useSession((s) => s.players);
  const following = useSession((s) => s.following);
  const targets = useSession((s) => s.targets);
  if (players.length === 0) {
    return <div className="empty">No players (or the server lists none)</div>;
  }
  return (
    <>
      {players.map((player) => {
        const followed = player.id === following;
        const target = targets.find((t) => t.id === player.targetId);
        return (
          <div
            className={followed ? "thread-row selected" : "thread-row"}
            key={player.id}
            onContextMenu={(e) => void playerMenu(e, player, followed)}
            onClick={() => player.targetId && void session.selectTarget(player.targetId)}
            title={`${player.account} · ${player.platform}`}
          >
            <div className="thread-line">
              <span className="grow player-name">
                {playerName(player)}
                {player.level !== undefined && <span className="dim"> · level {player.level}</span>}
                {player.powerLevel !== undefined && <span className="dim"> · power {player.powerLevel}</span>}
              </span>
              <button
                className={followed ? "follow on" : "follow"}
                onClick={(e) => {
                  e.stopPropagation();
                  session.follow(followed ? undefined : player.id);
                }}
                type="button"
              >
                {followed ? "Following" : "Follow"}
              </button>
            </div>
            <div className="thread-wait dim small">
              {player.id} · {player.character} · {player.account} · {player.platform}
            </div>
            <div className="thread-wait dim">
              {player.activity ?? "no activity"}
              {player.bubble ? ` · bubble ${player.bubble}` : ""}
              {target ? ` · ${target.label}` : ""}
            </div>
          </div>
        );
      })}
    </>
  );
}

function SourcesTab() {
  return <SourceTree />;
}

function runAction(bundle: Bundle, row: BundleRow, action: RowAction, refresh: () => void): void {
  const send = (args: unknown[]) =>
    void session
      .rowAction(bundle.bundle, row.typeId, row.typeIndex, action.name, args)
      .then(refresh);
  if (!action.params?.length) {
    send([]);
    return;
  }
  const params = action.params;
  openDialog(
    `${action.label} on ${row.name ?? row.nameHash}`,
    params.map((p) => ({ hint: p.hint ?? p.type, label: p.name, name: p.name })),
    (values) => send(params.map((p) => values[p.name]))
  );
}

function loadSliceOnly(): boolean {
  try {
    return localStorage.getItem("bsdbg.currentSlice") === "1";
  } catch {
    return false;
  }
}

// Only the bundles the current slice loads; combines with the world filter.
function useSliceFilter(targetId: string | undefined) {
  const players = useSession((s) => s.players);
  const following = useSession((s) => s.following);
  const [on, setOn] = useState(loadSliceOnly);
  const slice = currentSlice(players, following, targetId);
  const toggle = () => {
    setOn(!on);
    try {
      localStorage.setItem("bsdbg.currentSlice", on ? "0" : "1");
    } catch {
      // not kept
    }
  };
  const shows = (bundle: Bundle) => !(on && slice) || loadsInSlice(bundle, slice);
  return { on, shows, slice, toggle };
}

function SliceFilter({ on, slice, toggle }: { on: boolean; slice: string | undefined; toggle: () => void }) {
  return (
    <div className="segmented">
      <button
        className={on && slice ? "on" : ""}
        disabled={!slice}
        onClick={toggle}
        title={
          slice
            ? "Only the bundles this slice loads (global ones hidden)"
            : "No player in this target (or none in a slice) to take the slice from"
        }
        type="button"
      >
        Current slice{slice ? ` (${slice})` : ""}
      </button>
    </div>
  );
}

function BundlesTab() {
  const targetId = useSession((s) => s.targetId);
  const epoch = useSession((s) => s.epoch);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string>();
  const worlds = useWorldFilter();
  const slices = useSliceFilter(targetId);
  const refresh = useCallback(async () => {
    if (!targetId) {
      setBundles([]);
      return;
    }
    try {
      const body = await session.call<{ bundles: Bundle[] }>("tiger/bundles", { targetId });
      setBundles(body.bundles);
    } catch (error) {
      session.toast(`bundles: ${String(error)}`, true);
    }
  }, [targetId]);
  useEffect(() => {
    void refresh();
  }, [refresh, epoch]);
  // Row state moves while the scripts run; only while this tab is shown.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!session.target?.paused) {
        void refresh();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [refresh]);
  const needle = filter.trim().toLowerCase();
  const matches = (row: BundleRow) =>
    !needle ||
    (row.name ?? row.nameHash).toLowerCase().includes(needle) ||
    row.type.toLowerCase().includes(needle);
  const keyOf = (bundle: Bundle, row: BundleRow) =>
    `${bundle.bundle}:t${row.typeId}#${row.typeIndex}`;
  let detail: BundleRow | undefined;
  for (const bundle of bundles) {
    for (const row of bundle.rows) {
      if (keyOf(bundle, row) === selected) {
        detail = row;
      }
    }
  }
  // The text filter narrows the bundles too: one with no matching row (and
  // whose own hash doesn't match) is left out.
  const seen = new Set<string>();
  const shown = bundles.filter((bundle) => {
    if (seen.has(bundle.bundle)) {
      return false;
    }
    seen.add(bundle.bundle);
    return (
      worlds.shows(bundle.world) &&
      slices.shows(bundle) &&
      (!needle || bundle.bundle.includes(needle) || bundle.rows.some(matches))
    );
  });
  if (!targetId) {
    return <div className="empty">No target</div>;
  }
  return (
    <div className="bundles">
      <div className="panel-tools">
        <input
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or type"
          value={filter}
        />
        <button onClick={() => void refresh()} type="button">
          Refresh
        </button>
      </div>
      <div className="panel-tools">
        <WorldFilter select={worlds.select} world={worlds.world} />
        <SliceFilter on={slices.on} slice={slices.slice} toggle={slices.toggle} />
      </div>
      <div className="bundle-list">
        {shown.length === 0 && (
          <div className="empty">{bundles.length === 0 ? "No bundles" : "No bundle matches the filters"}</div>
        )}
        {shown.map((bundle) => (
          <BundleNode
            bundle={bundle}
            key={`${bundle.bundle}:${bundle.tag}`}
            matches={needle && bundle.bundle.includes(needle) ? () => true : matches}
            onMenu={(e, row) => {
              e.preventDefault();
              setSelected(keyOf(bundle, row));
              openMenu(
                e,
                row.actions.length
                  ? row.actions.map((action) => ({
                      label: action.params?.length ? `${action.label}…` : action.label,
                      run: () => runAction(bundle, row, action, () => void refresh()),
                    }))
                  : [{ disabled: true, label: "no actions", run: () => undefined }]
              );
            }}
            onSelect={(row) => setSelected(keyOf(bundle, row))}
            selected={selected}
          />
        ))}
      </div>
      {detail && (
        <div className="bundle-detail">
          <div className="group-head">
            {detail.name ?? detail.nameHash} · {detail.type} t{detail.typeId}#{detail.typeIndex}
          </div>
          {detail.childScript && <div className="dim">child script {detail.childScript}</div>}
          {detail.importIdent && <div className="dim">import {detail.importIdent}</div>}
          <div className="dim">state</div>
          <JsonTree open={3} value={detail.state ?? null} />
          <div className="dim">sense</div>
          <JsonTree open={3} value={detail.sense} />
        </div>
      )}
    </div>
  );
}

function BundleNode({
  bundle,
  matches,
  onMenu,
  onSelect,
  selected,
}: {
  bundle: Bundle;
  matches: (row: BundleRow) => boolean;
  onMenu: (e: React.MouseEvent, row: BundleRow) => void;
  onSelect: (row: BundleRow) => void;
  selected: string | undefined;
}) {
  const [open, setOpen] = useState(true);
  const rows = bundle.rows.filter(matches);
  return (
    <>
      <div className="tree-row clickable" onClick={() => setOpen(!open)} title={`tag ${bundle.tag}`}>
        <span className="twisty">{open ? "▾" : "▸"}</span>
        <span className="mono">{bundle.bundle}</span>
        {bundle.active !== undefined && (
          <span className={bundle.active ? "badge state-active" : "badge state-inactive"}>
            {bundle.active ? "active" : "inactive"}
          </span>
        )}
        <WorldBadge world={bundle.world} />
        <span className="dim right">{rows.length} rows</span>
      </div>
      {open && bundle.bubbles && bundle.bubbles.length > 0 && (
        <div className="dim small bubbles">bubbles {bundle.bubbles.join(", ")}</div>
      )}
      {open &&
        rows.map((row) => {
          const key = `${bundle.bundle}:t${row.typeId}#${row.typeIndex}`;
          return (
            <div
              className={key === selected ? "row-node selected" : "row-node"}
              key={key}
              onClick={() => onSelect(row)}
              onContextMenu={(e) => onMenu(e, row)}
            >
              <div className="thread-line">
                <span className="grow">{row.name ?? row.nameHash}</span>
                <span className="dim">
                  {row.type} #{row.typeIndex}
                </span>
              </div>
              {row.bound.length > 0 && <div className="dim small">{row.bound.join(", ")}</div>}
            </div>
          );
        })}
    </>
  );
}
