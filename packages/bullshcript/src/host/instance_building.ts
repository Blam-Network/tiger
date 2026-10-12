// Instance building: schema defaults, class chains, import and array import
// slots, and child scripts - the buildInstance() side of LuaEncounterHost,
// split out of encounter_host.ts.

import type { BsSchema } from "../bungiescript/schema.ts";
import { gateUntilPredicate, type LuaScriptThread } from "../hks/coroutines.ts";
import {
  applyUpvalueProvider,
  LuaHostObject,
  runMainChunk,
} from "../hks/host_env.ts";
import {
  arrayImportSlotNames,
  chunkStringConstants,
  fieldCallArguments,
  fieldHandoffs,
  fieldMethodCalls,
  importSlotNames,
  threadNameOf,
  threadNames,
} from "../hks/script_shape.ts";
import type { LuaChunk } from "../hks/types.ts";
import {
  LuaClosure,
  LuaHostFunction,
  LuaTable,
  type LuaValue,
} from "../hks/values.ts";
import { LuaRuntimeError } from "../hks/vm.ts";
import {
  type BoundRow,
  bundleRowByName,
  navPointPosition,
  owningSquadRow,
  resolveInstanceField,
  rowImportIdent,
  scriptNamespaces,
  squadNamedMemberRows,
  squadRosterSize,
} from "./bindings.ts";
import {
  COMMAND_SCRIPT_BUILDER_FIELD,
  controlPointAtoms,
  LuaCommandScriptBuilder,
} from "./command_script.ts";
import { chunkDeclName, type LuaEncounterHost } from "./encounter_host.ts";
import { itemKey } from "./item_key.ts";
import type { NavPoint } from "./items.ts";
import { fnv1 } from "./name_hash.ts";
import {
  boundObjectOf,
  LuaBoundObject,
  registerBoundObject,
  show,
  showArgs,
  unboundAnswer,
  unboundLabel,
} from "./natives.ts";
import * as schedulingThreads from "./scheduling_threads.ts";
import * as squadNatives from "./squad_natives.ts";
import type {
  ActivityBundleItemTypes,
  ActivityBundleTag,
  ObjectiveTask,
} from "./tag_types.ts";

const ENCOUNTER_DECL_PREFIX = "c_encounter__";

// Sibling scripts reached by a field name that is not their decl_name
// (`self.utils` is u_globals); without the alias their methods no-op.
const SIBLING_ALIASES: Readonly<Record<string, string>> = {
  event_controller: "u_event_world_controller",
  utils: "u_globals",
  pvp_controller: "c_pvp_controller",
  dominion: "c_pvp_dominion",
  salvage: "c_pvp_salvage",
  slayer: "c_pvp_slayer",
  slayer_ffa: "c_pvp_slayer_ffa",
};

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

// A mission phase script, run when its mission starts rather than when the
// activity's script graph loads.
function isPhaseScript(chunk: LuaChunk): boolean {
  return chunk.root.source?.toLowerCase().endsWith(".esp") === true;
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

class LuaScriptInstance extends LuaTable {
  private readonly resolve: (field: string) => LuaValue | undefined;
  // Every self.<field> = value a script instance ever runs, condition
  // gating's own feed (LuaEncounterHost.conditionTrue) - see onSet.
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
class LuaLazyArrayTable extends LuaTable {
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
// is live leave the client retrying "no spawn points or volumes".
export function reserveScriptPlacedSquads(
  self: LuaEncounterHost,
  built: readonly { chunk: LuaChunk; declName: string }[]
): void {
  for (const { chunk, declName } of built) {
    const namespaces = scriptNamespaces(declName);
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
      const row = resolveInstanceField(
        self.options.bundles,
        "",
        field,
        namespaces
      );
      if (row === undefined || row.typeId !== self.types.Squad) {
        continue;
      }
      self.writer.reserve(row);
    }
  }
}

export function isDormantPhase(
  self: LuaEncounterHost,
  chunk: LuaChunk
): boolean {
  const roots = self.options.rootTags;
  if (roots === undefined || roots.has(chunk.tagId.toUpperCase())) {
    return false;
  }
  return isPhaseScript(chunk);
}

// A chunk that is not a Link-A root is built at prefix "" for sibling and
// slot access, but its autostart threads must not share the root's namespace.
export function isTopLevelActor(
  self: LuaEncounterHost,
  chunk: LuaChunk
): boolean {
  const roots = self.options.rootTags;
  return roots === undefined || roots.has(chunk.tagId.toUpperCase());
}

// The compiled schema behind a chunk, when its source had one (TU0).
export function schemaOf(
  self: LuaEncounterHost,
  chunk: LuaChunk
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

// The schema's startup flags, else the threads no chunk names as a string.
export function startupThreads(
  self: LuaEncounterHost,
  chunk: LuaChunk,
  named: ReadonlySet<string>,
  implNames: readonly string[]
): string[] {
  const schema = schemaOf(self, chunk);
  return schema === undefined
    ? threadNames(named, implNames).autoStart
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

function scalarDefaultsFor(self: LuaEncounterHost, chunk: LuaChunk) {
  const tagId = chunk.tagId.toUpperCase();
  let defaults = self.scalarDefaultCache.get(tagId);
  if (defaults === undefined) {
    defaults = { ...self.options.scalarDefaults?.[tagId] };
    self.scalarDefaultCache.set(tagId, defaults);
  }
  return defaults;
}

export function callImport(self: LuaEncounterHost, instance: LuaTable): void {
  const method = instance.get("import");
  if (method instanceof LuaClosure) {
    self.vm.call(method, [instance]);
  }
}

export function buildInstance(
  self: LuaEncounterHost,
  chunk: LuaChunk,
  prefix: string,
  childScripts: ReadonlyMap<string, LuaChunk> | undefined,
  inherited: readonly string[] = [],
  // The tables this instance resolves its rows against, in order - see
  // bundlesFirst and childBundles.
  bundles: readonly ActivityBundleTag[] = self.options.bundles
): { declName: string; implNames: string[]; table: LuaTable } {
  const { module, methods } = chunkModule(self, chunk);
  const declared = module.get("decl_name");
  // `c_encounter__enc_entrance_ch2m1` is the encounter named
  // `enc_entrance_ch2m1`; that is the name other chunks reach it by.
  const declName =
    typeof declared === "string"
      ? declared.replace(ENCOUNTER_DECL_PREFIX, "")
      : chunk.tagId;
  const namespaces = [
    ...new Set([...scriptNamespaces(declName), ...inherited]),
  ];
  const implNames: string[] = [];
  const table = new LuaScriptInstance(
    (field) =>
      resolveField(
        self,
        prefix,
        field,
        namespaces,
        childScripts,
        bundles,
        chunk
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
    for (const [key, value] of chunkModule(self, ancestor).methods.entries()) {
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
  // Scalar fields as the schema's fast-init data authored them, overridable by
  // options.scalarDefaults; an unset scalar read via arithmetic throws on nil.
  const schema = schemaOf(self, chunk);
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
  return { declName, implNames, table };
}

function childChunkFor(
  self: LuaEncounterHost,
  row: BoundRow | undefined,
  key: string,
  childScripts: ReadonlyMap<string, LuaChunk> | undefined
): LuaChunk | undefined {
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
    declared === undefined ? undefined : chunkByDeclName(self, declared);
  return own ?? childScripts?.get(key);
}

function chunkByDeclName(
  self: LuaEncounterHost,
  declName: string
): LuaChunk | undefined {
  if (!self.chunksByDeclName) {
    self.chunksByDeclName = new Map();
    for (const chunk of [
      ...self.options.chunks,
      ...(self.options.childScripts?.values() ?? []),
    ]) {
      const name = chunkDeclName(chunk);
      if (name !== undefined && !self.chunksByDeclName.has(name)) {
        self.chunksByDeclName.set(name, chunk);
      }
    }
  }
  return self.chunksByDeclName.get(declName);
}

// Class-chain ancestors are named by tag id, not decl_name.
function chunkByTagId(
  self: LuaEncounterHost,
  tagId: string
): LuaChunk | undefined {
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

// A chunk's own compiled module table and its `instance` methods -
// buildInstance's own chunk, or (classChainMap) one of its ancestors.
function chunkModule(
  self: LuaEncounterHost,
  chunk: LuaChunk
): {
  module: LuaTable;
  methods: LuaTable;
} {
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
  return { module, methods };
}

function importSlot(
  self: LuaEncounterHost,
  prefix: string,
  slot: string,
  childScripts: ReadonlyMap<string, LuaChunk> | undefined,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[],
  parent?: LuaChunk
): LuaValue {
  const path = prefix ? `${prefix}.${slot}` : slot;
  const row = resolveInstanceField(bundles, prefix, slot, namespaces);
  // childScripts is keyed by parent chunk and slot name, so a listed slot runs
  // its child whether or not its row resolves in the bundle being served.
  const childChunk = childChunkFor(self, row, slot, childScripts);
  if (childChunk) {
    // a nested prefab resolves its rows under its parent's path
    const child = buildInstance(
      self,
      childChunk,
      path,
      undefined,
      namespaces,
      childBundles(self, row, bundles)
    );
    callImport(self, child.table);
    // The distinction the trace has to keep: this slot's methods now run the
    // child's own Lua, not the native fallback every other bound row hits.
    self.writer.note(
      `${path} runs child script ${child.declName} (${childChunk.tagId})`
    );
    // A slot naming a real Encounter row is a live encounter and owns its
    // autostart threads.
    if (row?.typeId === self.types.Encounter) {
      startChildThreads(self, child, childChunk, slot, parent);
    }
    return child.table;
  }
  const boundSlot = bound(self, path, row);
  self.importSlots.push(boundSlot);
  return registerBoundObject(boundSlot);
}

function arrayImportSlot(
  self: LuaEncounterHost,
  prefix: string,
  slot: string,
  childScripts: ReadonlyMap<string, LuaChunk> | undefined,
  namespaces: readonly string[],
  bundles: readonly ActivityBundleTag[],
  parent?: LuaChunk
): LuaTable {
  return new LuaLazyArrayTable(
    (index) =>
      importSlot(
        self,
        prefix,
        `${slot}[${index}]`,
        childScripts,
        namespaces,
        bundles,
        parent
      ),
    (index) =>
      resolveInstanceField(bundles, prefix, `${slot}[${index}]`, namespaces) !==
        undefined || childScripts?.has(`${slot}[${index}]`) === true
  );
}

export function arrayImportSlotLength(table: LuaTable): number | undefined {
  return table instanceof LuaLazyArrayTable ? table.importCount() : undefined;
}

// `scope` is the child slot path for a child instance, and the script's own
// declared name for a top-level one.
export function threadHandle(
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
  option: LuaValue
): boolean | number | readonly number[] | undefined {
  return typeof option === "number"
    ? self.options.activityOptions?.byHash?.[option]
    : undefined;
}

// Instance-level natives: methods a script calls on itself rather than on
// a row. They answer from the activity's options rather than the wire.
function instanceNative(
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
  prefix: string,
  field: string,
  namespaces: readonly string[],
  childScripts: ReadonlyMap<string, LuaChunk> | undefined,
  bundles: readonly ActivityBundleTag[] = self.options.bundles,
  parent?: LuaChunk
): LuaValue | undefined {
  // Every instance has its own command-script builder; no chunk assigns
  // it (command_script.ts).
  if (field === COMMAND_SCRIPT_BUILDER_FIELD) {
    return new LuaCommandScriptBuilder(
      self.types,
      prefix ? `${prefix}.${field}` : field,
      (value) => boundObjectOf(value)?.row,
      (row) => controlPointAtoms(self.types, self.commandScripts, row),
      (line) => self.writer.note(line)
    ).object;
  }
  if (!prefix) {
    const native = instanceNative(self, field);
    if (native !== undefined) {
      return native;
    }
  }
  // A sibling script first: `self.enc_entrance_ch2m1` is the encounter chunk's
  // own instance, whose threads mission 1 wakes.
  const sibling = prefix
    ? undefined
    : self.instances.get(SIBLING_ALIASES[field] ?? field);
  if (sibling) {
    return sibling;
  }
  const path = prefix ? `${prefix}.${field}` : field;
  const row = resolveInstanceField(bundles, prefix, field, namespaces);
  // A bare field naming an Encounter row with a known child runs that child, as
  // importSlot does: directors rarely import_only_bind the encounters they run.
  const childChunk = childChunkFor(self, row, field, childScripts);
  if (childChunk) {
    const child = buildInstance(
      self,
      childChunk,
      path,
      undefined,
      namespaces,
      childBundles(self, row, bundles)
    );
    callImport(self, child.table);
    self.writer.note(
      `${path} runs child script ${child.declName} (${childChunk.tagId})`
    );
    // A field naming a real Encounter row owns its autostart threads, scoped as
    // `<field>.<thread>` so they never share the top-level namespace.
    if (row?.typeId === self.types.Encounter) {
      startChildThreads(self, child, childChunk, field, parent);
    }
    return child.table;
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
export function markCarrierCargo(self: LuaEncounterHost): void {
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
  self: LuaEncounterHost,
  chunk: LuaChunk,
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

// Squads left to the table stand their named members from the first apply, as
// a script's place() does, so their cells go out at the authored 0 (B63AFDA3).
export function placeTableNamedMembers(self: LuaEncounterHost): void {
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
      for (const [field, methods] of fieldMethodCalls(chunk)) {
        if ([...methods].some((method) => SQUAD_PLACING_METHODS.has(method))) {
          continue;
        }
        const row = bundleRowByName([tag], `${entry.name}.${field}`);
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
  prefix: string,
  field: string,
  namespaces: readonly string[],
  childScripts: ReadonlyMap<string, LuaChunk> | undefined,
  bundles: readonly ActivityBundleTag[],
  parent?: LuaChunk
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
  child: ReturnType<typeof buildInstance>,
  chunk: LuaChunk,
  prefix: string,
  parent?: LuaChunk
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
  self: LuaEncounterHost,
  child: ReturnType<typeof buildInstance>,
  chunk: LuaChunk,
  prefix: string,
  parent?: LuaChunk
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
  self: LuaEncounterHost,
  parent: LuaChunk | undefined,
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
    if (chunkByDeclName(self, SIBLING_ALIASES[receiver] ?? receiver)) {
      return true;
    }
  }
  return false;
}

export function noteUnresolved(
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
  path: string,
  row: BoundRow | undefined
): LuaBoundObject {
  const object = new LuaBoundObject(
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
        squadRosterSize(self.types, self.options.bundles, squad),
      resolveByIdentifier: (identifier) =>
        resolveInstanceField(self.options.bundles, "", identifier),
      squadScopeOf: (row) => squadScopeOf(self, row),
      squadsForIdentifier: (identifier) =>
        squadsForIdentifier(self, identifier),
      squadSpawnPoint: (row) => squadSpawnPoint(self, row),
      sequenceDuration: (row) => sequenceDuration(self, row),
    },
    (ownerPath, field) => member(self, ownerPath, field)
  );
  self.objects.push(object);
  return object;
}

// bind_squad_identifier's row as the Squad item keys get_count() sums: itself,
// or a SquadGroup's children (recursed). undefined for neither.
export function squadsForIdentifier(
  self: LuaEncounterHost,
  identifier: string
): ReadonlySet<string> | undefined {
  const hash = fnv1(identifier);
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
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
  self: LuaEncounterHost,
  bundle: number
): LuaTable | undefined {
  for (const instance of self.instances.values()) {
    if (self.instanceBundle.get(instance) === bundle) {
      return instance;
    }
  }
  return;
}

// A member read on a bound object that names a row of its own, rather than
// calling a method.
export function member(
  self: LuaEncounterHost,
  ownerPath: string,
  field: string
): LuaValue {
  const path = `${ownerPath}.${field}`;
  const row = resolveInstanceField(self.options.bundles, ownerPath, field);
  if (!row) {
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
