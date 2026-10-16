import { closeSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { read_datamine_file } from "../../src/data_mine_reader.ts";
import { log_entries_from_datamine } from "../../src/reading/log_datamine.ts";
import type {
  s_log_entry,
  t_log_source_format,
} from "../../src/reading/log_entry.ts";
import { log_session_info_build } from "../../src/reading/log_session.ts";
import {
  c_log_text_parser,
  log_detect_format,
} from "../../src/reading/log_text_parser.ts";

const halo_dir = process.env.TIGER_HALO_DATA_DIR;
const reports_dir = process.env.TIGER_REPORTS_DIR;
const destiny_dir = process.env.TIGER_DESTINY_DATAMINE_DIR;
const text_dir = process.env.TIGER_DATAMINE_TEXT_DIR;

// Real files can be hundreds of megabytes, so only the start of each is read.
const k_head_size = 256 * 1024;
const k_rule_prefix = "====";

function read_head(path: string): Buffer {
  const file = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(Math.min(statSync(path).size, k_head_size));
    const count = readSync(file, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, count);
  } finally {
    closeSync(file);
  }
}

// The head ends mid-line, which would be read as a short entry.
function read_head_text(path: string): string {
  const text = read_head(path).toString("utf8");
  return text.slice(0, text.lastIndexOf("\n") + 1);
}

function entries_with_category_share(entries: s_log_entry[]): number {
  return (
    entries.filter((entry) => entry.categories.length > 0).length /
    entries.length
  );
}

// Parses the head of a text log and checks the shape of what comes out.
function expect_text_log(
  path: string,
  format: t_log_source_format,
  options: { levels_required: boolean }
): void {
  const head = read_head(path);
  expect(log_detect_format(path, head)).toBe(format);
  const parser = new c_log_text_parser();
  const all = [...parser.push(read_head_text(path)), ...parser.finish()];
  expect(parser.format).toBe(format);
  for (const [index, entry] of all.entries()) {
    expect(entry.ordinal).toBe(index);
  }
  const sessions = all.filter((entry) => entry.kind === "session");
  const entries = all.filter((entry) => entry.kind !== "session");
  expect(entries.length).toBeGreaterThan(0);
  for (const session of sessions) {
    expect(session.session?.version).toBeTruthy();
  }
  for (const entry of entries) {
    expect(entry.date).toBeInstanceOf(Date);
    expect(Number.isNaN(entry.date?.getTime())).toBe(false);
    if (options.levels_required) {
      expect(entry.level).toBeDefined();
    } else {
      expect(
        entry.level !== undefined || entry.level_text.startsWith("Unknown")
      ).toBe(true);
    }
  }
  expect(entries_with_category_share(entries)).toBeGreaterThan(0.5);
  if (head.toString("latin1").trimStart().startsWith(k_rule_prefix)) {
    expect(parser.banner_version).toBeTruthy();
    expect(sessions.length).toBeGreaterThan(0);
  }
  const info = log_session_info_build(path, format, all, {
    banner_version: parser.banner_version,
  });
  expect(info.entry_count).toBe(entries.length);
  expect(info.session_count).toBe(sessions.length);
  expect(info.categories.length).toBeGreaterThan(0);
  expect(info.first_date).toBeInstanceOf(Date);
}

function text_files(dir: string, names: string[]): string[] {
  return names
    .map((name) => join(dir, name))
    .filter((path) => {
      try {
        return statSync(path).size > 0;
      } catch {
        return false;
      }
    });
}

describe.skipIf(!halo_dir)("halo style report files", () => {
  const files = halo_dir
    ? text_files(join(halo_dir, "reports"), [
        "debug.txt",
        "debug_full.txt",
        "networking_debug.txt",
        "hs_log.txt",
      ])
    : [];

  it("parses the start of each", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const path of files) {
      expect_text_log(path, "halo_style_log", {
        levels_required: true,
      });
    }
  });
});

describe.skipIf(!reports_dir)("destiny style report folders", () => {
  const folders = reports_dir
    ? readdirSync(reports_dir)
        .filter((name) => /^\d{8}_\d{6}_/.test(name))
        .sort()
        .slice(-3)
    : [];

  it("parses the start of each file and finds the run", () => {
    let checked = 0;
    for (const folder of folders) {
      for (const path of text_files(join(reports_dir ?? "", folder), [
        "debug.txt",
        "debug_datamine.txt",
        "debug_full.txt",
        "networking_debug.txt",
      ])) {
        const parser = new c_log_text_parser();
        const entries = [
          ...parser.push(read_head_text(path)),
          ...parser.finish(),
        ];
        if (entries.length === 0) {
          continue;
        }
        expect_text_log(path, "destiny_style_log", {
          levels_required: true,
        });
        const info = log_session_info_build(
          path,
          parser.format ?? "destiny_style_log",
          entries
        );
        expect(info.report_folder?.suffix).toBeTruthy();
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe.skipIf(!text_dir)("datamine text exports", () => {
  const names = text_dir
    ? readdirSync(text_dir)
        .filter((name) => name.endsWith(".txt"))
        .slice(0, 4)
    : [];

  it("parses the start of each", () => {
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect_text_log(join(text_dir ?? "", name), "datamine_text", {
        levels_required: false,
      });
    }
  });
});

describe.skipIf(!destiny_dir)("destiny datamine files", () => {
  const k_size_limit = 8 * 1024 * 1024;
  const names = destiny_dir
    ? readdirSync(destiny_dir)
        .filter(
          (name) =>
            name.endsWith(".datamine") &&
            statSync(join(destiny_dir, name)).size < k_size_limit
        )
        .slice(0, 3)
    : [];

  it("reads the start of each into entries", () => {
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const path = join(destiny_dir ?? "", name);
      const head = read_head(path);
      expect(log_detect_format(path, head)).toBe("datamine_binary");
      const file = read_datamine_file(head);
      const [session, ...entries] = log_entries_from_datamine(file);
      expect(session?.kind).toBe("session");
      expect(session?.session?.session_id).toBeTruthy();
      expect(entries.length).toBeGreaterThan(0);
      for (const [index, entry] of entries.entries()) {
        expect(entry.ordinal).toBe(index + 1);
        expect(entry.level).toBeDefined();
        expect(entry.date).toBeInstanceOf(Date);
      }
      expect(entries_with_category_share(entries)).toBeGreaterThan(0.5);
    }
  });
});
