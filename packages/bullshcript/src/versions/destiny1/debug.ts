// The script debugger: attach it to script hosts, give each client a
// DapSession over whatever transport the embedder runs (src/debug).

export { DapSession } from "../../debug/dap.ts";
export {
  type AttachOptions,
  type BundleInfo,
  type DebugEventSink,
  type DebuggerCommand,
  ScriptDebugger,
  type ScriptDebuggerOptions,
} from "../../debug/debugger.ts";
export { evaluate } from "../../debug/evaluate.ts";
export type * from "../../debug/protocol.ts";
