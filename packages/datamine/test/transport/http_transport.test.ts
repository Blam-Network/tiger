import { createServer as http_server, type IncomingMessage } from "node:http";
import { createServer as net_server, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import {
  http_multipart_build,
  http_post_request_build,
  k_http_multipart_content_type,
} from "../../src/blam/networking/tools/http_stream.ts";
import { DatamineError } from "../../src/datamine_error.ts";
import {
  http_endpoint_url,
  http_transport_1_0,
  http_transport_fetch,
  http_transport_select,
  k_http_response_maximum_size,
  type s_http_endpoint,
  type s_http_request,
  type t_http_transport,
} from "../../src/transport/http_transport.ts";
import { tracked_servers } from "../support/servers.ts";

const k_body = Buffer.from([0, 1, 2, 3, 250, 251, 252, 253, 13, 10, 45, 45]);
const k_content_length_regex = /Content-Length: (\d+)\r\n/i;

const servers = tracked_servers();
const listen = servers.listen;
afterEach(servers.close_all);

// Reads one request (headers plus Content-Length bytes), then hands it to the responder.
function raw_server(
  respond: (received: Buffer, socket: Socket) => void
): Server {
  return net_server((socket) => {
    let received = Buffer.alloc(0);
    let answered = false;
    socket.on("error", () => undefined);
    socket.on("data", (chunk) => {
      received = Buffer.concat([received, chunk]);
      const end = received.indexOf("\r\n\r\n");
      if (answered || end < 0) {
        return;
      }
      const match = k_content_length_regex.exec(
        received.toString("latin1", 0, end + 4)
      );
      const length = match ? Number(match[1]) : 0;
      if (received.length >= end + 4 + length) {
        answered = true;
        respond(received, socket);
      }
    });
  });
}

function make_request(
  port: number,
  overrides: Partial<s_http_request> = {}
): s_http_request {
  const endpoint: s_http_endpoint = {
    host: "127.0.0.1",
    port,
    path: "/ticket_drop",
    ssl: false,
  };
  return {
    endpoint,
    filename: "upload_temp.zip",
    content_type: "application/x-bungie-datamine",
    body: k_body,
    extra_headers: [],
    header_quoting: "plain",
    timeout_ms: 5000,
    ...overrides,
  };
}

describe("http_endpoint_url", () => {
  it("builds http and https urls", () => {
    expect(
      http_endpoint_url({ host: "h", port: 80, path: "/p", ssl: false })
    ).toBe("http://h:80/p");
    expect(
      http_endpoint_url({ host: "h", port: 443, path: "/p", ssl: true })
    ).toBe("https://h:443/p");
  });
});

describe("http_transport_1_0", () => {
  it("writes exactly the bytes the game sends", async () => {
    let received: Buffer = Buffer.alloc(0);
    const port = await listen(
      raw_server((bytes, socket) => {
        received = bytes;
        socket.end("HTTP/1.0 200 OK\r\nContent-Length: 4\r\n\r\nDONE");
      })
    );
    const request = make_request(port, {
      extra_headers: [{ name: "systemid", value: "box" }],
      header_quoting: "quoted",
    });
    const response = await http_transport_1_0(request);
    expect(
      received.equals(
        http_post_request_build(
          "/ticket_drop",
          request.filename,
          request.content_type,
          k_body,
          request.extra_headers,
          "quoted"
        )
      )
    ).toBe(true);
    const text = received.toString("latin1");
    expect(text.startsWith("POST /ticket_drop HTTP/1.0\r\n")).toBe(true);
    expect(text).toContain("Content-type: ");
    expect(text).not.toContain("Host:");
    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("DONE");
  });

  it("reads a json body and lowercases header names", async () => {
    const json = JSON.stringify({ ok: true });
    const port = await listen(
      raw_server((_bytes, socket) => {
        socket.end(
          `HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${json.length}\r\n\r\n${json}`
        );
      })
    );
    const response = await http_transport_1_0(make_request(port));
    expect(response.status).toBe(200);
    expect(JSON.parse(response.body.toString())).toEqual({ ok: true });
    expect(response.headers["content-type"]).toBe("application/json");
  });

  it.each([404, 500])("returns status %d to the caller", async (status) => {
    const port = await listen(
      raw_server((_bytes, socket) => {
        socket.end(`HTTP/1.0 ${status} Nope\r\nContent-Length: 0\r\n\r\n`);
      })
    );
    const response = await http_transport_1_0(make_request(port));
    expect(response.status).toBe(status);
    expect(response.body.length).toBe(0);
  });

  it("reads to the end of the connection without a Content-Length", async () => {
    const port = await listen(
      raw_server((_bytes, socket) => {
        socket.write("HTTP/1.0 200 OK\r\n\r\nDO");
        setTimeout(() => socket.end("NE"), 20);
      })
    );
    const response = await http_transport_1_0(make_request(port));
    expect(response.body.toString()).toBe("DONE");
  });

  it("stops the body at Content-Length", async () => {
    const port = await listen(
      raw_server((_bytes, socket) => {
        socket.end("HTTP/1.0 200 OK\r\nContent-Length: 2\r\n\r\nDONE");
      })
    );
    const response = await http_transport_1_0(make_request(port));
    expect(response.body.toString()).toBe("DO");
  });

  it("caps an endless body at 64 KiB", async () => {
    const port = await listen(
      raw_server((_bytes, socket) => {
        socket.end(
          Buffer.concat([
            Buffer.from("HTTP/1.0 200 OK\r\n\r\n"),
            Buffer.alloc(200_000, 0x61),
          ])
        );
      })
    );
    const response = await http_transport_1_0(make_request(port));
    expect(response.status).toBe(200);
    expect(response.body.length).toBeLessThanOrEqual(
      k_http_response_maximum_size
    );
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("rejects when the server hangs up without answering", async () => {
    const port = await listen(raw_server((_bytes, socket) => socket.destroy()));
    await expect(http_transport_1_0(make_request(port))).rejects.toThrow(
      DatamineError
    );
  });

  it("rejects a response that is not http", async () => {
    const port = await listen(
      raw_server((_bytes, socket) => {
        socket.end("garbage\r\n\r\n");
      })
    );
    await expect(http_transport_1_0(make_request(port))).rejects.toThrow(
      "malformed"
    );
  });

  it("times out when the server never answers", async () => {
    const port = await listen(raw_server(() => undefined));
    await expect(
      http_transport_1_0(make_request(port, { timeout_ms: 50 }))
    ).rejects.toThrow("timed out");
  });

  it("aborts on the signal", async () => {
    const port = await listen(raw_server(() => undefined));
    const controller = new AbortController();
    const pending = http_transport_1_0(
      make_request(port, { signal: controller.signal })
    );
    setTimeout(() => controller.abort(), 30);
    await expect(pending).rejects.toThrow("aborted");
  });

  it("rejects at once with a signal that already fired", async () => {
    const port = await listen(raw_server(() => undefined));
    await expect(
      http_transport_1_0(make_request(port, { signal: AbortSignal.abort() }))
    ).rejects.toThrow("aborted");
  });

  it("rejects when nothing is listening", async () => {
    const server = net_server();
    const port = await listen(server);
    await new Promise((resolve) => server.close(resolve));
    await expect(http_transport_1_0(make_request(port))).rejects.toThrow(
      "connection failed"
    );
  });
});

describe("http_transport_fetch", () => {
  interface s_seen {
    body: Buffer;
    headers: IncomingMessage["headers"];
    method: string | undefined;
    url: string | undefined;
  }

  function fetch_server(
    status: number,
    reply: string,
    seen: s_seen[]
  ): Promise<number> {
    const server = http_server((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        seen.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: Buffer.concat(chunks),
        });
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(reply);
      });
    });
    return listen(server);
  }

  it("posts the multipart body intact with the boundary header", async () => {
    const seen: s_seen[] = [];
    const port = await fetch_server(200, JSON.stringify({ ok: true }), seen);
    const request = make_request(port, {
      extra_headers: [{ name: "x-systemid", value: "box" }],
    });
    const response = await http_transport_fetch(request);

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body.toString())).toEqual({ ok: true });
    expect(response.headers["content-type"]).toBe("application/json");
    expect(seen).toHaveLength(1);
    expect(seen[0].method).toBe("POST");
    expect(seen[0].url).toBe("/ticket_drop");
    expect(seen[0].headers["content-type"]).toBe(k_http_multipart_content_type);
    expect(seen[0].headers["x-systemid"]).toBe("box");
    expect(
      seen[0].body.equals(
        http_multipart_build(request.filename, request.content_type, k_body)
      )
    ).toBe(true);
  });

  it("quotes extra header values when asked", async () => {
    const seen: s_seen[] = [];
    const port = await fetch_server(200, "DONE", seen);
    await http_transport_fetch(
      make_request(port, {
        extra_headers: [{ name: "x-systemid", value: "box" }],
        header_quoting: "quoted",
      })
    );
    expect(seen[0].headers["x-systemid"]).toBe('"box"');
  });

  it("returns error statuses", async () => {
    const port = await fetch_server(500, "oops", []);
    const response = await http_transport_fetch(make_request(port));
    expect(response.status).toBe(500);
    expect(response.body.toString()).toBe("oops");
  });

  it("times out as a DatamineError", async () => {
    const port = await listen(http_server(() => undefined));
    await expect(
      http_transport_fetch(make_request(port, { timeout_ms: 50 }))
    ).rejects.toThrow(DatamineError);
  });

  it("aborts on the signal", async () => {
    const port = await listen(http_server(() => undefined));
    const controller = new AbortController();
    const pending = http_transport_fetch(
      make_request(port, { signal: controller.signal })
    );
    setTimeout(() => controller.abort(), 30);
    await expect(pending).rejects.toThrow(DatamineError);
  });
});

describe("http_transport_select", () => {
  const custom: t_http_transport = () =>
    Promise.reject(new DatamineError("unused"));

  it("prefers an explicit transport, then the 1.0 writer for 1.0, else fetch", () => {
    expect(
      http_transport_select({ transport: custom, http_version: "1.0" })
    ).toBe(custom);
    expect(http_transport_select({ http_version: "1.0" })).toBe(
      http_transport_1_0
    );
    expect(http_transport_select({})).toBe(http_transport_fetch);
    expect(http_transport_select({ http_version: "1.1" })).toBe(
      http_transport_fetch
    );
  });
});
