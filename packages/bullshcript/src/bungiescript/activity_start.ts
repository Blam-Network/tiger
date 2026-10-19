// How an activity starts: the data Bungie's host-only scenario tags held (the
// start slice) and what the live server chose besides (phases, spawn
// transitions). Scripts write it with decorators on the activity's encounter
// (@activity, @start_slice, @phase, @spawn_transition,
// @region_spawn_transition, @time_of_day), and it travels in the compiled
// tree beside the script.

import { fnv1, parseHashLiteral } from "../host/tags/name_hash.ts";

// A slice is named by its region: the name the scenario client's bubble holds
// the fnv1 of (region_name_hash), "plaza" or "dig_site", or its "0x<hash>"
// where the name never cracked. The slice descriptors' own names are the
// destination's ("venus") and tell bubbles apart no better than their index.
export function sliceRegionHash(slice: string): number {
  const hash = slice.startsWith("0x") ? parseHashLiteral(slice) : fnv1(slice);
  if (hash === undefined) {
    throw new Error(`'${slice}' is not a slice name or a 0x<hash>`);
  }
  return hash;
}

// The phase row that owns the state the activity starts in.
export interface ActivityStartPhase {
  // fnv1 of the phase row's name
  readonly hash: number;
  // as written: the name, or "0x<hash>" where it never cracked
  readonly name: string;
}

// A phase row the lifetime runs, in the order it runs them, with the slice it
// plays in.
export interface ActivityPhaseStart {
  // fnv1 of the phase row's name
  readonly hash: number;
  // as written: the name, or "0x<hash>" where it never cracked
  readonly name: string;
  // the slice's region name as written
  readonly slice: string;
}

// What a script authors for the activities it starts. Every field is set only
// when the script wrote it.
export interface ActivityStart {
  // the activity names this start is for (the activity definition's name)
  readonly activities: readonly string[];
  // in the order the lifetime runs them
  readonly phases: readonly ActivityPhaseStart[];
  // region id (bubble << 3 | state, the number the GAS carries) -> the GAS
  // spawn transition (fnv1 of a spawn point's name) the server names for that
  // region once a client has been there
  readonly regionSpawnTransitions: Readonly<Record<number, number>>;
  // the GAS spawn transition the activity starts at; unset starts at "default"
  readonly spawnTransition?: number;
  // the phase that owns the state the activity starts in, one of the phases
  // playing in startSlice; unset when no phase plays there and the activity
  // starts in the slice's state 0
  readonly startPhase?: ActivityStartPhase;
  // the slice the activity starts in (its region name as written)
  readonly startSlice?: string;
  // the time of day the lifetime locks its clients to from world entry, a
  // fraction of the day (0.77 is sunset); unset locks nothing and each client
  // keeps its own clock. set_time_of_day moves it once scripts run.
  readonly timeOfDay?: number;
}

// An activity's start as the host reads it: the script's authored data and
// where the script lives.
export interface ActivityStartData extends Omit<ActivityStart, "activities"> {
  readonly activity: string;
  // the destination's script folder (es/<destination>/); a shared bs\ encounter
  // has none
  readonly destination?: string;
  // the script that authored it, relative to the build folder
  readonly script: string;
}

// The start as authored, without the source line a parse keeps it by.
export function authoredActivityStart(
  start: ActivityStart & { readonly line: number }
): ActivityStart {
  const { line: _line, ...authored } = start;
  return authored;
}

const DESTINATION = /^es\/([^/]+)\//;

export function activityStartData(
  start: ActivityStart,
  activity: string,
  script: string
): ActivityStartData {
  const { activities: _activities, ...authored } = start;
  const destination = DESTINATION.exec(script)?.[1];
  return {
    activity,
    ...(destination === undefined ? {} : { destination }),
    ...authored,
    script,
  };
}
