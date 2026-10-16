// Request bytes as c_http_post_stream::build_headers builds them.
// The console build quotes extra header values, the PC build does not.
export const k_http_multipart_boundary = "BUNGIEr0x0rz";
export const k_http_multipart_content_type = `multipart/form-data; boundary=${k_http_multipart_boundary}`;

// MATCHING / _XENON builds write `%s: "%s"\r\n`; the PC build writes `%s: %s\r\n`.
export type t_http_header_quoting = "plain" | "quoted";

export interface s_http_header {
  name: string;
  value: string;
}

export function http_multipart_build(
  filename: string,
  content_type: string,
  body: Uint8Array
): Buffer {
  const header = Buffer.from(
    `--${k_http_multipart_boundary}\r\nContent-Disposition: form-data; name="upload"; filename="${filename}"\r\nContent-Type: ${content_type}\r\n\r\n`,
    "utf8"
  );
  const footer = Buffer.from(
    `\r\n--${k_http_multipart_boundary}--\r\n`,
    "utf8"
  );
  return Buffer.concat([header, body, footer]);
}

// Note the lowercase t in Content-type and the missing Host header, both as the game sends them.
export function http_post_header_build(
  url: string,
  content_length: number,
  extra_headers: readonly s_http_header[] = [],
  quoting: t_http_header_quoting = "plain"
): Buffer {
  let extra = "";
  for (const header of extra_headers) {
    extra +=
      quoting === "quoted"
        ? `${header.name}: "${header.value}"\r\n`
        : `${header.name}: ${header.value}\r\n`;
  }
  return Buffer.from(
    `POST ${url} HTTP/1.0\r\nContent-type: ${k_http_multipart_content_type}\r\nContent-Length: ${content_length}\r\n${extra}\r\n`,
    "utf8"
  );
}

export function http_post_request_build(
  url: string,
  filename: string,
  content_type: string,
  body: Uint8Array,
  extra_headers?: readonly s_http_header[],
  quoting?: t_http_header_quoting
): Buffer {
  const multipart = http_multipart_build(filename, content_type, body);
  const header = http_post_header_build(
    url,
    multipart.length,
    extra_headers,
    quoting
  );
  return Buffer.concat([header, multipart]);
}
