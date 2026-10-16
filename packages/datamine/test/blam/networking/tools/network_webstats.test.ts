import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { s_clock } from "../../../../src/blam/cseries/cseries_time.ts";
import { e_event_level } from "../../../../src/blam/cseries/event_levels.ts";
import {
  c_network_webstats,
  e_webstats_state,
} from "../../../../src/blam/networking/tools/network_webstats.ts";
import {
  data_mine_config_resolve,
  type s_data_mine_upload_config,
} from "../../../../src/config/data_mine_options.ts";
import { DatamineError } from "../../../../src/datamine_error.ts";
import type {
  s_http_endpoint,
  s_http_request,
  s_http_response,
  t_http_transport,
} from "../../../../src/transport/http_transport.ts";
import { zip_read_single_entry } from "../../../../src/transport/zip_writer.ts";
import { temp_dirs } from "../../../support/temp_dirs.ts";

// Upload settings of a 3.1 file, and of a 1.1 file which also wants DONE in the body.
const k_upload_3_1 = data_mine_config_resolve({}).upload;
const k_upload_1_1 = data_mine_config_resolve({ layout: "1.1" }).upload;

const zip_state = { fail: false };

vi.mock("../../../../src/transport/zip_writer.ts", async (load_original) => {
  const original =
    await load_original<
      typeof import("../../../../src/transport/zip_writer.ts")
    >();
  return {
    ...original,
    zip_create_single_entry: (
      ...args: Parameters<typeof original.zip_create_single_entry>
    ) =>
      zip_state.fail
        ? Promise.reject(new Error("compression broke"))
        : original.zip_create_single_entry(...args),
  };
});

const k_endpoint: s_http_endpoint = {
  host: "127.0.0.1",
  port: 9,
  path: "/ticket_drop",
  ssl: false,
};

function response(status: number, body = ""): s_http_response {
  return { status, body: Buffer.from(body), headers: {} };
}

interface s_event {
  level: number;
  text: string;
}

const temp = temp_dirs("webstats-");
let directory: string;
let file: string;
let events: s_event[];
const on_event = (level: number, text: string) => events.push({ level, text });

beforeEach(() => {
  directory = temp.make();
  file = join(directory, "sample.datamine");
  writeFileSync(file, Buffer.from("datamine file contents ".repeat(50)));
  events = [];
  zip_state.fail = false;
});

afterEach(() => {
  temp.remove_all();
});

function submit_options(
  transport: t_http_transport,
  upload: s_data_mine_upload_config = k_upload_3_1,
  extra: { clock?: s_clock; signal?: AbortSignal } = {}
) {
  return {
    upload,
    endpoint: k_endpoint,
    transport,
    on_event,
    ...extra,
  };
}

describe("c_network_webstats", () => {
  it("zips the file and posts it", async () => {
    const requests: s_http_request[] = [];
    const webstats = new c_network_webstats();
    const ok = await webstats.submit_file(
      file,
      submit_options((request) => {
        requests.push(request);
        return Promise.resolve(response(200, "{}"));
      })
    );

    expect(ok).toBe(true);
    expect(webstats.state).toBe(e_webstats_state.none);
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.filename).toBe("upload_temp.zip");
    expect(request.content_type).toBe("application/x-bungie-datamine");
    expect(request.endpoint).toBe(k_endpoint);
    const entry = zip_read_single_entry(request.body);
    expect(entry.name).toBe("compressed.dat");
    expect(entry.data.toString()).toBe("datamine file contents ".repeat(50));
    expect(events.map((event) => event.text)).toContain(
      "networking:webstats: upload successful."
    );
    expect(existsSync(file)).toBe(true);
  });

  it("applies the success rule of the layout", async () => {
    const webstats = new c_network_webstats();
    const answers = ["NOPE", "DONE"];
    const ok = await webstats.submit_file(
      file,
      submit_options(
        () => Promise.resolve(response(200, answers.shift() ?? "")),
        k_upload_1_1
      )
    );
    expect(ok).toBe(true);
    expect(answers).toEqual([]);
  });

  it("retries after a failure and then succeeds", async () => {
    let calls = 0;
    const webstats = new c_network_webstats();
    const ok = await webstats.submit_file(
      file,
      submit_options(() => {
        calls++;
        return Promise.resolve(response(calls === 1 ? 500 : 200));
      })
    );
    expect(ok).toBe(true);
    expect(calls).toBe(2);
    const texts = events.map((event) => event.text);
    expect(
      texts.some((text) =>
        text.startsWith("networking:webstats: upload 1/3 failed to server")
      )
    ).toBe(true);
    expect(texts).toContain("networking:webstats: upload successful.");
  });

  it("gives up after every retry fails and keeps the file", async () => {
    let calls = 0;
    const webstats = new c_network_webstats();
    const ok = await webstats.submit_file(
      file,
      submit_options(() => {
        calls++;
        return Promise.reject(new DatamineError("refused"));
      })
    );
    expect(ok).toBe(false);
    expect(calls).toBe(3);
    const texts = events.map((event) => event.text);
    expect(
      texts.filter((text) => text.includes("failed to server"))
    ).toHaveLength(4);
    expect(texts.at(-1)).toBe(
      "networking:webstats: upload failed to server 127.0.0.1:9."
    );
    expect(existsSync(file)).toBe(true);
    expect(webstats.state).toBe(e_webstats_state.none);
  });

  it("honours a custom retry count", async () => {
    let calls = 0;
    const webstats = new c_network_webstats();
    await webstats.submit_file(
      file,
      submit_options(
        () => {
          calls++;
          return Promise.resolve(response(503));
        },
        { ...k_upload_3_1, retry_count: 5 }
      )
    );
    expect(calls).toBe(5);
  });

  it("keeps the file when compression fails", async () => {
    zip_state.fail = true;
    let calls = 0;
    const webstats = new c_network_webstats();
    const ok = await webstats.submit_file(
      file,
      submit_options(() => {
        calls++;
        return Promise.resolve(response(200));
      })
    );
    expect(ok).toBe(false);
    expect(calls).toBe(0);
    expect(events).toEqual([
      {
        level: e_event_level.warning,
        text: "webstats: file compression failed.",
      },
    ]);
    expect(existsSync(file)).toBe(true);
    expect(webstats.state).toBe(e_webstats_state.none);
  });

  it("reports an unreadable file as a compression failure", async () => {
    const webstats = new c_network_webstats();
    const ok = await webstats.submit_file(
      join(directory, "missing.datamine"),
      submit_options(() => Promise.resolve(response(200)))
    );
    expect(ok).toBe(false);
    expect(events[0]?.text).toBe("webstats: file compression failed.");
  });

  it("allows one submission at a time", async () => {
    let release: (value: s_http_response) => void = () => undefined;
    const webstats = new c_network_webstats();
    const first = webstats.submit_file(
      file,
      submit_options(
        () =>
          new Promise<s_http_response>((resolve) => {
            release = resolve;
          })
      )
    );
    expect(webstats.busy).toBe(true);
    await expect(
      webstats.submit_file(
        file,
        submit_options(() => Promise.resolve(response(200)))
      )
    ).rejects.toThrow(DatamineError);

    await vi.waitFor(() =>
      expect(webstats.state).toBe(e_webstats_state.file_ready_for_upload)
    );
    release(response(200));
    expect(await first).toBe(true);
    expect(webstats.busy).toBe(false);
  });

  it("stops retrying once the overall deadline has passed", async () => {
    // First read sets the deadline, the second finds it long gone.
    const times = [0, 1000, 5_000_000];
    const clock: s_clock = {
      milliseconds: () => times.shift() ?? 5_000_000,
      now: () => new Date(0),
    };
    let calls = 0;
    const webstats = new c_network_webstats();
    const ok = await webstats.submit_file(
      file,
      submit_options(
        () => {
          calls++;
          return Promise.resolve(response(500));
        },
        k_upload_3_1,
        { clock }
      )
    );
    expect(ok).toBe(false);
    expect(calls).toBe(1);
    expect(events.map((event) => event.text)).toContain(
      "networking:webstats: upload step is taking too long, cancelling."
    );
  });

  it("cuts off a transport that ignores its timeout", async () => {
    const webstats = new c_network_webstats();
    const ok = await webstats.submit_file(
      file,
      submit_options(() => new Promise<s_http_response>(() => undefined), {
        ...k_upload_3_1,
        timeout_ms: 40,
        retry_count: 1,
      })
    );
    expect(ok).toBe(false);
    expect(events.some((event) => event.text.includes("timed out"))).toBe(true);
  });

  it("gives up when the signal fires", async () => {
    const controller = new AbortController();
    const webstats = new c_network_webstats();
    const pending = webstats.submit_file(
      file,
      submit_options(
        (request) =>
          new Promise<s_http_response>((_resolve, reject) => {
            request.signal?.addEventListener("abort", () =>
              reject(new DatamineError("aborted"))
            );
          }),
        k_upload_3_1,
        { signal: controller.signal }
      )
    );
    setTimeout(() => controller.abort(), 20);
    expect(await pending).toBe(false);
  });
});
