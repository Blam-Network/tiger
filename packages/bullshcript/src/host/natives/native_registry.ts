// The verb table a bound object dispatches through. Each *_natives module
// registers its own verbs here; the registry imports none of them.

import type { LuaValue } from "../../hks/vm/values.ts";
import type { BoundRow } from "../bound/bindings.ts";
import type { KillFilterDetails } from "./native_support.ts";

export type NativeHandler<Self> = (
  self: Self,
  args: readonly LuaValue[],
  method: string
) => LuaValue;

// Tried before the verb table; undefined falls through to it.
export type RowVerbHandler<Self> = (
  self: Self,
  method: string,
  args: readonly LuaValue[]
) => LuaValue;

export type AdvanceHook<Self> = (self: Self, seconds: number) => void;

// What the encounter host and the bound object call into a domain for.
export interface NativeEvents<Self> {
  applyScoreboardTeamIncident(
    self: Self,
    incidentName: number,
    team: number
  ): void;
  count(self: Self): number;
  dispatchIncident(self: Self, nameHash: number, metadata: LuaValue): void;
  dispatchTriggerFired(self: Self, metadata: LuaValue): void;
  noteAnyKill(self: Self, kill: KillFilterDetails): void;
  noteCinematicFinished(self: Self): void;
  noteDestructibleKill(
    self: Self,
    hashes: readonly number[],
    namesOf: (row: BoundRow) => number[]
  ): void;
  noteInteraction(
    self: Self,
    carries: (name: number) => boolean,
    namesOf: (row: BoundRow) => number[]
  ): void;
  noteLootGathered(self: Self): void;
}

export class NativeRegistry<Self> {
  private readonly verbs = new Map<string, NativeHandler<Self>>();
  private readonly rowVerbs: {
    applies: (self: Self) => boolean;
    handler: RowVerbHandler<Self>;
  }[] = [];
  private readonly advanceHooks: AdvanceHook<Self>[] = [];
  readonly events: Partial<NativeEvents<Self>> = {};

  verb(names: string | readonly string[], handler: NativeHandler<Self>): void {
    for (const name of typeof names === "string" ? [names] : names) {
      if (this.verbs.has(name)) {
        throw new Error(`native verb "${name}" registered twice`);
      }
      this.verbs.set(name, handler);
    }
  }

  // A row type's own verbs, tried ahead of the shared table.
  rowVerb(applies: (self: Self) => boolean, handler: RowVerbHandler<Self>) {
    this.rowVerbs.push({ applies, handler });
  }

  // Run in registration order each tick.
  onAdvance(hook: AdvanceHook<Self>): void {
    this.advanceHooks.push(hook);
  }

  lookup(method: string): NativeHandler<Self> | undefined {
    return this.verbs.get(method);
  }

  // The first row-type handler that answers, else undefined.
  rowAnswer(
    self: Self,
    method: string,
    args: readonly LuaValue[]
  ): LuaValue | undefined {
    for (const { applies, handler } of this.rowVerbs) {
      if (applies(self)) {
        const answer = handler(self, method, args);
        if (answer !== undefined) {
          return answer;
        }
      }
    }
  }

  advance(self: Self, seconds: number): void {
    for (const hook of this.advanceHooks) {
      hook(self, seconds);
    }
  }
}
