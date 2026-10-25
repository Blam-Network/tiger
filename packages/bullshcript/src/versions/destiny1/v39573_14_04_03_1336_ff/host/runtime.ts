// The shared host on the PS4 ff build's row type ids.
import {
  ScriptRuntime as SharedScriptRuntime,
  type ScriptRuntimeOptions as SharedScriptRuntimeOptions,
} from "../../../../host/activity/runtime.ts";
import { ActivityBundleItemType } from "./tag_types.ts";

export type ScriptRuntimeOptions = Omit<SharedScriptRuntimeOptions, "types">;

export class ScriptRuntime extends SharedScriptRuntime {
  constructor(options: ScriptRuntimeOptions) {
    super({ ...options, types: ActivityBundleItemType });
  }
}
