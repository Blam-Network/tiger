// Destiny alpha, 2013-12-02 (Xbox 360). The only build whose packages ship
// compiled scripts, so the decompiler and the BungieScript lifter live here;
// the hks layer, the host and the compiler are shared at package level.
export const k_build_string = "36735.13.12.02.1953.alpha";

export * from "../../hks/bytecode/proto.ts";
export { readBytecode, walkProtos } from "../../hks/bytecode/reader.ts";
export * from "../../hks/bytecode/writer.ts";
export * from "../../hks/source/script_source.ts";
export type {
  ActivityPlayer,
  EncounterScriptHostOptions,
  HostDebugSnapshot,
} from "../../host/activity/encounter_host.ts";
export {
  childScriptsFor,
  EncounterScriptHost,
  loadScriptGraph,
} from "../../host/activity/encounter_host.ts";
export type {
  HostClock,
  KillAssist,
  KillFilterDetails,
  KillParty,
} from "../../host/natives/natives.ts";
export * from "../../host/state/items.ts";
export type { ActivityOptionSet } from "../../host/tags/activity_options.ts";
export * from "../../host/tags/item_key.ts";
export * from "../../host/tags/name_hash.ts";
export * from "../../host/tags/tag_types.ts";
export {
  type LiftContext,
  type LiftedDecl,
  type LiftedFile,
  type LiftedTypeDecl,
  type LiftMember,
  type LiftOptions,
  type LiftPackageType,
  type LiftScriptInput,
  type LiftSide,
  type LiftValue,
  liftScript,
  numberText,
  renderLiftedFile,
  typeDeclLines,
} from "./v36735_13_12_02_1953_alpha/bungiescript/lift.ts";
export {
  type LuaCall,
  type LuaExpr,
  type LuaFunction,
  type LuaModule,
  LuaReadError,
  type LuaStmt,
  readLuaModule,
} from "./v36735_13_12_02_1953_alpha/bungiescript/lua_reader.ts";
export {
  type BsNativeBaseIds,
  type BsNativeTypeIds,
  NATIVE_BASE_IDS,
  NATIVE_TYPE_IDS,
  nativeBaseById,
  nativeTypeById,
} from "./v36735_13_12_02_1953_alpha/bungiescript/native_ids.ts";
export * from "./v36735_13_12_02_1953_alpha/host/runtime.ts";
export { ScriptRuntime as default } from "./v36735_13_12_02_1953_alpha/host/runtime.ts";
export * from "./v36735_13_12_02_1953_alpha/host/tag_types.ts";
export * from "./v36735_13_12_02_1953_alpha/lua/decompile.ts";
