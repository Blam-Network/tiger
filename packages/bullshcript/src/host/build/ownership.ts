// Which instance made what. A script instance builds its row bindings, child
// instances and encounter manager as it is built or as its fields are first
// read; recording the instance whose build is under way lets a phase reset
// find everything one instance (and the archetypes under it) owns, and drop
// it.

import type { LuaTable } from "../../hks/vm/values.ts";
import type { BoundInstance } from "../natives/natives.ts";

export class Ownership {
  // The instance whose build is under way: what is made now is its.
  private building: LuaTable | undefined;
  // Every live instance, with the one that built it; a top-level script's has
  // none.
  private readonly parents = new Map<LuaTable, LuaTable | undefined>();
  private readonly objectOwners = new WeakMap<BoundInstance, LuaTable>();

  get owner(): LuaTable | undefined {
    return this.building;
  }

  // Runs `build` with `owner` as the instance everything made meanwhile
  // belongs to. No owner is the host's own: a handle every script shares.
  scope<T>(owner: LuaTable | undefined, build: () => T): T {
    const outer = this.building;
    this.building = owner;
    try {
      return build();
    } finally {
      this.building = outer;
    }
  }

  // A new instance, built by whichever instance is building.
  noteInstance(instance: LuaTable): void {
    this.parents.set(instance, this.building);
  }

  // A new row binding, made for whichever instance is building.
  noteObject(bound: BoundInstance): void {
    if (this.building !== undefined) {
      this.objectOwners.set(bound, this.building);
    }
  }

  ownerOfObject(bound: BoundInstance): LuaTable | undefined {
    return this.objectOwners.get(bound);
  }

  // The top-level script an instance belongs to: itself when nothing built it.
  rootOf(instance: LuaTable): LuaTable {
    let at = instance;
    for (
      let parent = this.parents.get(at);
      parent !== undefined;
      parent = this.parents.get(at)
    ) {
      at = parent;
    }
    return at;
  }

  // The instance and every one built under it.
  treeOf(root: LuaTable): Set<LuaTable> {
    const tree = new Set<LuaTable>();
    for (const instance of this.parents.keys()) {
      if (this.rootOf(instance) === root) {
        tree.add(instance);
      }
    }
    return tree;
  }

  isLive(instance: LuaTable): boolean {
    return this.parents.has(instance);
  }

  get instances(): IterableIterator<LuaTable> {
    return this.parents.keys();
  }

  forget(dead: ReadonlySet<LuaTable>): void {
    for (const instance of dead) {
      this.parents.delete(instance);
    }
  }
}
