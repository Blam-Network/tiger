import {
  createServer,
  get,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  event_message,
  event_set_log_level_global,
  event_verbose,
  event_warning,
  events_dispose,
  events_initialize,
} from "../../src/blam/cseries/cseries_events.ts";
import { event_context_run } from "../../src/blam/cseries/event_context.ts";
import { e_event_level } from "../../src/blam/cseries/event_levels.ts";
import {
  data_mine_dispose,
  data_mine_initialize,
} from "../../src/blam/data_mining/data_mine_management.ts";
import { e_datamine_parameter_type } from "../../src/blam/data_mining/data_mining.ts";
import type { s_events_initialize_options } from "../../src/config/event_options.ts";
import {
  c_events_server_client,
  events_server_address,
  events_server_handler,
  events_server_running,
  events_server_start,
  events_server_stop,
  k_events_server_protocol_version,
  type s_events_server_address,
  type s_events_server_stream,
} from "../../src/server/events_server.ts";
import type {
  s_events_server_entry,
  s_events_server_hello,
  s_events_server_session,
} from "../../src/server/events_server_protocol.ts";
import { tracked_servers } from "../support/servers.ts";
import { temp_dirs } from "../support/temp_dirs.ts";

interface s_sse_message {
  data: string;
  event: string;
  id: string | undefined;
}

interface s_sse_client {
  close: () => void;
  ended: Promise<void>;
  messages: s_sse_message[];
  pings: () => number;
  response: IncomingMessage;
  // Resolves once a message matches, with everything received so far.
  wait_for: (
    predicate: (messages: s_sse_message[]) => boolean
  ) => Promise<s_sse_message[]>;
}

const temp = temp_dirs("datamine-events-server-");
const make_root = temp.make;
const servers = tracked_servers();
const k_clients: s_sse_client[] = [];

const k_version = "server test build";

function init_events(
  options: Partial<s_events_initialize_options> = {}
): string {
  const root = make_root();
  events_initialize({
    root,
    name: "tester",
    version_string: k_version,
    install_exit_flush: false,
    ...options,
  });
  event_set_log_level_global(e_event_level.verbose);
  return root;
}

function sse_parse(block: string): s_sse_message | undefined {
  const message: s_sse_message = { event: "message", data: "", id: undefined };
  let found = false;
  for (const line of block.split("\n")) {
    if (line.startsWith(":") || line.length === 0) {
      continue;
    }
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") {
      message.event = value;
      found = true;
    } else if (field === "data") {
      message.data = message.data ? `${message.data}\n${value}` : value;
      found = true;
    } else if (field === "id") {
      message.id = value;
      found = true;
    }
  }
  return found ? message : undefined;
}

function sse_connect(
  url: string,
  headers: Record<string, string> = {}
): Promise<s_sse_client> {
  return new Promise((resolve, reject) => {
    const request = get(url, {
      headers: { Accept: "text/event-stream", ...headers },
    });
    request.on("error", reject);
    request.on("response", (response) => {
      response.setEncoding("utf8");
      const messages: s_sse_message[] = [];
      const waiters: (() => void)[] = [];
      let pending = "";
      let pings = 0;
      response.on("data", (chunk: string) => {
        pending += chunk;
        let split = pending.indexOf("\n\n");
        while (split >= 0) {
          const block = pending.slice(0, split);
          pending = pending.slice(split + 2);
          if (block.startsWith(": ping")) {
            pings++;
          }
          const message = sse_parse(block);
          if (message) {
            messages.push(message);
          }
          split = pending.indexOf("\n\n");
        }
        for (const waiter of [...waiters]) {
          waiter();
        }
      });
      const ended = new Promise<void>((done) => {
        response.on("close", () => done());
        response.on("error", () => done());
      });
      const client: s_sse_client = {
        response,
        messages,
        ended,
        pings: () => pings,
        close: () => request.destroy(),
        wait_for: (predicate) =>
          new Promise((done, fail) => {
            const timer = setTimeout(
              () =>
                fail(
                  new Error(
                    `timed out waiting, got ${JSON.stringify(messages.map((m) => m.event))}`
                  )
                ),
              4000
            );
            const check = (): boolean => {
              if (predicate(messages)) {
                clearTimeout(timer);
                done(messages);
                return true;
              }
              return false;
            };
            if (!check()) {
              const waiter = (): void => {
                if (check()) {
                  waiters.splice(waiters.indexOf(waiter), 1);
                }
              };
              waiters.push(waiter);
            }
          }),
      };
      k_clients.push(client);
      resolve(client);
    });
  });
}

function entries_of(messages: s_sse_message[]): s_events_server_entry[] {
  return messages
    .filter((message) => message.event === "entry")
    .map((message) => JSON.parse(message.data) as s_events_server_entry);
}

function names_of(messages: s_sse_message[]): string[] {
  return messages.map((message) => message.event);
}

function entry_count(count: number) {
  return (messages: s_sse_message[]): boolean =>
    entries_of(messages).length >= count;
}

async function start(
  options: Parameters<typeof events_server_start>[0] = {}
): Promise<s_events_server_address> {
  return await events_server_start({ port: 0, ...options });
}

// Mounts a handler on its own http server.
async function serve_embedded(
  handler: (req: IncomingMessage, res: ServerResponse) => unknown
): Promise<string> {
  const port = await servers.listen(createServer(handler));
  return `http://127.0.0.1:${port}`;
}

async function fetch_json<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return (await response.json()) as T;
}

afterEach(async () => {
  for (const client of k_clients.splice(0)) {
    client.close();
  }
  await events_server_stop();
  await servers.close_all();
  data_mine_dispose();
  events_dispose();
  temp.remove_all();
});

describe("events server hello", () => {
  it("answers /info from the events profile", async () => {
    init_events();
    const address = await start();
    expect(address.host).toBe("127.0.0.1");
    expect(address.port).toBeGreaterThan(0);
    expect(address.url).toBe(`http://127.0.0.1:${address.port}`);
    expect(events_server_running()).toBe(true);
    expect(events_server_address()).toEqual(address);

    const hello = await fetch_json<s_events_server_hello>(
      `${address.url}/datamine/info`
    );
    expect(hello.protocol).toBe(k_events_server_protocol_version);
    expect(hello.name).toBe("tester");
    expect(hello.version_string).toBe(k_version);
    expect(hello.session_number).toBeGreaterThan(0);
    expect(hello.started_ms).toBeGreaterThan(0);
    expect(hello.entry_count).toBe(0);
    expect(hello.backlog_count).toBe(0);
    expect(hello.session_id).toBeUndefined();
    expect(hello.run_id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("gets a new run id each time the server starts", async () => {
    init_events();
    const first = await start();
    const first_run = (
      await fetch_json<s_events_server_hello>(`${first.url}/datamine/info`)
    ).run_id;
    await events_server_stop();
    const second = await start();
    const second_run = (
      await fetch_json<s_events_server_hello>(`${second.url}/datamine/info`)
    ).run_id;
    expect(second_run).not.toBe(first_run);
  });

  it("adds the datamine ids once the datamine is initialized", async () => {
    const root = init_events();
    data_mine_initialize({
      root,
      session_id: "session-1",
      system_id: "system-1",
      build_string: "build-1",
      install_exit_flush: false,
    });
    const address = await start();
    const hello = await fetch_json<s_events_server_hello>(
      `${address.url}/datamine/info`
    );
    expect(hello.session_id).toBe("session-1");
    expect(hello.system_id).toBe("system-1");
    expect(hello.build_string).toBe("build-1");
  });

  it("is up before the events are initialized", async () => {
    const address = await start();
    const hello = await fetch_json<s_events_server_hello>(
      `${address.url}/datamine/info`
    );
    expect(hello.entry_count).toBe(0);
    const client = await sse_connect(`${address.url}/datamine/events`);
    await client.wait_for((messages) => messages.length >= 1);

    init_events();
    event_warning("test:server: late %d", 1);
    const messages = await client.wait_for(entry_count(1));
    // An older run may have left a session behind; the new one comes right before the entry.
    expect(names_of(messages)[0]).toBe("hello");
    expect(names_of(messages).slice(-2)).toEqual(["session", "entry"]);
    expect(entries_of(messages)[0].text).toContain("late 1");
  });
});

describe("events server stream", () => {
  it("sends the hello, the backlog and then live entries", async () => {
    init_events();
    const address = await start();
    event_warning("test:server: first %d", 1);
    event_message("test:server:sub: second %s", "two");

    const client = await sse_connect(`${address.url}/datamine/events`);
    const messages = await client.wait_for(entry_count(2));
    expect(client.response.headers["content-type"]).toContain(
      "text/event-stream"
    );
    expect(names_of(messages)).toEqual(["hello", "session", "entry", "entry"]);

    const hello = JSON.parse(messages[0].data) as s_events_server_hello;
    expect(hello.backlog_count).toBe(2);
    expect(hello.entry_count).toBe(2);

    const [first, second] = entries_of(messages);
    expect(first.index).toBe(0);
    expect(first.level).toBe(e_event_level.warning);
    expect(first.category_path).toBe("test:server");
    expect(first.text).toContain("first 1");
    expect(first.session).toBe(hello.session_number);
    expect(first.time_ms).toBeGreaterThan(0);
    expect(first.thread_id).toBeTypeOf("number");
    expect(messages[2].id).toBe("0");
    expect(second.index).toBe(1);
    expect(second.category_path).toBe("test:server:sub");
    expect(messages[3].id).toBe("1");

    event_warning("test:server: live %d", 3);
    const live = await client.wait_for(entry_count(3));
    expect(entries_of(live)[2].index).toBe(2);
    expect(entries_of(live)[2].text).toContain("live 3");
  });

  it("limits the backlog with ?backlog", async () => {
    init_events();
    const address = await start();
    for (let index = 0; index < 5; index++) {
      event_warning("test:server: n %d", index);
    }

    const none = await sse_connect(`${address.url}/datamine/events?backlog=0`);
    const two = await sse_connect(`${address.url}/datamine/events?backlog=2`);
    await two.wait_for(entry_count(2));
    expect(entries_of(two.messages).map((entry) => entry.index)).toEqual([
      3, 4,
    ]);

    event_warning("test:server: n %d", 5);
    await none.wait_for(entry_count(1));
    expect(entries_of(none.messages).map((entry) => entry.index)).toEqual([5]);
  });

  it("keeps only the newest entries in the ring buffer", async () => {
    init_events();
    const address = await start({ backlog: 3 });
    for (let index = 0; index < 5; index++) {
      event_warning("test:server: n %d", index);
    }
    const hello = await fetch_json<s_events_server_hello>(
      `${address.url}/datamine/info`
    );
    expect(hello.entry_count).toBe(5);
    expect(hello.backlog_count).toBe(3);

    const client = await sse_connect(`${address.url}/datamine/events`);
    await client.wait_for(entry_count(3));
    expect(entries_of(client.messages).map((entry) => entry.index)).toEqual([
      2, 3, 4,
    ]);
  });

  it("announces a session when the events are initialized again", async () => {
    init_events();
    const address = await start();
    event_warning("test:server: before");
    const client = await sse_connect(`${address.url}/datamine/events`);
    await client.wait_for(entry_count(1));
    const first = JSON.parse(
      client.messages.find((message) => message.event === "session")?.data ??
        "{}"
    ) as s_events_server_session;
    expect(first.number).toBeGreaterThan(0);
    expect(first.version).toBe(k_version);

    events_dispose();
    init_events();
    event_warning("test:server: after");
    const messages = await client.wait_for(entry_count(2));
    const sessions = messages
      .filter((message) => message.event === "session")
      .map((message) => JSON.parse(message.data) as s_events_server_session);
    expect(sessions.map((session) => session.number)).toEqual([
      first.number,
      first.number + 1,
    ]);
    expect(entries_of(messages).map((entry) => entry.session)).toEqual([
      first.number,
      first.number + 1,
    ]);
    // The new session message comes before its first entry.
    expect(names_of(messages).slice(-2)).toEqual(["session", "entry"]);

    // A fresh viewer gets the divider between the two sessions in the backlog.
    const late = await sse_connect(`${address.url}/datamine/events`);
    await late.wait_for(entry_count(2));
    expect(names_of(late.messages)).toEqual([
      "hello",
      "session",
      "entry",
      "session",
      "entry",
    ]);
  });

  it("resumes after Last-Event-ID", async () => {
    init_events();
    const address = await start();
    for (let index = 0; index < 4; index++) {
      event_warning("test:server: n %d", index);
    }
    const client = await sse_connect(`${address.url}/datamine/events`, {
      "Last-Event-ID": "1",
    });
    await client.wait_for(entry_count(2));
    expect(entries_of(client.messages).map((entry) => entry.index)).toEqual([
      2, 3,
    ]);
    // The viewer already knows the session, so no divider.
    expect(names_of(client.messages)).toEqual(["hello", "entry", "entry"]);

    event_warning("test:server: n %d", 4);
    await client.wait_for(entry_count(3));
    expect(entries_of(client.messages)[2].index).toBe(4);
  });

  it("starts over when Last-Event-ID is newer than anything captured", async () => {
    init_events();
    const address = await start();
    event_warning("test:server: only");
    const client = await sse_connect(`${address.url}/datamine/events`, {
      "Last-Event-ID": "500",
    });
    await client.wait_for(entry_count(1));
    expect(entries_of(client.messages)[0].index).toBe(0);
  });

  it("filters by minimum_level", async () => {
    init_events();
    const address = await start({ minimum_level: e_event_level.warning });
    event_verbose("test:server: quiet");
    event_message("test:server: still quiet");
    event_warning("test:server: loud");
    const client = await sse_connect(`${address.url}/datamine/events`);
    await client.wait_for(entry_count(1));
    expect(entries_of(client.messages)).toHaveLength(1);
    expect(entries_of(client.messages)[0].text).toContain("loud");
    expect(entries_of(client.messages)[0].index).toBe(0);
  });

  it("maps printf arguments to datamine parameters", async () => {
    init_events();
    const address = await start();
    event_warning(
      "test:server: id %I64d name %s count %d ratio %f",
      9_007_199_254_740_993n,
      "bob",
      7,
      0.5
    );
    event_warning("test:server: no arguments");
    const client = await sse_connect(`${address.url}/datamine/events`);
    await client.wait_for(entry_count(2));
    const [with_args, without] = entries_of(client.messages);
    expect(with_args.parameters).toEqual([
      {
        name: "",
        type: e_datamine_parameter_type.int64,
        value: "9007199254740993",
      },
      { name: "", type: e_datamine_parameter_type.string, value: "bob" },
      { name: "", type: e_datamine_parameter_type.long, value: 7 },
      { name: "", type: e_datamine_parameter_type.float, value: 0.5 },
    ]);
    expect(with_args.text).toContain("id 9007199254740993 name bob");
    expect(without.parameters).toBeUndefined();
  });

  it("sends heartbeat comments", async () => {
    init_events();
    const address = await start({ heartbeat_ms: 20 });
    const client = await sse_connect(`${address.url}/datamine/events`);
    await new Promise<void>((done) => {
      const timer = setInterval(() => {
        if (client.pings() >= 2) {
          clearInterval(timer);
          done();
        }
      }, 10);
    });
    expect(client.pings()).toBeGreaterThanOrEqual(2);
  });

  it("includes the event context", async () => {
    init_events();
    const address = await start();
    event_context_run("job", "build", () => {
      event_warning("test:server: inside");
    });
    event_warning("test:server: outside");
    const client = await sse_connect(`${address.url}/datamine/events`);
    await client.wait_for(entry_count(2));
    const [inside, outside] = entries_of(client.messages);
    expect(inside.context).toContain("build");
    expect(outside.context).toBeUndefined();
  });
});

describe("events server http", () => {
  it("sends CORS headers and answers preflight", async () => {
    init_events();
    const address = await start();
    const info = await fetch(`${address.url}/datamine/info`);
    expect(info.headers.get("access-control-allow-origin")).toBe("*");

    const preflight = await fetch(`${address.url}/datamine/events`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://viewer.example",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "last-event-id",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-headers")).toContain(
      "Last-Event-ID"
    );

    const client = await sse_connect(`${address.url}/datamine/events`);
    expect(client.response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("answers 404 off the prefix, and 405 for other methods", async () => {
    init_events();
    const address = await start();
    for (const path of [
      "/",
      "/info",
      "/events",
      "/datamine",
      "/datamine/other",
    ]) {
      const response = await fetch(`${address.url}${path}`);
      expect(response.status, path).toBe(404);
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    }
    const post = await fetch(`${address.url}/datamine/info`, {
      method: "POST",
    });
    expect(post.status).toBe(405);
  });

  it("honours a custom path prefix", async () => {
    init_events();
    const address = await start({ path_prefix: "live/" });
    expect((await fetch(`${address.url}/live/info`)).status).toBe(200);
    expect((await fetch(`${address.url}/datamine/info`)).status).toBe(404);
  });

  it("runs inside an existing http server", async () => {
    init_events();
    const handler = events_server_handler({ path_prefix: "/tools/events" });
    const url = await serve_embedded((req, res) => {
      handler(req, res, () => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("site");
      });
    });

    expect(events_server_running()).toBe(false);
    expect(await (await fetch(`${url}/index.html`)).text()).toBe("site");
    const hello = await fetch_json<s_events_server_hello>(
      `${url}/tools/events/info`
    );
    expect(hello.name).toBe("tester");

    const client = await sse_connect(`${url}/tools/events/events`);
    event_warning("test:server: embedded");
    await client.wait_for(entry_count(1));
    expect(entries_of(client.messages)[0].text).toContain("embedded");
  });

  it("returns false without next so the caller can answer", async () => {
    init_events();
    const handler = events_server_handler();
    let handled: boolean | undefined;
    const url = await serve_embedded((req, res) => {
      handled = handler(req, res);
      if (!handled) {
        res.writeHead(418);
        res.end();
      }
    });
    expect((await fetch(`${url}/elsewhere`)).status).toBe(418);
    expect(handled).toBe(false);
    expect((await fetch(`${url}/datamine/info`)).status).toBe(200);
    expect(handled).toBe(true);
  });

  it("shares one capture between a handler and the standalone server", async () => {
    init_events();
    const handler = events_server_handler();
    const embedded = await serve_embedded((req, res) => {
      handler(req, res);
    });
    event_warning("test:server: one");
    const address = await start();
    event_warning("test:server: two");

    for (const url of [embedded, address.url]) {
      const hello = await fetch_json<s_events_server_hello>(
        `${url}/datamine/info`
      );
      expect(hello.entry_count).toBe(2);
    }
  });

  it("refuses to start twice", async () => {
    await start();
    await expect(start()).rejects.toThrow("already running");
  });

  it("fails cleanly when the port is taken", async () => {
    const address = await start();
    await events_server_stop();
    const blocker = createServer();
    await new Promise<void>((done) =>
      blocker.listen(address.port, "127.0.0.1", done)
    );
    await expect(start({ port: address.port })).rejects.toThrow();
    expect(events_server_running()).toBe(false);
    // A later start still works.
    await new Promise((done) => blocker.close(done));
    await expect(start()).resolves.toBeDefined();
  });
});

describe("events server stop", () => {
  it("closes streams and the listener", async () => {
    init_events();
    const address = await start();
    const client = await sse_connect(`${address.url}/datamine/events`);
    await client.wait_for((messages) => messages.length >= 1);
    await events_server_stop();
    await client.ended;
    expect(events_server_running()).toBe(false);
    expect(events_server_address()).toBeUndefined();
    await expect(fetch(`${address.url}/datamine/info`)).rejects.toThrow();

    // Events raised afterwards go nowhere, and a new server starts from index 0.
    event_warning("test:server: gone");
    const next = await start();
    const hello = await fetch_json<s_events_server_hello>(
      `${next.url}/datamine/info`
    );
    expect(hello.entry_count).toBe(0);
  });

  it("is harmless when nothing is running", async () => {
    await events_server_stop();
    await events_server_stop();
    expect(events_server_running()).toBe(false);
  });

  it("answers 503 from a handler after the stop", async () => {
    init_events();
    const handler = events_server_handler();
    const url = await serve_embedded((req, res) => {
      handler(req, res);
    });
    await events_server_stop();
    expect((await fetch(`${url}/datamine/info`)).status).toBe(503);
  });
});

describe("events server client", () => {
  function fake_stream(): s_events_server_stream & {
    destroyed: boolean;
    ended: boolean;
    need_drain: boolean;
    queued: number;
    written: string[];
  } {
    const stream = {
      destroyed: false,
      ended: false,
      need_drain: false,
      queued: 0,
      written: [] as string[],
      destroy() {
        stream.destroyed = true;
      },
      end() {
        stream.ended = true;
      },
      write(chunk: string) {
        stream.written.push(chunk);
        stream.queued += chunk.length;
        stream.need_drain = stream.queued > 10;
        return !stream.need_drain;
      },
      get writableLength() {
        return stream.queued;
      },
      get writableNeedDrain() {
        return stream.need_drain;
      },
    };
    return stream;
  }

  it("drops a client that stays backed up past the limit", () => {
    const stream = fake_stream();
    const closed: c_events_server_client[] = [];
    const client = new c_events_server_client(stream, 100, (done) =>
      closed.push(done)
    );
    // Backed up but under the limit: kept.
    client.send("x".repeat(50));
    expect(client.closed).toBe(false);
    expect(stream.destroyed).toBe(false);
    client.send("x".repeat(60));
    expect(client.closed).toBe(true);
    expect(stream.destroyed).toBe(true);
    expect(closed).toEqual([client]);

    // Once dropped nothing more is written.
    const written = stream.written.length;
    client.send("more");
    expect(stream.written).toHaveLength(written);
  });

  it("keeps a client that drains", () => {
    const stream = fake_stream();
    const client = new c_events_server_client(stream, 100, () => undefined);
    client.send("x".repeat(60));
    stream.queued = 0;
    stream.need_drain = false;
    client.send("x".repeat(60));
    expect(client.closed).toBe(false);
  });

  it("drops a client whose write throws", () => {
    const stream = fake_stream();
    stream.write = () => {
      throw new Error("socket gone");
    };
    const client = new c_events_server_client(stream, 100, () => undefined);
    expect(() => client.send("hello")).not.toThrow();
    expect(client.closed).toBe(true);
    expect(stream.destroyed).toBe(true);
  });

  it("ends politely", () => {
    const stream = fake_stream();
    const client = new c_events_server_client(stream, 100, () => undefined);
    client.end();
    client.end();
    expect(stream.ended).toBe(true);
    expect(stream.destroyed).toBe(false);
  });
});

describe("events server capture", () => {
  it("never throws into the event pipeline", async () => {
    init_events();
    await start();
    expect(() => {
      event_warning("test:server: %d %s", "not a number");
      event_warning("test:server: bad %q format");
    }).not.toThrow();
  });
});
