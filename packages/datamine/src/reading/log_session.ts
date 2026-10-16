// What a log file is as a whole: where it came from, when it ran, how big it is.

import { k_event_level_names } from "../blam/cseries/event_levels.ts";
import type {
  s_log_category_count,
  s_log_datamine_header,
  s_log_entry,
  s_log_report_folder,
  s_log_session_info,
  t_log_source_format,
} from "./log_entry.ts";

// "<yyyymmdd>_<hhmmss>[_<suffix>]", the folder a run's reports are written into.
const k_report_folder_regex =
  /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?:_(.+))?$/;
// "networking:sessionid: [<id>] hash [-1]"
const k_session_id_text_regex = /^networking:sessionid:\s*\[([^\]]*)\]/i;

export function report_folder_parse(
  name: string
): s_log_report_folder | undefined {
  const match = k_report_folder_regex.exec(name);
  if (!match) {
    return;
  }
  const [, year, month, day, hour, minute, second, suffix] = match;
  const folder: s_log_report_folder = {
    date: new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
      Number.parseInt(second, 10)
    ),
  };
  if (suffix !== undefined) {
    folder.suffix = suffix;
  }
  return folder;
}

// The file's own name, or the folder it sits in when the name is a path.
function report_folder_find(
  file_name: string
): s_log_report_folder | undefined {
  const parts = file_name.replaceAll("\\", "/").split("/");
  for (let index = parts.length - 1; index >= 0; index--) {
    const folder = report_folder_parse(parts[index]);
    if (folder) {
      return folder;
    }
  }
}

function path_compare(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function level_key(entry: s_log_entry): string {
  if (entry.level !== undefined) {
    return k_event_level_names[entry.level];
  }
  return entry.level_text.length > 0 ? entry.level_text : "unknown";
}

export interface s_log_session_extra {
  banner_version?: string;
  header?: s_log_datamine_header;
  truncated_at?: number;
}

export function log_session_info_build(
  file_name: string,
  format: t_log_source_format,
  entries: readonly s_log_entry[],
  extra: s_log_session_extra = {}
): s_log_session_info {
  const counts_by_level: Record<string, number> = {};
  const category_counts = new Map<string, number>();
  let first_time: number | undefined;
  let last_time: number | undefined;
  let session_id = extra.header?.sessionid || undefined;
  let session_count = 0;
  let event_count = 0;

  for (const entry of entries) {
    if (entry.kind === "session") {
      session_count++;
      continue;
    }
    event_count++;
    const key = level_key(entry);
    counts_by_level[key] = (counts_by_level[key] ?? 0) + 1;
    if (entry.category_path.length > 0) {
      category_counts.set(
        entry.category_path,
        (category_counts.get(entry.category_path) ?? 0) + 1
      );
    }
    if (entry.date) {
      const time = entry.date.getTime();
      first_time = first_time === undefined ? time : Math.min(first_time, time);
      last_time = last_time === undefined ? time : Math.max(last_time, time);
    }
    if (session_id === undefined && entry.categories[0] === "networking") {
      session_id = k_session_id_text_regex.exec(entry.text)?.[1];
    }
  }

  const categories: s_log_category_count[] = [...category_counts].map(
    ([path, count]) => ({ path, count })
  );
  categories.sort((a, b) => b.count - a.count || path_compare(a.path, b.path));

  const info: s_log_session_info = {
    format,
    file_name,
    entry_count: event_count,
    session_count,
    counts_by_level,
    categories,
  };
  if (extra.banner_version !== undefined) {
    info.banner_version = extra.banner_version;
  }
  if (extra.header) {
    info.header = extra.header;
  }
  if (extra.truncated_at !== undefined) {
    info.truncated_at = extra.truncated_at;
  }
  const report_folder = report_folder_find(file_name);
  if (report_folder) {
    info.report_folder = report_folder;
  }
  if (session_id) {
    info.session_id = session_id;
  }
  if (first_time !== undefined && last_time !== undefined) {
    info.first_date = new Date(first_time);
    info.last_date = new Date(last_time);
  }
  return info;
}
