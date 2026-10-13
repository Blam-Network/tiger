// One client's DAP conversation with a ScriptDebugger. The transport hands
// each parsed message to handle() and sends whatever comes out.

import type { ScriptDebugger } from "./debugger.ts";
import type {
  DapEvent,
  DapRequest,
  DapResponse,
  DapSourceBreakpoint,
} from "./protocol.ts";

type Args = Record<string, unknown>;

// Requests that can change rows: the embedder sends them on at once.
const CHANGING_COMMANDS = new Set([
  "continue",
  "evaluate",
  "next",
  "stepIn",
  "stepOut",
  "terminateThreads",
  "tiger/activatePhase",
  "tiger/command",
  "tiger/incident",
  "tiger/kill",
  "tiger/restart",
  "tiger/rowAction",
  "tiger/stepTick",
  "tiger/wake",
]);

const number = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

export class DapSession {
  private readonly debugger: ScriptDebugger;
  private readonly send: (message: DapEvent | DapResponse) => void;
  private seq = 0;
  private readonly removeSink: () => void;
  // Trace and sent rows are many: only a client that asks gets them pushed.
  private subscriptions = { sent: false, trace: true };

  constructor(
    scriptDebugger: ScriptDebugger,
    send: (message: DapEvent | DapResponse) => void
  ) {
    this.debugger = scriptDebugger;
    this.send = send;
    this.removeSink = scriptDebugger.addSink({
      event: (event, body) => {
        if (event === "tiger/trace" && !this.subscriptions.trace) {
          return;
        }
        if (event === "tiger/sent" && !this.subscriptions.sent) {
          return;
        }
        if (event === "breakpoint-set") {
          return;
        }
        this.event(event, body);
      },
    });
  }

  close(): void {
    this.removeSink();
  }

  private event(event: string, body?: unknown): void {
    this.seq += 1;
    this.send({ seq: this.seq, type: "event", event, body });
  }

  handle(message: unknown): void {
    const request = message as DapRequest;
    if (request?.type !== "request" || typeof request.command !== "string") {
      return;
    }
    let body: unknown;
    try {
      body = this.dispatch(request.command, request.arguments ?? {});
    } catch (error) {
      this.respond(request, false, undefined, errorText(error));
      return;
    }
    this.respond(request, true, body);
    if (CHANGING_COMMANDS.has(request.command)) {
      this.debugger.changed(request.arguments?.targetId);
    }
    if (request.command === "initialize") {
      this.event("initialized");
    }
  }

  private respond(
    request: DapRequest,
    success: boolean,
    body?: unknown,
    message?: string
  ): void {
    this.seq += 1;
    this.send({
      seq: this.seq,
      type: "response",
      request_seq: request.seq,
      command: request.command,
      success,
      body,
      message,
    });
  }

  private dispatch(command: string, args: Args): unknown {
    const dbg = this.debugger;
    switch (command) {
      case "initialize":
        return {
          supportsConditionalBreakpoints: true,
          supportsConfigurationDoneRequest: true,
          supportsEvaluateForHovers: true,
          supportsHitConditionalBreakpoints: true,
          supportsLoadedSourcesRequest: true,
          supportsLogPoints: true,
          supportsTerminateThreadsRequest: true,
        };
      case "attach":
      case "launch":
      case "configurationDone":
        return;
      case "disconnect":
        this.close();
        return;
      case "threads":
        return { threads: dbg.threads() };
      case "stackTrace": {
        const frames = dbg.stackTrace(number(args.threadId) ?? -1);
        return { stackFrames: frames, totalFrames: frames.length };
      }
      case "scopes":
        return { scopes: dbg.scopes(number(args.frameId) ?? -1) };
      case "variables":
        return {
          variables: dbg.variables(number(args.variablesReference) ?? -1),
        };
      case "setBreakpoints": {
        const source = args.source as { path?: string } | undefined;
        if (!source?.path) {
          throw new Error("setBreakpoints needs source.path");
        }
        return {
          breakpoints: dbg.setBreakpoints(
            source.path,
            (args.breakpoints as DapSourceBreakpoint[] | undefined) ?? []
          ),
        };
      }
      case "continue":
        dbg.continue(args.targetId);
        return { allThreadsContinued: true };
      case "pause":
        dbg.pause(args.targetId);
        return;
      case "next":
        dbg.step(number(args.threadId) ?? -1, "over");
        return;
      case "stepIn":
        dbg.step(number(args.threadId) ?? -1, "in");
        return;
      case "stepOut":
        dbg.step(number(args.threadId) ?? -1, "out");
        return;
      case "terminateThreads":
        for (const id of (args.threadIds as number[] | undefined) ?? []) {
          dbg.killThread(id);
        }
        return;
      case "evaluate":
        if (
          String(args.expression ?? "")
            .trim()
            .startsWith("/")
        ) {
          return {
            result: dbg.command(String(args.expression), args.targetId),
            variablesReference: 0,
          };
        }
        return dbg.evaluate(
          String(args.expression ?? ""),
          number(args.frameId),
          args.targetId
        );
      case "loadedSources":
        return { sources: dbg.loadedSources() };
      case "source": {
        const source = args.source as { path?: string } | undefined;
        const path = source?.path ?? "";
        const content = dbg.sourceText(path);
        if (content === undefined) {
          throw new Error(`no source for ${path}`);
        }
        return { content, mimeType: "text/x-bungiescript" };
      }
      case "tiger/targets":
        return { targets: dbg.targetList() };
      case "tiger/activity":
        return dbg.activity(args.targetId);
      case "tiger/world":
        return dbg.world(args.targetId);
      case "tiger/trace":
        return { entries: dbg.trace(args.targetId) };
      case "tiger/subscribe":
        this.subscriptions = {
          sent: args.sent === true,
          trace: args.trace !== false,
        };
        return;
      case "tiger/bundles":
        return { bundles: dbg.bundles(args.targetId) };
      case "tiger/rowAction":
        return {
          result: dbg.rowAction(
            args.targetId,
            String(args.bundle ?? ""),
            number(args.typeId) ?? -1,
            number(args.typeIndex) ?? -1,
            String(args.action ?? ""),
            (args.args as unknown[] | undefined) ?? []
          ),
        };
      case "tiger/incidentKinds":
        return { kinds: dbg.incidentKinds() };
      case "tiger/incident":
        dbg.incident(
          args.targetId,
          String(args.kind ?? ""),
          (args.params as Record<string, unknown> | undefined) ?? {}
        );
        return;
      case "tiger/activatePhase":
        return {
          result: dbg.activatePhase(
            args.targetId,
            typeof args.phase === "number"
              ? args.phase
              : String(args.phase ?? "")
          ),
        };
      case "tiger/commands":
        return { commands: dbg.commandList() };
      case "tiger/command":
        return { output: dbg.command(String(args.line ?? ""), args.targetId) };
      case "tiger/stepTick":
        dbg.stepTick(args.targetId);
        return;
      case "tiger/wake":
        dbg.wakeThread(number(args.threadId) ?? -1);
        return;
      case "tiger/kill":
        dbg.killThread(number(args.threadId) ?? -1);
        return;
      case "tiger/restart":
        return { threadId: dbg.restartThread(number(args.threadId) ?? -1) };
      default: {
        const extra = dbg.request(command, args);
        if (extra) {
          return extra.body;
        }
        throw new Error(`unknown command ${command}`);
      }
    }
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
