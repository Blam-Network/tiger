// Event category tree, ported from the cseries events category code
// (event_parse_categories, event_find_category_recursive, event_query).
import { DatamineError } from "../../datamine_error.ts";
import { ascii_strnlwr } from "./cseries_strings.ts";
import type { s_event_category_default_configuration } from "./event_category_defaults.ts";
import {
  e_event_level,
  k_event_level_none,
  type t_event_level_threshold,
} from "./event_levels.ts";
import {
  e_event_response,
  type t_event_response_flags,
} from "./event_response.ts";

// Bungie uses NONE (-1) for "no category".
export const k_event_category_none = -1;

// Same name as the Bungie constant.
export const k_event_category_maximum_depth = 8;

// Names below are ours; the original uses the literals 64 and 1024. Each segment lives in a
// 64 byte buffer, so a segment of 64 characters already errors.
export const k_event_category_name_maximum_size = 64;
export const k_maximum_event_categories = 1024;

// Bungie used ascii_strnlwr and isalnum, so no locale and no non-ASCII.
const k_category_character_regex = /[A-Za-z0-9_-]/;
const k_category_separator = ":";

// "netbuf" is build_networking_buffer_for_log: per-session timestamps inserted into the line.
export type t_event_log_format = "none" | "netbuf";

export interface s_real_rgb_color {
  blue: number;
  green: number;
  red: number;
}

export type t_event_category_property =
  | "display"
  | "force_display"
  | "log"
  | "remote_log"
  | "debugger_break"
  | "halt";

export interface s_event_category {
  debugger_break_level: t_event_level_threshold;
  depth: number;
  display_color: s_real_rgb_color;
  display_level: t_event_level_threshold;
  first_child_index: number;
  force_display_level: t_event_level_threshold;
  halt_level: t_event_level_threshold;
  // Spam state, see event_spam.ts.
  last_event_time: number;
  // Bit per registered listener, set by event_set_listener_by_name.
  listener_mask: number;
  log_format: t_event_log_format;
  log_level: t_event_level_threshold;
  // Category log file, undefined for none. Children inherit it at creation.
  log_name: string | undefined;
  // One segment, lowercase, empty for the root.
  name: string;
  next_sibling_index: number;
  parent_index: number;
  possible_spam_event_count: number;
  remote_log_level: t_event_level_threshold;
}

const k_event_category_property_level_keys = {
  display: "display_level",
  force_display: "force_display_level",
  log: "log_level",
  remote_log: "remote_log_level",
  debugger_break: "debugger_break_level",
  halt: "halt_level",
} as const satisfies Record<t_event_category_property, keyof s_event_category>;

export interface s_event_category_parse_result {
  // Text of each event(_event_error, ...) the original raises while parsing.
  errors: string[];
  names: string[];
  // The original vwarn text, set whenever errors is not empty.
  warning?: string;
}

// console is console_printf in the original.
export type t_event_category_message_handler = (
  kind: "error" | "warning" | "console",
  text: string
) => void;

export interface s_event_global_levels {
  // Left out means none.
  debugger_break?: t_event_level_threshold;
  display: t_event_level_threshold;
  log: t_event_level_threshold;
  remote_log: t_event_level_threshold;
}

export interface s_event_category_dump_row {
  debugger_break_level: t_event_level_threshold;
  depth: number;
  display_color: s_real_rgb_color;
  display_level: t_event_level_threshold;
  force_display_level: t_event_level_threshold;
  halt_level: t_event_level_threshold;
  index: number;
  listener_mask: number;
  log_format: t_event_log_format;
  log_level: t_event_level_threshold;
  log_name: string | undefined;
  name: string;
  parent_index: number;
  // event_describe_category, e.g. "networking:session".
  path: string;
  remote_log_level: t_event_level_threshold;
}

// Faithful to event_parse_categories, including its leftovers: a segment only counts
// when a colon follows it, and anything that is not a category character ends the
// parse, so "networking:session: hi" gives networking and session.
export function event_parse_categories(
  event_name: string
): s_event_category_parse_result {
  const names: string[] = [];
  const errors: string[] = [];
  let colon_count = 0;
  let position = 0;
  let failed = false;
  let succeeded = false;

  while (!(succeeded || failed)) {
    const segment_start = position;
    let segment_length = 0;
    let segment_found = false;
    while (!(segment_found || failed)) {
      // Past the end this is "", which is neither a category character nor a colon.
      const character = event_name.charAt(position);
      if (segment_length < k_event_category_name_maximum_size) {
        if (k_category_character_regex.test(character)) {
          position++;
          segment_length++;
        } else {
          segment_found = true;
          if (character === k_category_separator) {
            position++;
            colon_count++;
          }
        }
      } else {
        errors.push(
          `network event category substring #${names.length} '${event_name.slice(segment_start)}' exceeded ${k_event_category_name_maximum_size} characters`
        );
        failed = true;
      }
    }

    if (segment_found) {
      if (segment_length === 0) {
        succeeded = true;
      } else if (names.length < k_event_category_maximum_depth) {
        names.push(
          ascii_strnlwr(
            event_name.slice(segment_start, segment_start + segment_length)
          )
        );
      } else {
        errors.push(
          `network event category #${names.length} '${event_name.slice(position)}' exceeded ${k_event_category_maximum_depth} category substrings`
        );
        failed = true;
      }
    }
  }

  const result: s_event_category_parse_result = {
    names: names.slice(0, colon_count),
    errors,
  };
  if (failed) {
    result.warning = `failed to parse network event '${event_name}'`;
  }
  return result;
}

// build_correct_category_name
export function build_correct_category_name(category: string): string {
  return category.length > 0 && !category.endsWith(k_category_separator)
    ? `${category}${k_category_separator}`
    : category;
}

function make_category(
  name: string,
  depth: number,
  parent_index: number
): s_event_category {
  return {
    depth,
    name,
    parent_index,
    first_child_index: k_event_category_none,
    next_sibling_index: k_event_category_none,
    display_level: k_event_level_none,
    force_display_level: k_event_level_none,
    log_level: k_event_level_none,
    remote_log_level: k_event_level_none,
    debugger_break_level: k_event_level_none,
    halt_level: k_event_level_none,
    display_color: { red: 1, green: 1, blue: 1 },
    log_name: undefined,
    log_format: "none",
    listener_mask: 0,
    last_event_time: 0,
    possible_spam_event_count: 0,
  };
}

function set_response_bit(
  flags: t_event_response_flags,
  bit: e_event_response,
  value: boolean
): t_event_response_flags {
  return value ? flags | bit : flags & ~bit;
}

export class c_event_category_table {
  private readonly m_categories: s_event_category[] = [];
  private readonly m_message_handler:
    | t_event_category_message_handler
    | undefined;
  private m_minimum_level: number | undefined;

  // The defaults go through the same creation path as runtime categories, in order,
  // so a default category inherits what its parent had when it was created.
  constructor(
    defaults: readonly s_event_category_default_configuration[],
    message_handler?: t_event_category_message_handler
  ) {
    this.m_message_handler = message_handler;
    this.m_categories.push(make_category("", 0, k_event_category_none));
    for (const configuration of defaults) {
      this.apply_default_configuration(configuration);
    }
  }

  get count(): number {
    return this.m_categories.length;
  }

  get(index: number): s_event_category {
    const category = this.m_categories[index];
    if (!category) {
      throw new DatamineError(`invalid event category index ${index}`);
    }
    return category;
  }

  parse_categories(format: string): s_event_category_parse_result {
    return event_parse_categories(format);
  }

  // event_category_from_name. A format without a colon parses to no segments and so
  // resolves to the root. Returns k_event_category_none for an unknown category when not
  // creating, or when the table is full.
  category_index_from_format(format: string, create: boolean): number {
    const parsed = this.parse_categories(format);
    this.report_parse_failure(parsed);
    return this.find_category_by_names(parsed.names, create);
  }

  // Name with or without the trailing colon; never creates.
  find_category(name: string): number {
    const parsed = this.parse_categories(build_correct_category_name(name));
    this.report_parse_failure(parsed);
    return this.find_category_by_names(parsed.names, false);
  }

  category_path(index: number): string {
    const names: string[] = [];
    let current = index;
    while (current !== k_event_category_none) {
      const category = this.get(current);
      if (category.depth === 0) {
        break;
      }
      names.push(category.name);
      current = category.parent_index;
    }
    return names.reverse().join(":");
  }

  // event_set_category_level_by_name_internal. Creates the category when unknown (the
  // original does), then sets the node and all of its descendants, never its siblings. False when
  // the category could not be created.
  set_property_by_name(
    name: string,
    property: t_event_category_property,
    level: t_event_level_threshold
  ): boolean {
    const index = this.resolve_for_set(name);
    if (index === k_event_category_none) {
      return false;
    }
    this.for_each_in_subtree(index, (category) => {
      this.set_property(category, property, level);
    });
    this.m_minimum_level = undefined;
    return true;
  }

  // Listener registration: an index sets that bit, undefined clears all listeners.
  set_listener_by_name(
    name: string,
    listener_index: number | undefined
  ): boolean {
    const index = this.resolve_for_set(name);
    if (index === k_event_category_none) {
      return false;
    }
    this.for_each_in_subtree(index, (category) => {
      category.listener_mask =
        listener_index === undefined
          ? 0
          : (category.listener_mask | (1 << listener_index)) >>> 0;
    });
    return true;
  }

  // Lowest level any category can still react to, for the caller's fast path gate. The
  // original only looked at display and log (and then global display, log and remote); we include
  // every per-category level, otherwise lowering just a category's remote level (or
  // force display, break or halt) never opened the gate. Global levels are combined by the
  // caller. Critical when nothing is set, so critical always passes, as in the original.
  minimum_level(): number {
    if (this.m_minimum_level === undefined) {
      let minimum: number = e_event_level.critical;
      for (const category of this.m_categories) {
        for (const level of [
          category.display_level,
          category.force_display_level,
          category.log_level,
          category.remote_log_level,
          category.debugger_break_level,
          category.halt_level,
        ]) {
          if (level !== k_event_level_none && level < minimum) {
            minimum = level;
          }
        }
      }
      this.m_minimum_level = minimum;
    }
    return this.m_minimum_level;
  }

  // For callers that change a category's levels directly through get().
  invalidate_minimum_level(): void {
    this.m_minimum_level = undefined;
  }

  // Pre-order walk of a subtree, children in list order (newest first, as in the original).
  // The original event_dump_categories_recursive also walks the start node's siblings; that
  // looks accidental, so a dump of "networking:" only lists networking and below.
  walk(start_index: number): number[] {
    const indices: number[] = [];
    const visit = (index: number) => {
      indices.push(index);
      let child = this.get(index).first_child_index;
      while (child !== k_event_category_none) {
        visit(child);
        child = this.get(child).next_sibling_index;
      }
    };
    visit(start_index);
    return indices;
  }

  private report_parse_failure(parsed: s_event_category_parse_result): void {
    for (const error of parsed.errors) {
      this.m_message_handler?.("error", error);
    }
    if (parsed.warning) {
      this.m_message_handler?.("warning", parsed.warning);
    }
  }

  private find_category_by_names(names: string[], create: boolean): number {
    let parent_index = 0;
    for (const name of names) {
      const child_index = this.find_or_create_child(parent_index, name, create);
      if (child_index === k_event_category_none) {
        return k_event_category_none;
      }
      parent_index = child_index;
    }
    return parent_index;
  }

  private find_or_create_child(
    parent_index: number,
    name: string,
    create: boolean
  ): number {
    const parent = this.get(parent_index);
    let child_index = parent.first_child_index;
    while (child_index !== k_event_category_none) {
      const child = this.get(child_index);
      if (child.name === name) {
        return child_index;
      }
      child_index = child.next_sibling_index;
    }
    if (!create) {
      return k_event_category_none;
    }
    if (this.m_categories.length >= k_maximum_event_categories) {
      this.m_message_handler?.(
        "console",
        `event_find_category_recursive: ran out of categories creating '${name}'`
      );
      return k_event_category_none;
    }

    // A new category copies its parent as it is right now; later changes to the parent
    // do not reach it unless they come through a by-name setter.
    const created = make_category(name, parent.depth + 1, parent_index);
    created.display_level = parent.display_level;
    created.display_color = { ...parent.display_color };
    created.log_level = parent.log_level;
    created.remote_log_level = parent.remote_log_level;
    created.debugger_break_level = parent.debugger_break_level;
    created.halt_level = parent.halt_level;
    created.force_display_level = parent.force_display_level;
    created.log_name = parent.log_name;
    created.log_format = parent.log_format;
    created.listener_mask = parent.listener_mask;
    created.next_sibling_index = parent.first_child_index;
    const created_index = this.m_categories.length;
    this.m_categories.push(created);
    parent.first_child_index = created_index;
    this.m_minimum_level = undefined;
    return created_index;
  }

  // Applies a default to the node only. Descendants that already exist keep what they
  // had; ones created later copy it. log_name and a missing log_format behave like the original:
  // no log_name keeps what the parent handed down, but the format is always replaced.
  private apply_default_configuration(
    configuration: s_event_category_default_configuration
  ): void {
    const index = this.category_index_from_format(configuration.name, true);
    if (index === k_event_category_none) {
      return;
    }
    const category = this.get(index);
    category.display_level = configuration.display_level;
    category.display_color = { ...configuration.display_color };
    if (configuration.log_name !== undefined) {
      category.log_name = configuration.log_name;
    }
    category.log_level = configuration.log_level;
    category.remote_log_level = configuration.remote_log_level;
    category.debugger_break_level = k_event_level_none;
    category.halt_level = k_event_level_none;
    category.force_display_level = k_event_level_none;
    category.log_format = configuration.log_format ?? "none";
    this.m_minimum_level = undefined;
  }

  private resolve_for_set(name: string): number {
    const parsed = this.parse_categories(build_correct_category_name(name));
    this.report_parse_failure(parsed);
    if (parsed.names.length === 0) {
      return 0;
    }
    const index = this.find_category_by_names(parsed.names, true);
    if (index === k_event_category_none) {
      this.m_message_handler?.(
        "console",
        `failed to set event category level, ${name} is not a valid category`
      );
    }
    return index;
  }

  private for_each_in_subtree(
    index: number,
    callback: (category: s_event_category) => void
  ): void {
    for (const subtree_index of this.walk(index)) {
      callback(this.get(subtree_index));
    }
  }

  private set_property(
    category: s_event_category,
    property: t_event_category_property,
    level: t_event_level_threshold
  ): void {
    category[k_event_category_property_level_keys[property]] = level;
  }
}

// Sets or clears one response bit by comparing the level to a threshold; none leaves it alone.
function apply_threshold(
  flags: t_event_response_flags,
  bit: e_event_response,
  threshold: t_event_level_threshold,
  level: e_event_level
): t_event_response_flags {
  return threshold === k_event_level_none
    ? flags
    : set_response_bit(flags, bit, level >= threshold);
}

// event_query. Global display, log, remote and debugger break levels set their bit first,
// then the category's own levels override it. Halt and force display exist only per category.
// Suppress flags and disable_event_logging are the caller's job.
export function event_query(
  table: c_event_category_table,
  category_index: number,
  level: e_event_level,
  globals: s_event_global_levels
): t_event_response_flags {
  let flags = 0;
  flags = apply_threshold(
    flags,
    e_event_response.console,
    globals.display,
    level
  );
  flags = apply_threshold(flags, e_event_response.log, globals.log, level);
  flags = apply_threshold(
    flags,
    e_event_response.remote_log,
    globals.remote_log,
    level
  );
  flags = apply_threshold(
    flags,
    e_event_response.break_into_debugger,
    globals.debugger_break ?? k_event_level_none,
    level
  );

  if (category_index === k_event_category_none) {
    return flags;
  }
  const category = table.get(category_index);
  flags = apply_threshold(
    flags,
    e_event_response.console,
    category.display_level,
    level
  );
  flags = apply_threshold(
    flags,
    e_event_response.log,
    category.log_level,
    level
  );
  flags = apply_threshold(
    flags,
    e_event_response.remote_log,
    category.remote_log_level,
    level
  );
  flags = apply_threshold(
    flags,
    e_event_response.break_into_debugger,
    category.debugger_break_level,
    level
  );
  flags = apply_threshold(
    flags,
    e_event_response.halt,
    category.halt_level,
    level
  );
  return apply_threshold(
    flags,
    e_event_response.console_force,
    category.force_display_level,
    level
  );
}

// Rows for event_dump_categories, in the original order. It prints only the path, as
// "  '<path>'" (root prints an empty path). Destiny's dump is a table:
//   header "ID Parent Log Output     Force      Log        Debug      Datamine   Name"
//   row    "%04d %04d %03d [%-8s] [%-8s] [%-8s] [%-8s] [%-8s] [%-8s] %s"
// The row format has six level columns but the header names five, and what the "Log"
// number is (probably an event log index) is unknown, so every level is exposed here and
// the formatter decides. root_name is parsed like the original does, so it needs its trailing
// colon: "networking" without one resolves to the root. Undefined when not found.
export function event_category_dump_rows(
  table: c_event_category_table,
  root_name = ""
): s_event_category_dump_row[] | undefined {
  const start_index = table.category_index_from_format(root_name, false);
  if (start_index === k_event_category_none) {
    return;
  }
  return table.walk(start_index).map((index) => {
    const category = table.get(index);
    return {
      index,
      parent_index: category.parent_index,
      depth: category.depth,
      name: category.name,
      path: table.category_path(index),
      display_level: category.display_level,
      force_display_level: category.force_display_level,
      log_level: category.log_level,
      remote_log_level: category.remote_log_level,
      debugger_break_level: category.debugger_break_level,
      halt_level: category.halt_level,
      log_name: category.log_name,
      log_format: category.log_format,
      display_color: { ...category.display_color },
      listener_mask: category.listener_mask,
    };
  });
}
