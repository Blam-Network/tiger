// The sandbox libraries' globals, bound as stubs so a sandbox chunk loads:
// __schema_get/allocate/schema/is_instance (exact match), enum_to_int (via
// `enumValue`, else nil), event_message/_warning/_error (logged), vector4.

import type { LuaHostEnvironment } from "../../hks/env/host_env.ts";
import { LuaTable, type LuaValue, luaToString } from "../../hks/vm/values.ts";

// The table __schema_get hands out for a schema name, told apart from the
// instances allocated from it.
export class SchemaHandle extends LuaTable {}

export interface LibraryNativeOptions {
  enumValue?: (member: string) => number | undefined;
  log: (message: string) => void;
}

const FORMAT_SPEC = /%[sdif]/g;

// Fills a message's %s/%d/%i/%f specifiers in order, the way the scripts'
// own `("..."):format(...)` calls read.
export function formatEventMessage(args: readonly LuaValue[]): string {
  const [format, ...rest] = args;
  let next = 0;
  return luaToString(format).replace(FORMAT_SPEC, (spec) => {
    const value = rest[next];
    next += 1;
    return value === undefined ? spec : luaToString(value);
  });
}

export function bindLibraryNatives(
  environment: LuaHostEnvironment,
  options: LibraryNativeOptions
): void {
  const handles = new Map<string, SchemaHandle>();
  const allocatedFrom = new WeakMap<LuaTable, SchemaHandle>();
  const schemaOf = (value: LuaValue): SchemaHandle | undefined =>
    value instanceof LuaTable ? allocatedFrom.get(value) : undefined;

  environment.bind("__schema_get", (args) => {
    const name = luaToString(args[0]);
    let handle = handles.get(name);
    if (handle === undefined) {
      handle = new SchemaHandle();
      handles.set(name, handle);
    }
    return [handle];
  });
  environment.bind("allocate", (args) => {
    const instance = new LuaTable();
    const schema = args[0];
    if (schema instanceof SchemaHandle) {
      allocatedFrom.set(instance, schema);
    }
    return [instance];
  });
  environment.bind("schema", (args) => [schemaOf(args[0])]);
  environment.bind("is_instance", (args) => [
    args[1] instanceof SchemaHandle && schemaOf(args[0]) === args[1],
  ]);
  environment.bind("enum_to_int", (args) => [
    typeof args[0] === "string" ? options.enumValue?.(args[0]) : undefined,
  ]);
  for (const level of ["message", "warning", "error"] as const) {
    environment.bind(`event_${level}`, (args) => {
      options.log(`event ${level}: ${formatEventMessage(args)}`);
    });
  }
  environment.bind("vector4", (args) => {
    const vector = new LuaTable();
    for (const [index, axis] of ["x", "y", "z", "w"].entries()) {
      vector.set(axis, args[index] ?? 0);
    }
    return [vector];
  });
}
