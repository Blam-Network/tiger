import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer as http_server } from "node:http";
import { createServer as net_server } from "node:net";
import { join } from "node:path";
import {
  read_datamine_file as blf_read_datamine_file,
  get_formatted_event_string,
} from "@blamnetwork/blf";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  filetime_from_date,
  type s_clock,
} from "../../../src/blam/cseries/cseries_time.ts";
import { e_event_level } from "../../../src/blam/cseries/event_levels.ts";
import {
  data_mine_current_file,
  data_mine_dispose,
  data_mine_enable,
  data_mine_enabled,
  data_mine_flush,
  data_mine_initialize,
  data_mine_insert,
  data_mine_session_id,
  data_mine_set_endpoint,
  data_mine_upload,
  data_mine_uploading_files,
  type s_data_mine_initialize_options,
} from "../../../src/blam/data_mining/data_mine_management.ts";
import {
  c_datamine,
  data_mining_event_index_peek,
  data_mining_reset,
} from "../../../src/blam/data_mining/data_mining.ts";
import {
  data_mine_config_resolve,
  k_untracked_build_number,
  k_untracked_build_string,
  type s_data_mine_config_options,
} from "../../../src/config/data_mine_options.ts";
import {
  read_datamine_file,
  read_datamine_upload,
  type s_datamine_file,
} from "../../../src/data_mine_reader.ts";
import { DatamineError } from "../../../src/datamine_error.ts";
import type {
  s_http_endpoint,
  s_http_request,
  s_http_response,
  t_http_transport,
} from "../../../src/transport/http_transport.ts";
import {
  capture_events,
  type s_captured_event,
} from "../../support/capture_events.ts";
import {
  k_layout_1_1,
  k_layout_3_1,
  occurrences,
} from "../../support/datamine_files.ts";
import { tracked_servers } from "../../support/servers.ts";
import { temp_dirs } from "../../support/temp_dirs.ts";

const k_name_regex =
  /^[0-7][0-9a-f]{3}[0-7][0-9a-f]{3}[0-7][0-9a-f]{3}[0-7][0-9a-f]{3}\.datamine$/;
const k_date = new Date(2026, 8, 29, 16, 37, 42);
const k_endpoint: s_http_endpoint = {
  host: "127.0.0.1",
  port: 9,
  path: "/ticket_drop",
  ssl: false,
};
// Only tracked builds may upload, so tests start as one unless they say otherwise.
const k_tracked_build = {
  build_string: "00001.26.10.17.0000.test",
  build_number: 1,
};
const k_untracked_build = { build_string: undefined, build_number: undefined };

const temp = temp_dirs("data-mine-");
const servers = tracked_servers();
let root: string;
let events: s_captured_event[];
let captured: ReturnType<typeof capture_events>;
let clock_ms: number;
let clock_step: number;

const clock: s_clock = {
  now: () => k_date,
  milliseconds: () => {
    clock_ms += clock_step;
    return clock_ms;
  },
};

beforeEach(() => {
  root = temp.make();
  captured = capture_events();
  events = captured.events;
  clock_ms = 0;
  clock_step = 0;
});

afterEach(async () => {
  data_mine_dispose();
  captured.dispose();
  vi.useRealTimers();
  data_mining_reset();
  temp.remove_all();
  await servers.close_all();
});

function start(
  layout_options: s_data_mine_config_options,
  options: Partial<s_data_mine_initialize_options> = {}
): void {
  const ok = data_mine_initialize({
    root,
    ...layout_options,
    clock,
    enabled: true,
    install_exit_flush: false,
    system_id: "x64@pc@win@testbox",
    ...k_tracked_build,
    ...options,
  });
  expect(ok).toBe(true);
}

function start_untracked(
  layout_options: s_data_mine_config_options,
  options: Partial<s_data_mine_initialize_options> = {}
): void {
  start(layout_options, { ...k_untracked_build, ...options });
}

function datamine_directory(options: s_data_mine_config_options): string {
  return join(root, options.directory ?? "datamine");
}

function files_in(options: s_data_mine_config_options): string[] {
  return readdirSync(datamine_directory(options))
    .filter((name) => name.endsWith(".datamine"))
    .sort()
    .map((name) => join(datamine_directory(options), name));
}

function emit(name: string, value: number, categories = ["cat"]): void {
  const datamine = new c_datamine(2, name, categories);
  datamine.add_long("n", value);
  datamine.add_string("s", "text");
  datamine.commit();
}

function read(path: string): s_datamine_file {
  return read_datamine_file(readFileSync(path));
}

const k_layouts: [string, s_data_mine_config_options][] = [
  ["1.0", { layout: "1.0", byte_order: "big" }],
  ["1.1", { layout: "1.1", byte_order: "little" }],
  ["2.0", { layout: "2.0", byte_order: "big" }],
  ["2.1", { layout: "2.1", byte_order: "big" }],
  ["3.1", { layout: "3.1", byte_order: "big" }],
];

describe("data_mine_initialize", () => {
  it("creates a file with a generated name inside the datamine directory", () => {
    start(k_layout_1_1);
    const [path] = files_in(k_layout_1_1);
    expect(path).toBe(data_mine_current_file());
    expect(path.startsWith(join(root, "datamine"))).toBe(true);
    expect(path.split(/[\\/]/).at(-1)).toMatch(k_name_regex);
  });

  it("builds the name from four 15 bit groups and retries a taken name", () => {
    const directory = join(root, "datamine");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "0001000200030004.datamine"), "taken");
    const values = [1, 2, 3, 4, 0x7f_ff, 0xff_ff, 0x10, 0xab];
    start(k_layout_1_1, { rand: () => values.shift() ?? 0 });
    expect(data_mine_current_file()?.split(/[\\/]/).at(-1)).toBe(
      "7fff7fff001000ab.datamine"
    );
  });

  it("throws when initialized twice", () => {
    start(k_layout_1_1);
    expect(() => data_mine_initialize({ root })).toThrow(DatamineError);
  });

  it("can start again after dispose", () => {
    start(k_layout_1_1);
    data_mine_dispose();
    start(k_layout_1_1);
    expect(data_mine_current_file()).toBeDefined();
  });

  it("reports and stays down when the file can't be created", () => {
    writeFileSync(join(root, "datamine"), "not a directory");
    const ok = data_mine_initialize({
      root,
      ...k_layout_1_1,
      install_exit_flush: false,
      enabled: true,
    });
    expect(ok).toBe(false);
    expect(events[0]?.level).toBe(e_event_level.error);
    expect(data_mine_enabled()).toBe(false);
  });

  it("registers and removes the exit flush", () => {
    const before = process.listenerCount("exit");
    start(k_layout_1_1, { install_exit_flush: true });
    expect(process.listenerCount("exit")).toBe(before + 1);
    data_mine_dispose();
    expect(process.listenerCount("exit")).toBe(before);
  });

  it("derives the session id from the start time and system id", () => {
    start(k_layout_1_1);
    expect(data_mine_session_id()).toBe(
      "Tue_09292026_163742@x64@pc@win@testbox"
    );
    data_mine_dispose();
    start(k_layout_3_1);
    expect(data_mine_session_id()).toBe(
      "Tue_09292026_163742_000001@x64@pc@win@testbox"
    );
  });

  it("applies the title, build and directory to the file", () => {
    const options: s_data_mine_config_options = {
      title: "my_app default",
      build_string: "1.2.3",
      build_number: 123,
      directory: join("out", "mine"),
    };
    start({}, options);
    data_mine_dispose();
    const header = read(files_in(options)[0]).header;
    expect(header.title).toBe("my_app default");
    expect(header.build_string).toBe("1.2.3");
    expect(header.build_number).toBe(123);
    expect(files_in(options)[0].startsWith(join(root, "out", "mine"))).toBe(
      true
    );
  });

  it("writes the header extras of the layouts that have them", () => {
    const options: s_data_mine_config_options = {
      layout: "2.1",
      header_extra: { source_flag: 1 },
    };
    start(options);
    data_mine_dispose();
    expect(read(files_in(options)[0]).header.source_flag).toBe(1);
  });

  it("writes and reads back files of an untracked build", () => {
    start_untracked(k_layout_3_1);
    emit("untracked", 1);
    data_mine_dispose();

    const file = read(files_in(k_layout_3_1)[0]);
    expect(file.header.build_string).toBe(k_untracked_build_string);
    expect(file.header.build_number).toBe(k_untracked_build_number);
    expect(occurrences(file).map((entry) => entry.record.event_name)).toEqual([
      "untracked",
    ]);
  });
});

describe.each(k_layouts)("%s files", (_name, profile) => {
  const config = data_mine_config_resolve(profile);
  it("writes a header the reader decodes", () => {
    start(profile);
    emit("one", 1);
    data_mine_dispose();

    const [path] = files_in(profile);
    const file = read(path);
    expect(file.header.layout).toBe(config.layout);
    expect(file.header.byte_order).toBe(config.byte_order);
    expect(file.header.sessionid).toBe(
      config.layout === "3.1"
        ? "Tue_09292026_163742_000001@x64@pc@win@testbox"
        : "Tue_09292026_163742@x64@pc@win@testbox"
    );
    expect(file.header.systemid).toBe("x64@pc@win@testbox");
    expect(file.header.title).toBe("datamine");
    expect(file.header.build_string).toBe(k_tracked_build.build_string);
    expect(file.header.build_number).toBe(k_tracked_build.build_number);
    expect(file.header.session_start_date).toBe(filetime_from_date(k_date));
    expect(file.truncated_at).toBeUndefined();
  });

  it("round trips records through the reader", () => {
    start(profile);
    emit("first", 11, ["a", "b"]);
    emit("second", -22);
    data_mine_dispose();

    const file = read(files_in(profile)[0]);
    const found = occurrences(file);
    expect(found.map((entry) => entry.record.event_name)).toEqual([
      "first",
      "second",
    ]);
    expect(found[0].record.categories).toEqual(["a", "b"]);
    expect(found.map((entry) => entry.record.parameters[0].value)).toEqual([
      11, -22,
    ]);
    expect(found[0].record.parameters[1].value).toBe("text");
    expect(found.map((entry) => entry.record.event_index)).toEqual([
      config.behaviour.event_index_start,
      config.behaviour.event_index_start + 1,
    ]);
    expect(found[0].record.event_date).toBe(filetime_from_date(k_date));
  });

  it("holds the buffered tail back until flush or dispose", () => {
    start(profile);
    const [path] = files_in(profile);
    const header_size = statSync(path).size;
    emit("pending", 1);
    expect(statSync(path).size).toBe(header_size);
    data_mine_dispose();
    expect(statSync(path).size).toBeGreaterThan(header_size);
  });
});

describe("rotation", () => {
  it("re-emits definitions in each new file for v3", () => {
    start(k_layout_3_1);
    const first_path = data_mine_current_file() as string;
    emit("repeat", 1);
    data_mine_flush();
    const second_path = data_mine_current_file() as string;
    expect(second_path).not.toBe(first_path);
    emit("repeat", 2);
    data_mine_dispose();

    const first = read(first_path);
    const second = read(second_path);
    for (const file of [first, second]) {
      expect(file.truncated_at).toBeUndefined();
      expect(file.records.map((entry) => entry.kind)).toEqual([
        "definition",
        "occurrence",
      ]);
    }
    const [first_definition] = first.records;
    const [second_definition] = second.records;
    expect(first_definition.kind === "definition").toBe(true);
    if (
      first_definition.kind === "definition" &&
      second_definition.kind === "definition"
    ) {
      expect(second_definition.definition.definition_id).toBe(
        first_definition.definition.definition_id
      );
    }
    expect(occurrences(second)[0].record.event_index).toBe(1);
  });

  it("starts each file with its own header", () => {
    start(k_layout_1_1);
    const first_path = data_mine_current_file() as string;
    data_mine_flush();
    data_mine_dispose();
    expect(files_in(k_layout_1_1)).toHaveLength(2);
    expect(read(first_path).header.sessionid).toBe(data_mine_session_id());
  });

  it("rotates once rotate_bytes is reached", () => {
    start(k_layout_1_1, { rotate_bytes: 3000 });
    for (let index = 0; index < 5; index++) {
      emit("big", index);
    }
    data_mine_dispose();

    const files = files_in(k_layout_1_1);
    expect(files.length).toBeGreaterThan(1);
    const total = files.flatMap((path) => occurrences(read(path)));
    expect(total).toHaveLength(5);
    expect(total.map((entry) => entry.record.event_index).sort()).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("reports a slow rotation", () => {
    start(k_layout_1_1);
    clock_step = 150;
    data_mine_flush();
    expect(events.map((event) => event.text)).toContain(
      "datamine: data_min_flush took 150 msecs to rotate the datamine files"
    );
    expect(events.at(-1)?.level).toBe(e_event_level.error);
  });

  it("rotates on rotate_interval_ms only when there is something to rotate", () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    start(k_layout_1_1, { rotate_interval_ms: 20 });
    vi.advanceTimersByTime(100);
    expect(files_in(k_layout_1_1)).toHaveLength(1);
    emit("tick", 1);
    vi.advanceTimersByTime(20);
    expect(files_in(k_layout_1_1)).toHaveLength(2);
  });
});

describe("enable and disable", () => {
  it("advances the event index but writes nothing while disabled", () => {
    start(k_layout_1_1, { enabled: false });
    expect(data_mine_enabled()).toBe(false);
    const before = data_mining_event_index_peek();
    emit("ignored", 1);
    expect(data_mining_event_index_peek()).toBe(before + 1);
    data_mine_dispose();

    const file = read(files_in(k_layout_1_1)[0]);
    expect(file.records).toHaveLength(0);
  });

  it("writes again once enabled", () => {
    start(k_layout_1_1, { enabled: false });
    emit("ignored", 1);
    data_mine_enable(true);
    expect(data_mine_enabled()).toBe(true);
    emit("kept", 2);
    data_mine_dispose();

    const found = occurrences(read(files_in(k_layout_1_1)[0]));
    expect(found.map((entry) => entry.record.event_name)).toEqual(["kept"]);
    expect(found[0].record.event_index).toBe(2);
  });

  it("does not rotate while disabled", () => {
    start(k_layout_1_1, { enabled: false });
    data_mine_flush();
    expect(files_in(k_layout_1_1)).toHaveLength(1);
  });
});

describe("data_mine_insert", () => {
  it("records the text under the generic text event", () => {
    start(k_layout_3_1);
    data_mine_insert("hello there");
    data_mine_dispose();

    const [entry] = occurrences(read(files_in(k_layout_3_1)[0]));
    expect(entry.record.event_name).toBe("generic text");
    expect(entry.record.categories).toEqual(["test"]);
    expect(entry.record.priority).toBe(0);
    expect(entry.record.parameters).toMatchObject([
      { name: "text", value: "hello there" },
    ]);
  });
});

describe("blf compatibility", () => {
  it("reads a 3.1 file the way the game tools do", () => {
    start(k_layout_3_1);
    emit("networking:first", 5, ["networking", "first"]);
    emit("networking:first", 6, ["networking", "first"]);
    data_mine_dispose();

    const parsed = blf_read_datamine_file(
      readFileSync(files_in(k_layout_3_1)[0])
    );
    expect(parsed?.header).toMatchObject({
      version: 3,
      version_minor: 1,
      application_name: "datamine",
      build_number: k_tracked_build.build_number,
    });
    expect(parsed?.events).toHaveLength(2);
    const [first, second] = parsed?.events ?? [];
    expect(first.header.event_name).toBe("networking:first");
    expect(first.categories).toEqual(["networking", "first"]);
    expect(second.header.event_index).toBe(1);
    expect(get_formatted_event_string(second)).toContain("networking:first");
  });
});

describe("data_mine_upload", () => {
  function stub_transport(
    respond: (request: s_http_request) => s_http_response
  ): { calls: s_http_request[]; transport: t_http_transport } {
    const calls: s_http_request[] = [];
    return {
      calls,
      transport: (request) => {
        calls.push(request);
        return Promise.resolve(respond(request));
      },
    };
  }

  const accepted = (): s_http_response => ({
    status: 200,
    headers: {},
    body: Buffer.from("{}"),
  });

  // A Halo-style upload server: it reads the whole multipart body, records the start of the
  // request and answers with the next of `answers`, repeating the last.
  function legacy_upload_server(answers: string[]): {
    port: Promise<number>;
    requests: string[];
  } {
    const requests: string[] = [];
    const server = net_server((socket) => {
      let received = Buffer.alloc(0);
      socket.on("error", () => undefined);
      socket.on("data", (chunk) => {
        received = Buffer.concat([received, chunk]);
        if (received.includes("\r\n--BUNGIEr0x0rz--\r\n")) {
          requests.push(received.toString("latin1", 0, 40));
          const answer =
            answers.length > 1 ? (answers.shift() as string) : answers[0];
          socket.end(
            `HTTP/1.0 200 OK\r\nContent-Length: ${answer.length}\r\n\r\n${answer}`
          );
        }
      });
    });
    return { port: servers.listen(server), requests };
  }

  it("skips the open file, deletes empty files and removes uploaded ones", async () => {
    const { calls, transport } = stub_transport(accepted);
    start(k_layout_3_1, { endpoint: k_endpoint, transport });
    emit("upload me", 1);
    const directory = datamine_directory(k_layout_3_1);
    const empty = join(directory, "0000000000000000.datamine");
    writeFileSync(empty, "");
    const written = data_mine_current_file() as string;

    const result = await data_mine_upload();

    expect(result).toEqual({ uploaded: 1, failed: 0, deleted_empty: 1 });
    expect(existsSync(empty)).toBe(false);
    expect(existsSync(written)).toBe(false);
    // The replacement file is still being written.
    const current = data_mine_current_file() as string;
    expect(current).not.toBe(written);
    expect(existsSync(current)).toBe(true);
    expect(files_in(k_layout_3_1)).toEqual([current]);

    expect(calls).toHaveLength(1);
    expect(calls[0].filename).toBe("upload_temp.zip");
    const uploaded = read_datamine_upload(calls[0].body);
    expect(uploaded.header.layout).toBe("3.1");
    expect(
      occurrences(uploaded).map((entry) => entry.record.event_name)
    ).toEqual(["upload me"]);
    expect(events.map((event) => event.text)).toContain(
      `datamine: file '${written}' uploaded successfully`
    );
  });

  it("does not rotate when the open file holds only its header", async () => {
    const { calls, transport } = stub_transport(accepted);
    start(k_layout_3_1, { endpoint: k_endpoint, transport });
    const before = data_mine_current_file();
    const result = await data_mine_upload();
    expect(result).toEqual({ uploaded: 0, failed: 0, deleted_empty: 0 });
    expect(data_mine_current_file()).toBe(before);
    expect(calls).toHaveLength(0);
  });

  it("keeps a file the server refused and stops", async () => {
    const { calls, transport } = stub_transport(() => ({
      status: 500,
      headers: {},
      body: Buffer.alloc(0),
    }));
    start(k_layout_3_1, { endpoint: k_endpoint, transport });
    emit("stays", 1);
    const written = data_mine_current_file() as string;
    // A second finished file that should not be attempted after the first failure.
    const other = join(
      datamine_directory(k_layout_3_1),
      "7fffffffffffffff.datamine"
    );
    writeFileSync(other, readFileSync(written));

    const result = await data_mine_upload();

    expect(result.uploaded).toBe(0);
    expect(result.failed).toBe(1);
    expect(existsSync(written)).toBe(true);
    expect(existsSync(other)).toBe(true);
    // Three attempts at one file, nothing for the next.
    expect(calls).toHaveLength(3);
    expect(events.map((event) => event.text)).toContain(
      `datamine: failed to upload file '${written}', cancelling uploading.  will retry later.`
    );
    expect(data_mine_uploading_files()).toBe(false);
  });

  it("shares one in-flight upload between callers", async () => {
    let release: (response: s_http_response) => void = () => undefined;
    let calls = 0;
    start(k_layout_3_1, {
      endpoint: k_endpoint,
      transport: () => {
        calls++;
        return new Promise<s_http_response>((resolve) => {
          release = resolve;
        });
      },
    });
    emit("once", 1);

    const first = data_mine_upload();
    const second = data_mine_upload();
    expect(second).toBe(first);
    expect(data_mine_uploading_files()).toBe(true);

    await vi.waitFor(() => expect(calls).toBe(1));
    release(accepted());
    expect(await first).toMatchObject({ uploaded: 1 });
    expect(data_mine_uploading_files()).toBe(false);

    // A later call starts a fresh upload.
    expect(data_mine_upload()).not.toBe(first);
  });

  it("uploads to an endpoint set after initialization, and stops when it is cleared", async () => {
    const { calls, transport } = stub_transport(accepted);
    start(k_layout_3_1, { transport });
    emit("late endpoint", 1);

    data_mine_set_endpoint({ ...k_endpoint, host: "example.test", ssl: true });
    expect(await data_mine_upload()).toMatchObject({ uploaded: 1 });
    expect(calls[0].endpoint).toEqual({
      ...k_endpoint,
      host: "example.test",
      ssl: true,
    });

    data_mine_set_endpoint(undefined);
    await expect(data_mine_upload()).rejects.toThrow(DatamineError);
  });

  it("rejects without an endpoint", async () => {
    start(k_layout_3_1);
    await expect(data_mine_upload()).rejects.toThrow(DatamineError);
    expect(data_mine_uploading_files()).toBe(false);
  });

  it("refuses an untracked build and keeps its files", async () => {
    const { calls, transport } = stub_transport(accepted);
    start_untracked(k_layout_3_1, { endpoint: k_endpoint, transport });
    emit("stays", 1);

    await expect(data_mine_upload()).rejects.toThrow("untracked");
    expect(calls).toHaveLength(0);
    expect(data_mine_uploading_files()).toBe(false);

    data_mine_dispose();
    const [path] = files_in(k_layout_3_1);
    expect(
      occurrences(read(path)).map((entry) => entry.record.event_name)
    ).toEqual(["stays"]);
  });

  it("does nothing while disabled", async () => {
    const { calls, transport } = stub_transport(accepted);
    start(k_layout_3_1, {
      endpoint: k_endpoint,
      transport,
      enabled: false,
    });
    expect(await data_mine_upload()).toEqual({
      uploaded: 0,
      failed: 0,
      deleted_empty: 0,
    });
    expect(calls).toHaveLength(0);
  });

  it("uploads on upload_interval_ms", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { calls, transport } = stub_transport(accepted);
    start(k_layout_3_1, {
      endpoint: k_endpoint,
      transport,
      upload_interval_ms: 20,
    });
    emit("timed", 1);
    vi.advanceTimersByTime(20);
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));
  });

  it("starts no upload timer for an untracked build", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { calls, transport } = stub_transport(accepted);
    start_untracked(k_layout_3_1, {
      endpoint: k_endpoint,
      transport,
      upload_interval_ms: 20,
    });
    emit("never uploaded", 1);
    await vi.advanceTimersByTimeAsync(200);
    expect(calls).toHaveLength(0);
    expect(
      events.filter((event) => event.level >= e_event_level.error)
    ).toEqual([]);
  });

  it("reports a timer upload that throws", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    start(k_layout_3_1, { upload_interval_ms: 20 });
    await vi.advanceTimersByTimeAsync(20);
    expect(
      events.some((event) => event.text.includes("no upload endpoint"))
    ).toBe(true);
  });

  it("sends a 3.1 file to an http server with fetch", async () => {
    const bodies: Buffer[] = [];
    const port = await servers.listen(
      http_server((req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          bodies.push(Buffer.concat(chunks));
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end("{}");
        });
      })
    );
    start(k_layout_3_1, { endpoint: { ...k_endpoint, port } });
    emit("over the wire", 3);
    const result = await data_mine_upload();
    expect(result.uploaded).toBe(1);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].includes(Buffer.from('filename="upload_temp.zip"'))).toBe(
      true
    );
  });

  it("sends a 1.1 file over the 1.0 writer and needs DONE", async () => {
    const { port, requests } = legacy_upload_server(["nope", "DONE"]);
    start(k_layout_1_1, {
      endpoint: { ...k_endpoint, port: await port },
    });
    emit("old school", 3);
    const result = await data_mine_upload();
    expect(result.uploaded).toBe(1);
    expect(requests).toHaveLength(2);
    expect(requests[0].startsWith("POST /ticket_drop HTTP/1.0\r\n")).toBe(true);
  });

  it("takes an http version at initialize that beats the layout's", async () => {
    const { port, requests } = legacy_upload_server(["{}"]);
    start(k_layout_3_1, {
      endpoint: { ...k_endpoint, port: await port },
      http_version: "1.0",
    });
    emit("old school", 3);
    const result = await data_mine_upload();
    expect(result.uploaded).toBe(1);
    expect(requests[0].startsWith("POST /ticket_drop HTTP/1.0\r\n")).toBe(true);
  });
});
