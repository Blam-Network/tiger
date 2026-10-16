// Default event category settings.
//
// A consumer supplies its own table; none ships with the package. Order matters: each
// entry is applied to its node only, and a category created afterwards (by a later entry or
// at runtime) copies its parent as it is at that moment. A missing log_name therefore means
// "keep what the parent handed down", not "no file".
import type {
  s_real_rgb_color,
  t_event_log_format,
} from "./event_categories.ts";
import type { t_event_level_threshold } from "./event_levels.ts";

export interface s_event_category_default_configuration {
  display_color: s_real_rgb_color;
  display_level: t_event_level_threshold;
  // Undefined is none: unlike log_name, the format is always replaced.
  log_format?: t_event_log_format;
  log_level: t_event_level_threshold;
  // Undefined keeps the parent's log file (see above).
  log_name?: string;
  // With the trailing colon, e.g. "networking:".
  name: string;
  remote_log_level: t_event_level_threshold;
}
