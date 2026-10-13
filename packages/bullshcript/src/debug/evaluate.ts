// Debugger expressions, in BungieScript: compiled by bullshcript's own
// compiler as the body of a method on the frame's script instance, so they
// read exactly like the source (`sq_x.alive_count() == 0`, bare members,
// `!=`). The frame's locals come in as the method's parameters; `self` is
// the frame's instance, or the activity's root script with no frame.
//
// An expression can call natives, and natives can send rows: evaluating is
// not side-effect free.

import { compileScriptFiles } from "../bungiescript/script_files.ts";
import { applyUpvalueProvider, runMainChunk } from "../hks/host_env.ts";
import { parseLuaChunk } from "../hks/undump.ts";
import { LuaClosure, LuaTable, type LuaValue } from "../hks/values.ts";
import type { LuaFrame, LuaVm } from "../hks/vm.ts";
import type { LuaEncounterHost } from "../host/encounter_host.ts";
import { activeLocals } from "./inspect.ts";

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const EVAL_PATH = "es/debugger/debugger_eval.es";
const NEWLINES = /\r?\n/g;
const EVAL_METHOD = "debugger_eval";
// Compiled expressions kept per VM, by text and parameters.
const CACHE_KEEP = 256;

export interface EvaluationScope {
  frame?: LuaFrame;
  // the pc the frame stands at, for which locals are live
  pc?: number;
}

export class BsEvaluationError extends Error {}

const caches = new WeakMap<LuaVm, Map<string, LuaClosure>>();

// The frame's locals a BungieScript expression may name: the source's own
// (the compiler's internal ones, `(for index)` and the like, are not names).
function frameLocals(
  scope: EvaluationScope
): { name: string; value: LuaValue }[] {
  const { frame } = scope;
  if (!frame) {
    return [];
  }
  return activeLocals(frame, scope.pc ?? frame.currentPc)
    .filter(({ name }) => IDENTIFIER.test(name) && name !== "self")
    .map(({ name, register }) => ({ name, value: frame.registers[register] }));
}

function selfOf(host: LuaEncounterHost, scope: EvaluationScope): LuaValue {
  const { frame } = scope;
  if (frame) {
    const local = activeLocals(frame, scope.pc ?? frame.currentPc).find(
      ({ name }) => name === "self"
    );
    if (local) {
      return frame.registers[local.register];
    }
  }
  return host.rootInstance ?? host.instances.values().next().value;
}

function compileExpression(
  vm: LuaVm,
  expression: string,
  params: readonly string[]
): LuaClosure {
  const key = `${params.join(",")}\u0000${expression}`;
  let cache = caches.get(vm);
  if (!cache) {
    cache = new Map();
    caches.set(vm, cache);
  }
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const text = `# es\\debugger\\debugger_eval.es\ndef ${EVAL_METHOD}(${params.join(", ")}):\n    return ${expression.replace(NEWLINES, " ")}\n`;
  const compiled = compileScriptFiles([{ path: EVAL_PATH, text }]);
  const errors = compiled.diagnostics.filter((d) => d.severity === "error");
  if (errors.length > 0) {
    throw new BsEvaluationError(errors.map((d) => d.message).join("; "));
  }
  const chunk = parseLuaChunk(compiled.chunkFor(EVAL_PATH), "DEBUGGER");
  const module = runMainChunk(vm, chunk);
  applyUpvalueProvider(vm, module);
  const methods =
    module instanceof LuaTable ? module.get("instance") : undefined;
  const method =
    methods instanceof LuaTable ? methods.get(EVAL_METHOD) : undefined;
  if (!(method instanceof LuaClosure)) {
    throw new BsEvaluationError("the expression compiled to no method");
  }
  if (cache.size >= CACHE_KEEP) {
    cache.clear();
  }
  cache.set(key, method);
  return method;
}

// Throws BsEvaluationError for what does not compile, the VM's error for what
// fails as it runs.
export function evaluate(
  host: LuaEncounterHost,
  expression: string,
  scope: EvaluationScope = {}
): LuaValue {
  const locals = frameLocals(scope);
  const method = compileExpression(
    host.vm,
    expression.trim(),
    locals.map(({ name }) => name)
  );
  return host.vm.call(method, [
    selfOf(host, scope),
    ...locals.map(({ value }) => value),
  ])[0];
}
