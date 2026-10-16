// Events with the remote log bit become datamine records: the event's format string is the
// record name, the leading "category:" segments are its categories and the printf arguments
// are its parameters.

import type { s_data_mine_bridge_config } from "../../config/data_mine_options.ts";
import { datamine_globals_get } from "../../datamine_globals.ts";
import {
  c_datamine,
  k_datamine_event_name_length,
} from "../data_mining/data_mining.ts";
import {
  events_remote_log_handler,
  events_set_remote_log_handler,
  type s_event_remote_record,
  type t_event_remote_log_handler,
} from "./cseries_events.ts";
import { csstrnzcpy } from "./cseries_strings.ts";

// One of the network sessions an event can be attributed to.
export interface s_event_bridge_session {
  id: bigint;
  timestamp: number;
}

export interface s_event_bridge_providers {
  // Squad, target and group session in that order; undefined when not in one.
  network_session_ids?: () => readonly (s_event_bridge_session | undefined)[];
}

export interface s_event_remote_bridge_options {
  // The bridge writes nothing while this says no.
  enabled: () => boolean;
  providers: s_event_bridge_providers;
  settings: s_data_mine_bridge_config;
}

const k_session_names = ["squad", "target", "group"] as const;

// The segments before the first space that end in a colon, as written. No lowercasing and no
// validation, unlike the event category table.
function categories_from_format(format: string, limit: number): string[] {
  const name = csstrnzcpy(format, k_datamine_event_name_length);
  const [prefix] = name.split(" ", 1);
  // The last piece has no colon after it, so it is not a category.
  return prefix.split(":").slice(0, -1).slice(0, limit);
}

function network_sessions_add(
  datamine: c_datamine,
  providers: s_event_bridge_providers
): void {
  const sessions = providers.network_session_ids?.() ?? [];
  for (const [index, name] of k_session_names.entries()) {
    const session = sessions[index];
    datamine.add_int64(`${name} session id`, session?.id ?? 0n);
    datamine.add_long(`${name} session timestamp`, session?.timestamp ?? 0);
  }
}

export function event_write_to_datamine(
  record: s_event_remote_record,
  settings: s_data_mine_bridge_config,
  providers: s_event_bridge_providers = {}
): void {
  if (record.format.length === 0) {
    return;
  }

  const { root_category } = settings;
  const limit =
    settings.maximum_categories - (root_category === undefined ? 0 : 1);
  const categories = categories_from_format(
    record.format,
    Math.max(limit, 0)
  ).map((category) => csstrnzcpy(category, settings.category_name_size));

  const datamine = new c_datamine(
    record.level,
    record.format,
    root_category === undefined ? categories : [root_category, ...categories]
  );
  if (settings.session_parameters) {
    network_sessions_add(datamine, providers);
    datamine.add_string("context", record.context);
  }
  datamine.add_args(record.format, record.args);
  datamine.commit();
}

interface s_event_bridge_globals {
  handler: t_event_remote_log_handler | undefined;
}

function bridge_globals(): s_event_bridge_globals {
  return datamine_globals_get<s_event_bridge_globals>("event_bridge", () => ({
    handler: undefined,
  }));
}

// Routes remote log events into the datamine. Works whether or not the events are initialized
// yet, because the handler is kept by the events layer across initialize and dispose.
export function event_remote_bridge_install(
  options: s_event_remote_bridge_options
): void {
  const globals = bridge_globals();
  const handler: t_event_remote_log_handler = (record) => {
    if (options.enabled()) {
      event_write_to_datamine(record, options.settings, options.providers);
    }
  };
  globals.handler = handler;
  events_set_remote_log_handler(handler);
}

// Takes the bridge out again, leaving a handler somebody else installed alone.
export function event_remote_bridge_remove(): void {
  const globals = bridge_globals();
  if (
    globals.handler !== undefined &&
    events_remote_log_handler() === globals.handler
  ) {
    events_set_remote_log_handler(undefined);
  }
  globals.handler = undefined;
}
