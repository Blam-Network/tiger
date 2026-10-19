// Destiny TU0, 2014-07-03 (Xbox 360 retail). The TU0 packages ship no host
// scripts, so this build runs the shared hks layer and host (on its own row
// type ids) on scripts the package-level BungieScript compiler produces.
export const k_build_string = "41375.14.07.03.1501.live";

export {
  type ActivityPhaseStart,
  type ActivityStart,
  type ActivityStartData,
  activityStartData,
  sliceRegionHash,
} from "../../bungiescript/activity_start.ts";
export type {
  BsBinaryOp,
  BsDecl,
  BsDeclKind,
  BsExpr,
  BsFile,
  BsFileKind,
  BsMember,
  BsMemberCounts,
  BsStmt,
  BsType,
} from "../../bungiescript/ast.ts";
export {
  type GeneratedLua,
  generateLua,
} from "../../bungiescript/codegen.ts";
export {
  type BsCompiledDecl,
  type BsCompileOptions,
  type BsCompileResult,
  type BsDiagnostic,
  type BsSourceFile,
  compileBungieScript,
  lineMapper,
} from "../../bungiescript/compile.ts";
export {
  COMPILED_BS_FORMAT,
  COMPILED_BS_INDEX,
  type CompiledBsDecl,
  CompiledBsError,
  type CompiledBsFile,
  type CompiledBsIndex,
  type CompiledBsWriteOptions,
  type CompiledScriptSet,
  compiledBsIndex,
  compiledScriptSetOf,
  formatDiagnostic,
  readCompiledBs,
  writeCompiledBs,
} from "../../bungiescript/compiled_bs.ts";
export {
  BsCompileError,
  type BsToken,
  type BsTokenKind,
  tokenize,
} from "../../bungiescript/lexer.ts";
export {
  type BsNativeBase,
  type BsNativeKind,
  type BsNativeType,
  NATIVE_BASES,
  NATIVE_TYPES,
  nativeBaseNamed,
  nativeTypeNamed,
} from "../../bungiescript/native_types.ts";
export {
  bsFileKind,
  implicitDeclName,
  parseBungieScript,
  scriptStem,
} from "../../bungiescript/parser.ts";
export {
  BUILTINS,
  chunkNameOf,
  modulePathOf,
  NATIVE_BASE_METHODS,
  NATIVE_DELEGATES,
  Project,
  type ProjectDecl,
  type Resolution,
} from "../../bungiescript/project.ts";
export { py2DictOrder, py2StringHash } from "../../bungiescript/pydict.ts";
export {
  type BsSchema,
  type BsSchemaDefault,
  type BsSchemaMember,
  type BsSchemaMemberCounts,
  type BsSchemaMemberKind,
  type BsSchemaSide,
  emitSchema,
} from "../../bungiescript/schema.ts";
export {
  type CompiledScriptFiles,
  compileScriptFiles,
  type ScriptFileSource,
} from "../../bungiescript/script_files.ts";
export {
  bundleHashOf,
  fukugenDaihonDir,
  loadScriptFolder,
  normalizeScriptPath,
  parseScriptFile,
  readScriptSources,
  type ScriptDecl,
  type ScriptFile,
  type ScriptFileSummary,
  type ScriptFolder,
  type ScriptLookups,
  type ScriptStub,
  type ScriptTagEntry,
  scriptChunkName,
  scriptLookups,
} from "../../bungiescript/script_folder.ts";
export {
  chunkLineOf,
  fileLineOf,
} from "../../bungiescript/stand_in.ts";
export {
  type BsImportKind,
  type BsRegistryEntry,
  IMPORT_REGISTRY,
} from "../../bungiescript/types.ts";
export * from "../../hks/bytecode/proto.ts";
export { readBytecode, walkProtos } from "../../hks/bytecode/reader.ts";
export * from "../../hks/bytecode/writer.ts";
export {
  compile,
  compileLua,
  compileLuaChunk,
  LuaCompileError,
  type LuaCompileOptions,
} from "../../hks/compiler/compile.ts";
export { missingGlobals, OBSERVED_GLOBALS } from "../../hks/env/host_env.ts";
export { formatG, formatLuaNumber } from "../../hks/env/printf.ts";
export { globalReads } from "../../hks/env/script_shape.ts";
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
export {
  missionNamespaces,
  resolveInstanceField,
  scriptNamespaces,
} from "../../host/bound/bindings.ts";
export {
  type LibraryNativeOptions,
  SchemaHandle,
} from "../../host/natives/library_natives.ts";
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
export * from "./v41375_14_07_03_1501_live/host/runtime.ts";
export { ScriptRuntime as default } from "./v41375_14_07_03_1501_live/host/runtime.ts";
export * from "./v41375_14_07_03_1501_live/host/tag_types.ts";
