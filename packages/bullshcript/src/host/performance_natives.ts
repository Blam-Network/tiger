// Machine (type 40) verbs - the receiver-side split of natives.ts's
// LuaBoundObject for the rows that drive an actor's AI-managed performance.

import type { LuaValue } from "../hks/values.ts";
import type { MachineState } from "./items.ts";
import {
  type LuaBoundObject,
  resolveStringHash,
  rowKind,
  show,
} from "./natives.ts";

// The client keeps at most four cues (80800556 [1], a 3-bit count).
const MAX_CUES = 4;

// The row's state, shared by every handle bound to it: the breach encounter
// starts the Ghost's performance and mission 3 cues it.
function machineState(self: LuaBoundObject): MachineState {
  const key = self.row
    ? `${self.row.bundle}:${self.row.typeId}:${self.row.typeIndex}`
    : self.path;
  self.context.machineStates ??= new Map();
  const states = self.context.machineStates;
  let state = states.get(key);
  if (!state) {
    state = { cues: [] };
    states.set(key, state);
  }
  return state;
}

function push(self: LuaBoundObject, state: MachineState, label: string) {
  if (!self.row) {
    return true;
  }
  self.writer.set(
    self.row,
    { kind: "machine", state: { ...state, cues: [...state.cues] } },
    label
  );
  return true;
}

// start_performance(name): the actor runs the named performance.
export function startPerformance(
  self: LuaBoundObject,
  name: LuaValue
): boolean {
  const label = `start_performance(${show(name)})`;
  if (self.row?.typeId !== self.types.Machine) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  const hash = resolveStringHash(name);
  if (hash === undefined) {
    self.writer.note(`${self.path}:${label} (not a name hash, no-op)`);
    return true;
  }
  const state = machineState(self);
  state.performance = {
    generation: (state.performance?.generation ?? 0) + 1,
    name: hash >>> 0,
  };
  return push(self, state, `performance 0x${(hash >>> 0).toString(16)}`);
}

// cue_performance(name): a cue into the running performance (the nests'
// scatter, the Ghost's light-up beats).
export function cuePerformance(self: LuaBoundObject, name: LuaValue): boolean {
  const label = `cue_performance(${show(name)})`;
  if (self.row?.typeId !== self.types.Machine) {
    self.writer.note(`${self.path}:${label} (${rowKind(self.row)})`);
    return true;
  }
  const hash = resolveStringHash(name);
  if (hash === undefined) {
    self.writer.note(`${self.path}:${label} (not a name hash, no-op)`);
    return true;
  }
  const state = machineState(self);
  state.cues = [...state.cues, hash >>> 0].slice(-MAX_CUES);
  return push(self, state, `cue 0x${(hash >>> 0).toString(16)}`);
}
