// The shared host on the alpha's row type ids.
import {
  ScriptRuntime as SharedScriptRuntime,
  type ScriptRuntimeOptions as SharedScriptRuntimeOptions,
} from "../../../../host/runtime.ts";
import { ActivityBundleItemType } from "./tag_types.ts";

export type ScriptRuntimeOptions = Omit<SharedScriptRuntimeOptions, "types">;

export class ScriptRuntime extends SharedScriptRuntime {
  constructor(options: ScriptRuntimeOptions) {
    super({ ...options, types: ActivityBundleItemType });
  }
}
