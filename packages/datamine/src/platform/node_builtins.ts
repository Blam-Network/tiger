// Node built-ins for the code that also runs in browsers. process.getBuiltinModule loads them on
// Node without a static import a bundler would follow, and anywhere else each one is undefined.
// Nothing is looked up until it is first asked for.
import { DatamineError } from "../datamine_error.ts";

interface s_node_process {
  getBuiltinModule?: (id: string) => unknown;
  off?: (event: "exit", listener: () => void) => unknown;
  on?: (event: "exit", listener: () => void) => unknown;
}

const g_node_builtins = new Map<string, unknown>();

function node_process(): s_node_process | undefined {
  return (globalThis as { process?: s_node_process }).process;
}

export function node_builtin<T>(id: string): T | undefined {
  if (!g_node_builtins.has(id)) {
    g_node_builtins.set(id, node_process()?.getBuiltinModule?.(id));
  }
  return g_node_builtins.get(id) as T | undefined;
}

// The built-in, or a DatamineError naming the feature that needed it.
export function node_builtin_required<T>(id: string, feature: string): T {
  const builtin = node_builtin<T>(id);
  if (builtin === undefined) {
    throw new DatamineError(`${feature} needs ${id}, which this runtime lacks`);
  }
  return builtin;
}

export function node_thread_id(): number | undefined {
  return node_builtin<typeof import("node:worker_threads")>(
    "node:worker_threads"
  )?.threadId;
}

export function node_async_local_storage():
  | typeof import("node:async_hooks").AsyncLocalStorage
  | undefined {
  return node_builtin<typeof import("node:async_hooks")>("node:async_hooks")
    ?.AsyncLocalStorage;
}

// Runs the handler when the process exits. Returns the remover, or undefined where there is no
// process to watch.
export function process_exit_listener_add(
  handler: () => void
): (() => void) | undefined {
  const process = node_process();
  if (!(process?.on && process.off)) {
    return;
  }
  process.on("exit", handler);
  return () => {
    process.off?.("exit", handler);
  };
}
