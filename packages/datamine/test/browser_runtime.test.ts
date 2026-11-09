import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A runtime with no Node built-ins: process.getBuiltinModule finds nothing, as in a browser.
// The modules are loaded fresh so none of them has a built-in cached from another test.
type t_events_entry = typeof import("../src/events.ts");
type t_events_module = typeof import("../src/blam/cseries/cseries_events.ts");

let entry: t_events_entry;
let events_module: t_events_module;

beforeEach(async () => {
  vi.spyOn(process, "getBuiltinModule").mockReturnValue(undefined as never);
  vi.resetModules();
  entry = await import("../src/events.ts");
  events_module = await import("../src/blam/cseries/cseries_events.ts");
});

afterEach(() => {
  entry.events_dispose();
  vi.restoreAllMocks();
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("without Node built-ins", () => {
  it("raises events to the sinks, listeners and captures, with thread id 0", () => {
    const displayed: string[] = [];
    const heard: string[] = [];
    const thread_ids: number[] = [];
    entry.events_initialize({
      root: "",
      write_files: false,
      initial_levels: { display: entry._event_status },
      sinks: { display: (line) => displayed.push(line) },
    });
    entry.events_register_listener("ide:", (event) => heard.push(event.text));
    const remove = events_module.events_capture_add((record) =>
      thread_ids.push(record.thread_id)
    );
    entry.event_warning("ide:files: %s missing", "a.txt");
    remove();
    expect(displayed).toEqual(["warning  ide:files: a.txt missing"]);
    expect(heard).toEqual(["ide:files: a.txt missing"]);
    expect(thread_ids).toEqual([0]);
  });

  it("refuses write_files", () => {
    expect(() => entry.events_initialize({ root: "logs" })).toThrow(
      entry.DatamineError
    );
    expect(() => entry.events_initialize({ root: "logs" })).toThrow(
      "write_files needs node:fs, which this runtime lacks"
    );
    expect(entry.events_initialized()).toBe(false);
  });

  it("keeps contexts for the synchronous part of a callback only", async () => {
    const seen: string[] = [];
    await entry.event_context_run("tag", "weapon", async () => {
      seen.push(entry.event_context_get("log"));
      await sleep(1);
      seen.push(entry.event_context_get("log"));
    });
    expect(seen).toEqual(["[(tag)weapon]", ""]);
    expect(entry.event_context_depth()).toBe(0);
  });

  it("reads and writes datamine files", () => {
    const file = entry.read_datamine_file(
      entry.encode_data_mine_header({
        layout: "3.1",
        byte_order: "big",
        sessionid: "session",
        session_start_date: 0n,
        build_string: "build",
        build_number: 1,
        systemid: "system",
        title: "title",
      })
    );
    expect(file.header.sessionid).toBe("session");
    expect(entry.encode_datamine_file(file)).toBeInstanceOf(Uint8Array);
  });
});
