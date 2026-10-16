import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  read_datamine_file as blf_read_datamine_file,
  get_formatted_event_string,
} from "@blamnetwork/blf";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  event_error,
  event_set_remote_log_level_global,
  event_verbose,
  event_warning,
  events_dispose,
  events_initialize,
  events_remote_log_handler,
  events_set_remote_log_handler,
  type s_event_remote_record,
} from "../../../src/blam/cseries/cseries_events.ts";
import { event_context_run } from "../../../src/blam/cseries/event_context.ts";
import { event_write_to_datamine } from "../../../src/blam/cseries/event_data_mine_bridge.ts";
import { e_event_level } from "../../../src/blam/cseries/event_levels.ts";
import {
  data_mine_dispose,
  data_mine_enable,
  data_mine_initialize,
} from "../../../src/blam/data_mining/data_mine_management.ts";
import { data_mining_reset } from "../../../src/blam/data_mining/data_mining.ts";
import {
  data_mine_config_resolve,
  type s_data_mine_bridge_config,
  type s_data_mine_config_options,
} from "../../../src/config/data_mine_options.ts";
import {
  read_datamine_file,
  type s_datamine_file,
} from "../../../src/data_mine_reader.ts";
import { fixed_clock } from "../../support/clocks.ts";
import {
  k_layout_1_1,
  k_layout_3_1,
  occurrences,
} from "../../support/datamine_files.ts";
import { temp_dirs } from "../../support/temp_dirs.ts";

const clock = fixed_clock(new Date(2026, 8, 29, 16, 37, 42));
const k_format = "networking:session: join %s failed %d";

// A tracked build, so the datamine behaves as it does in a release.
const k_tracked_build = { build_string: "bridge test", build_number: 1 };

const temp = temp_dirs("datamine-bridge-");
let root: string;

beforeEach(() => {
  root = temp.make();
});

afterEach(() => {
  events_dispose();
  data_mine_dispose();
  data_mining_reset();
  events_set_remote_log_handler(undefined);
  temp.remove_all();
});

function events_start(): void {
  events_initialize({
    root,
    providers: { clock },
    install_exit_flush: false,
  });
  event_set_remote_log_level_global(e_event_level.warning);
}

function data_mine_start(
  options: s_data_mine_config_options,
  sessions?: () => ({ id: bigint; timestamp: number } | undefined)[]
): void {
  expect(
    data_mine_initialize({
      root,
      ...options,
      ...k_tracked_build,
      clock,
      enabled: true,
      install_exit_flush: false,
      system_id: "x64@pc@win@testbox",
      network_session_ids: sessions,
    })
  ).toBe(true);
}

// Closes the file being written and reads the only one on disk.
function datamine_read(options: s_data_mine_config_options): {
  bytes: Buffer;
  file: s_datamine_file;
} {
  data_mine_dispose();
  const directory = join(root, options.directory ?? "datamine");
  const names = readdirSync(directory).filter((entry) =>
    entry.endsWith(".datamine")
  );
  expect(names).toHaveLength(1);
  const bytes = readFileSync(join(directory, names[0]));
  return { bytes, file: read_datamine_file(bytes) };
}

describe("layout 1.1", () => {
  it("writes the root category, the sessions and the context before the arguments", () => {
    events_start();
    data_mine_start(k_layout_1_1, () => [
      { id: 0x11_22_33_44_55_66n, timestamp: 7 },
      undefined,
      { id: 3n, timestamp: 9 },
    ]);

    event_warning(k_format, "x", 5);

    const [entry] = occurrences(datamine_read(k_layout_1_1).file);
    expect(entry.record.event_name).toBe(k_format);
    expect(entry.record.priority).toBe(e_event_level.warning);
    expect(entry.record.categories).toEqual(["root", "networking", "session"]);
    expect(
      entry.record.parameters.map(({ name, value }) => [name, value])
    ).toEqual([
      ["squad session id", 0x11_22_33_44_55_66n],
      ["squad session timestamp", 7],
      ["target session id", 0n],
      ["target session timestamp", 0],
      ["group session id", 3n],
      ["group session timestamp", 9],
      ["context", ""],
      ["", "x"],
      ["", 5],
    ]);
    expect(entry.record.parameter_signature).toBe(
      "%I64d, %d, %I64d, %d, %I64d, %d, %s, %s, %d"
    );
  });

  it("defaults the sessions to zero", () => {
    events_start();
    data_mine_start(k_layout_1_1);
    event_warning(k_format, "x", 5);
    const [entry] = occurrences(datamine_read(k_layout_1_1).file);
    expect(entry.record.parameters.slice(0, 6).map((p) => p.value)).toEqual([
      0n,
      0,
      0n,
      0,
      0n,
      0,
    ]);
  });

  it("carries the context of the event", () => {
    events_start();
    data_mine_start(k_layout_1_1);
    event_context_run("lobby", "party", () => event_warning(k_format, "x", 5));
    const [entry] = occurrences(datamine_read(k_layout_1_1).file);
    expect(entry.record.parameters[6]).toMatchObject({ name: "context" });
    expect(entry.record.parameters[6].value).toContain("party");
  });
});

describe("layout 3.1", () => {
  it("writes only the format segments and the unnamed arguments", () => {
    events_start();
    data_mine_start(k_layout_3_1);

    event_warning(k_format, "x", 5);

    const { bytes, file } = datamine_read(k_layout_3_1);
    const [entry] = occurrences(file);
    expect(entry.record.categories).toEqual(["networking", "session"]);
    expect(entry.record.parameters.map((p) => p.value)).toEqual(["x", 5]);
    expect(entry.record.parameter_signature).toBe("%s, %d, ");

    const parsed = blf_read_datamine_file(bytes);
    expect(parsed?.events).toHaveLength(1);
    const [event] = parsed?.events ?? [];
    expect(event.header.event_name).toBe(k_format);
    expect(event.categories).toEqual(["networking", "session"]);
    expect(get_formatted_event_string(event)).toBe(
      "networking:session: join x failed 5"
    );
  });
});

describe("filtering", () => {
  it("skips events below the remote log level", () => {
    events_start();
    data_mine_start(k_layout_3_1);
    event_set_remote_log_level_global(e_event_level.error);

    // A category with its own remote level would override the global one, so use a fresh one.
    event_warning("bridgetest: below the level %d", 5);
    event_verbose("bridgetest: far below the level");
    expect(occurrences(datamine_read(k_layout_3_1).file)).toEqual([]);
  });

  it("writes an event at the remote log level", () => {
    events_start();
    data_mine_start(k_layout_3_1);
    event_set_remote_log_level_global(e_event_level.error);

    event_error("bridgetest: at the level %d", 5);
    expect(occurrences(datamine_read(k_layout_3_1).file)).toHaveLength(1);
  });

  it("writes nothing while the datamine is disabled", () => {
    events_start();
    data_mine_start(k_layout_3_1);
    data_mine_enable(false);
    event_error(k_format, "x", 5);
    expect(occurrences(datamine_read(k_layout_3_1).file)).toEqual([]);
  });
});

describe("initialization order", () => {
  it("picks up the events when they start after the datamine", () => {
    data_mine_start(k_layout_3_1);
    events_start();
    event_warning(k_format, "x", 5);
    expect(occurrences(datamine_read(k_layout_3_1).file)).toHaveLength(1);
  });

  it("picks up the datamine when it starts after the events", () => {
    events_start();
    data_mine_start(k_layout_3_1);
    event_warning(k_format, "x", 5);
    expect(occurrences(datamine_read(k_layout_3_1).file)).toHaveLength(1);
  });

  it("keeps the bridge across an events restart", () => {
    data_mine_start(k_layout_3_1);
    events_start();
    events_dispose();
    events_start();
    event_warning(k_format, "x", 5);
    expect(occurrences(datamine_read(k_layout_3_1).file)).toHaveLength(1);
  });

  it("unhooks on dispose and leaves another handler alone", () => {
    events_start();
    data_mine_start(k_layout_3_1);
    expect(events_remote_log_handler()).toBeTypeOf("function");
    data_mine_dispose();
    expect(events_remote_log_handler()).toBeUndefined();

    const seen: s_event_remote_record[] = [];
    data_mine_start(k_layout_3_1);
    events_set_remote_log_handler((record) => seen.push(record));
    data_mine_dispose();
    expect(events_remote_log_handler()).toBeTypeOf("function");
    event_warning(k_format, "x", 5);
    expect(seen).toHaveLength(1);
  });
});

describe("event_write_to_datamine", () => {
  function record_create(
    format: string,
    args: s_event_remote_record["args"] = []
  ): s_event_remote_record {
    return {
      format,
      args,
      level: e_event_level.message,
      text: format,
      category_path: "",
      categories: [],
      context: "ctx",
    };
  }

  function write_one(
    settings: s_data_mine_bridge_config,
    record: s_event_remote_record
  ): s_datamine_file {
    data_mine_start(k_layout_3_1);
    event_write_to_datamine(record, settings, {});
    return datamine_read(k_layout_3_1).file;
  }

  it("splits categories on colons up to the first space", () => {
    const file = write_one(
      data_mine_config_resolve(k_layout_3_1).bridge,
      record_create("a:b: c:d %d", [1])
    );
    expect(occurrences(file)[0].record.categories).toEqual(["a", "b"]);
  });

  it("keeps the category count within the limit, the root included", () => {
    const segments = Array.from({ length: 20 }, (_, index) => `c${index}`);
    const settings: s_data_mine_bridge_config = {
      ...data_mine_config_resolve(k_layout_1_1).bridge,
      session_parameters: false,
    };
    const file = write_one(
      settings,
      record_create(`${segments.join(":")}: text`)
    );
    const { categories } = occurrences(file)[0].record;
    expect(categories).toHaveLength(16);
    expect(categories[0]).toBe("root");
    expect(categories[15]).toBe("c14");
  });

  it("cuts category names to the name size", () => {
    const file = write_one(
      data_mine_config_resolve(k_layout_3_1).bridge,
      record_create(`${"x".repeat(40)}: text`)
    );
    expect(occurrences(file)[0].record.categories[0]).toBe("x".repeat(31));
  });

  it("ignores an empty format", () => {
    const file = write_one(
      data_mine_config_resolve(k_layout_3_1).bridge,
      record_create("")
    );
    expect(occurrences(file)).toEqual([]);
  });
});
