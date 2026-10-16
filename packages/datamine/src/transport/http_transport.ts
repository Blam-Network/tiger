import { isIP, connect as net_connect, type Socket } from "node:net";
import { connect as tls_connect } from "node:tls";
import {
  http_multipart_build,
  http_post_request_build,
  k_http_multipart_content_type,
  type s_http_header,
  type t_http_header_quoting,
} from "../blam/networking/tools/http_stream.ts";
import { DatamineError } from "../datamine_error.ts";

// Responses are a status word like DONE or a small JSON blob; anything past this is dropped.
export const k_http_response_maximum_size = 64 * 1024;

export interface s_http_endpoint {
  host: string;
  path: string;
  port: number;
  // Only the 1.0 writer can honour this; fetch always verifies.
  reject_unauthorized?: boolean;
  ssl: boolean;
}

export interface s_http_request {
  body: Uint8Array;
  content_type: string;
  endpoint: s_http_endpoint;
  extra_headers: readonly s_http_header[];
  filename: string;
  header_quoting: t_http_header_quoting;
  signal?: AbortSignal;
  timeout_ms: number;
}

export interface s_http_response {
  body: Buffer;
  // Names are lowercase.
  headers: Record<string, string>;
  status: number;
}

export type t_http_transport = (
  request: s_http_request
) => Promise<s_http_response>;

export type t_http_version = "1.0" | "1.1";

export function http_endpoint_url(endpoint: s_http_endpoint): string {
  return `${endpoint.ssl ? "https" : "http"}://${endpoint.host}:${endpoint.port}${endpoint.path}`;
}

function header_value(
  header: s_http_header,
  quoting: t_http_header_quoting
): string {
  return quoting === "quoted" ? `"${header.value}"` : header.value;
}

function request_signal(request: s_http_request): AbortSignal {
  const timeout = AbortSignal.timeout(Math.max(request.timeout_ms, 1));
  return request.signal ? AbortSignal.any([timeout, request.signal]) : timeout;
}

async function response_body_read(
  response: Response,
  limit: number
): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    return Buffer.alloc(0);
  }
  const chunks: Buffer[] = [];
  let total = 0;
  while (total < limit) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
    total += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks).subarray(0, limit);
}

// Default transport. Sends the same multipart body as the 1.0 writer, but with the usual HTTP/1.1 framing.
export async function http_transport_fetch(
  request: s_http_request
): Promise<s_http_response> {
  const extra: Record<string, string> = {};
  for (const header of request.extra_headers) {
    extra[header.name] = header_value(header, request.header_quoting);
  }
  const body = http_multipart_build(
    request.filename,
    request.content_type,
    request.body
  );
  try {
    const response = await fetch(http_endpoint_url(request.endpoint), {
      method: "POST",
      body: new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
      headers: { "Content-Type": k_http_multipart_content_type, ...extra },
      signal: request_signal(request),
    });
    const headers: Record<string, string> = {};
    for (const [name, value] of response.headers) {
      headers[name.toLowerCase()] = value;
    }
    return {
      status: response.status,
      headers,
      body: await response_body_read(response, k_http_response_maximum_size),
    };
  } catch (error) {
    throw new DatamineError(
      `http: request failed: ${(error as Error).message}`,
      { cause: error }
    );
  }
}

const k_status_line_regex = /^HTTP\/1\.[01] (\d{3})/;
const k_header_terminator = Buffer.from("\r\n\r\n");
const k_header_terminator_bare = Buffer.from("\n\n");

interface s_parsed_head {
  body_offset: number;
  headers: Record<string, string>;
  status: number;
}

// Undefined until the whole header block has arrived.
function http_response_head_parse(data: Buffer): s_parsed_head | undefined {
  let end = data.indexOf(k_header_terminator);
  let terminator_length = k_header_terminator.length;
  if (end < 0) {
    end = data.indexOf(k_header_terminator_bare);
    terminator_length = k_header_terminator_bare.length;
  }
  if (end < 0) {
    return;
  }
  const lines = data.toString("latin1", 0, end).split("\n");
  const status_match = k_status_line_regex.exec(lines[0] ?? "");
  if (!status_match) {
    throw new DatamineError("http: malformed response status line");
  }
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(":");
    if (colon > 0) {
      headers[line.slice(0, colon).trim().toLowerCase()] = line
        .slice(colon + 1)
        .trim();
    }
  }
  return {
    status: Number(status_match[1]),
    headers,
    body_offset: end + terminator_length,
  };
}

function content_length_of(
  headers: Record<string, string>
): number | undefined {
  const value = headers["content-length"];
  if (value === undefined) {
    return;
  }
  const length = Number(value);
  return Number.isInteger(length) && length >= 0 ? length : undefined;
}

// What has arrived so far as a response, or undefined while the headers are incomplete.
// With a Content-Length the body stops there; without one it runs to the end of the data.
// complete_only holds back until the Content-Length worth of body is in; without a length it never completes early.
function http_response_parse(
  data: Buffer,
  complete_only: boolean
): s_http_response | undefined {
  const head = http_response_head_parse(data);
  if (!head) {
    return;
  }
  const length = content_length_of(head.headers);
  let body = data.subarray(head.body_offset);
  if (length !== undefined) {
    if (complete_only && body.length < length) {
      return;
    }
    body = body.subarray(0, length);
  } else if (complete_only) {
    return;
  }
  return {
    status: head.status,
    headers: head.headers,
    body: body.subarray(0, k_http_response_maximum_size),
  };
}

// HTTP/1.0 writer. Sends exactly the bytes the game does (no Host header, a lowercase Content-type)
// and reads until the server closes the connection.
export function http_transport_1_0(
  request: s_http_request
): Promise<s_http_response> {
  const { endpoint } = request;
  const bytes = http_post_request_build(
    endpoint.path,
    request.filename,
    request.content_type,
    request.body,
    request.extra_headers,
    request.header_quoting
  );

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    let settled = false;

    const options = { host: endpoint.host, port: endpoint.port };
    const socket: Socket = endpoint.ssl
      ? tls_connect({
          ...options,
          servername: isIP(endpoint.host) ? undefined : endpoint.host,
          rejectUnauthorized: endpoint.reject_unauthorized ?? true,
        })
      : net_connect(options);

    const cleanup = () => {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", on_abort);
    };
    const fail = (error: DatamineError) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      socket.destroy();
      reject(error);
    };
    const succeed = (response: s_http_response) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      socket.destroy();
      resolve(response);
    };
    // Whatever arrived by the time the connection ended.
    const finish = (reason: string) => {
      try {
        const response = http_response_parse(Buffer.concat(chunks), false);
        if (response) {
          succeed(response);
        } else {
          fail(new DatamineError(`http: ${reason} before a response arrived`));
        }
      } catch (error) {
        fail(error as DatamineError);
      }
    };
    function on_abort() {
      fail(new DatamineError("http: request aborted"));
    }
    const timer = setTimeout(
      () => fail(new DatamineError("http: request timed out")),
      Math.max(request.timeout_ms, 1)
    );

    if (request.signal?.aborted) {
      on_abort();
      return;
    }
    request.signal?.addEventListener("abort", on_abort, { once: true });

    socket.on("data", (chunk: Buffer) => {
      if (received < k_http_response_maximum_size) {
        chunks.push(chunk);
        received += chunk.length;
      }
      try {
        const response = http_response_parse(Buffer.concat(chunks), true);
        if (response) {
          succeed(response);
        } else if (received >= k_http_response_maximum_size) {
          finish("response limit reached");
        }
      } catch (error) {
        fail(error as DatamineError);
      }
    });
    socket.on("end", () => finish("connection closed"));
    socket.on("close", () => finish("connection closed"));
    socket.on("error", (error) => {
      // A server that answers early and hangs up can reset the connection while we are still writing.
      if (chunks.length > 0) {
        finish(error.message);
      } else {
        fail(
          new DatamineError(`http: connection failed: ${error.message}`, {
            cause: error,
          })
        );
      }
    });
    socket.write(bytes);
  });
}

// An explicit transport wins; otherwise 1.0 selects the raw writer and anything else uses fetch.
export function http_transport_select(options: {
  http_version?: t_http_version;
  transport?: t_http_transport;
}): t_http_transport {
  if (options.transport) {
    return options.transport;
  }
  return options.http_version === "1.0"
    ? http_transport_1_0
    : http_transport_fetch;
}
