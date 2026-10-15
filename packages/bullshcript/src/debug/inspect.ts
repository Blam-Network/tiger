// Values as a debugger shows them: one line each, and children on demand
// through DAP variablesReference handles. Reading never calls into Lua: a
// script instance's unresolved fields stay unresolved (its get() resolves
// rows lazily and notes it), and only raw entries are listed.

import { LuaHostObject } from "../hks/env/host_env.ts";
import type { ActivationRecord } from "../hks/vm/interpreter.ts";
import {
  LuaClosure,
  LuaHostFunction,
  LuaTable,
  type LuaValue,
  luaToString,
} from "../hks/vm/values.ts";
import type { EncounterScriptHost } from "../host/activity/encounter_host.ts";
import {
  type BoundInstance,
  boundObjectOf,
  describe,
} from "../host/natives/natives.ts";
import type { DapVariable } from "./protocol.ts";
import type { SourceIndex } from "./sources.ts";

const SOURCE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
// Children listed per expansion, past which the rest are summarised.
const MAX_CHILDREN = 500;
// Handles kept before the oldest are dropped.
const MAX_HANDLES = 50_000;
// BoundInstance members that are plumbing, not state.
const BOUND_PLUMBING = new Set([
  "object",
  "context",
  "types",
  "writer",
  "rows",
  "member",
  "path",
  "row",
  "handle",
  "children",
]);

export interface InspectTarget {
  host: EncounterScriptHost;
  sources: SourceIndex;
}

type Handle =
  | { kind: "lua"; target: InspectTarget; value: LuaValue }
  | { kind: "js"; target: InspectTarget; value: unknown }
  | { kind: "bound"; target: InspectTarget; bound: BoundInstance }
  | {
      kind: "locals";
      target: InspectTarget;
      frame: ActivationRecord;
      pc: number;
    }
  | { kind: "upvalues"; target: InspectTarget; frame: ActivationRecord };

export class Handles {
  private next = 1;
  private readonly map = new Map<number, Handle>();

  add(handle: Handle): number {
    if (this.map.size >= MAX_HANDLES) {
      this.clear();
    }
    const id = this.next;
    this.next += 1;
    this.map.set(id, handle);
    return id;
  }

  get(id: number): Handle | undefined {
    return this.map.get(id);
  }

  clear(): void {
    this.map.clear();
  }
}

// The locals live at pc: Lua 5.1 numbers them into registers in the order
// they are declared.
export function activeLocals(
  frame: ActivationRecord,
  pc: number
): { name: string; register: number }[] {
  const out: { name: string; register: number }[] = [];
  for (const local of frame.closure.prototype.locals) {
    if (local.startPc <= pc && pc < local.endPc) {
      out.push({ name: local.name, register: out.length });
    }
  }
  return out;
}

export function instanceLabel(
  host: EncounterScriptHost,
  table: LuaTable
): string | undefined {
  const prefix = host.instancePrefix.get(table);
  if (prefix === undefined) {
    return;
  }
  if (prefix !== "") {
    return prefix;
  }
  for (const [name, instance] of host.instances) {
    if (instance === table) {
      return name;
    }
  }
  return "(script)";
}

// The script owning the shared archetype instance a member names, when the
// member's holder is not that owner: the host runs one instance per
// Encounter row and every other script declaring the row holds a reference.
function sharedOwner(
  host: EncounterScriptHost,
  holder: LuaTable,
  value: LuaTable
): string | undefined {
  for (const shared of host.sharedArchetypes.values()) {
    if (shared.table !== value) {
      continue;
    }
    // the owner built it at <its prefix>.<slot>; a top-level owner by name
    const dot = shared.path.lastIndexOf(".");
    const ownerPrefix = dot < 0 ? "" : shared.path.slice(0, dot);
    const prefix = host.instancePrefix.get(holder);
    const owns =
      prefix === ownerPrefix &&
      (prefix !== "" || instanceLabel(host, holder) === shared.owner);
    return owns ? undefined : shared.owner;
  }
}

export class Inspector {
  readonly handles = new Handles();

  // One line for a value, and a handle when it has children. holder is the
  // script instance the value is a member of.
  present(
    target: InspectTarget,
    name: string,
    value: LuaValue,
    holder?: LuaTable
  ): DapVariable {
    const bound = boundObjectOf(value);
    if (bound) {
      return {
        name,
        type: "bound",
        value: bound.row
          ? `${bound.path} (${describe(bound.row)})`
          : `${bound.path} (no row)`,
        variablesReference: this.handles.add({ kind: "bound", target, bound }),
      };
    }
    if (value instanceof LuaClosure) {
      const prototype = value.prototype;
      const path = target.sources.pathOf(prototype);
      return {
        name,
        type: "function",
        value: `${target.sources.nameOf(prototype)} (${path ?? "?"}:${prototype.lineDefined})`,
        variablesReference:
          value.upvalues.length > 0
            ? this.handles.add({ kind: "lua", target, value })
            : 0,
      };
    }
    if (value instanceof LuaHostFunction) {
      return {
        name,
        type: "native",
        value: `native ${value.name}`,
        variablesReference: 0,
      };
    }
    if (value instanceof LuaTable) {
      const label = instanceLabel(target.host, value);
      const count = [...value.entries()].filter(
        ([, item]) =>
          !(
            label !== undefined &&
            (item instanceof LuaClosure || item instanceof LuaHostFunction)
          )
      ).length;
      let text = `table [${count}]`;
      if (label !== undefined) {
        const owner = holder && sharedOwner(target.host, holder, value);
        text = owner
          ? `instance ${label} (shared, owned by ${owner})`
          : `instance ${label}`;
      } else if (value instanceof LuaHostObject) {
        text = `host ${value.hostName}`;
      }
      return {
        name,
        type: label === undefined ? "table" : "instance",
        value: text,
        variablesReference:
          count > 0 ? this.handles.add({ kind: "lua", target, value }) : 0,
      };
    }
    if (typeof value === "string") {
      return {
        name,
        type: "string",
        value: JSON.stringify(value),
        variablesReference: 0,
      };
    }
    return {
      name,
      type: value === undefined ? "nil" : typeof value,
      value: luaToString(value),
      variablesReference: 0,
    };
  }

  presentJs(target: InspectTarget, name: string, value: unknown): DapVariable {
    if (
      value instanceof LuaTable ||
      value instanceof LuaClosure ||
      value instanceof LuaHostFunction
    ) {
      return this.present(target, name, value);
    }
    if (value === null || value === undefined) {
      return { name, value: String(value), variablesReference: 0 };
    }
    if (typeof value === "string") {
      return { name, value: JSON.stringify(value), variablesReference: 0 };
    }
    if (typeof value !== "object") {
      return { name, value: String(value), variablesReference: 0 };
    }
    let text = "{…}";
    if (Array.isArray(value)) {
      text = `Array(${value.length})`;
    } else if (value instanceof Map) {
      text = `Map(${value.size})`;
    } else if (value instanceof Set) {
      text = `Set(${value.size})`;
    }
    return {
      name,
      value: text,
      variablesReference: this.handles.add({ kind: "js", target, value }),
    };
  }

  children(id: number): DapVariable[] {
    const handle = this.handles.get(id);
    if (!handle) {
      return [];
    }
    switch (handle.kind) {
      case "locals":
        // the source's own names; the compiler's `(for index)` and `self`
        // (its own scope) are not shown
        return activeLocals(handle.frame, handle.pc)
          .filter(({ name }) => SOURCE_NAME.test(name) && name !== "self")
          .map(({ name, register }) =>
            this.present(handle.target, name, handle.frame.registers[register])
          );
      case "upvalues":
        return this.upvalues(handle.target, handle.frame.closure);
      case "bound":
        return this.boundChildren(handle.target, handle.bound);
      case "js":
        return this.jsChildren(handle.target, handle.value);
      case "lua":
        if (handle.value instanceof LuaClosure) {
          return this.upvalues(handle.target, handle.value);
        }
        if (handle.value instanceof LuaTable) {
          return this.tableChildren(handle.target, handle.value);
        }
        return [];
      default:
        return [];
    }
  }

  private upvalues(target: InspectTarget, closure: LuaClosure): DapVariable[] {
    return closure.upvalues.map((upvalue, i) =>
      this.present(
        target,
        closure.prototype.upvalues[i] ?? `upvalue ${i}`,
        upvalue.get()
      )
    );
  }

  private tableChildren(target: InspectTarget, table: LuaTable): DapVariable[] {
    // A script instance's members, not its compiled methods.
    const instance = instanceLabel(target.host, table) !== undefined;
    const entries = [...table.entries()]
      .filter(
        ([, value]) =>
          !(
            instance &&
            (value instanceof LuaClosure || value instanceof LuaHostFunction)
          )
      )
      .sort(([a], [b]) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
      );
    const out = entries
      .slice(0, MAX_CHILDREN)
      .map(([key, value]) =>
        this.present(
          target,
          typeof key === "string" ? key : `[${luaToString(key)}]`,
          value,
          instance ? table : undefined
        )
      );
    if (entries.length > MAX_CHILDREN) {
      out.push({
        name: "…",
        value: `${entries.length - MAX_CHILDREN} more`,
        variablesReference: 0,
      });
    }
    return out;
  }

  private boundChildren(
    target: InspectTarget,
    bound: BoundInstance
  ): DapVariable[] {
    const out: DapVariable[] = [
      { name: "path", value: bound.path, variablesReference: 0 },
      {
        name: "row",
        value: bound.row ? describe(bound.row) : "none",
        variablesReference: 0,
      },
    ];
    if (bound.handle !== undefined) {
      out.push({
        name: "handle",
        value: JSON.stringify(bound.handle),
        variablesReference: 0,
      });
    }
    if (bound.row?.typeId === bound.types.Squad) {
      out.push(
        this.presentJs(
          target,
          "squad state",
          target.host.itemState.squad(bound.row)
        )
      );
    }
    if (bound.children.length > 0) {
      out.push(
        this.presentJs(
          target,
          "children",
          bound.children.map((child) => child.object)
        )
      );
    }
    for (const [key, value] of Object.entries(bound)) {
      if (BOUND_PLUMBING.has(key) || typeof value === "function") {
        continue;
      }
      out.push(this.presentJs(target, key, value));
    }
    for (const [key, value] of bound.object.entries()) {
      out.push(this.present(target, `.${luaToString(key)}`, value));
    }
    return out;
  }

  private jsChildren(target: InspectTarget, value: unknown): DapVariable[] {
    let entries: [string, unknown][];
    if (Array.isArray(value)) {
      entries = value.map((item, i) => [`[${i}]`, item]);
    } else if (value instanceof Map) {
      entries = [...value].map(([key, item]) => [String(key), item]);
    } else if (value instanceof Set) {
      entries = [...value].map((item, i) => [`[${i}]`, item]);
    } else if (value !== null && typeof value === "object") {
      entries = Object.entries(value);
    } else {
      return [];
    }
    return entries
      .filter(([, item]) => typeof item !== "function")
      .slice(0, MAX_CHILDREN)
      .map(([key, item]) => this.presentJs(target, key, item));
  }
}
