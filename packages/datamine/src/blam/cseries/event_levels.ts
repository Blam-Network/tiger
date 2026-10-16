// Event severities, ordered so a threshold is a simple >= compare.
export const e_event_level = {
  verbose: 0,
  status: 1,
  message: 2,
  warning: 3,
  error: 4,
  critical: 5,
} as const;
export type e_event_level = (typeof e_event_level)[keyof typeof e_event_level];

// A threshold of none never fires.
export const k_event_level_none = -1;
export type t_event_level_threshold = e_event_level | typeof k_event_level_none;

export const k_event_level_count = 6;

// Script-facing names, indexed by level; index 6 is "none".
export const k_event_level_names = [
  "verbose",
  "status",
  "message",
  "warning",
  "error",
  "critical",
  "none",
] as const;

// The upper case severity column of log and console lines, always 7 characters.
export const k_event_level_severity_strings = [
  "verbose",
  "status ",
  "message",
  "WARNING",
  "-ERROR-",
  "-FATAL-",
] as const;

const k_event_level_digits_regex = /^-?\d+$/;

// Accepts level names, "none"/"disable", and the script integers (6 = none).
export function event_level_from_name(
  name: string
): t_event_level_threshold | undefined {
  const lowered = name.trim().toLowerCase();
  if (lowered === "none" || lowered === "disable" || lowered === "disabled") {
    return k_event_level_none;
  }
  if (k_event_level_digits_regex.test(lowered)) {
    const value = Number.parseInt(lowered, 10);
    if (value >= k_event_level_count || value < 0) {
      return k_event_level_none;
    }
    return value as e_event_level;
  }
  const index = k_event_level_names.indexOf(
    lowered as (typeof k_event_level_names)[number]
  );
  if (index < 0) {
    return;
  }
  return index === k_event_level_count
    ? k_event_level_none
    : (index as e_event_level);
}

export function event_level_name(level: t_event_level_threshold): string {
  return level === k_event_level_none ? "none" : k_event_level_names[level];
}
