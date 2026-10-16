import * as datamine from "@blamnetwork/datamine";
import { describe, expect, it } from "vitest";
import * as reading from "../src/reading/index.ts";

describe("package entries", () => {
  it("expose the main entry points of the barrel and the reading entry", () => {
    const exported: Record<string, unknown> = { ...datamine };
    for (const name of [
      "events_initialize",
      "event_error",
      "data_mine_initialize",
      "data_mine_upload",
      "events_server_start",
      "read_datamine_file",
    ]) {
      expect(typeof exported[name], name).toBe("function");
    }
    expect(exported.c_datamine).toBeDefined();

    const reader: Record<string, unknown> = { ...reading };
    for (const name of [
      "c_log_text_parser",
      "log_detect_format",
      "read_datamine_file",
      "read_datamine_upload",
      "log_entries_from_datamine",
      "format_event_for_log",
      "build_banner",
    ]) {
      expect(reader[name], name).toBeDefined();
    }
    // The server and the writers stay out of the browser entry.
    expect("events_server_start" in reader).toBe(false);
    expect("events_initialize" in reader).toBe(false);
  });
});
