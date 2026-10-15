// The shared host on 01.29's row type ids.
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
