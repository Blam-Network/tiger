// Destiny TU0, 2014-07-03 (Xbox 360 retail). The TU0 packages ship no host
// scripts, so this build runs the shared hks layer and host (on its own row
// type ids) on scripts the package-level BungieScript compiler produces.
export const k_build_string = "41375.14.07.03.1501.live";

export type {
  BsBinaryOp,
  BsDecl,
  BsDeclKind,
  BsExpr,
  BsFile,
  BsFileKind,
  BsMember,
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
  type ScriptFolder,
  type ScriptLookups,
  type ScriptPathed,
  type ScriptStub,
  type ScriptTagEntry,
  scriptChunkName,
  scriptLookups,
} from "../../bungiescript/script_folder.ts";
export {
  type BsImportKind,
  type BsRegistryEntry,
  IMPORT_REGISTRY,
} from "../../bungiescript/types.ts";
export {
  compile,
  compileLua,
  compileLuaChunk,
  LuaCompileError,
  type LuaCompileOptions,
} from "../../hks/compile.ts";
export * from "../../hks/encode.ts";
export { missingGlobals, OBSERVED_GLOBALS } from "../../hks/host_env.ts";
export { formatG, formatLuaNumber } from "../../hks/printf.ts";
export { globalReads } from "../../hks/script_shape.ts";
export * from "../../hks/script_source.ts";
export * from "../../hks/types.ts";
export { parseLuaChunk, walkPrototypes } from "../../hks/undump.ts";
export type { ActivityOptionSet } from "../../host/activity_options.ts";
export type {
  ActivityPlayer,
  LuaEncounterHostOptions,
  LuaHostDebugSnapshot,
} from "../../host/encounter_host.ts";
export {
  childScriptsFor,
  LuaEncounterHost,
  loadScriptGraph,
} from "../../host/encounter_host.ts";
export * from "../../host/item_key.ts";
export * from "../../host/items.ts";
export {
  type LibraryNativeOptions,
  LuaSchemaHandle,
} from "../../host/library_natives.ts";
export * from "../../host/name_hash.ts";
export type {
  KillAssist,
  KillFilterDetails,
  KillParty,
  LuaHostClock,
} from "../../host/natives.ts";
export * from "../../host/tag_types.ts";
export * from "./v41375_14_07_03_1501_live/host/runtime.ts";
export { ScriptRuntime as default } from "./v41375_14_07_03_1501_live/host/runtime.ts";
export * from "./v41375_14_07_03_1501_live/host/tag_types.ts";
