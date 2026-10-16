// Where an event goes, as bit flags from event_query.
export const e_event_response = {
  console: 1 << 0,
  console_force: 1 << 1,
  log: 1 << 2,
  remote_log: 1 << 3,
  break_into_debugger: 1 << 4,
  halt: 1 << 5,
} as const;
export type e_event_response =
  (typeof e_event_response)[keyof typeof e_event_response];

export type t_event_response_flags = number;

export function event_response_test(
  flags: t_event_response_flags,
  response: e_event_response
): boolean {
  return (flags & response) !== 0;
}
