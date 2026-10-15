// The global environment host Lua chunks run in, and the seam where a host
// binds native behaviour.

import type { HksBytecode } from "../bytecode/proto.ts";
import { LuaRuntimeError, type LuaState } from "../vm/interpreter.ts";
import {
  isTruthy,
  LuaClosure,
  type LuaHostCallback,
  type LuaHostCallContext,
  LuaHostFunction,
  LuaTable,
  type LuaValue,
  luaToString,
} from "../vm/values.ts";
import { globalReads } from "./script_shape.ts";

// Every name the alpha chunks read with GETGLOBAL, decoded from the
// instruction stream, with its site count; anything else trips missingGlobals.
export const OBSERVED_GLOBALS: readonly { name: string; sites: number }[] = [
  { name: "__coro_yield", sites: 595 },
  { name: "predicate_pack", sites: 310 },
  { name: "__class_definition_get", sites: 215 },
  { name: "print", sites: 152 },
  { name: "assert", sites: 152 },
  { name: "__enum_definition_get", sites: 94 },
  { name: "__schema_get", sites: 82 },
  { name: "len", sites: 72 },
  { name: "enum_of", sites: 32 },
  { name: "enum_to_int", sites: 10 },
  { name: "is_instance", sites: 7 },
  { name: "pick_random_count", sites: 6 },
  { name: "event_message", sites: 4 },
  { name: "allocate", sites: 4 },
  { name: "event_error", sites: 1 },
  { name: "event_warning", sites: 1 },
  { name: "schema", sites: 1 },
  { name: "vector4", sites: 1 },
];

export interface LuaHostInvocation {
  readonly args: readonly LuaValue[];
  readonly context: LuaHostCallContext;
  readonly method: string;
  readonly receiver: LuaHostObject;
}

export type LuaHostInvoke = (
  invocation: LuaHostInvocation
  // biome-ignore lint/suspicious/noConfusingVoidType: a native with no result returns nothing, as LuaHostCallback
) => readonly LuaValue[] | void;

export class LuaHostObject extends LuaTable {
  readonly hostName: string;
  private readonly invoke: LuaHostInvoke;
  private readonly methods = new Map<string, LuaHostFunction>();

  constructor(hostName: string, invoke: LuaHostInvoke) {
    super();
    this.hostName = hostName;
    this.invoke = invoke;
  }

  override get(key: LuaValue): LuaValue {
    const own = super.get(key);
    if (own !== undefined || typeof key !== "string") {
      return own;
    }
    return this.method(key);
  }

  private method(name: string): LuaHostFunction {
    const cached = this.methods.get(name);
    if (cached !== undefined) {
      return cached;
    }
    const fn = new LuaHostFunction(
      `${this.hostName}:${name}`,
      (args, context) => {
        // a method call passes the receiver as the first argument; drop it,
        // the invocation already names the receiver
        const withoutSelf = args[0] === this ? args.slice(1) : args;
        return this.invoke({
          receiver: this,
          method: name,
          args: withoutSelf,
          context,
        });
      }
    );
    this.methods.set(name, fn);
    return fn;
  }
}

interface LuaHostEnvironmentOptions {
  // Where `print` goes; dropped when not given.
  readonly log?: (message: string) => void;
}

function defaultLog(_message: string): void {
  // print with nowhere to go
}

export class LuaHostEnvironment {
  readonly globals = new LuaTable();
  // hks's per-type metatable for strings (LuaStateOptions.stringMetatable).
  readonly stringMetatable = new LuaTable();
  private readonly log: (message: string) => void;

  constructor(options: LuaHostEnvironmentOptions = {}) {
    this.log = options.log ?? defaultLog;
    this.stringMetatable.set(
      "__add",
      new LuaHostFunction("string.__add", ([left, right]) => [
        luaToString(left) + luaToString(right),
      ])
    );
    // print calls the global tostring per argument
    this.bind("tostring", (args) => [luaToString(args[0])]);
    this.bind("print", (args) => {
      this.log(args.map((arg) => luaToString(arg)).join("\t"));
    });
    this.bind("assert", (args) => {
      if (isTruthy(args[0])) {
        return args;
      }
      const message =
        args.length > 1 ? luaToString(args[1]) : "assertion failed!";
      throw new LuaRuntimeError(message);
    });
    // The VM's only suspension point. CALL_I_R1's B=C=1 form calls this with
    // no arguments and wants no results; see interpreter.ts.
    this.bind("__coro_yield", (_args, context) => {
      context.requestYield();
    });
  }

  bind(name: string, callback: LuaHostCallback): LuaHostFunction {
    const fn = new LuaHostFunction(name, callback);
    this.globals.set(name, fn);
    return fn;
  }

  bindValue(name: string, value: LuaValue): void {
    this.globals.set(name, value);
  }

  unboundGlobals(): readonly string[] {
    return OBSERVED_GLOBALS.filter(
      (entry) => this.globals.get(entry.name) === undefined
    ).map((entry) => entry.name);
  }
}

// The globals a chunk reads that `globals` leaves nil.
export function missingGlobals(
  chunk: HksBytecode,
  globals: LuaTable
): string[] {
  return [...globalReads(chunk).keys()]
    .filter((name) => globals.get(name) === undefined)
    .sort();
}

export function runMainChunk(vm: LuaState, chunk: HksBytecode): LuaValue {
  const [module] = vm.call(vm.loadChunk(chunk));
  return module;
}

interface LuaUpvalueProviderReport {
  // provider names that were written into a captured upvalue
  readonly applied: readonly string[];
  // provider names nothing in the module captures - a declared-but-unused
  // import, not a problem
  readonly unused: readonly string[];
}

// The module upvalue contract: the host calls upvalue_provider and writes each
// import into the matching upvalue; `false` is the unbound sentinel (821B8000 declares one unused).
export function applyUpvalueProvider(
  vm: LuaState,
  module: LuaValue
): LuaUpvalueProviderReport {
  if (!(module instanceof LuaTable)) {
    throw new LuaRuntimeError(
      `module is a ${typeof module}, not a table, so it has no upvalue_provider`
    );
  }
  const provider = module.get("upvalue_provider");
  if (provider === undefined) {
    return { applied: [], unused: [] };
  }
  if (!(provider instanceof LuaClosure)) {
    throw new LuaRuntimeError("upvalue_provider is not a Lua closure");
  }
  const [provided] = vm.call(provider);
  if (!(provided instanceof LuaTable)) {
    throw new LuaRuntimeError("upvalue_provider did not return a table");
  }
  const imports = new Map<string, LuaValue>();
  for (const [key, value] of provided.entries()) {
    if (typeof key === "string") {
      imports.set(key, value);
    }
  }
  const closures = collectClosures(module);
  const applied = new Set<string>();
  for (const closure of closures) {
    closure.prototype.upvalues.forEach((name, index) => {
      if (!imports.has(name)) {
        return;
      }
      closure.upvalues[index]?.set(imports.get(name));
      applied.add(name);
    });
  }
  const unfilled = new Set<string>();
  for (const closure of closures) {
    closure.prototype.upvalues.forEach((name, index) => {
      if (closure.upvalues[index]?.get() === false) {
        unfilled.add(name);
      }
    });
  }
  if (unfilled.size > 0) {
    throw new LuaRuntimeError(
      `upvalue(s) ${[...unfilled].map((name) => `"${name}"`).join(", ")} are still the compiler's unbound-import sentinel (false) after the provider ran`
    );
  }
  return {
    applied: [...applied],
    unused: [...imports.keys()].filter((name) => !applied.has(name)),
  };
}

function collectClosures(root: LuaTable): LuaClosure[] {
  const found: LuaClosure[] = [];
  const seen = new Set<LuaTable>([root]);
  const queue: LuaTable[] = [root];
  while (queue.length > 0) {
    const table = queue.shift();
    if (table === undefined) {
      break;
    }
    for (const [, value] of table.entries()) {
      if (value instanceof LuaClosure) {
        found.push(value);
      } else if (value instanceof LuaTable && !seen.has(value)) {
        seen.add(value);
        queue.push(value);
      }
    }
  }
  return found;
}
