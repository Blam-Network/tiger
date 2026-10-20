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

// Everything an item state holds, copied: what a phase reset puts back.
export interface ItemStateCapture {
  flags: ReadonlySet<number>;
  sequences: ReadonlyMap<string, SequenceState>;
  squads: ReadonlyMap<string, SquadState>;
}

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

  // The squad as if no script had touched it.
  clearSquad(item: ItemRef): void {
    this.squads.delete(squadKey(item.bundle, item.typeIndex));
  }

  capture(): ItemStateCapture {
    return {
      flags: new Set(this.flags),
      sequences: new Map(
        [...this.sequences].map(([key, state]) => [
          key,
          { ...state, pairs: state.pairs.map((pair) => ({ ...pair })) },
        ])
      ),
      squads: new Map(this.squads),
    };
  }

  // The sequence as the capture held it, or as if no script had touched it.
  restoreSequence(item: ItemRef, capture: ItemStateCapture): void {
    const key = squadKey(item.bundle, item.typeIndex);
    const held = capture.sequences.get(key);
    if (held === undefined) {
      this.sequences.delete(key);
    } else {
      this.sequences.set(key, {
        ...held,
        pairs: held.pairs.map((pair) => ({ ...pair })),
      });
    }
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
