// What a phase's scripts, and the encounters running beside it, did to the
// world since the phase started, so a hard wipe can put it back. Every change
// the scripts send is noted: the first touch of a row says it is to be put
// back, to the change last sent before the phase (its before-image), or to
// untouched where none was. The world the host started from is kept too: an
// encounter the wipe restarts has the rows it owns put back to that.

import type { LuaTable } from "../../hks/vm/values.ts";
import type {
  HostContext,
  ObjectItemState,
} from "../natives/native_support.ts";
import type { ItemStateCapture } from "./item_state.ts";
import type { ItemChange, ItemRef, MachineState } from "./items.ts";

// The lifetime is the activity's, not a phase's, and the score outlives it; the
// hard wipe row is the phase's own arming, sent again as it starts. A reset
// leaves them be.
const KEPT_KINDS: ReadonlySet<ItemChange["kind"]> = new Set([
  "hardWipeGlobals",
  "lifetime",
  "scoreboard",
]);

// The state the host keeps beside the rows it sent (the object and machine
// state every handle on a row shares, and the item state) at a phase's start.
export interface PhaseShadow {
  items: ItemStateCapture;
  machines: ReadonlyMap<string, MachineState>;
  objects: ReadonlyMap<string, ObjectItemState>;
}

export interface JournalledRow {
  // The change last sent before the phase; none, the row was untouched.
  before: ItemChange | undefined;
  // The change last sent.
  current: ItemChange;
  item: ItemRef;
  kind: ItemChange["kind"];
  // The change the host sent for the row before any script ran (reserving a
  // squad empty); none, the row started untouched.
  origin: ItemChange | undefined;
}

export function changeKey(kind: ItemChange["kind"], item: ItemRef): string {
  return `${kind}:${item.bundle >>> 0}:${item.typeId}:${item.typeIndex}`;
}

// The row an item is of, whichever kind of change it carries.
export function rowKey(item: ItemRef): string {
  return `${item.bundle >>> 0}:${item.typeId}:${item.typeIndex}`;
}

function copyOf<T>(states: ReadonlyMap<string, T> | undefined): Map<string, T> {
  return new Map(
    [...(states ?? [])].map(([key, state]) => [key, structuredClone(state)])
  );
}

export class PhaseJournal {
  // The change last sent for every row, as the client has it.
  private readonly sent = new Map<string, ItemChange>();
  private baseline = new Map<string, ItemChange>();
  // The world the host started from: what had been sent when the first phase
  // began, before any thread ran.
  private origin: Map<string, ItemChange> | undefined;
  private readonly touched = new Set<string>();
  // The top-level scripts that wrote any of the touched rows.
  private writtenBy = new Set<LuaTable>();
  private capture: PhaseShadow | undefined;

  // A change was sent, by the top-level script `writer` when it is known.
  note(change: ItemChange, writer: LuaTable | undefined): void {
    const key = changeKey(change.kind, change.item);
    if (!KEPT_KINDS.has(change.kind)) {
      this.touched.add(key);
      if (writer !== undefined) {
        this.writtenBy.add(writer);
      }
    }
    this.sent.set(key, change);
  }

  // The change last sent for a row.
  last(kind: ItemChange["kind"], item: ItemRef): ItemChange | undefined {
    return this.sent.get(changeKey(kind, item));
  }

  // A reset sent this change itself: it is the row's state now, not a write
  // of a script.
  noteRestored(change: ItemChange): void {
    this.sent.set(changeKey(change.kind, change.item), change);
  }

  // A reset put a row back to untouched.
  noteCleared(kind: ItemChange["kind"], item: ItemRef): void {
    this.sent.delete(changeKey(kind, item));
  }

  // A phase starts: the world as it stands is what a reset puts back.
  begin(context: HostContext): void {
    this.origin ??= new Map(this.sent);
    this.baseline = new Map(this.sent);
    this.touched.clear();
    this.writtenBy = new Set();
    this.capture = {
      items: context.state.capture(),
      machines: copyOf(context.machineStates),
      objects: copyOf(context.objectStates),
    };
  }

  get shadow(): PhaseShadow {
    if (this.capture === undefined) {
      throw new Error("no phase has started");
    }
    return this.capture;
  }

  // The top-level scripts that wrote since the phase started.
  get writers(): ReadonlySet<LuaTable> {
    return this.writtenBy;
  }

  // Every row touched since the phase started, and every row sent of the
  // items `also` names (by rowKey), touched or not.
  rows(also: ReadonlySet<string>): JournalledRow[] {
    const keys = new Set(this.touched);
    for (const [key, change] of this.sent) {
      if (!KEPT_KINDS.has(change.kind) && also.has(rowKey(change.item))) {
        keys.add(key);
      }
    }
    return [...keys].flatMap((key) => {
      const current = this.sent.get(key);
      return current === undefined
        ? []
        : [
            {
              before: this.baseline.get(key),
              current,
              item: current.item,
              kind: current.kind,
              origin: this.origin?.get(key),
            },
          ];
    });
  }
}
