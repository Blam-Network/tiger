import type { ItemRef, SquadState } from "./items.ts";

const squadKey = (bundle: number, typeIndex: number) =>
  `${bundle >>> 0}:${typeIndex}`;

const NO_SQUAD_STATE: SquadState = { carried: false, wave: 0 };

// Shared by every script that names the row: one sequence, not two.
export interface SequenceState {
  nextPlayingId: number;
  readonly pairs: { name: number; value: number }[];
  playedAt: number | undefined;
  playing: { id: number; startedAt: number } | undefined;
  stopped: boolean;
  target: ItemRef | undefined;
}

export const newSequenceState = (): SequenceState => ({
  nextPlayingId: 0,
  pairs: [],
  playedAt: undefined,
  playing: undefined,
  stopped: false,
  target: undefined,
});

// What the runtime has asked of its items, so scripts can read back their
// own placements and flags and a squad change can carry the whole squad.
export class ScriptItemState {
  private readonly squads = new Map<string, SquadState>();
  private readonly sequences = new Map<string, SequenceState>();
  private readonly flags = new Set<number>();

  squad(item: ItemRef): SquadState {
    return (
      this.squads.get(squadKey(item.bundle, item.typeIndex)) ?? NO_SQUAD_STATE
    );
  }

  sequence(item: ItemRef): SequenceState {
    const key = squadKey(item.bundle, item.typeIndex);
    let state = this.sequences.get(key);
    if (!state) {
      state = newSequenceState();
      this.sequences.set(key, state);
    }
    return state;
  }

  setSquad(item: ItemRef, state: SquadState): void {
    this.squads.set(squadKey(item.bundle, item.typeIndex), state);
  }

  bodiesFor(bundle: number, typeIndex: number): number | undefined {
    return this.squads.get(squadKey(bundle, typeIndex))?.bodies;
  }

  // Everything held, for a debugger: keys are `bundle:typeIndex`, decimal.
  snapshot(): {
    flags: number[];
    sequences: [string, SequenceState][];
    squads: [string, SquadState][];
  } {
    return {
      flags: [...this.flags],
      sequences: [...this.sequences],
      squads: [...this.squads],
    };
  }

  hasActivityFlag(hash: number): boolean {
    return this.flags.has(hash >>> 0);
  }

  // Whether it changed.
  setActivityFlag(hash: number, active: boolean): boolean {
    if (this.hasActivityFlag(hash) === active) {
      return false;
    }
    if (active) {
      this.flags.add(hash >>> 0);
    } else {
      this.flags.delete(hash >>> 0);
    }
    return true;
  }
}
