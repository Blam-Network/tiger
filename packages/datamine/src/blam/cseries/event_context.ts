// Event context stack, ported from c_event_context / event_context_get in
// cseries events. The original keeps a thread_local stack and pops in a destructor; here the
// stack lives in AsyncLocalStorage, so concurrent async flows stay apart and the pop is
// implicit when the callback returns.
import { AsyncLocalStorage } from "node:async_hooks";

export interface s_event_context {
  description: string;
  display_to_console: boolean;
  type: string;
}

// Bungie: g_event_context_stack[32], s_event_context type[64] and description[128].
export const k_event_context_stack_maximum_depth = 32;
export const k_event_context_type_maximum_size = 64;
export const k_event_context_description_maximum_size = 128;

// event_generated_handle_console builds its context in 256 bytes, the log forms use
// k_error_message_buffer_maximum_size (2048). Names are ours.
export const k_event_context_console_text_maximum_size = 256;
export const k_event_context_log_text_maximum_size = 2048;

export type t_event_context_destination = "console" | "log" | "remote_log";

export interface s_event_context_options {
  display_to_console?: boolean;
}

const g_event_context_storage = new AsyncLocalStorage<
  readonly s_event_context[]
>();

let g_event_context_overflow_handler: (() => void) | undefined;

// The original dhalts on overflow and then counts the push as a failure so the pop still
// balances; with no push there is nothing to balance, the handler is only told.
export function event_context_set_overflow_handler(
  handler: (() => void) | undefined
): void {
  g_event_context_overflow_handler = handler;
}

// csstrnzcpy keeps size - 1 characters.
function truncate_text(text: string, maximum_size: number): string {
  return text.slice(0, maximum_size - 1);
}

// c_event_context: pushes for the duration of fn, including across awaits when fn
// returns a promise. Always run() rather than enterWith(), so the push cannot leak into
// the caller's flow.
export function event_context_run<T>(
  type: string,
  description: string,
  fn: () => T,
  options?: s_event_context_options
): T {
  const stack = g_event_context_storage.getStore() ?? [];
  if (stack.length >= k_event_context_stack_maximum_depth) {
    g_event_context_overflow_handler?.();
    return fn();
  }
  const context: s_event_context = {
    type: truncate_text(type, k_event_context_type_maximum_size),
    description: truncate_text(
      description,
      k_event_context_description_maximum_size
    ),
    display_to_console: options?.display_to_console ?? false,
  };
  return g_event_context_storage.run([...stack, context], fn);
}

export function event_context_depth(): number {
  return g_event_context_storage.getStore()?.length ?? 0;
}

// csstrnzcat: appends, then cuts to size - 1.
function append_text(
  buffer: string,
  text: string,
  maximum_size: number
): string {
  return truncate_text(buffer + text, maximum_size);
}

// Console form: the descriptions of contexts shown on the console, outermost first.
// A ":" follows each shown context unless it is the innermost one on the stack, so a
// shown context under a hidden one is followed by a dangling ":", as in the original.
// Log and remote log form: "[(type)description:(type)description]", innermost first.
// Empty when there are no contexts (console: none shown).
export function event_context_get(
  destination: t_event_context_destination
): string {
  const stack = g_event_context_storage.getStore() ?? [];
  let buffer = "";

  if (destination === "console") {
    const maximum_size = k_event_context_console_text_maximum_size;
    for (let depth = 0; depth < stack.length; depth++) {
      const context = stack[depth];
      if (context?.display_to_console) {
        buffer = append_text(buffer, context.description, maximum_size);
        if (depth < stack.length - 1) {
          buffer = append_text(buffer, ":", maximum_size);
        }
      }
    }
    return buffer;
  }

  const maximum_size = k_event_context_log_text_maximum_size;
  for (let depth = stack.length - 1; depth >= 0; depth--) {
    const context = stack[depth];
    if (!context) {
      continue;
    }
    if (depth === stack.length - 1) {
      buffer = append_text(buffer, "[", maximum_size);
    }
    buffer = append_text(buffer, `(${context.type})`, maximum_size);
    buffer = append_text(buffer, context.description, maximum_size);
    buffer = append_text(buffer, depth === 0 ? "]" : ":", maximum_size);
  }
  return buffer;
}
