import type { s_event_category_default_configuration } from "../../src/blam/cseries/event_category_defaults.ts";
import {
  e_event_level,
  k_event_level_none,
} from "../../src/blam/cseries/event_levels.ts";

// Halo-style: colors, netbuf format on networking, files inherited from the parent.
export const k_test_category_defaults: readonly s_event_category_default_configuration[] =
  [
    {
      name: "crash:",
      display_level: e_event_level.message,
      display_color: { red: 1, green: 0.1, blue: 0.1 },
      log_level: e_event_level.message,
      remote_log_level: e_event_level.message,
    },
    {
      name: "networking:",
      display_level: k_event_level_none,
      display_color: { red: 1, green: 0.4, blue: 0.7 },
      log_level: e_event_level.message,
      log_name: "networking_debug.txt",
      log_format: "netbuf",
      remote_log_level: e_event_level.message,
    },
    {
      name: "xoverlapped:",
      display_level: k_event_level_none,
      display_color: { red: 1, green: 0.4, blue: 0.7 },
      log_level: e_event_level.message,
      remote_log_level: e_event_level.message,
    },
    {
      name: "networking:leaderboards:",
      display_level: k_event_level_none,
      display_color: { red: 1, green: 0.4, blue: 0.7 },
      log_level: e_event_level.message,
      log_name: "leaderboard_debug.txt",
      remote_log_level: e_event_level.message,
    },
    {
      name: "networking:spawning:",
      display_level: k_event_level_none,
      display_color: { red: 1, green: 0.4, blue: 0.7 },
      log_level: e_event_level.message,
      log_format: "netbuf",
      remote_log_level: k_event_level_none,
    },
    {
      name: "ui:",
      display_level: k_event_level_none,
      display_color: { red: 1, green: 0.5, blue: 0 },
      log_level: k_event_level_none,
      log_name: "ui_debug.txt",
      remote_log_level: k_event_level_none,
    },
    {
      name: "ui:window_manager:",
      display_level: k_event_level_none,
      display_color: { red: 1, green: 0.5, blue: 0 },
      log_level: e_event_level.message,
      remote_log_level: e_event_level.message,
    },
    {
      name: "ui:profile:campaign:",
      display_level: k_event_level_none,
      display_color: { red: 1, green: 0.5, blue: 0 },
      log_level: e_event_level.message,
      remote_log_level: e_event_level.message,
    },
    {
      name: "hs:",
      display_level: e_event_level.warning,
      display_color: { red: 0.5, green: 0.8, blue: 0.3 },
      log_level: e_event_level.message,
      log_name: "hs_log.txt",
      remote_log_level: k_event_level_none,
    },
  ];
