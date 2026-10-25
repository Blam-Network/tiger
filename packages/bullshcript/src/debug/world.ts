// The debugger's hands on the world: every bundle row with its state, the
// actions a row's type answers to (its natives, or a client report the host
// would otherwise only get from the game), and incidents made up on the spot.

import {
  LuaClosure,
  LuaHostFunction,
  type LuaTable,
  type LuaValue,
} from "../hks/vm/values.ts";
import type { EncounterScriptHost } from "../host/activity/encounter_host.ts";
import type { BoundRow } from "../host/bound/bindings.ts";
import { bound } from "../host/build/instance_building.ts";
import type {
  BoundInstance,
  KillFilterDetails,
} from "../host/natives/natives.ts";
import { registerBoundObject } from "../host/natives/natives.ts";
import { itemKey } from "../host/tags/item_key.ts";
import { fnv1, parseHashLiteral } from "../host/tags/name_hash.ts";

export interface ActionParam {
  name: string;
  type: "number" | "string";
}

// One context-menu entry: a native on the row's bound object, a client
// report for the row, a method of the encounter instance the row names, or
// something only the host does to the row.
export interface RowAction {
  kind: "host" | "instance" | "native" | "report";
  label: string;
  name: string;
  params?: ActionParam[];
}

const NATIVE = (name: string, params?: ActionParam[]): RowAction => ({
  kind: "native",
  label: name,
  name,
  params,
});
const REPORT = (
  name: string,
  label: string,
  params?: ActionParam[]
): RowAction => ({
  kind: "report",
  label,
  name,
  params,
});

// By row type name (the build's ActivityBundleItemType keys).
const ACTIONS: Readonly<Record<string, readonly RowAction[]>> = {
  Squad: [
    NATIVE("place"),
    NATIVE("respawn"),
    NATIVE("remove"),
    NATIVE("kill"),
    REPORT("squadAlive", "report alive count", [
      { name: "count", type: "number" },
    ]),
  ],
  Actor: [NATIVE("place"), NATIVE("remove"), NATIVE("kill")],
  Object: [
    NATIVE("create"),
    NATIVE("delete_object"),
    NATIVE("set_device_position", [{ name: "position", type: "number" }]),
    REPORT("objectAlive", "report alive", [
      { name: "alive (0/1)", type: "number" },
    ]),
  ],
  Sequence: [NATIVE("start"), NATIVE("stop")],
  Timer: [
    NATIVE("start"),
    NATIVE("stop"),
    NATIVE("reset", [{ name: "seconds", type: "number" }]),
  ],
  PlayerObjective: [
    NATIVE("set_incoming"),
    NATIVE("set_active"),
    NATIVE("set_complete"),
    NATIVE("clear"),
  ],
  Objective: [NATIVE("reset")],
  PlayerTrigger: [REPORT("triggerFired", "fire (report triggered)")],
  PlayerMonitor: [
    REPORT("playerMonitor", "report players inside", [
      { name: "count", type: "number" },
    ]),
  ],
  Cinematic: [NATIVE("start"), REPORT("cinematicFinished", "report finished")],
  Encounter: [
    { kind: "instance", label: "activate()", name: "activate" },
    { kind: "instance", label: "deactivate()", name: "deactivate" },
  ],
  // Until the next phase starts, whatever the running phase's @hard_wipe says.
  HardWipeGlobals: [
    { kind: "host", label: "enable hard wipe", name: "enable" },
    { kind: "host", label: "disable hard wipe", name: "disable" },
  ],
};

// A name typed by hand: a "0x..." hash as written, else its fnv1.
export function hashOf(value: unknown): number {
  const text = String(value ?? "").trim();
  return parseHashLiteral(text) ?? fnv1(text);
}

function typeNames(host: EncounterScriptHost): Map<number, string> {
  return new Map(
    Object.entries(host.types).map(([name, id]) => [id as number, name])
  );
}

const hex8 = (n: number) => (n >>> 0).toString(16).padStart(8, "0");

export interface BundleRowView {
  actions: readonly RowAction[];
  bound: string[];
  childScript?: string;
  importIdent?: string;
  name: string | undefined;
  nameHash: string;
  sense: Record<string, unknown>;
  state: unknown;
  type: string;
  typeId: number;
  typeIndex: number;
}

export interface BundleView {
  active: boolean | undefined;
  // The embedder's: where the bundle loads, and which world builds it.
  bubbles?: readonly string[];
  bundle: string;
  rows: BundleRowView[];
  tag: string;
  world?: string;
}

export function bundlesView(
  host: EncounterScriptHost,
  lastSent: (key: string) => unknown
): BundleView[] {
  const names = typeNames(host);
  const reports = host.debugSnapshot().reports as unknown as Record<
    string,
    unknown
  >;
  const fired = new Set((reports.triggersFired as string[] | undefined) ?? []);
  const byRow = new Map<string, BoundInstance[]>();
  for (const object of host.objects) {
    if (!object.row) {
      continue;
    }
    const key = `${itemKey(object.row.bundle, object.row.typeIndex)}:${object.row.typeId}`;
    const list = byRow.get(key) ?? [];
    list.push(object);
    byRow.set(key, list);
  }
  // An embedder's list can name a bundle once per bubble that loads it (a
  // global bundle in every slice); the view lists it once.
  const seen = new Set<number>();
  const bundles = host.options.bundles.filter((tag) => {
    const key = tag.bundle >>> 0;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return bundles.map((tag) => ({
    active: host.activeBundles?.has(tag.bundle),
    bundle: hex8(tag.bundle),
    tag: hex8(tag.tag),
    rows: tag.rows.map((row) => {
      const key = itemKey(tag.bundle, row.typeIndex);
      const type = names.get(row.typeId) ?? `t${row.typeId}`;
      const sense: Record<string, unknown> = {};
      for (const [report, values] of Object.entries(reports)) {
        if (values && typeof values === "object" && !Array.isArray(values)) {
          const value = (values as Record<string, unknown>)[key];
          if (value !== undefined) {
            sense[report] = value;
          }
        }
      }
      if (fired.has(key)) {
        sense.triggerFired = true;
      }
      const extra = row as unknown as {
        childScript?: string;
        importIdent?: number;
        name?: string;
      };
      return {
        actions: ACTIONS[type] ?? [],
        bound: (byRow.get(`${key}:${row.typeId}`) ?? []).map((o) => o.path),
        childScript: extra.childScript,
        importIdent:
          extra.importIdent === undefined ? undefined : hex8(extra.importIdent),
        name: extra.name,
        nameHash: hex8(row.nameHash),
        sense,
        state:
          lastSent(`${hex8(tag.bundle)}:t${row.typeId}#${row.typeIndex}`) ??
          (row.typeId === host.types.Squad
            ? host.itemState.squad({
                bundle: tag.bundle,
                typeId: row.typeId,
                typeIndex: row.typeIndex,
              })
            : undefined),
        type,
        typeId: row.typeId,
        typeIndex: row.typeIndex,
      };
    }),
  }));
}

function findRow(
  host: EncounterScriptHost,
  bundle: number,
  typeId: number,
  typeIndex: number
): BoundRow {
  const tag = host.options.bundles.find((t) => t.bundle >>> 0 === bundle >>> 0);
  const row = tag?.rows.find(
    (r) => r.typeId === typeId && r.typeIndex === typeIndex
  );
  if (!row) {
    throw new Error(`no row t${typeId}#${typeIndex} in ${hex8(bundle)}`);
  }
  const name = (row as unknown as { name?: string }).name ?? hex8(row.nameHash);
  return { bundle: tag!.bundle, name, typeId, typeIndex };
}

// The row's own bound object when a script has one, else one made for the
// debugger.
function boundFor(host: EncounterScriptHost, row: BoundRow): BoundInstance {
  const existing = host.objects.find(
    (object) =>
      object.row?.bundle === row.bundle &&
      object.row.typeId === row.typeId &&
      object.row.typeIndex === row.typeIndex
  );
  if (existing) {
    return existing;
  }
  const made = bound(host, `debugger.${row.name}`, row);
  registerBoundObject(made);
  return made;
}

export function runRowAction(
  host: EncounterScriptHost,
  bundle: number,
  typeId: number,
  typeIndex: number,
  name: string,
  args: readonly unknown[]
): LuaValue {
  const row = findRow(host, bundle, typeId, typeIndex);
  const type = typeNames(host).get(typeId) ?? "";
  const action = (ACTIONS[type] ?? []).find((a) => a.name === name);
  const values = args.map((arg) =>
    typeof arg === "string" && arg.trim() !== "" && !Number.isNaN(Number(arg))
      ? Number(arg)
      : (arg as LuaValue)
  );
  const item = { bundle: row.bundle, typeIndex: row.typeIndex };
  host.writer.note(
    `debugger: ${name}(${values.join(", ")}) on ${row.name} t${typeId}#${typeIndex}`
  );
  if (action?.kind === "report") {
    switch (name) {
      case "squadAlive":
        host.reportSquadAlive(item, Number(values[0] ?? 0));
        return;
      case "objectAlive":
        host.reportObjectAlive(item, Number(values[0] ?? 0) !== 0);
        return;
      case "triggerFired":
        host.reportTriggerFired(item);
        return;
      case "playerMonitor":
        host.reportPlayerMonitor(item, Number(values[0] ?? 0));
        return;
      case "cinematicFinished":
        host.reportCinematicFinished(item);
        return;
      default:
        throw new Error(`no report ${name}`);
    }
  }
  if (action?.kind === "host") {
    switch (name) {
      case "enable":
      case "disable":
        host.setHardWipeArmed(name === "enable");
        return;
      default:
        throw new Error(`no host action ${name}`);
    }
  }
  if (action?.kind === "instance" || typeId === host.types.Encounter) {
    for (const [table, prefix] of instancesByPrefix(host)) {
      if (prefix === row.name || prefix.endsWith(`.${row.name}`)) {
        const method = table.get(name);
        if (!(method instanceof LuaClosure)) {
          throw new Error(`${prefix} has no ${name}()`);
        }
        return host.vm.call(method, [table, ...values])[0];
      }
    }
    throw new Error(`no script instance runs ${row.name}`);
  }
  const object = boundFor(host, row);
  const method = object.object.get(name);
  if (!(method instanceof LuaHostFunction)) {
    throw new Error(`${row.name} has no native ${name}`);
  }
  return method.callback([object.object, ...values], {
    name,
    requestYield: () => undefined,
  })?.[0];
}

// The child instances the host built, with their prefixes (instancePrefix is
// a WeakMap, so they are found through the threads and bound objects).
function instancesByPrefix(host: EncounterScriptHost): Map<LuaTable, string> {
  const out = new Map<LuaTable, string>();
  const consider = (table: LuaTable | undefined) => {
    if (!table || out.has(table)) {
      return;
    }
    const prefix = host.instancePrefix.get(table);
    if (prefix !== undefined) {
      out.set(table, prefix);
    }
  };
  for (const table of host.instances.values()) {
    consider(table);
  }
  for (const script of host.scheduler.threads) {
    consider(host.threadOwners.get(script));
  }
  for (const manager of host.managers) {
    for (const encounter of manager.encounters) {
      consider(encounter.instance);
    }
  }
  return out;
}

// ---- incidents --------------------------------------------------------------

export interface IncidentKind {
  label: string;
  name: string;
  params: (ActionParam & { hint?: string })[];
}

export const INCIDENT_KINDS: readonly IncidentKind[] = [
  {
    name: "client",
    label: "client incident (by name)",
    params: [
      { name: "name", type: "string", hint: "incident name or 0x hash" },
    ],
  },
  {
    name: "kill",
    label: "kill",
    params: [
      {
        name: "deadCombatant",
        type: "string",
        hint: "combatant name or 0x hash",
      },
      {
        name: "objectIdentifier",
        type: "string",
        hint: "identifier or 0x hash",
      },
      { name: "victimFaction", type: "number" },
      { name: "killerIsPlayer", type: "number", hint: "1 = the local player" },
      { name: "bubble", type: "string", hint: "bubble name or 0x hash" },
    ],
  },
  {
    name: "squadKill",
    label: "squad member killed (by identifier)",
    params: [{ name: "identifier", type: "string" }],
  },
  {
    name: "interaction",
    label: "interaction (by identifier)",
    params: [{ name: "identifier", type: "string" }],
  },
  {
    name: "loot",
    label: "loot gathered (by material)",
    params: [{ name: "material", type: "string" }],
  },
  { name: "playerSpawned", label: "player spawned", params: [] },
  {
    name: "playerDied",
    label: "player died",
    params: [{ name: "characterKey", type: "string", hint: "blank = local" }],
  },
  {
    name: "playerRespawned",
    label: "player respawned",
    params: [{ name: "characterKey", type: "string", hint: "blank = local" }],
  },
];

export function sendIncident(
  host: EncounterScriptHost,
  kind: string,
  params: Record<string, unknown>
): void {
  const local = host.options.players?.()[0]?.characterKey;
  const text = (key: string) => {
    const value = params[key];
    return value === undefined || value === null ? "" : String(value).trim();
  };
  host.writer.note(`debugger: incident ${kind} ${JSON.stringify(params)}`);
  switch (kind) {
    case "client":
      host.reportClientIncident(hashOf(text("name")));
      return;
    case "kill": {
      const details: KillFilterDetails = {
        assists: [],
        bubbleHash: text("bubble") ? hashOf(text("bubble")) : undefined,
        deadCombatantHash: text("deadCombatant")
          ? hashOf(text("deadCombatant"))
          : undefined,
        killer:
          Number(text("killerIsPlayer") || "1") !== 0 && local
            ? { characterKey: local }
            : {},
        objectIdentifierHashes: text("objectIdentifier")
          ? [hashOf(text("objectIdentifier"))]
          : undefined,
        victim: text("victimFaction")
          ? { faction: Number(text("victimFaction")) }
          : {},
      };
      host.reportKill(details);
      return;
    }
    case "squadKill":
      host.reportSquadKill(hashOf(text("identifier")));
      return;
    case "interaction": {
      const hash = hashOf(text("identifier"));
      host.reportInteraction((name) => name >>> 0 === hash >>> 0);
      return;
    }
    case "loot": {
      const hash = hashOf(text("material"));
      host.reportLootGathered((material) => material >>> 0 === hash >>> 0);
      return;
    }
    case "playerSpawned":
      host.reportPlayerSpawned();
      return;
    case "playerDied":
      host.reportPlayerDied(text("characterKey") || local || "");
      return;
    case "playerRespawned":
      host.reportPlayerRespawned(text("characterKey") || local || "");
      return;
    default:
      throw new Error(`no incident kind ${kind}`);
  }
}
