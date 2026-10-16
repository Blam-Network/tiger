// Destiny PS4 patch 01.29, 2016-09-28 (Rise of Iron, CUSA00219). Like TU0,
// the packages ship no host scripts: this build runs the shared hks layer and
// host (on its own row type ids) on scripts the BungieScript compiler produces.
export const k_build_string = "52553.16.09.28.1551.evil";

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
  type ScriptFileSummary,
  type ScriptFolder,
  type ScriptLookups,
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
export * from "./v52553_16_09_28_1551_evil/host/runtime.ts";
export { ScriptRuntime as default } from "./v52553_16_09_28_1551_evil/host/runtime.ts";
export * from "./v52553_16_09_28_1551_evil/host/tag_types.ts";
