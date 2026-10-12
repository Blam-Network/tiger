// Incident listeners (il_*/eil_*/kil_*/self._incident_listener), kill
// filters/audiences, PlayerIterator/PlayerSensor, and PlayerTrigger verbs - the
// receiver-side split of natives.ts's LuaBoundObject.

import { LuaHostObject } from "../hks/host_env.ts";
import type { LuaValue } from "../hks/values.ts";
import type { BoundRow } from "./bindings.ts";
import { itemKey } from "./item_key.ts";
import { FNV1_EMPTY, fnv1, parseHashLiteral } from "./name_hash.ts";
import {
  boundObjectOf,
  type IncidentMetadata,
  type KillFilterDetails,
  type KillParty,
  type LuaBoundObject,
  type LuaHostContext,
  resolveStringHash,
  rowKind,
  showArgs,
  unboundAnswer,
} from "./natives.ts";
import * as scoreboardNatives from "./scoreboard_natives.ts";

const incidentMetadataOf_ = new WeakMap<LuaHostObject, IncidentMetadata>();

export function registerIncidentMetadata(
  data: IncidentMetadata
): LuaHostObject {
  const object = new LuaHostObject("incident_metadata", (invocation) => {
    const answer = unboundAnswer(invocation.method);
    return [answer];
  });
  incidentMetadataOf_.set(object, data);
  return object;
}

function metadataOf(value: LuaValue): IncidentMetadata | undefined {
  return value instanceof LuaHostObject
    ? incidentMetadataOf_.get(value)
    : undefined;
}

// The kill audience table; an unlisted audience "could not find audience"s
// (0x821A9840) and counts as nobody.
const AUD_ALL_PLAYERS = fnv1("all_players");
const AUD_KILLING_PLAYER = fnv1("killing_object_player");
const AUD_KILLING_PLAYER_ALIAS = fnv1("killing_player");
const AUD_KILLING_FIRETEAM = fnv1("killing_object_fireteam");
const AUD_KILLING_FIRETEAM_ALIAS = fnv1("killing_fireteam");
const AUD_KILLING_FACTION = fnv1("killing_object_faction");
const AUD_KILLING_FACTION_ALIAS = fnv1("killing_faction");
const AUD_DEAD_PLAYER = fnv1("dead_object_player");
const AUD_DEAD_PLAYER_ALIAS = fnv1("dead_player");
const AUD_DEAD_FIRETEAM = fnv1("dead_object_fireteam");
const AUD_DEAD_FIRETEAM_ALIAS = fnv1("dead_fireteam");
const AUD_DEAD_FACTION = fnv1("dead_object_faction");
const AUD_DEAD_FACTION_ALIAS = fnv1("dead_faction");
const AUD_ASSISTING_PLAYER = fnv1("assisting_object_player");
const AUD_ASSISTING_PLAYER_ALIAS = fnv1("assisting_player");
const AUD_ASSISTING_FIRETEAM = fnv1("assisting_object_fireteam");
const AUD_ASSISTING_FIRETEAM_ALIAS = fnv1("assisting_fireteam");
const AUD_ASSISTING_FACTION = fnv1("assisting_object_faction");
const AUD_ASSISTING_FACTION_ALIAS = fnv1("assisting_faction");
const AUD_PARTICIPANT_PLAYER = fnv1("participant_player");
const AUD_PARTICIPANT_FIRETEAM = fnv1("participant_fireteam");
const AUD_PARTICIPANT_FACTION = fnv1("participant_faction");
const AUD_ASSISTING_DAMAGE_PLAYER = fnv1("assisting_object_damage_player");
const AUD_ASSISTING_PROXIMITY_TARGET_PLAYER = fnv1(
  "assisting_object_proximity_target_player"
);
const AUD_ASSISTING_PROXIMITY_KILLER_PLAYER = fnv1(
  "assisting_object_proximity_killer_player"
);
const ASSIST_KIND_DAMAGE = 0;
const ASSIST_KIND_PROXIMITY_TARGET = 1;
const ASSIST_KIND_PROXIMITY_KILLER = 2;

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function partyPlayer(party: KillParty | undefined): string[] {
  return party?.characterKey === undefined ? [] : [party.characterKey];
}

// "Same fireteam"/"same faction": every activity player (single-fireteam PvE);
// an AI or world party has neither.
function partyGroup(
  party: KillParty | undefined,
  activityPlayers: readonly string[]
): readonly string[] {
  return party?.characterKey === undefined ? [] : activityPlayers;
}

// Resolves one audience hash against a kill's parties. undefined = unknown
// audience ("could not find audience").
function killAudiencePlayers(
  audienceHash: number,
  kill: KillFilterDetails,
  activityPlayers: readonly string[]
): readonly string[] | undefined {
  const assistsOf = (kind?: number) =>
    kind === undefined
      ? kill.assists
      : kill.assists.filter((assist) => assist.kind === kind);
  const assistPlayers = (kind?: number) =>
    unique(assistsOf(kind).flatMap((assist) => partyPlayer(assist)));
  const assistGroups = () =>
    unique(
      assistsOf().flatMap((assist) => partyGroup(assist, activityPlayers))
    );
  switch (audienceHash) {
    case AUD_ALL_PLAYERS:
      return activityPlayers;
    case AUD_KILLING_PLAYER:
    case AUD_KILLING_PLAYER_ALIAS:
      return partyPlayer(kill.killer);
    case AUD_KILLING_FIRETEAM:
    case AUD_KILLING_FIRETEAM_ALIAS:
    case AUD_KILLING_FACTION:
    case AUD_KILLING_FACTION_ALIAS:
      return partyGroup(kill.killer, activityPlayers);
    case AUD_DEAD_PLAYER:
    case AUD_DEAD_PLAYER_ALIAS:
      return partyPlayer(kill.victim);
    case AUD_DEAD_FIRETEAM:
    case AUD_DEAD_FIRETEAM_ALIAS:
    case AUD_DEAD_FACTION:
    case AUD_DEAD_FACTION_ALIAS:
      return partyGroup(kill.victim, activityPlayers);
    case AUD_ASSISTING_PLAYER:
    case AUD_ASSISTING_PLAYER_ALIAS:
      return assistPlayers();
    case AUD_ASSISTING_FIRETEAM:
    case AUD_ASSISTING_FIRETEAM_ALIAS:
    case AUD_ASSISTING_FACTION:
    case AUD_ASSISTING_FACTION_ALIAS:
      return assistGroups();
    case AUD_PARTICIPANT_PLAYER:
      return unique([...partyPlayer(kill.killer), ...assistPlayers()]);
    case AUD_PARTICIPANT_FIRETEAM:
    case AUD_PARTICIPANT_FACTION:
      return unique([
        ...partyGroup(kill.killer, activityPlayers),
        ...assistGroups(),
      ]);
    case AUD_ASSISTING_DAMAGE_PLAYER:
      return assistPlayers(ASSIST_KIND_DAMAGE);
    case AUD_ASSISTING_PROXIMITY_TARGET_PLAYER:
      return assistPlayers(ASSIST_KIND_PROXIMITY_TARGET);
    case AUD_ASSISTING_PROXIMITY_KILLER_PLAYER:
      return assistPlayers(ASSIST_KIND_PROXIMITY_KILLER);
    default:
      return;
  }
}

// A "no audience table" incident carries its players in metadata; a kill
// resolves through the table. An unset audience is all_players.
function audiencePlayers(
  audienceHash: number | undefined,
  metadata: IncidentMetadata,
  activityPlayers: readonly string[],
  log?: (line: string) => void
): readonly string[] {
  if (!metadata.kill) {
    return metadata.players;
  }
  if (audienceHash === undefined) {
    return activityPlayers;
  }
  const resolved = killAudiencePlayers(
    audienceHash,
    metadata.kill,
    activityPlayers
  );
  if (resolved === undefined) {
    log?.(`could not find audience 0x${audienceHash.toString(16)}`);
    return [];
  }
  return resolved;
}

// A player_trigger incident (class 18) fired for this row.
const PLAYER_TRIGGER_NAME_HASH = fnv1("player_trigger");
// The default name filter ("kill" = 0x790C2A95), used when the listener never
// bound its own.
const INCIDENT_KILL_NAME_HASH = fnv1("kill");
// The member a public-event objective's engagement sources hand to set_handler.
const ENGAGEMENT_DELEGATE = ".d_handle_engagement_incident";

const engagements = new WeakMap<
  LuaHostContext,
  Map<string, LuaBoundObject[]>
>();

export function engagementsOf(
  context: LuaHostContext
): Map<string, LuaBoundObject[]> {
  let sources = engagements.get(context);
  if (!sources) {
    sources = new Map();
    engagements.set(context, sources);
  }
  return sources;
}

export function hasEngaged(self: LuaBoundObject): boolean {
  const watch = self.incidentWatch;
  if (!watch || watch.disabled) {
    return false;
  }
  if (self.row?.typeId === self.types.PlayerTrigger) {
    return self.context.reports.triggerFired(
      itemKey(self.row.bundle, self.row.typeIndex)
    );
  }
  return self.count() > 0;
}

export function armTrigger(self: LuaBoundObject, method: string): boolean {
  if (self.row?.typeId !== self.types.PlayerTrigger) {
    self.writer.note(`${self.path}:${method}() (${rowKind(self.row)})`);
    return true;
  }
  self.writer.set(
    self.row,
    {
      kind: "playerTrigger",
      state: { armedAt: self.context.clock.activityTicks(), enabled: true },
    },
    "trigger armed"
  );
  // The client fires a trigger once per arm (last fire < arm stamp).
  self.context.reports.triggerArmed?.(
    itemKey(self.row.bundle, self.row.typeIndex)
  );
  if (self.incidentWatch) {
    self.incidentWatch.disabled = false;
  }
  return true;
}

// disable(): the handler stops counting and the trigger goes out disarmed;
// enable()/reset() arm it again.
export function disarmTrigger(self: LuaBoundObject, row: BoundRow): boolean {
  if (self.incidentWatch) {
    self.incidentWatch.disabled = true;
  }
  self.writer.set(
    row,
    {
      kind: "playerTrigger",
      state: { armedAt: self.context.clock.activityTicks(), enabled: false },
    },
    "trigger disarmed"
  );
  return true;
}

// The bind_* verbs arm host-side listener bookkeeping (no IncidentListener row
// type exists). bind_squad_identifier resolving to a squad scopes get_count().
export function armIncidentListener(
  self: LuaBoundObject,
  method: string,
  args: readonly LuaValue[]
): boolean {
  self.incidentWatch ??= { count: 0 };
  const watch = self.incidentWatch;
  // A plain string, not a string_hash: the row lookup needs the literal text.
  const literal = args.find((arg): arg is string => typeof arg === "string");
  switch (method) {
    case "bind_hash":
      watch.nameHash = resolveStringHash(args[0]);
      watch.audienceHash = resolveStringHash(args[1]);
      break;
    case "bind_incident_name_hash":
      watch.nameHash = resolveStringHash(args[0]);
      break;
    case "bind_audience_hash":
    case "bind_audience":
      watch.audienceHash = resolveStringHash(args[0]);
      break;
    case "bind_bubble_name_hash":
    case "bind_bubble_name":
      watch.bubbleHash = resolveStringHash(args[0]);
      break;
    case "bind_dead_combatant_name_hash":
    case "bind_dead_combatant_name":
      watch.deadCombatantHash = resolveStringHash(args[0]);
      break;
    case "bind_object_identifier":
      watch.objectIdentifierHash = resolveStringHash(args[0]);
      break;
    default:
      break;
  }
  // set_handler(po.d_handle_engagement_incident): this listener or trigger is
  // one of that objective's engagement sources (get_engaged_player_count).
  const delegate = boundObjectOf(args[0])?.path;
  if (method === "set_handler" && delegate?.endsWith(ENGAGEMENT_DELEGATE)) {
    const objective = delegate.slice(0, -ENGAGEMENT_DELEGATE.length);
    const objectiveEngagements = engagementsOf(self.context);
    objectiveEngagements.set(objective, [
      ...(objectiveEngagements.get(objective) ?? []).filter(
        (source) => source !== self
      ),
      self,
    ]);
    self.writer.note(
      `${self.path}:set_handler(${showArgs(args)}) (engagement source ` +
        `for ${objective}, handler not run)`
    );
    return true;
  }
  // Every other set_handler: a real script function, run per match as its own
  // thread.
  if (method === "set_handler") {
    watch.handler = args[0];
    watch.handlerSelf = self.context.currentInstance();
    self.writer.note(`${self.path}:set_handler(${showArgs(args)}) (armed)`);
    return true;
  }
  // bind_squad(row) scopes by the row itself, the same way
  // bind_squad_identifier scopes by what its identifier names.
  const squadRow =
    method === "bind_squad" ? boundObjectOf(args[0])?.row : undefined;
  if (method === "bind_squad_identifier" || squadRow !== undefined) {
    // The authored import identifier first - it names every squad in the
    // group, where a row lookup can only ever find one.
    const row =
      squadRow ??
      (literal === undefined
        ? undefined
        : self.rows.resolveByIdentifier(literal));
    const scope =
      (literal === undefined
        ? undefined
        : self.rows.squadsForIdentifier?.(literal)) ??
      (row === undefined ? undefined : self.rows.squadScopeOf?.(row));
    watch.squads = scope;
    watch.squadBaseline = scope ? sumSquadDeaths(self, scope) : undefined;
    self.writer.note(
      `${self.path}:${method}(${showArgs(args)}) (incident listener armed, ` +
        (scope
          ? `scoped to squad(s) [${[...scope].join(",")}] - counts their own deaths`
          : "squad could not be resolved from the identifier - counting " +
            "every kill host-wide") +
        ")"
    );
    return true;
  }
  self.writer.note(
    `${self.path}:${method}(${showArgs(args)}) (incident listener armed, ` +
      "host bookkeeping - no IncidentListener row exists)"
  );
  return true;
}

export function runHandler(
  self: LuaBoundObject,
  nameArg: LuaValue,
  metadata: LuaValue
): void {
  const watch = self.incidentWatch;
  if (watch?.handler === undefined) {
    return;
  }
  self.context.runHandler(watch.handler, [
    watch.handlerSelf,
    nameArg,
    metadata,
  ]);
}

// Drops in this scope's squads, capped by the kills the guest actually
// reported.
export function sumSquadDeaths(
  self: LuaBoundObject,
  squads: ReadonlySet<string>
): number {
  let drops = 0;
  for (const key of squads) {
    drops += self.context.reports.squadDeaths?.(key) ?? 0;
  }
  const deaths =
    self.context.reports.scopeDeaths?.(squads) ??
    Math.max(drops, self.context.reports.scopeKills?.(squads) ?? 0);
  const kills = self.context.reports.killIncidents?.();
  return kills === undefined ? deaths : Math.min(deaths, kills);
}

// Counts when the incident names the identifier or the object it resolves
// to; on an Object row, marks it used.
export function noteInteraction(
  self: LuaBoundObject,
  carries: (name: number) => boolean,
  namesOf: (row: BoundRow) => number[]
): void {
  if (self.row?.typeId === self.types.Object) {
    if (!self.interacted && namesOf(self.row).some((name) => carries(name))) {
      self.interacted = true;
      self.writer.note(`${self.path} used (interaction incident)`);
    }
    return;
  }
  if (self.row !== undefined || self.handle === undefined) {
    return;
  }
  const object = self.rows.resolveByIdentifier(self.handle);
  // a "0x" literal is the identifier itself, anything else its name
  const names = [
    parseHashLiteral(self.handle) ?? fnv1(self.handle),
    ...(object ? namesOf(object) : []),
  ];
  if (!names.some((name) => carries(name))) {
    return;
  }
  self.incidentWatch ??= { count: 0 };
  self.incidentWatch.count += 1;
  self.writer.note(
    `${self.path} interaction with "${self.handle}" -> ${self.incidentWatch.count}`
  );
}

// Bumped by LuaEncounterHost.reportKill for every armed listener with no squad
// scope, on a kill-family incident matching its filters.
export function noteAnyKill(
  self: LuaBoundObject,
  kill: KillFilterDetails
): void {
  if (self.row?.typeId === self.types.Scoreboard) {
    scoreboardNatives.applyScoreboardIncident(
      self,
      INCIDENT_KILL_NAME_HASH,
      (audience) =>
        killAudiencePlayers(
          audience,
          kill,
          self.context.players().map((player) => player.characterKey)
        )
    );
  }
  const watch = self.incidentWatch;
  if (!watch || watch.squads || watch.disabled) {
    return;
  }
  if (!matchesKillFilters(self, watch, kill)) {
    return;
  }
  watch.count += 1;
  self.writer.note(
    `${self.path} incident listener +1 (kill) -> ${watch.count}`
  );
  runHandler(
    self,
    watch.nameHash ?? INCIDENT_KILL_NAME_HASH,
    registerIncidentMetadata({
      kill,
      players: self.context.players().map((player) => player.characterKey),
    })
  );
}

// The kill filters: an unset value (undefined or the FNV-1 basis) matches
// anything.
function matchesKillFilters(
  self: LuaBoundObject,
  watch: NonNullable<LuaBoundObject["incidentWatch"]>,
  kill: KillFilterDetails
): boolean {
  if (
    watch.bubbleHash !== undefined &&
    watch.bubbleHash !== FNV1_EMPTY &&
    watch.bubbleHash !== kill.bubbleHash
  ) {
    return false;
  }
  if (
    watch.deadCombatantHash !== undefined &&
    watch.deadCombatantHash !== FNV1_EMPTY &&
    watch.deadCombatantHash !== kill.deadCombatantHash
  ) {
    return false;
  }
  if (
    watch.objectIdentifierHash !== undefined &&
    watch.objectIdentifierHash !== FNV1_EMPTY &&
    !(kill.objectIdentifierHashes ?? []).includes(watch.objectIdentifierHash)
  ) {
    return false;
  }
  if (
    watch.audienceHash === undefined ||
    watch.audienceHash === AUD_ALL_PLAYERS
  ) {
    return true;
  }
  const activityPlayers = self.context
    .players()
    .map((player) => player.characterKey);
  const resolved = killAudiencePlayers(
    watch.audienceHash,
    kill,
    activityPlayers
  );
  if (resolved === undefined) {
    self.writer.note(
      `${self.path} could not find audience 0x${watch.audienceHash.toString(16)}`
    );
    return false;
  }
  return resolved.length > 0;
}

// Exact-name match for host-local and host-synthesized incidents; the
// audience check is "no metadata or all_players".
export function dispatchIncident(
  self: LuaBoundObject,
  nameHash: number,
  metadata: LuaValue
): void {
  const watch = self.incidentWatch;
  if (
    !watch ||
    watch.disabled ||
    watch.nameHash === undefined ||
    watch.nameHash !== nameHash
  ) {
    return;
  }
  watch.count += 1;
  self.writer.note(
    `${self.path} incident listener +1 (0x${nameHash.toString(16)}) -> ${watch.count}`
  );
  runHandler(self, nameHash, metadata);
}

// The row is the listener: a fire runs the handler unconditionally.
export function dispatchTriggerFired(
  self: LuaBoundObject,
  metadata: LuaValue
): void {
  const watch = self.incidentWatch;
  if (!watch || watch.disabled) {
    return;
  }
  watch.count += 1;
  self.writer.note(`${self.path} trigger fired -> ${watch.count}`);
  runHandler(self, PLAYER_TRIGGER_NAME_HASH, metadata);
}

// incident_player_iterator/player_iterator:begin(name, audience, metadata).
export function playerIteratorBegin(
  self: LuaBoundObject,
  _name: LuaValue,
  audience: LuaValue,
  metadataArg: LuaValue
): boolean {
  const meta = metadataOf(metadataArg);
  const activityPlayers = self.context
    .players()
    .map((player) => player.characterKey);
  const players = meta
    ? audiencePlayers(
        resolveStringHash(audience),
        meta,
        activityPlayers,
        (line) => self.writer.note(`${self.path} ${line}`)
      )
    : activityPlayers;
  self.playerIterator = { index: 0, players };
  self.writer.note(`${self.path}:begin(...) -> ${players.length} player(s)`);
  return true;
}

export function currentIteratorPlayer(
  self: LuaBoundObject
): string | undefined {
  const it = self.playerIterator;
  return it && it.index < it.players.length ? it.players[it.index] : undefined;
}

// Only a PlayerTrigger's fired state is really reported; anything else reads
// false.
export function isTriggered(self: LuaBoundObject): boolean {
  if (self.row?.typeId === self.types.PlayerTrigger) {
    const fired = self.context.reports.triggerFired(
      itemKey(self.row.bundle, self.row.typeIndex)
    );
    self.writer.notePoll(
      `${self.path}:is_triggered`,
      `${self.path}:is_triggered() -> ${fired}`
    );
    return fired;
  }
  // A trigger slot bound to a Location means "a player is inside that bubble":
  // the bubble's one PlayerMonitor answers.
  if (self.row?.typeId === self.types.Location) {
    const inside = self.context.reports.bubbleOccupied(self.row.bundle);
    if (inside !== undefined) {
      self.writer.notePoll(
        `${self.path}:is_triggered`,
        `${self.path}:is_triggered() -> ${inside} (bubble occupancy)`
      );
      return inside;
    }
  }
  return self.unknownPredicate("is_triggered");
}
