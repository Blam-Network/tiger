// Actor command scripts. execute() takes either a ControlPoint item, which is a
// compiled command script in the tags, or `self.__cs`, a builder the host gives
// every script instance and no chunk ever assigns.

import { LuaHostObject } from "../../hks/env/host_env.ts";
import {
  isTruthy,
  type LuaValue,
  luaToString,
  toNumber,
} from "../../hks/vm/values.ts";
import type { BoundRow } from "../bound/bindings.ts";
import {
  type CommandScriptAtom,
  type ItemRef,
  MAX_COMMAND_SCRIPT_ATOMS,
} from "../state/items.ts";
import { fnv1, parseHashLiteral } from "../tags/name_hash.ts";
import type {
  ActivityBundleItemTypes,
  ControlPointCommandScript,
} from "../tags/tag_types.ts";
import { show } from "./native_support.ts";

export const COMMAND_SCRIPT_BUILDER_FIELD = "__cs";

// ability() names no ability slot. The client reads -1 as "any"; the
// point-targeted form is assumed to do the same.
const ANY_SLOT = -1;

// A name argument: hashed, unless it spells a hash out ("0x4B6A2C60").
function nameHash(value: LuaValue): number {
  const text = luaToString(value);
  return parseHashLiteral(text) ?? fnv1(text);
}

export type CommandScriptIndex = ReadonlyMap<
  string,
  readonly CommandScriptAtom[]
>;

export function commandScriptIndex(
  scripts: readonly ControlPointCommandScript[]
): CommandScriptIndex {
  return new Map(
    scripts.map((script) => [
      `${script.bundle >>> 0}:${script.typeIndex}`,
      script.atoms,
    ])
  );
}

export function controlPointAtoms(
  types: ActivityBundleItemTypes,
  index: CommandScriptIndex,
  row: BoundRow | undefined
): readonly CommandScriptAtom[] | undefined {
  if (row?.typeId !== types.ControlPoint) {
    return;
  }
  return index.get(`${row.bundle >>> 0}:${row.typeIndex}`);
}

// The client resolves atom points only on ActionPoint and ControlPoint
// items (sub_836D1BE0).
function pointRow(
  types: ActivityBundleItemTypes,
  row: BoundRow | undefined
): ItemRef | undefined {
  if (row?.typeId !== types.ControlPoint && row?.typeId !== types.ActionPoint) {
    return;
  }
  return { bundle: row.bundle, typeId: row.typeId, typeIndex: row.typeIndex };
}

const builders = new WeakMap<LuaHostObject, CommandScriptBuilder>();

export function commandScriptBuilderOf(
  value: LuaValue
): CommandScriptBuilder | undefined {
  return value instanceof LuaHostObject ? builders.get(value) : undefined;
}

// `self.__cs`. Verbs from the dropship and boss chunks (821B802D, 821B801F,
// 821B8030); each appends atoms, clear() starts over.
export class CommandScriptBuilder {
  readonly object: LuaHostObject;
  private atoms: CommandScriptAtom[] = [];
  private readonly types: ActivityBundleItemTypes;
  private readonly path: string;
  private readonly rowOf: (value: LuaValue) => BoundRow | undefined;
  private readonly pathAtoms: (
    row: BoundRow | undefined
  ) => readonly CommandScriptAtom[] | undefined;
  private readonly note: (line: string) => void;

  constructor(
    types: ActivityBundleItemTypes,
    path: string,
    rowOf: (value: LuaValue) => BoundRow | undefined,
    pathAtoms: (
      row: BoundRow | undefined
    ) => readonly CommandScriptAtom[] | undefined,
    note: (line: string) => void
  ) {
    this.types = types;
    this.path = path;
    this.rowOf = rowOf;
    this.pathAtoms = pathAtoms;
    this.note = note;
    this.object = new LuaHostObject(path, ({ method, args }) => [
      this.invoke(method, args),
    ]);
    builders.set(this.object, this);
  }

  get script(): readonly CommandScriptAtom[] {
    return this.atoms;
  }

  private invoke(method: string, args: readonly LuaValue[]): LuaValue {
    const call = `${this.path}:${method}(${args.map(show).join(", ")})`;
    const number = (value: LuaValue) => toNumber(value) ?? 0;
    switch (method) {
      case "clear":
        this.atoms = [];
        break;
      case "snap_to": {
        const point = pointRow(this.types, this.rowOf(args[0]));
        if (!point) {
          this.note(`${call} (not a point row, skipped)`);
          return true;
        }
        this.append(call, {
          kind: 0,
          point,
          index: number(args[1]),
          end: { kind: 0 },
        });
        break;
      }
      // No chunk or client code expands a path; appending the path item's
      // own compiled atoms is a guess.
      case "follow_path": {
        const atoms = this.pathAtoms(this.rowOf(args[0]));
        if (!atoms) {
          this.note(`${call} (not a ControlPoint row, skipped)`);
          return true;
        }
        this.append(call, ...atoms);
        break;
      }
      case "sleep": {
        const seconds = number(args[0]);
        this.append(call, { kind: 2, seconds, end: { kind: 2, seconds } });
        break;
      }
      // move_to(point, index, stop): the move atom (kind 3).
      case "move_to": {
        const point = pointRow(this.types, this.rowOf(args[0]));
        if (!point) {
          this.note(`${call} (not a point row, skipped)`);
          return true;
        }
        this.append(call, {
          kind: 3,
          point,
          index: number(args[1]),
          stop: isTruthy(args[2]),
          end: { kind: 0 },
        });
        break;
      }
      // face(point, index): turn to a path's point (kind 8). Retail's
      // dropships face their exit path's first point before the exit ability.
      case "face": {
        const point = pointRow(this.types, this.rowOf(args[0]));
        if (!point) {
          this.note(`${call} (not a point row, skipped)`);
          return true;
        }
        this.append(call, {
          kind: 8,
          point,
          index: number(args[1]),
          end: { kind: 0 },
        });
        break;
      }
      // set_flag(which, value): the tags' flag command (kind 5). Retail sends
      // (3, 3) around every dropship's moves and abilities; what the flags do
      // is not known.
      case "set_flag":
        this.append(call, {
          kind: 5,
          which: number(args[0]),
          value: number(args[1]),
          end: { kind: 0 },
        });
        break;
      case "set_channel_scalar": {
        const value = number(args[1]);
        this.append(call, {
          kind: 7,
          channel: nameHash(args[0]),
          values: [value, value, value, value],
          end: { kind: 0 },
        });
        break;
      }
      // scripted_sequence(name): the kind-1 atom (sub_82ACD278, ability policy 61).
      // No chunk calls it; the verb's name is a guess.
      case "scripted_sequence":
        this.append(call, {
          kind: 1,
          name: nameHash(args[0]),
          end: { kind: 0 },
        });
        break;
      case "ability":
        this.append(call, {
          kind: 9,
          name: nameHash(args[0]),
          argument: nameHash(args[1]),
          slot: ANY_SLOT,
          index: 0,
          end: { kind: 0 },
        });
        break;
      case "point_targeted_ability": {
        const point = pointRow(this.types, this.rowOf(args[2]));
        if (!point) {
          this.note(`${call} (not a point row, sent without a point)`);
        }
        this.append(call, {
          kind: 9,
          name: fnv1(luaToString(args[0])),
          argument: fnv1(luaToString(args[1])),
          ...(point ? { point } : {}),
          slot: ANY_SLOT,
          index: number(args[3]),
          end: { kind: 0 },
        });
        break;
      }
      // Ends the last atom after d seconds. A copy, so an atom already sent
      // under a cookie never changes.
      case "terminate_delay": {
        const last = this.atoms.at(-1);
        if (last) {
          this.atoms[this.atoms.length - 1] = {
            ...last,
            end: { kind: 2, seconds: number(args[0]) },
          };
        }
        break;
      }
      // Ends the last atom with end kind 1 rather than its own duration:
      // retail's dropship exits open with set_flag(3, 3) ended this way.
      case "terminate_immediate": {
        const last = this.atoms.at(-1);
        if (last) {
          this.atoms[this.atoms.length - 1] = { ...last, end: { kind: 1 } };
        }
        break;
      }
      default:
        this.note(`${call} (unknown command script verb)`);
        return true;
    }
    this.note(`${call} -> ${this.atoms.length} atoms`);
    return true;
  }

  private append(call: string, ...atoms: readonly CommandScriptAtom[]): void {
    const room = MAX_COMMAND_SCRIPT_ATOMS - this.atoms.length;
    if (atoms.length > room) {
      this.note(
        `${call} (the client holds ${MAX_COMMAND_SCRIPT_ATOMS} atoms, ${atoms.length - Math.max(0, room)} dropped)`
      );
    }
    this.atoms.push(...atoms.slice(0, Math.max(0, room)));
  }
}
