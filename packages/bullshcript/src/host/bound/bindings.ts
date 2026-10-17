// Script names -> activity bundle rows.

import type { NavPoint } from "../state/items.ts";
import { fnv1 } from "../tags/name_hash.ts";
import type {
  ActivityBundleItemTypes,
  ActivityBundleRow,
  ActivityBundleTag,
  NavPointPosition,
} from "../tags/tag_types.ts";

export interface BoundRow {
  bundle: number;
  // The name we hashed to find it, for logs and traces.
  name: string;
  typeId: number;
  typeIndex: number;
}

const rowIndexes = new WeakMap<
  ActivityBundleTag,
  ReadonlyMap<number, ActivityBundleRow>
>();

// First row per name hash, as a linear search would find it.
function rowByHash(
  tag: ActivityBundleTag,
  hash: number
): ActivityBundleRow | undefined {
  let index = rowIndexes.get(tag);
  if (index === undefined) {
    const rows = new Map<number, ActivityBundleRow>();
    for (const row of tag.rows) {
      if (!rows.has(row.nameHash)) {
        rows.set(row.nameHash, row);
      }
    }
    index = rows;
    rowIndexes.set(tag, index);
  }
  return index.get(hash);
}

export function bundleRowByName(
  tags: readonly ActivityBundleTag[],
  name: string
): BoundRow | undefined {
  const hash = fnv1(name);
  for (const tag of tags) {
    const row = rowByHash(tag, hash);
    if (row) {
      return {
        bundle: tag.bundle,
        name,
        typeId: row.typeId,
        typeIndex: row.typeIndex,
      };
    }
  }
  return;
}

// One instance field: `<prefix>.<field>` wins, then the script's own
// namespaces, then bare `<field>`.
const resolutions = new WeakMap<
  readonly ActivityBundleTag[],
  Map<string, BoundRow | undefined>
>();

export function resolveInstanceField(
  tags: readonly ActivityBundleTag[],
  prefix: string,
  field: string,
  namespaces: readonly string[] = []
): BoundRow | undefined {
  let cache = resolutions.get(tags);
  if (cache === undefined) {
    cache = new Map();
    resolutions.set(tags, cache);
  }
  const key = `${prefix}|${field}|${namespaces.join(",")}`;
  if (cache.has(key)) {
    return cache.get(key);
  }
  const row = resolveUncached(tags, prefix, field, namespaces);
  cache.set(key, row);
  return row;
}

function resolveUncached(
  tags: readonly ActivityBundleTag[],
  prefix: string,
  field: string,
  namespaces: readonly string[]
): BoundRow | undefined {
  if (prefix) {
    const scoped = bundleRowByName(tags, `${prefix}.${field}`);
    if (scoped) {
      return scoped;
    }
  }
  const own = resolveInNamespaces(tags, prefix, field, namespaces);
  if (own) {
    return own;
  }
  const bare = bundleRowByName(tags, field);
  if (bare) {
    return bare;
  }
  return resolveByBundleNamespace(tags, prefix, field, namespaces);
}

function resolveInNamespaces(
  tags: readonly ActivityBundleTag[],
  prefix: string,
  field: string,
  namespaces: readonly string[]
): BoundRow | undefined {
  for (const namespace of namespaces) {
    // A child instance's own rows are namespaced AND slot-scoped:
    // `engineering_phase.engineering_bubble_objective._player_trigger`.
    const qualified = prefix
      ? bundleRowByName(tags, `${namespace}.${prefix}.${field}`)
      : undefined;
    if (qualified) {
      return qualified;
    }
    const plain = bundleRowByName(tags, `${namespace}.${field}`);
    if (plain) {
      return plain;
    }
  }
  return;
}

// Namespaces the bundles themselves use, rather than a rule read off the
// script's name.
function resolveByBundleNamespace(
  tags: readonly ActivityBundleTag[],
  prefix: string,
  field: string,
  // A mission script's own phase, when the rule that produced it actually
  // describes this bundle.
  namespaces: readonly string[] = []
): BoundRow | undefined {
  const suffix = prefix ? `${prefix}.${field}` : field;
  let found: BoundRow | undefined;
  // The same bundle can appear more than once in a caller's list (a slice table
  // is also an overlay elsewhere).
  const seen = new Set<number>();
  for (const tag of tags) {
    if (seen.has(tag.bundle)) {
      continue;
    }
    seen.add(tag.bundle);
    const own = bundleNamespaces(tag);
    const scoped = namespaces.filter((namespace) => own.includes(namespace));
    for (const namespace of own) {
      if (scoped.length > 0 && !scoped.includes(namespace)) {
        continue;
      }
      const name = `${namespace}.${suffix}`;
      // By hash, as the game resolves it: a cracked name is our convenience,
      // and a row whose name never cracked was invisible here.
      const row = rowByHash(tag, fnv1(name));
      if (!row) {
        continue;
      }
      if (found) {
        return;
      }
      found = {
        bundle: tag.bundle,
        name,
        typeId: row.typeId,
        typeIndex: row.typeIndex,
      };
    }
  }
  return found;
}

const namespaceCache = new WeakMap<ActivityBundleTag, readonly string[]>();

function bundleNamespaces(tag: ActivityBundleTag): readonly string[] {
  const cached = namespaceCache.get(tag);
  if (cached !== undefined) {
    return cached;
  }
  const names = new Set<string>();
  for (const row of tag.rows) {
    const dot = row.name?.indexOf(".") ?? -1;
    if (dot > 0) {
      names.add((row.name as string).slice(0, dot));
    }
  }
  const list = [...names];
  namespaceCache.set(tag, list);
  return list;
}

// A hub bundle namespaces its rows by phase (`phase00.ch2m1_collect_loot`);
// missionN is phase(N-1), zero padded.
const MISSION_DECL = /mission(\d+)$/;
const PHASE_DIGITS = 2;

export function scriptNamespaces(declName: string): string[] {
  const match = MISSION_DECL.exec(declName);
  if (!match) {
    return [];
  }
  const mission = Number(match[1]);
  if (!Number.isFinite(mission) || mission < 1) {
    return [];
  }
  return [`phase${String(mission - 1).padStart(PHASE_DIGITS, "0")}`];
}

// A mission's rows are its phase's: the member its root declares of the
// mission's class names the phase (`venus_strike_1_mission1
// engineering_phase`), else the mission's number does (scriptNamespaces).
export function missionNamespaces(
  declName: string,
  rootMembers: readonly { name: string; type: string }[] = []
): string[] {
  const phase = rootMembers.find((member) => member.type === declName);
  return phase ? [phase.name] : scriptNamespaces(declName);
}

// Bodies: each cell's default, one for a cell authored empty (a named member),
// else the member count. The import identifier is fnv1 of the bound name (1C450A3D).
export function rowImportIdent(
  tags: readonly ActivityBundleTag[],
  row: BoundRow
): number | undefined {
  const tag = tags.find((t) => t.bundle === row.bundle);
  const entry = tag?.rows.find(
    (r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex
  );
  return entry?.importIdent;
}

// A squad's cells as its script authored them (@member_counts), the
// host-only squad host's cells: each cell's anonymous bodies. A named cell
// (the package's 0) has its actor besides: the alpha's hosts give 192 of 206
// named cells 0 and retail serves them as 0, so the count is what goes out,
// never the actor counted in.
export interface AuthoredCells {
  readonly counts: readonly number[];
  readonly named: readonly boolean[];
}

// The bodies authored cells stand with: the counts, and one actor for each
// named cell.
function authoredBodies(cells: AuthoredCells): number {
  return (
    cells.counts.reduce((sum, count) => sum + count, 0) +
    cells.named.filter(Boolean).length
  );
}

// SquadAuth's roster for `bodies`: the anonymous ones (all but the named
// actors) split over the cells by their authored counts (largest
// remainder, the earlier cell on a tie). At the authored total it is the
// authored counts; how retail splits a refill over several cells is
// unknown.
export function authoredRoster(
  cells: AuthoredCells,
  bodies: number = authoredBodies(cells)
): number[] {
  const weights = [...cells.counts];
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const named = cells.named.filter(Boolean).length;
  const anonymous = Math.max(0, bodies - named);
  if (total === 0) {
    return weights;
  }
  const exact = weights.map((weight) => (anonymous * weight) / total);
  const roster = exact.map(Math.floor);
  let left = anonymous - roster.reduce((sum, count) => sum + count, 0);
  const order = exact
    .map((value, cell) => ({ cell, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest || a.cell - b.cell);
  for (const { cell } of order) {
    if (left <= 0) {
      break;
    }
    roster[cell] += 1;
    left -= 1;
  }
  return roster;
}

export function squadRosterSize(
  types: ActivityBundleItemTypes,
  tags: readonly ActivityBundleTag[],
  row: BoundRow,
  // the script's @member_counts for the row, over the package's cells
  scripted?: AuthoredCells
): number {
  if (scripted !== undefined) {
    return authoredBodies(scripted);
  }
  const tag = tags.find((t) => t.bundle === row.bundle);
  if (!tag) {
    return 1;
  }
  const squad = tag.rows.find(
    (entry) => entry.typeId === types.Squad && entry.typeIndex === row.typeIndex
  );
  if (squad?.cells !== undefined && squad.cells.length > 0) {
    return squad.cells.reduce((sum, count) => sum + Math.max(count, 1), 0);
  }
  const authored = squad?.memberCount;
  if (authored !== undefined && authored > 0) {
    return authored;
  }
  let current: number | undefined;
  let members = 0;
  for (const entry of tag.rows) {
    if (entry.typeId === types.Squad) {
      if (current === row.typeIndex) {
        break;
      }
      current = entry.typeIndex;
      members = 0;
    } else if (entry.typeId === types.Actor && current !== undefined) {
      members += 1;
    }
  }
  return current === row.typeIndex && members > 0 ? members : 1;
}

// The named members of a Squad row whose every cell is authored empty, in cell
// order: the Actor rows listed after it, one per cell.
export function squadNamedMemberRows(
  types: ActivityBundleItemTypes,
  tags: readonly ActivityBundleTag[],
  row: BoundRow
): BoundRow[] {
  const tag = tags.find((t) => t.bundle === row.bundle);
  const at =
    tag?.rows.findIndex(
      (entry) =>
        entry.typeId === types.Squad && entry.typeIndex === row.typeIndex
    ) ?? -1;
  const cells = tag?.rows[at]?.cells;
  if (!tag || at < 0 || !cells?.length || cells.some((count) => count !== 0)) {
    return [];
  }
  const members: BoundRow[] = [];
  for (const entry of tag.rows.slice(at + 1)) {
    if (entry.typeId === types.Squad) {
      break;
    }
    if (entry.typeId === types.Actor) {
      members.push({
        bundle: row.bundle,
        name: entry.name ?? `${row.name} member ${members.length}`,
        typeId: types.Actor,
        typeIndex: entry.typeIndex,
      });
    }
  }
  return members.length === cells.length ? members : [];
}

// NavPoint rows carry no state slot, so their world position is package
// data (the row's companion record), keyed the same way a BoundRow is.
export function navPointIndex(
  points: readonly NavPointPosition[]
): ReadonlyMap<string, NavPointPosition> {
  return new Map(
    points.map((point) => [`${point.bundle}:${point.typeIndex}`, point])
  );
}

export function navPointPosition(
  types: ActivityBundleItemTypes,
  index: ReadonlyMap<string, NavPointPosition>,
  row: BoundRow
): NavPoint | undefined {
  if (row.typeId !== types.NavPoint) {
    return;
  }
  const point = index.get(`${row.bundle}:${row.typeIndex}`);
  return (
    point && {
      ref: { bundle: row.bundle, typeId: row.typeId, typeIndex: row.typeIndex },
      sliceSet: point.sliceSet,
      x: point.x,
      y: point.y,
      z: point.z,
    }
  );
}

// The Squad row an Actor row belongs to: the Squad it follows in the table,
// which is the same grouping the RSAT builder's member counts use.
export function owningSquadRow(
  types: ActivityBundleItemTypes,
  tags: readonly ActivityBundleTag[],
  row: BoundRow
): BoundRow | undefined {
  const tag = tags.find((t) => t.bundle === row.bundle);
  if (!tag || row.typeId !== types.Actor) {
    return;
  }
  let squad: number | undefined;
  for (const entry of tag.rows) {
    if (entry.typeId === types.Squad) {
      squad = entry.typeIndex;
    } else if (
      entry.typeId === types.Actor &&
      entry.typeIndex === row.typeIndex
    ) {
      break;
    }
  }
  return squad === undefined
    ? undefined
    : {
        bundle: row.bundle,
        name: `${row.name} owner`,
        typeId: types.Squad,
        typeIndex: squad,
      };
}
