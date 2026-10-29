// Instance building: schema defaults, class chains, import and array import
// slots, and child scripts - the buildInstance() side of EncounterScriptHost,
// split out of encounter_host.ts.

import type { BsSchema, BsSchemaMember } from "../../bungiescript/schema.ts";
import type { HksBytecode } from "../../hks/bytecode/proto.ts";
import {
  applyUpvalueProvider,
  LuaHostObject,
  runMainChunk,
} from "../../hks/env/host_env.ts";
import {
  arrayImportSlotNames,
  chunkStringConstants,
  fieldCallArguments,
  fieldHandoffs,
  fieldMethodCalls,
  importSlotNames,
  threadNameOf,
  threadNames,
} from "../../hks/env/script_shape.ts";
import {
  gateUntilPredicate,
  type LuaScriptThread,
} from "../../hks/scheduler/scheduler.ts";
import { LuaRuntimeError } from "../../hks/vm/interpreter.ts";
import {
  LuaClosure,
  LuaHostFunction,
  LuaTable,
  type LuaValue,
} from "../../hks/vm/values.ts";
import {
  type BoundRow,
  bundleRowByName,
  missionNamespaces,
  navPointPosition,
  owningSquadRow,
  resolveInstanceField,
  rowImportIdent,
  squadNamedMemberRows,
  squadRosterSize,
} from "../bound/bindings.ts";
import {
  COMMAND_SCRIPT_BUILDER_FIELD,
  controlPointAtoms,
  CommandScriptBuilder,
} from "../natives/command_script.ts";
import type {
  BuiltScript,
  EncounterHostContext,
  SharedArchetype,
  TaskGate,
} from "../activity/host_context.ts";
import { itemKey } from "../tags/item_key.ts";
import { rowKey } from "../state/phase_journal.ts";
import type { NavPoint } from "../state/items.ts";
import { fnv1, parseHashLiteral } from "../tags/name_hash.ts";
import {
  boundObjectOf,
  BoundInstance,
  registerBoundObject,
  show,
  showArgs,
  unboundAnswer,
  unboundLabel,
} from "../natives/natives.ts";
import * as schedulingThreads from "../schedule/scheduling_threads.ts";
import { isPhaseChunk, scriptName } from "./script_graph.ts";
import * as squadNatives from "../natives/squad_natives.ts";
import type {
  ActivityBundleItemTypes,
  ActivityBundleTag,
  ObjectiveTask,
} from "../tags/tag_types.ts";

// How far reserveChildSquads probes a `<name>[i]` family.
const CHILD_SQUAD_FAMILY_PROBE = 8;

// `pf_event_countdown[0]` is a member of the pf_event_countdown family.
const ROW_FAMILY_INDEX = /\[\d+\]$/;

// Incident listener fields are host bookkeeping, resolved by design.
const INCIDENT_LISTENER_FIELD = /^(?:k?e?il_|_incident_listener$)/;
// `_activity_flag` is a flag on the players, bound to an identifier; TU0 has
// no activity-flag row type.
const ACTIVITY_FLAG_FIELD = /^_activity_flag$/;

const SQUAD_PLACING_METHODS = new Set(["place", "respawn", "remove"]);

// The verbs that put bodies on the ground. remove()/drop_squad() only make
// sense on a squad the script already owns, so they count too.
const PLACEMENT_VERBS = new Set(["place", "respawn", "remove", "drop_squad"]);

function hasPlacementVerb(methods: ReadonlySet<string>): boolean {
  for (const verb of PLACEMENT_VERBS) {
    if (methods.has(verb)) {
      return true;
    }
  }
  return false;
}

// The members the activity's other scripts declare of a mission's class: a
// root naming its phases.
function phaseMembers(self: EncounterHostContext): readonly BsSchemaMember[] {
  if (!self.phaseMembers) {
    const missions = new Set(
      self.options.chunks.filter(isPhaseChunk).map(scriptName)
    );
    self.phaseMembers = self.options.chunks
      .filter((chunk) => !isPhaseChunk(chunk))
      .flatMap((chunk) => schemaOf(self, chunk)?.members ?? [])
      .filter((member) => missions.has(member.type));
  }
  return self.phaseMembers;
}

// The namespaces a script's rows are under: a mission's phase.
function namespacesOf(self: EncounterHostContext, declName: string): string[] {
  return missionNamespaces(declName, phaseMembers(self));
}

// Whether a Squad row owns an actor: in a table, a squad's Actor rows follow
// it before the next Squad row (owningSquadRow).
function squadOwnsActor(
  types: ActivityBundleItemTypes,
  tag: ActivityBundleTag,
  squadIndex: number
): boolean {
  const at = tag.rows.findIndex(
    (row) => row.typeId === types.Squad && row.typeIndex === squadIndex
  );
  for (let i = at + 1; at >= 0 && i < tag.rows.length; i++) {
    const row = tag.rows[i];
    if (row.typeId === types.Squad) {
      return false;
    }
    if (row.typeId === types.Actor) {
      return true;
    }
  }
  return false;
}

class ScriptInstance extends LuaTable {
  private readonly resolve: (field: string) => LuaValue | undefined;
  // Every self.<field> = value a script instance ever runs, condition
  // gating's own feed (EncounterScriptHost.conditionTrue) - see onSet.
  private readonly onSet:
    | ((field: string, value: LuaValue) => void)
    | undefined;

  constructor(
    resolve: (field: string) => LuaValue | undefined,
    onSet?: (field: string, value: LuaValue) => void
  ) {
    super();
    this.resolve = resolve;
    this.onSet = onSet;
  }

  override get(key: LuaValue): LuaValue {
    const own = super.get(key);
    if (own !== undefined || typeof key !== "string") {
      return own;
    }
    const made = this.resolve(key);
    if (made !== undefined) {
      this.set(key, made);
    }
    return made;
  }

  override set(key: LuaValue, value: LuaValue): void {
    super.set(key, value);
    if (typeof key === "string") {
      this.onSet?.(key, value);
    }
  }
}

// A numeric index resolves to a real import slot on first read and is cached.
class LazyArrayTable extends LuaTable {
  private readonly resolve: (index: number) => LuaValue;
  private readonly exists: (index: number) => boolean;

  constructor(
    resolve: (index: number) => LuaValue,
    exists: (index: number) => boolean
  ) {
    super();
    this.resolve = resolve;
    this.exists = exists;
  }

  // Indices with a row or child script behind them; every index resolves to
  // something, so `len` cannot probe for a hole.
  importCount(): number {
    let count = 0;
    while (this.exists(count)) {
      count += 1;
    }
    return count;
  }

  override get(key: LuaValue): LuaValue {
    const own = super.get(key);
    if (own !== undefined || typeof key !== "number") {
      return own;
    }
    const made = this.resolve(key);
    this.set(key, made);
    return made;
  }
}
// A squad some chunk places starts empty: bodies before the spawn definition
// is live leave the client retrying "no spawn points or volumes". The field
// resolves as the chunk's own instance does, its bundle first: two bundles
// can both have a sq_cutter (enc_wisdom_amb1, enc_strength_m5).
export function reserveScriptPlacedSquads(
  self: EncounterHostContext,
  built: readonly { chunk: HksBytecode; declName: string }[]
): void {
  for (const { chunk, declName } of built) {
    const bundles = topLevelBundles(self, chunk);
    const namespaces = namespacesOf(self, declName);
    const placed = new Set<string>();
    for (const [field, methods] of fieldMethodCalls(chunk)) {
      if (hasPlacementVerb(methods)) {
        placed.add(field);
      }
    }
    for (const child of fieldCallArguments(chunk).get("add_child") ?? []) {
      placed.add(child);
    }
    for (const field of placed) {
      const row = resolveInstanceField(bundles, "", field, namespaces);
      if (row === undefined || row.typeId !== self.types.Squad) {
        continue;
      }
      self.writer.reserve(row);
    }
  }
}

export function isDormantPhase(
  self: EncounterHostContext,
  chunk: HksBytecode
): boolean {
  const roots = self.options.rootTags;
  if (roots === undefined || roots.has(chunk.tagId.toUpperCase())) {
    return false;
  }
  return isPhaseChunk(chunk);
}

// A chunk that is not a Link-A root is built at prefix "" for sibling and
// slot access, but its autostart threads must not share the root's namespace.
export function isTopLevelActor(
  self: EncounterHostContext,
  chunk: HksBytecode
): boolean {
  const roots = self.options.rootTags;
  return roots === undefined || roots.has(chunk.tagId.toUpperCase());
}

// The compiled schema behind a chunk, when its source had one (TU0).
export function schemaOf(
  self: EncounterHostContext,
  chunk: HksBytecode
): BsSchema | undefined {
  return self.options.schemas?.get(chunk.tagId.toUpperCase());
}

// The threads a schema flags `startup`: what the engine starts at
// instance start.
function schemaStartupThreads(schema: BsSchema): string[] {
  return schema.members
    .filter((member) => member.kind === "thread" && member.autostart === true)
    .map((member) => member.name);
}

// A top-level script's autostart threads, each guarded so that one raising on
// its first step takes only itself out.
export function autostart(
  self: EncounterHostContext,
  script: BuiltScript
): void {
  const started = startupThreads(
    self,
    script.chunk,
    self.namedThreads,
    script.implNames
  );
  for (const name of started) {
    try {
      schedulingThreads.restartThread(self, script.table, "", name);
    } catch (error) {
      self.writer.note(
        `thread ${name} of ${script.declName} did not start: ` +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }
  self.writer.note(`script ${script.declName} threads [${started.join(",")}]`);
}

// The schema's startup flags, else the threads no chunk names as a string.
export function startupThreads(
  self: EncounterHostContext,
  chunk: HksBytecode,
  named: ReadonlySet<string>,
  implNames: readonly string[]
): string[] {
  const schema = schemaOf(self, chunk);
  return schema === undefined
    ? threadNames(
        new Set([...named, ...chunkStringConstants(chunk)]),
        implNames
      ).autoStart
    : schemaStartupThreads(schema);
}

// What a schema's scalars read before assignment: bsc's fast-init image (bool
// false, number 0, string_hash its FNV-1) or the declared default; both sides.
function schemaDefaults(schema: BsSchema): Record<string, LuaValue> {
  const defaults: Record<string, LuaValue> = {};
  for (const member of schema.members) {
    const declared = member.default;
    switch (member.kind) {
      case "bool":
        defaults[member.name] =
          declared?.kind === "bool" ? declared.value : false;
        break;
      case "int":
      case "short":
      case "real":
        defaults[member.name] =
          declared?.kind === "number" ? declared.value : 0;
        break;
      case "string_hash":
        defaults[member.name] = declared?.kind === "string" ? declared.hash : 0;
        break;
      case "string":
        if (declared?.kind === "string") {
          defaults[member.name] = declared.value;
        }
        break;
      default:
        break;
    }
  }
  return defaults;
}

function scalarDefaultsFor(self: EncounterHostContext, chunk: HksBytecode) {
  const tagId = chunk.tagId.toUpperCase();
  let defaults = self.scalarDefaultCache.get(tagId);
  if (defaults === undefined) {
    defaults = { ...self.options.scalarDefaults?.[tagId] };
    self.scalarDefaultCache.set(tagId, defaults);
  }
  return defaults;
}

export function callImport(
  self: EncounterHostContext,
  instance: LuaTable
): void {
  const method = instance.get("import");
  if (method instanceof LuaClosure) {
    self.vm.call(method, [instance]);
  }
}

export function buildInstance(
  self: EncounterHostContext,
  chunk: HksBytecode,
  prefix: string,
  childScripts: ReadonlyMap<string, HksBytecode> | undefined,
  inherited: readonly string[] = [],
  // The tables this instance resolves its rows against, in order - see
  // bundlesFirst and childBundles.
  bundles: readonly ActivityBundleTag[] = self.options.bundles
): { declName: string; implNames: string[]; table: LuaTable } {
  const methods = chunkMethods(self, chunk);
  const declName = scriptName(chunk);
  const namespaces = [
    ...new Set([...namespacesOf(self, declName), ...inherited]),
  ];
  const implNames: string[] = [];
  const table: ScriptInstance = new ScriptInstance(
    (field) =>
      self.ownership.scope(table, () =>
        resolveField(
          self,
          prefix,
          field,
          namespaces,
          childScripts,
          bundles,
          chunk
        )
      ),
    (field, value) => noteScalarField(self, table, field, value)
  );
  // Base classes first: the class chain supplies ancestor methods, and the
  // chunk's own (set last) take precedence.
  const classChain = self.options.classChainMap?.[chunk.tagId.toUpperCase()];
  for (const ancestorTag of classChain?.chain.slice(0, -1) ?? []) {
    const ancestor = chunkByTagId(self, ancestorTag);
    if (!ancestor) {
      continue;
    }
    for (const [key, value] of chunkMethods(self, ancestor).entries()) {
      table.set(key, value);
      if (typeof key === "string") {
        implNames.push(key);
      }
    }
  }
  for (const [key, value] of methods.entries()) {
    table.set(key, value);
    if (typeof key === "string") {
      implNames.push(key);
    }
  }
  // d_X delegates (kind 0xC): the host binds them to whichever class in the
  // chain declares <d_X>_impl, now merged into `table` above.
  for (const name of classChain?.delegates ?? []) {
    const impl = table.get(`${name}_impl`);
    if (impl !== undefined) {
      table.set(name, impl);
    }
  }
  // What this instance binds or builds from here on is its own.
  self.ownership.noteInstance(table);
  self.ownership.scope(table, () => {
    // Scalar fields as the schema's fast-init data authored them, overridable by
    // options.scalarDefaults; an unset scalar read via arithmetic throws on nil.
    const schema = schemaOf(self, chunk);
    if (schema !== undefined) {
      noteMemberCounts(self, schema, prefix, namespaces, bundles);
      noteObjectives(self, schema, prefix, namespaces, bundles);
    }
    for (const [key, value] of Object.entries({
      ...(schema === undefined ? {} : schemaDefaults(schema)),
      ...scalarDefaultsFor(self, chunk),
      ...self.options.constants,
    })) {
      table.set(key, value);
    }
    // Thread handles: one per `<name>_d_execute_impl`.
    for (const impl of implNames) {
      const name = threadNameOf(impl);
      if (name !== undefined) {
        table.set(name, threadHandle(self, table, prefix, name));
      }
    }
    // Import slots start with no row; `import` binds them.
    for (const slot of importSlotNames(chunk)) {
      table.set(
        slot,
        importSlot(self, prefix, slot, childScripts, namespaces, bundles, chunk)
      );
    }
    // Array import slots (`zone_capturables[i]`) with no authored row family;
    // an authored family (`zones[i]`) resolves through resolveArrayField and a
    // device array (`dev_x[i]` over `o_x[i]`) through resolveDeviceArray.
    const hasRow = (field: string) =>
      resolveInstanceField(bundles, prefix, `${field}[0]`, namespaces) !==
      undefined;
    for (const slot of arrayImportSlotNames(chunk)) {
      if (
        hasRow(slot) ||
        (slot.startsWith("dev_") && hasRow(`o_${slot.slice("dev_".length)}`))
      ) {
        continue;
      }
      table.set(
        slot,
        arrayImportSlot(
          self,
          prefix,
          slot,
          childScripts,
          namespaces,
          bundles,
          chunk
        )
      );
    }
    table.set("encounters", schedulingThreads.encounterManager(self, table));
    self.instancePrefix.set(table, prefix);
    // Only a bubble's root script and what it builds have an owner; a phase
    // script has none and always runs.
    const owner = self.scopeOwner.get(bundles);
    if (owner !== undefined) {
      self.instanceBundle.set(table, owner);
    }
    if (prefix) {
      reserveChildSquads(self, chunk, prefix, namespaces, bundles);
    }
    if (!prefix) {
      self.instances.set(declName, table);
    }
  });
  return { declName, implNames, table };
}

// A script's @member_counts against the rows it binds: the host-only squad
// host's cells. Each names a Squad row and keys its definition's members by
// name: a key gives each member of that name a count, in member order; a
// member it leaves out keeps the package's bodies. A named actor's cell
// counts the anonymous bodies beside its actor (nearly always 0). Anything
// else stops the script loading.
function noteMemberCounts(
  self: EncounterHostContext,
  schema: BsSchema,
  prefix: string,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[]
): void {
  for (const member of schema.members) {
    for (const { members, path } of member.memberCounts ?? []) {
      const field =
        path === undefined
          ? member.name
          : `${member.name}${path.startsWith("[") ? "" : "."}${path}`;
      const fail = (why: string): never => {
        throw new Error(
          `${schema.name}:${member.line}: @member_counts on ${field}: ${why}`
        );
      };
      const row = resolveInstanceField(bundles, prefix, field, namespaces);
      if (row?.typeId !== self.types.Squad) {
        return fail("no Squad row has that name");
      }
      const entry = bundles
        .find((tag) => tag.bundle === row.bundle)
        ?.rows.find(
          (r) => r.typeId === self.types.Squad && r.typeIndex === row.typeIndex
        );
      const { cells, memberNames } = entry ?? {};
      if (
        cells === undefined ||
        memberNames === undefined ||
        memberNames.length !== cells.length
      ) {
        return fail("the packages give its squad definition no member names");
      }
      const named = cells.map((count) => count === 0);
      const counts = [...cells];
      for (const { counts: given, hash, key } of members) {
        const at = memberNames.flatMap((name, cell) =>
          name >>> 0 === hash >>> 0 ? [cell] : []
        );
        if (at.length === 0) {
          const listed = memberNames
            .map((name) => `0x${(name >>> 0).toString(16).toUpperCase()}`)
            .join(", ");
          return fail(`its squad has no member '${key}' (members: ${listed})`);
        }
        if (at.length !== given.length) {
          return fail(
            `${at.length} of its members are named '${key}', so '${key}' takes ${at.length === 1 ? "a count" : `a list of ${at.length} counts`}`
          );
        }
        at.forEach((cell, i) => {
          counts[cell] = given[i];
        });
      }
      const key = itemKey(row.bundle, row.typeIndex);
      const known = self.memberCounts.get(key);
      if (known !== undefined && known.counts.join() !== counts.join()) {
        return fail(`another declaration gives it (${known.counts.join(", ")})`);
      }
      self.memberCounts.set(key, { counts, named });
    }
  }
}

// How many elements of an array a `[]` in an @objective path reaches at most.
const OBJECTIVE_ARRAY_PROBE = 64;

// The rows a schema path names: the one row, or for each `[]` every element
// that has a row, in order.
function rowsAtPath(
  field: string,
  rowOf: (name: string) => BoundRow | undefined
): BoundRow[] {
  const at = field.indexOf("[]");
  if (at < 0) {
    const row = rowOf(field);
    return row === undefined ? [] : [row];
  }
  const rows: BoundRow[] = [];
  for (let i = 0; i < OBJECTIVE_ARRAY_PROBE; i++) {
    const found = rowsAtPath(
      `${field.slice(0, at)}[${i}]${field.slice(at + 2)}`,
      rowOf
    );
    if (found.length === 0) {
      break;
    }
    rows.push(...found);
  }
  return rows;
}

// A script's @objective and @task against the rows it binds: the host-only
// data of the squad hosts (the Objective a squad is against) and of the
// Objective host (a task's squad filter and condition). Anything the rows
// cannot take stops the script loading.
function noteObjectives(
  self: EncounterHostContext,
  schema: BsSchema,
  prefix: string,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[]
): void {
  const rowOf = (name: string) =>
    resolveInstanceField(bundles, prefix, name, namespaces);
  for (const member of schema.members) {
    const fail = (decorator: string, why: string): never => {
      throw new Error(
        `${schema.name}:${member.line}: @${decorator} on ${member.name}: ${why}`
      );
    };
    for (const { path, target } of member.objective ?? []) {
      const field =
        path === undefined
          ? member.name
          : `${member.name}${path.startsWith("[") ? "" : "."}${path}`;
      const objective = rowOf(target);
      if (objective?.typeId !== self.types.Objective) {
        return fail("objective", `'${target}' names no Objective row`);
      }
      const squads = rowsAtPath(field, rowOf);
      if (squads.length === 0 && !field.includes("[]")) {
        return fail("objective", `no Squad row has the name '${field}'`);
      }
      for (const squad of squads) {
        if (squad.typeId !== self.types.Squad) {
          return fail("objective", `'${squad.name}' is no Squad row`);
        }
        const key = itemKey(squad.bundle, squad.typeIndex);
        const known = self.squadObjectives.get(key);
        if (
          known !== undefined &&
          (known.bundle !== objective.bundle ||
            known.typeIndex !== objective.typeIndex)
        ) {
          return fail(
            "objective",
            `another declaration gives '${squad.name}' another Objective`
          );
        }
        self.squadObjectives.set(key, {
          bundle: objective.bundle,
          typeIndex: objective.typeIndex,
        });
      }
    }
    if (member.tasks === undefined) {
      continue;
    }
    for (const task of member.tasks) {
      const name =
        task.path === undefined ? member.name : `${member.name}.${task.path}`;
      const objective = rowOf(name);
      if (objective?.typeId !== self.types.Objective) {
        return fail("task", `no Objective row has the name '${name}'`);
      }
      const key = itemKey(objective.bundle, objective.typeIndex);
      const gates = self.taskGates.get(key) ?? new Map<number, TaskGate>();
      self.taskGates.set(key, gates);
      let filter: TaskGate["filter"];
      if (task.squad !== undefined) {
        const row = rowOf(task.squad);
        if (
          row?.typeId !== self.types.Squad &&
          row?.typeId !== self.types.SquadGroup
        ) {
          return fail(
            "task",
            `'${task.squad}' names no Squad or SquadGroup row`
          );
        }
        filter = {
          bundle: row.bundle,
          typeId: row.typeId,
          typeIndex: row.typeIndex,
        };
      }
      const gate: TaskGate = {
        ...(task.condition === undefined
          ? {}
          : { condition: fnv1(task.condition) }),
        ...(filter === undefined ? {} : { filter }),
      };
      const known = gates.get(task.hash);
      if (
        known !== undefined &&
        JSON.stringify(known) !== JSON.stringify(gate)
      ) {
        return fail(
          "task",
          `another declaration gives task ${task.name} another gate`
        );
      }
      gates.set(task.hash, gate);
    }
  }
}

// The rows a top-level chunk resolves against: bundlesFirst on its own
// bundle, the same array every time it is asked for.
export function topLevelBundles(
  self: EncounterHostContext,
  chunk: HksBytecode
): readonly ActivityBundleTag[] {
  let bundles = self.topLevelBundles.get(chunk);
  if (bundles === undefined) {
    bundles = bundlesFirst(self, self.options.chunkOwners?.get(chunk.tagId));
    self.topLevelBundles.set(chunk, bundles);
  }
  return bundles;
}

// What a top-level instance of the chunk resolves its fields with.
function topLevelScope(
  self: EncounterHostContext,
  chunk: HksBytecode
): { bundles: readonly ActivityBundleTag[]; namespaces: readonly string[] } {
  return {
    bundles: topLevelBundles(self, chunk),
    namespaces: namespacesOf(self, scriptName(chunk)),
  };
}

const ARCHETYPE_MEMBER_KINDS = new Set([
  "class_instance",
  "dynamic_array",
  "static_array",
]);

function declaresArchetype(
  self: EncounterHostContext,
  chunk: HksBytecode,
  member: string
): boolean {
  return (
    schemaOf(self, chunk)?.members.some(
      (entry) => entry.name === member && ARCHETYPE_MEMBER_KINDS.has(entry.kind)
    ) === true
  );
}

function sameRow(a: BoundRow | undefined, b: BoundRow): boolean {
  return (
    a !== undefined &&
    a.bundle === b.bundle &&
    a.typeId === b.typeId &&
    a.typeIndex === b.typeIndex
  );
}

// The chunks start() builds as top-level instances, in load order.
function topLevelChunks(self: EncounterHostContext): HksBytecode[] {
  const children = new Set(self.options.childScripts?.values());
  return self.options.chunks.filter(
    (chunk) =>
      !children.has(chunk) || self.options.rootTags?.has(chunk.tagId) === true
  );
}

function archetypeOwner(
  self: EncounterHostContext,
  row: BoundRow,
  field: string
): HksBytecode | undefined {
  const member = field.replace(ROW_FAMILY_INDEX, "");
  const declares = (chunk: HksBytecode) => {
    if (!declaresArchetype(self, chunk, member)) {
      return false;
    }
    const scope = topLevelScope(self, chunk);
    return sameRow(
      resolveInstanceField(scope.bundles, "", field, scope.namespaces),
      row
    );
  };
  const chunks = topLevelChunks(self);
  return (
    chunks.find(
      (chunk) =>
        self.options.rowOwners?.get(chunk.tagId) === row.bundle &&
        declares(chunk)
    ) ?? chunks.find(declares)
  );
}

// Builds (or, for a shared archetype, finds) the child instance a slot or
// field naming a row with a child script runs.
function childInstance(
  self: EncounterHostContext,
  childChunk: HksBytecode,
  row: BoundRow | undefined,
  slot: string,
  prefix: string,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[],
  parent: HksBytecode | undefined
): LuaTable {
  const path = prefix ? `${prefix}.${slot}` : slot;
  const key =
    self.options.rowOwners !== undefined && row?.typeId === self.types.Encounter
      ? itemKey(row.bundle, row.typeIndex)
      : undefined;
  const shared = key === undefined ? undefined : self.sharedArchetypes.get(key);
  if (shared) {
    self.writer.note(`${path} is ${shared.owner}'s ${shared.path}`);
    return shared.table;
  }
  let scope = { bundles, namespaces, parent };
  let owner = parent;
  if (key !== undefined && row !== undefined && !prefix) {
    owner = archetypeOwner(self, row, slot) ?? parent;
    if (owner !== undefined && owner !== parent) {
      scope = { ...topLevelScope(self, owner), parent: owner };
    }
  }
  // An archetype another script owns (a shared one) hangs under that script,
  // so resetting this one's phase leaves it be.
  const home =
    owner !== undefined && owner !== parent
      ? self.instances.get(scriptName(owner))
      : undefined;
  // a nested prefab resolves its rows under its parent's path
  const child = self.ownership.scope(home ?? self.ownership.owner, () =>
    buildInstance(
      self,
      childChunk,
      path,
      undefined,
      scope.namespaces,
      childBundles(self, row, scope.bundles)
    )
  );
  const entry: SharedArchetype | undefined =
    key === undefined
      ? undefined
      : {
          owner: owner === undefined ? path : scriptName(owner),
          path,
          table: child.table,
        };
  if (key !== undefined && entry !== undefined) {
    self.sharedArchetypes.set(key, entry);
  }
  callImport(self, child.table);
  // The distinction the trace has to keep: this slot's methods now run the
  // child's own Lua, not the native fallback every other bound row hits.
  self.writer.note(
    `${path} runs child script ${child.declName} (${childChunk.tagId})` +
      (entry !== undefined && owner !== parent ? ` for ${entry.owner}` : "")
  );
  // A slot naming a real Encounter row is a live encounter and owns its
  // autostart threads, scoped as `<slot>.<thread>`.
  if (row?.typeId === self.types.Encounter) {
    startChildThreads(self, child, childChunk, slot, scope.parent);
  }
  return child.table;
}

// The archetype members a running root declares exist with it, as the
// engine builds an instance's class instances with the instance. A
// mission phase's are built as the phase starts (instantiateArchetypes).
export function instantiateDeclaredArchetypes(
  self: EncounterHostContext,
  built: readonly { chunk: HksBytecode; table: LuaTable }[]
): void {
  for (const { chunk, table } of built) {
    if (isDormantPhase(self, chunk) || !isTopLevelActor(self, chunk)) {
      continue;
    }
    instantiateArchetypes(self, chunk, table);
  }
}

// One instance's archetype members, built now: each naming an Encounter row
// runs its child script, startup threads and all.
export function instantiateArchetypes(
  self: EncounterHostContext,
  chunk: HksBytecode,
  table: LuaTable
): void {
  const scope = topLevelScope(self, chunk);
  for (const member of schemaOf(self, chunk)?.members ?? []) {
    if (!ARCHETYPE_MEMBER_KINDS.has(member.kind)) {
      continue;
    }
    const field =
      member.kind === "class_instance" ? member.name : `${member.name}[0]`;
    const row = resolveInstanceField(
      scope.bundles,
      "",
      field,
      scope.namespaces
    );
    if (
      row?.typeId === self.types.Encounter &&
      childChunkFor(self, row, field, self.options.childScripts)
    ) {
      table.get(member.name);
    }
  }
}

// The child an Encounter row runs: the row's own record class, then the class
// the declaring script gives the member, then the slot's by name. Two phases
// can name rows alike (phase_valley.sp_objective_goto, phase_catacombs's) with
// different archetypes, and the slot map keeps only the first.
function childChunkFor(
  self: EncounterHostContext,
  row: BoundRow | undefined,
  key: string,
  childScripts: ReadonlyMap<string, HksBytecode> | undefined,
  declaredChild?: HksBytecode
): HksBytecode | undefined {
  if (row === undefined) {
    return childScripts?.get(key);
  }
  if (row.typeId !== self.types.Encounter) {
    return;
  }
  const declared = self.options.bundles
    .find((tag) => tag.bundle === row.bundle)
    ?.rows.find(
      (candidate) =>
        candidate.typeId === self.types.Encounter &&
        candidate.typeIndex === row.typeIndex
    )?.childScript;
  const own =
    declared === undefined ? undefined : chunkByScriptName(self, declared);
  return own ?? declaredChild ?? childScripts?.get(key);
}

function chunkByScriptName(
  self: EncounterHostContext,
  name: string
): HksBytecode | undefined {
  if (!self.chunksByScriptName) {
    self.chunksByScriptName = new Map();
    for (const chunk of [
      ...self.options.chunks,
      ...(self.options.childScripts?.values() ?? []),
    ]) {
      const key = scriptName(chunk);
      if (!self.chunksByScriptName.has(key)) {
        self.chunksByScriptName.set(key, chunk);
      }
    }
  }
  return self.chunksByScriptName.get(name);
}

// A script class by its decl name: a schema's name, else the script's stem.
function chunkByClassName(
  self: EncounterHostContext,
  name: string
): HksBytecode | undefined {
  if (!self.chunksByClassName) {
    self.chunksByClassName = new Map();
    for (const chunk of [
      ...self.options.chunks,
      ...(self.options.childScripts?.values() ?? []),
    ]) {
      const key = schemaOf(self, chunk)?.name ?? scriptName(chunk);
      if (!self.chunksByClassName.has(key)) {
        self.chunksByClassName.set(key, chunk);
      }
    }
  }
  return self.chunksByClassName.get(name);
}

const ARRAY_ELEMENT_FIELD = /^(.+)\[\d+\]$/;
const ARRAY_ELEMENT_TYPE = /^(?:static|dynamic)_array<\s*([A-Za-z_]\w*)\s*[,>]/;

// The script class a member is declared with, as Bungie's instance tree
// embedded it: from the declaring script's schema, else the per-parent
// member-type map the package data gives (childScriptSchemaMap).
function declaredChildChunk(
  self: EncounterHostContext,
  parent: HksBytecode | undefined,
  field: string
): HksBytecode | undefined {
  if (parent === undefined) {
    return;
  }
  const schema = schemaOf(self, parent);
  if (schema !== undefined) {
    const member = schema.members.find((m) => m.name === field);
    if (member?.kind === "class_instance") {
      return chunkByClassName(self, member.type);
    }
    // An element of a list of a script class (`static_array<u_event_tank_drop,
    // 3> pf_event_tank_drop`, `dynamic_array<u_event_dropship_point> pf_point`)
    // is that class's instance, as a class_instance member is.
    const element = ARRAY_ELEMENT_FIELD.exec(field);
    const list =
      element === null
        ? undefined
        : schema.members.find((m) => m.name === element[1]);
    const type =
      list?.kind === "static_array" || list?.kind === "dynamic_array"
        ? ARRAY_ELEMENT_TYPE.exec(list.type)?.[1]
        : undefined;
    return type === undefined ? undefined : chunkByClassName(self, type);
  }
  const tag =
    self.options.childScriptSchemaMap?.[parent.tagId.toUpperCase()]?.[field];
  return tag === undefined ? undefined : chunkByTagId(self, tag);
}

// A handle reaches another bundle's encounter, which the activity lookup
// fills by the encounter's name (child_bundles, fnv1 of its file stem). A
// declared member that is not a handle never is one.
function encounterHandle(
  self: EncounterHostContext,
  parent: HksBytecode | undefined,
  field: string
): LuaTable | undefined {
  const member =
    parent === undefined
      ? undefined
      : schemaOf(self, parent)?.members.find((m) => m.name === field);
  if (member !== undefined && member.kind !== "handle") {
    return;
  }
  const encounter = chunkByScriptName(self, field);
  return encounter && isEncounterScript(encounter)
    ? self.instances.get(field)
    : undefined;
}

// An encounter's script: a .es file, one bundle's root.
function isEncounterScript(chunk: HksBytecode): boolean {
  return chunk.root.source?.toLowerCase().endsWith(".es") === true;
}

// Class-chain ancestors are named by tag id, not script name.
function chunkByTagId(
  self: EncounterHostContext,
  tagId: string
): HksBytecode | undefined {
  if (!self.chunksByTagId) {
    self.chunksByTagId = new Map();
    for (const chunk of [
      ...self.options.chunks,
      ...(self.options.childScripts?.values() ?? []),
    ]) {
      self.chunksByTagId.set(chunk.tagId.toUpperCase(), chunk);
    }
  }
  return self.chunksByTagId.get(tagId.toUpperCase());
}

// A chunk's `instance` methods, off its compiled module table -
// buildInstance's own chunk, or (classChainMap) one of its ancestors.
function chunkMethods(self: EncounterHostContext, chunk: HksBytecode): LuaTable {
  const module = runMainChunk(self.vm, chunk);
  applyUpvalueProvider(self.vm, module);
  if (!(module instanceof LuaTable)) {
    throw new LuaRuntimeError(
      `${chunk.tagId} main chunk returned no module table`
    );
  }
  const methods = module.get("instance");
  if (!(methods instanceof LuaTable)) {
    throw new LuaRuntimeError(`${chunk.tagId} module has no instance table`);
  }
  return methods;
}

function importSlot(
  self: EncounterHostContext,
  prefix: string,
  slot: string,
  childScripts: ReadonlyMap<string, HksBytecode> | undefined,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[],
  parent?: HksBytecode
): LuaValue {
  const path = prefix ? `${prefix}.${slot}` : slot;
  const row = resolveInstanceField(bundles, prefix, slot, namespaces);
  // childScripts is keyed by parent chunk and slot name, so a listed slot runs
  // its child whether or not its row resolves in the bundle being served.
  const declared = declaredChildChunk(self, parent, slot);
  const childChunk = childChunkFor(
    self,
    row,
    slot,
    childScripts,
    declared && !isPhaseChunk(declared) ? declared : undefined
  );
  if (childChunk) {
    return childInstance(
      self,
      childChunk,
      row,
      slot,
      prefix,
      namespaces,
      bundles,
      parent
    );
  }
  // An activity flag is on the players, never a row, whatever binds it.
  if (row === undefined && ACTIVITY_FLAG_FIELD.test(slot)) {
    self.writer.note(`${path} is an activity flag (on the players, no row)`);
    return registerBoundObject(bound(self, path, undefined));
  }
  const boundSlot = bound(self, path, row);
  self.importSlots.push(boundSlot);
  return registerBoundObject(boundSlot);
}

function arrayImportSlot(
  self: EncounterHostContext,
  prefix: string,
  slot: string,
  childScripts: ReadonlyMap<string, HksBytecode> | undefined,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[],
  parent?: HksBytecode
): LuaTable {
  // An element binds when it is first read, for the instance that holds it.
  const owner = self.ownership.owner;
  return new LazyArrayTable(
    (index) =>
      self.ownership.scope(owner, () =>
        importSlot(
          self,
          prefix,
          `${slot}[${index}]`,
          childScripts,
          namespaces,
          bundles,
          parent
        )
      ),
    (index) =>
      resolveInstanceField(bundles, prefix, `${slot}[${index}]`, namespaces) !==
        undefined || childScripts?.has(`${slot}[${index}]`) === true
  );
}

export function arrayImportSlotLength(table: LuaTable): number | undefined {
  return table instanceof LazyArrayTable ? table.importCount() : undefined;
}

// `scope` is the child slot path for a child instance, and the script's own
// declared name for a top-level one.
export function threadHandle(
  self: EncounterHostContext,
  instance: LuaTable,
  scope: string,
  name: string
): LuaHostObject {
  const prefix = scope;
  const scoped = prefix ? `${prefix}.${name}` : name;
  // A mission script waking a bubble's thread wants it now, loaded or not: venus_chapter_2 mission 1
  // wakes ch2m1_objective (44FB7AA2), which places the captain then waits on his alive_count(); held for the
  // bubble, the unplaced squad's 0 passed main's gate. Rows written early wait for their slice.
  const releaseForWaker = (script: LuaScriptThread | undefined) => {
    const waker = self.scheduler.current;
    if (
      script !== undefined &&
      waker !== undefined &&
      schedulingThreads.threadBundle(self, waker) === undefined
    ) {
      self.scriptStarted.add(script);
    }
  };
  // Semantics are the xex's thread natives, except restart, whose client
  // body is a stub: host-only, kill then run from the top.
  return new LuaHostObject(scoped, ({ method }) => {
    const state = schedulingThreads.threadState(self, instance, scoped);
    if (method === "restart" || method === "start") {
      releaseForWaker(
        schedulingThreads.restartThread(self, instance, prefix, name)
      );
      return [true];
    }
    // wake (sub_835CCB08): a finished thread stays finished; a waiting one
    // drops its wait and resumes now, where it slept; one never started starts.
    if (method === "wake") {
      if (state === "finished") {
        self.writer.note(`${scoped}:wake() has finished, cannot be woken`);
        return [true];
      }
      if (state === "running") {
        for (const script of schedulingThreads.threadsOf(
          self,
          instance,
          scoped
        )) {
          self.scheduler.wake(script);
          releaseForWaker(script);
        }
        self.writer.note(`woke thread ${scoped}`);
        return [true];
      }
      releaseForWaker(
        schedulingThreads.restartThread(self, instance, prefix, name)
      );
      return [true];
    }
    // kill (sub_835CCDC8): only a running thread has anything to kill.
    if (method === "kill" || method === "stop") {
      if (state === "unstarted") {
        self.writer.note(
          `${scoped}:kill() tried to kill thread before it was started`
        );
      } else if (state === "finished") {
        self.writer.note(`${scoped}:kill() already finished`);
      } else {
        schedulingThreads.killThread(self, instance, scoped);
      }
      return [true];
    }
    // is_running = started && !finished; is_done is u_event_world_controller's
    // name for is_finished.
    if (method === "is_done" || method === "is_finished") {
      return [state === "finished"];
    }
    if (method === "is_running") {
      return [state === "running"];
    }
    // u_event_countdown parks sc_ghost_scan_start in its cleanup: the thread
    // waits on nothing until a restart replaces it.
    if (method === "sleep_forever") {
      const threads = schedulingThreads.threadsOf(self, instance, scoped);
      for (const script of threads) {
        script.gate = gateUntilPredicate("sleep_forever", () => false);
      }
      self.writer.note(
        `${scoped}:sleep_forever() (${threads.length} thread(s) parked)`
      );
      return [true];
    }
    const answer = unboundAnswer(method);
    self.writer.note(
      `${scoped}:${method}() ${unboundLabel(answer, "unbound thread verb")}`
    );
    return [answer];
  });
}

// The numeric-hash path: `option` is a real FNV-1 name hash.
function activityOptionByHash(
  self: EncounterHostContext,
  option: LuaValue
): boolean | number | readonly number[] | undefined {
  return typeof option === "number"
    ? self.options.activityOptions?.byHash?.[option]
    : undefined;
}

// Instance-level natives: methods a script calls on itself rather than on
// a row. They answer from the activity's options rather than the wire.
function instanceNative(
  self: EncounterHostContext,
  field: string
): LuaValue | undefined {
  // `self:insertion_point()` - a native the script does not define, most likely
  // the respawn checkpoint (true name/semantics unknown).
  if (field === "insertion_point") {
    return new LuaHostFunction(field, () => {
      self.writer.note("insertion_point() (checkpoint, host no-op)");
      return [];
    });
  }
  if (field === "get_activity_option_integer_array") {
    return new LuaHostFunction(field, (args) => {
      // `option` is an inert bound object named by the script's field, or a plain
      // number (the option's FNV-1 name hash) - see activityOptionByHash.
      const bound = boundObjectOf(args[1]);
      const index = typeof args[2] === "number" ? args[2] : 0;
      if (bound) {
        // 0 is the harness's own "nothing here" entry, and the right answer for
        // an option we do not serve: the script skips that slot.
        const value =
          self.options.activityOptions?.integerArrays[bound.path]?.[index] ?? 0;
        self.writer.note(
          `${bound.path}[${index}] -> ${value} (activity option)`
        );
        return [value];
      }
      const hash = activityOptionByHash(self, args[1]);
      const values = Array.isArray(hash) ? hash : undefined;
      const value = values?.[index] ?? 0;
      self.writer.note(
        `${show(args[1])}[${index}] -> ${value} (activity option)`
      );
      return [value];
    });
  }
  // Same family as the array form above. pvp_* game-mode libraries reach
  // it through get_outer() instead (below).
  if (field === "get_activity_option_integer") {
    return new LuaHostFunction(field, (args) => {
      const bound = boundObjectOf(args[1]);
      if (bound) {
        const value = self.options.activityOptions?.integers?.[bound.path] ?? 0;
        self.writer.note(`${bound.path} -> ${value} (activity option)`);
        return [value];
      }
      const raw = activityOptionByHash(self, args[1]);
      const value = typeof raw === "number" ? raw : Number(raw ?? 0);
      self.writer.note(`${show(args[1])} -> ${value} (activity option)`);
      return [value];
    });
  }
  if (field === "get_activity_option_string_hash") {
    return new LuaHostFunction(field, (args) => {
      const bound = boundObjectOf(args[1]);
      if (bound) {
        const value =
          self.options.activityOptions?.stringHashes?.[bound.path] ?? "";
        self.writer.note(`${bound.path} -> "${value}" (activity option)`);
        return [value];
      }
      // A string_hash option's value is fnv1 of the string, so it compares against
      // `self.<field>_hash` scalars without decoding text.
      const raw = activityOptionByHash(self, args[1]);
      const value = typeof raw === "number" ? raw : 0;
      self.writer.note(`${show(args[1])} -> ${value} (activity option)`);
      return [value];
    });
  }
  if (field === "set_activity_complete") {
    return new LuaHostFunction(field, () => {
      self.writer.note("set_activity_complete()");
      self.options.onActivityComplete?.();
      return [];
    });
  }
  // get_outer(): the pvp game-mode instances are Link-B children of the
  // activity's root script, so the root is the answer.
  if (field === "get_outer") {
    return new LuaHostFunction(field, () => {
      const outer = self.rootInstance;
      if (outer) {
        self.writer.note("get_outer() -> activity root");
        return [outer];
      }
      // No root built: an inert handle, so the chained get_activity_option_* logs
      // instead of throwing.
      self.writer.note("get_outer() (no root built, inert handle)");
      return [
        new LuaHostObject("get_outer()", (invocation) => {
          const answer = unboundAnswer(invocation.method);
          self.writer.note(
            `get_outer():${invocation.method}(${showArgs(invocation.args)}) ${unboundLabel(answer)}`
          );
          return [answer];
        }),
      ];
    });
  }
  return;
}

function resolveField(
  self: EncounterHostContext,
  prefix: string,
  field: string,
  namespaces: readonly string[],
  childScripts: ReadonlyMap<string, HksBytecode> | undefined,
  bundles: readonly ActivityBundleTag[] = self.options.bundles,
  parent?: HksBytecode
): LuaValue | undefined {
  // Every instance has its own command-script builder; no chunk assigns
  // it (command_script.ts).
  if (field === COMMAND_SCRIPT_BUILDER_FIELD) {
    return new CommandScriptBuilder(
      self.types,
      prefix ? `${prefix}.${field}` : field,
      (value) => boundObjectOf(value)?.row,
      (row) => controlPointAtoms(self.types, self.commandScripts, row),
      (line) => self.writer.note(line)
    ).object;
  }
  // The native base's methods, on every instance: an embedded class (a pvp
  // game type in its controller's root) reaches get_outer() too.
  const native = instanceNative(self, field);
  if (native !== undefined) {
    return native;
  }
  // A handle: `self.enc_entrance_ch2m1` is that encounter's own instance,
  // whose threads mission 1 wakes.
  const handle = prefix ? undefined : encounterHandle(self, parent, field);
  if (handle) {
    return handle;
  }
  // A phase the root declares is the activity's instance of that mission.
  const declared = declaredChildChunk(self, parent, field);
  if (declared && isPhaseChunk(declared)) {
    const phase = self.instances.get(scriptName(declared));
    if (phase) {
      return phase;
    }
  }
  const path = prefix ? `${prefix}.${field}` : field;
  const row = resolveInstanceField(bundles, prefix, field, namespaces);
  // A bare field naming an Encounter row with a known child runs that child, as
  // importSlot does: directors rarely import_only_bind the encounters they run.
  // A member declared with a script class embeds that class, row or not; an
  // Encounter row's own record class says which first.
  const embedded = declared && !isPhaseChunk(declared) ? declared : undefined;
  const childChunk =
    row === undefined
      ? (embedded ?? childChunkFor(self, row, field, childScripts))
      : (childChunkFor(self, row, field, childScripts, embedded) ?? embedded);
  if (childChunk) {
    return childInstance(
      self,
      childChunk,
      row,
      field,
      prefix,
      namespaces,
      bundles,
      parent
    );
  }
  if (!row) {
    // An unset reference reads nil (`if _objective_reference:`).
    if (
      parent &&
      schemaOf(self, parent)?.members.some(
        (member) => member.name === field && member.kind === "typed_pointer"
      )
    ) {
      return;
    }
    // A row family named "<field>[0]", "<field>[1]", ... - the shape
    // u_event_world_controller.esu's start_N family and its children index.
    const array = resolveArrayField(
      self,
      prefix,
      field,
      namespaces,
      childScripts,
      bundles,
      parent
    );
    if (array) {
      return array;
    }
    const devices = resolveDeviceArray(
      self,
      prefix,
      field,
      namespaces,
      bundles
    );
    if (devices) {
      return devices;
    }
    // A field the script only indexes is a table it owns: hand it an empty one.
    if (!(self.handles.has(field) || row) && self.tableFields.has(field)) {
      return new LuaTable();
    }
    if (INCIDENT_LISTENER_FIELD.test(field)) {
      self.writer.note(`${path} is an incident listener (host-side, no row)`);
      return registerBoundObject(bound(self, path, undefined));
    }
    if (ACTIVITY_FLAG_FIELD.test(field)) {
      self.writer.note(`${path} is an activity flag (on the players, no row)`);
      return registerBoundObject(bound(self, path, undefined));
    }
    noteUnresolved(self, path, self.handles.has(field));
    // A field the script calls methods on has to answer even when no row backs
    // it - some content is entirely unauthored and has to degrade, not throw.
    if (!self.handles.has(field)) {
      return;
    }
    self.writer.note(`${path} is not a row - inert handle`);
  }
  return registerBoundObject(bound(self, path, row));
}

// The squads a carrier drops, known before any bubble is applied.
export function markCarrierCargo(self: EncounterHostContext): void {
  for (const [slot, chunk] of self.options.childScripts ?? []) {
    const dropsSquads = [...fieldMethodCalls(chunk).values()].some((methods) =>
      methods.has("drop_squad")
    );
    if (!dropsSquads) {
      continue;
    }
    const names = new Set([
      ...chunkStringConstants(chunk),
      ...importSlotNames(chunk),
    ]);
    for (const tag of self.options.bundles) {
      for (const name of names) {
        for (let i = -1; i < CHILD_SQUAD_FAMILY_PROBE; i++) {
          const field = i < 0 ? name : `${name}[${i}]`;
          const row = resolveInstanceField([tag], slot, field);
          if (row?.typeId !== self.types.Squad) {
            if (i >= 0) {
              break;
            }
            continue;
          }
          if (squadOwnsActor(self.types, tag, row.typeIndex)) {
            continue;
          }
          self.writer.squad(row, { carried: true }, true);
          if (
            self.itemState.bodiesFor(row.bundle, row.typeIndex) === undefined
          ) {
            self.writer.reserve(row);
          }
        }
      }
    }
  }
}

// A child encounter's squads are its script's to place, drop or leave empty -
// never the default roster's.
function reserveChildSquads(
  self: EncounterHostContext,
  chunk: HksBytecode,
  prefix: string,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[]
): void {
  const names = new Set([
    ...chunkStringConstants(chunk),
    ...importSlotNames(chunk),
  ]);
  const calls = fieldMethodCalls(chunk);
  for (const name of names) {
    const methods = calls.get(name);
    const onlyRead =
      methods !== undefined &&
      ![...methods].some((method) => SQUAD_PLACING_METHODS.has(method));
    for (let i = -1; i < CHILD_SQUAD_FAMILY_PROBE; i++) {
      const field = i < 0 ? name : `${name}[${i}]`;
      if (i < 0 && onlyRead) {
        continue;
      }
      const row = resolveInstanceField(bundles, prefix, field, namespaces);
      if (row?.typeId !== self.types.Squad) {
        if (i >= 0) {
          break;
        }
        continue;
      }
      if (self.itemState.bodiesFor(row.bundle, row.typeIndex) === undefined) {
        self.writer.squad(row, { bodies: 0 });
      }
    }
  }
}

// Squads that start placed stand their named members from the first apply, as
// a script's place() does, so their cells go out at the authored 0 (B63AFDA3).
// A squad starts placed when the package's default says so, or a script marks
// it @placed (the squad host's +0x54 flag, the warp gates').
export function placeStartingMembers(self: EncounterHostContext): void {
  const seen = new Set<number>();
  for (const tag of self.options.bundles) {
    if (seen.has(tag.bundle)) {
      continue;
    }
    seen.add(tag.bundle);
    for (const entry of tag.rows) {
      if (entry.typeId !== self.types.Encounter || entry.name === undefined) {
        continue;
      }
      const encounter: BoundRow = {
        bundle: tag.bundle,
        name: entry.name,
        typeId: entry.typeId,
        typeIndex: entry.typeIndex,
      };
      const chunk = childChunkFor(
        self,
        encounter,
        entry.name.split(".").at(-1) ?? entry.name,
        self.options.childScripts
      );
      if (chunk === undefined) {
        continue;
      }
      const marked = new Set(
        (schemaOf(self, chunk)?.members ?? [])
          .filter((member) => member.placed === true)
          .map((member) => member.name)
      );
      const fields = new Map(fieldMethodCalls(chunk));
      for (const field of marked) {
        fields.set(field, fields.get(field) ?? new Set());
      }
      for (const [field, methods] of fields) {
        if ([...methods].some((method) => SQUAD_PLACING_METHODS.has(method))) {
          continue;
        }
        const row = bundleRowByName([tag], `${entry.name}.${field}`);
        if (row?.typeId === self.types.Squad && marked.has(field)) {
          self.startsPlaced.add(itemKey(row.bundle, row.typeIndex));
        }
        if (
          row?.typeId !== self.types.Squad ||
          self.itemState.bodiesFor(row.bundle, row.typeIndex) !== undefined ||
          self.itemState.squad(row).carried ||
          self.defaultBodies(row.bundle, row.typeIndex) === 0
        ) {
          continue;
        }
        squadNatives.pushActors(
          self.context,
          self.writer,
          squadNamedMemberRows(self.types, self.options.bundles, row),
          { placed: true },
          `placed with ${row.name} (table)`
        );
      }
    }
  }
}

// A root script's own bundle first, then the rest.
export function bundlesFirst(
  self: EncounterHostContext,
  owner: number | undefined
): readonly ActivityBundleTag[] {
  const own = self.options.bundles.filter((tag) => tag.bundle === owner);
  if (owner === undefined || own.length === 0) {
    return self.options.bundles;
  }
  const scope = [
    ...own,
    ...self.options.bundles.filter((tag) => tag.bundle !== owner),
  ];
  self.scopeOwner.set(scope, owner);
  return scope;
}

// A child encounter's rows are in the bundle its own Encounter row is in, and
// nowhere else.
function childBundles(
  self: EncounterHostContext,
  row: BoundRow | undefined,
  bundles: readonly ActivityBundleTag[]
): readonly ActivityBundleTag[] {
  if (row === undefined) {
    return bundles;
  }
  const own = bundles.filter((tag) => tag.bundle === row.bundle);
  if (own.length === 0) {
    return bundles;
  }
  // A child belongs to whatever its parent belongs to.
  const owner = self.scopeOwner.get(bundles);
  if (owner !== undefined) {
    self.scopeOwner.set(own, owner);
  }
  return own;
}

// Probes `<field>[0]`, `<field>[1]`, ... for a row or child chunk before
// building anything, so a past-the-end probe never logs a false "not a row".
export function resolveArrayField(
  self: EncounterHostContext,
  prefix: string,
  field: string,
  namespaces: readonly string[],
  childScripts: ReadonlyMap<string, HksBytecode> | undefined,
  bundles: readonly ActivityBundleTag[],
  parent?: HksBytecode
): LuaTable | undefined {
  const exists = (index: number) =>
    resolveInstanceField(bundles, prefix, `${field}[${index}]`, namespaces) !==
      undefined || childScripts?.has(`${field}[${index}]`) === true;
  if (!exists(0)) {
    return;
  }
  const table = new LuaTable();
  for (let i = 0; exists(i); i++) {
    table.set(
      i,
      resolveField(
        self,
        prefix,
        `${field}[${i}]`,
        namespaces,
        childScripts,
        bundles,
        parent
      )
    );
  }
  return table;
}

// `dev_<name>[i]` is the device component of `o_<name>[i]`, not a row.
function resolveDeviceArray(
  self: EncounterHostContext,
  prefix: string,
  field: string,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[]
): LuaTable | undefined {
  if (!field.startsWith("dev_")) {
    return;
  }
  const objectField = `o_${field.slice("dev_".length)}`;
  const objectRow = (index: number) =>
    resolveInstanceField(
      bundles,
      prefix,
      `${objectField}[${index}]`,
      namespaces
    );
  if (objectRow(0) === undefined) {
    return;
  }
  const path = prefix ? `${prefix}.${field}` : field;
  const table = new LuaTable();
  for (let i = 0; ; i++) {
    const row = objectRow(i);
    if (!row) {
      break;
    }
    table.set(i, registerBoundObject(bound(self, `${path}[${i}]`, row)));
  }
  self.writer.note(`${path} -> the device on each ${objectField}[i]`);
  return table;
}

// Autostart threads of a child instance, under the field's own scope.
export function startChildThreads(
  self: EncounterHostContext,
  child: ReturnType<typeof buildInstance>,
  chunk: HksBytecode,
  prefix: string,
  parent?: HksBytecode
): void {
  self.options.onEncounterActivated?.(prefix);
  const schema = schemaOf(self, chunk);
  const autoStart =
    schema === undefined
      ? childThreadsByShape(self, child, chunk, prefix, parent)
      : schemaStartupThreads(schema);
  for (const name of autoStart) {
    try {
      schedulingThreads.restartThread(self, child.table, prefix, name);
    } catch (error) {
      self.writer.note(
        `thread ${name} of ${prefix} did not start: ` +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }
  if (autoStart.length > 0) {
    self.writer.note(`${prefix} threads [${autoStart.join(",")}]`);
  }
}

// A child's threads nothing drives, read off its chunk: the ones its own
// Lua never restarts or wakes, minus init when its parent starts it.
function childThreadsByShape(
  self: EncounterHostContext,
  child: ReturnType<typeof buildInstance>,
  chunk: HksBytecode,
  prefix: string,
  parent?: HksBytecode
): string[] {
  const driven = new Set<string>();
  for (const [field, methods] of fieldMethodCalls(chunk)) {
    if (methods.has("restart") || methods.has("wake")) {
      driven.add(field);
    }
  }
  if (parentStarts(self, parent, prefix)) {
    driven.add("init");
    self.writer.note(`${prefix}.init not started (its parent starts it)`);
  }
  return child.implNames
    .map((impl) => threadNameOf(impl))
    .filter((name): name is string => name !== undefined && !driven.has(name));
}

// Whether the owning script drives the child itself (activate(), or handing
// it to another script); its own init would otherwise be a second driver.
export function parentStarts(
  self: EncounterHostContext,
  parent: HksBytecode | undefined,
  field: string
): boolean {
  if (parent === undefined) {
    return false;
  }
  let shape = self.parentShapes.get(parent);
  if (!shape) {
    shape = {
      calls: fieldMethodCalls(parent),
      handoffs: fieldHandoffs(parent),
    };
    self.parentShapes.set(parent, shape);
  }
  if (shape.calls.get(field)?.has("activate")) {
    return true;
  }
  const family = field.replace(ROW_FAMILY_INDEX, "");
  for (const receiver of shape.handoffs.get(family) ?? []) {
    if (
      declaredChildChunk(self, parent, receiver) ??
      chunkByScriptName(self, receiver)
    ) {
      return true;
    }
  }
  return false;
}

export function noteUnresolved(
  self: EncounterHostContext,
  path: string,
  binding: boolean
): void {
  if (!self.unresolved.includes(path)) {
    self.unresolved.push(path);
  }
  if (binding && !self.unresolvedBindings.includes(path)) {
    self.unresolvedBindings.push(path);
  }
}

export function bound(
  self: EncounterHostContext,
  path: string,
  row: BoundRow | undefined
): BoundInstance {
  const object: BoundInstance = new BoundInstance(
    self.context,
    self.writer,
    path,
    row,
    {
      capturableDefinition: (row) =>
        self.options.capturableDefinition?.(row.bundle, row.typeIndex),
      commandScript: (row) =>
        controlPointAtoms(self.types, self.commandScripts, row),
      defaultBodies: (squad) =>
        self.defaultBodies(squad.bundle, squad.typeIndex),
      hasSequence: (row) => hasSequence(self, row),
      importIdentifier: (row) => rowImportIdent(self.options.bundles, row),
      namedMembers: (squad) =>
        squadNamedMemberRows(self.types, self.options.bundles, squad),
      navPointPosition: (row) =>
        navPointPosition(self.types, self.navPoints, row),
      objectiveTasks: (row) => objectiveTasksOf(self, row),
      objectPosition: (row) => objectPosition(self, row),
      owningSquad: (row) =>
        owningSquadRow(self.types, self.options.bundles, row),
      roster: (squad) =>
        squadRosterSize(
          self.types,
          self.options.bundles,
          squad,
          self.memberCounts.get(itemKey(squad.bundle, squad.typeIndex))
        ),
      resolveByIdentifier: (identifier) =>
        resolveInstanceField(self.options.bundles, "", identifier) ??
        objectForIdentifier(self, identifier),
      squadScopeOf: (row) => squadScopeOf(self, row),
      squadsForIdentifier: (identifier) =>
        squadsForIdentifier(self, identifier),
      squadSpawnPoint: (row) => squadSpawnPoint(self, row),
      sequenceDuration: (row) => sequenceDuration(self, row),
    },
    (ownerPath, field) =>
      self.ownership.scope(self.ownership.ownerOfObject(object), () =>
        member(self, ownerPath, field)
      )
  );
  self.ownership.noteObject(object);
  self.objects.push(object);
  const restarted = row && self.restartedRows.get(rowKey(row));
  if (restarted) {
    object.restart(restarted);
  }
  return object;
}

// The Object a placement's import identifier names (the Last Array's
// console, bound by "0x4CBCA57B"): the row whose importIdent it is.
function objectForIdentifier(
  self: EncounterHostContext,
  identifier: string
): BoundRow | undefined {
  const hash = parseHashLiteral(identifier) ?? fnv1(identifier);
  for (const tag of self.options.bundles) {
    const row = tag.rows.find(
      (entry) =>
        entry.importIdent === hash && entry.typeId === self.types.Object
    );
    if (row) {
      return {
        bundle: tag.bundle,
        name: identifier,
        typeId: row.typeId,
        typeIndex: row.typeIndex,
      };
    }
  }
}

// bind_squad_identifier's row as the Squad item keys get_count() sums: itself,
// or a SquadGroup's children (recursed). undefined for neither.
export function squadsForIdentifier(
  self: EncounterHostContext,
  identifier: string
): ReadonlySet<string> | undefined {
  const hash = parseHashLiteral(identifier) ?? fnv1(identifier);
  const scope = new Set<string>();
  for (const tag of self.options.bundles) {
    for (const row of tag.rows) {
      if (row.importIdent === hash && row.typeId === self.types.Squad) {
        scope.add(itemKey(tag.bundle, row.typeIndex));
      }
    }
  }
  return scope.size > 0 ? scope : undefined;
}

// nav_point_activate/nav_point_activate_with_fallback's item fallback for a
// Squad item: its own authored spawn point (80801603), the first one.
export function squadSpawnPoint(
  self: EncounterHostContext,
  row: BoundRow
): NavPoint | undefined {
  if (row.typeId !== self.types.Squad) {
    return;
  }
  const tagRow = self.options.bundles
    .find((tag) => tag.bundle === row.bundle)
    ?.rows.find(
      (r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex
    );
  return tagRow?.spawnPoints?.[0];
}

// The nav point fallback for an Object item: its baked placement
// (objectPosition, filled in by the caller's bundle reader).
export function objectPosition(
  self: EncounterHostContext,
  row: BoundRow
): NavPoint | undefined {
  if (row.typeId !== self.types.Object) {
    return;
  }
  const tagRow = self.options.bundles
    .find((tag) => tag.bundle === row.bundle)
    ?.rows.find(
      (r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex
    );
  return tagRow?.objectPosition;
}

// Sequence.is_done(): the definition's duration (+0x30). 0 is authored (a
// music bed driven by set_state) and returned as-is; hasSequence tells it from unread.
export function sequenceDuration(
  self: EncounterHostContext,
  row: BoundRow
): number | undefined {
  if (row.typeId !== self.types.Sequence) {
    return;
  }
  return self.options.bundles
    .find((tag) => tag.bundle === row.bundle)
    ?.rows.find((r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex)
    ?.sequenceDurationSeconds;
}

// Whether the definition carries a sequence blueprint (+0x3D); the archetype
// placeholder rows carry none and can never play.
export function hasSequence(
  self: EncounterHostContext,
  row: BoundRow
): boolean | undefined {
  if (row.typeId !== self.types.Sequence) {
    return;
  }
  return self.options.bundles
    .find((tag) => tag.bundle === row.bundle)
    ?.rows.find((r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex)
    ?.sequenceHasBlueprint;
}

export function squadScopeOf(
  self: EncounterHostContext,
  row: BoundRow
): ReadonlySet<string> | undefined {
  if (row.typeId === self.types.Squad) {
    return new Set([itemKey(row.bundle, row.typeIndex)]);
  }
  if (row.typeId !== self.types.SquadGroup) {
    return;
  }
  const owner = self.objects.find(
    (object) =>
      object.row?.bundle === row.bundle &&
      object.row.typeId === row.typeId &&
      object.row.typeIndex === row.typeIndex
  );
  if (!owner) {
    return;
  }
  const scope = new Set<string>();
  for (const child of owner.children) {
    if (!child.row) {
      continue;
    }
    for (const key of squadScopeOf(self, child.row) ?? []) {
      scope.add(key);
    }
  }
  return scope.size > 0 ? scope : undefined;
}

// The row's AI influencer assignment tree (808015F0).
function objectiveTasksOf(
  self: EncounterHostContext,
  row: BoundRow
): readonly ObjectiveTask[] | undefined {
  if (row.typeId !== self.types.Objective) {
    return;
  }
  return self.options.bundles
    .find((tag) => tag.bundle === row.bundle)
    ?.rows.find((r) => r.typeId === row.typeId && r.typeIndex === row.typeIndex)
    ?.tasks;
}

// Every self.<field> write, folded into the registries an Objective task's
// condition (+0x60) reads; per instance, so same-named fields never merge.
function noteScalarField(
  self: EncounterHostContext,
  instance: LuaTable,
  field: string,
  value: LuaValue
): void {
  const hash = fnv1(field);
  self.scalarFieldValues.set(hash, value);
  let own = self.instanceScalarFieldValues.get(instance);
  if (!own) {
    own = new Map();
    self.instanceScalarFieldValues.set(instance, own);
  }
  own.set(hash, value);
}

// The root script instance built for `bundle`: the encounter instance that
// owns an Objective (its 808004C5 host tag is that root's).
export function instanceForBundle(
  self: EncounterHostContext,
  bundle: number
): LuaTable | undefined {
  for (const instance of self.instances.values()) {
    if (self.instanceBundle.get(instance) === bundle) {
      return instance;
    }
  }
  return;
}

function memberFamily(
  self: EncounterHostContext,
  ownerPath: string,
  field: string
): LuaTable | undefined {
  const rowAt = (index: number) =>
    resolveInstanceField(self.options.bundles, ownerPath, `${field}[${index}]`);
  if (rowAt(0) === undefined) {
    return;
  }
  const table = new LuaTable();
  for (let i = 0, row = rowAt(0); row !== undefined; i++, row = rowAt(i)) {
    table.set(i, registerBoundObject(bound(self, `${ownerPath}.${field}[${i}]`, row)));
  }
  return table;
}

// A member read on a bound object that names a row of its own, rather than
// calling a method.
export function member(
  self: EncounterHostContext,
  ownerPath: string,
  field: string
): LuaValue {
  const path = `${ownerPath}.${field}`;
  const row = resolveInstanceField(self.options.bundles, ownerPath, field);
  if (!row) {
    // A row family under the object (a placement prefab's `_objects[0]`,
    // `_objects[1]`) is a list of its rows, as resolveArrayField builds one.
    const family = memberFamily(self, ownerPath, field);
    if (family) {
      return family;
    }
    // An unrecognized handle is a verb, not a row: method dispatch has it.
    if (!self.handles.has(field)) {
      return;
    }
    if (ACTIVITY_FLAG_FIELD.test(field)) {
      self.writer.note(`${path} is an activity flag (on the players, no row)`);
    } else {
      noteUnresolved(self, path, true);
      self.writer.note(`${path} is not a row - inert handle`);
    }
  }
  return registerBoundObject(bound(self, path, row));
}
