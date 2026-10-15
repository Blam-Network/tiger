// The natives an authored host script calls, bound to activity items. This is
// the assembly point: each domain module registers its verbs into the bound
// object's registry, and the shared types and helpers are re-exported here.

import { LuaTable, type LuaValue } from "../../hks/vm/values.ts";
import { nativeRegistry } from "../bound/bound_object.ts";
import * as commonNatives from "./common_natives.ts";
import * as incidentNatives from "./incident_natives.ts";
import * as objectNatives from "./object_natives.ts";
import * as objectiveNatives from "./objective_natives.ts";
import * as performanceNatives from "./performance_natives.ts";
import * as scoreboardNatives from "./scoreboard_natives.ts";
import * as sequenceNatives from "./sequence_natives.ts";
import * as squadNatives from "./squad_natives.ts";

export {
  BoundInstance,
  boundObjectOf,
  registerBoundObject,
  resolveStringHash,
} from "../bound/bound_object.ts";
export type {
  HostClock,
  HostContext,
  HostReports,
  IncidentMetadata,
  KillAssist,
  KillFilterDetails,
  KillParty,
  ObjectItemState,
  RowFacts,
  TimerModel,
} from "./native_support.ts";
export {
  describe,
  ItemWriter,
  LIFETIME_CINEMATIC_STATE,
  LIFETIME_END_GAME_DELAY_SECONDS,
  LIFETIME_RESULTS_STATE,
  LIFETIME_STATE_BY_MEMBER,
  OBJECTIVE_ACTIVE_STATE,
  OBJECTIVE_SLOT,
  rowKind,
  SOLO_PLAYERS,
  show,
  showArgs,
  unboundAnswer,
  unboundLabel,
} from "./native_support.ts";

// Registration order is the tick order of the advance hooks.
objectNatives.register(nativeRegistry);
squadNatives.register(nativeRegistry);
sequenceNatives.register(nativeRegistry);
objectiveNatives.register(nativeRegistry);
incidentNatives.register(nativeRegistry);
scoreboardNatives.register(nativeRegistry);
performanceNatives.register(nativeRegistry);
commonNatives.register(nativeRegistry);

// The pack a sleep_until waits on: the closure returns (value, description).
export class PredicatePack extends LuaTable {
  readonly predicate: LuaValue;

  constructor(predicate: LuaValue) {
    super();
    this.predicate = predicate;
  }
}
