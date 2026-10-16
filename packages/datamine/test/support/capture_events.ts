import { tmpdir } from "node:os";
import {
  events_dispose,
  events_initialize,
  events_register_listener,
} from "../../src/blam/cseries/cseries_events.ts";
import {
  e_event_level,
  k_event_level_none,
} from "../../src/blam/cseries/event_levels.ts";

export interface s_captured_event {
  level: e_event_level;
  text: string;
}

// Starts events with no files, no console and no datamine bridge, and collects what the
// code under test raises. Call the returned dispose in afterEach.
export function capture_events(): {
  events: s_captured_event[];
  dispose: () => void;
} {
  const events: s_captured_event[] = [];
  events_initialize({
    root: tmpdir(),
    install_exit_flush: false,
    write_files: false,
    initial_levels: {
      display: k_event_level_none,
      log: e_event_level.verbose,
      remote_log: k_event_level_none,
    },
    sinks: { display: () => undefined },
  });
  events_register_listener("", (event) =>
    events.push({ level: event.level, text: event.text })
  );
  return { events, dispose: events_dispose };
}
