import { describe, expect, it } from "vitest";
import {
  http_multipart_build,
  http_post_header_build,
  http_post_request_build,
} from "../../../../src/blam/networking/tools/http_stream.ts";

// The body of c_http_post_stream::unit_test (http_stream.cpp): 80 digits, 557 dashes, "640".
const k_unit_test_contents = `${"0123456789".repeat(8)}${"-".repeat(557)}640`;
const k_unit_test_headers = [{ name: "random-header", value: "I'm a header!" }];

function unit_test_expected(header_line: string): string {
  return (
    "POST /webstats/stats.ashx HTTP/1.0\r\n" +
    "Content-type: multipart/form-data; boundary=BUNGIEr0x0rz\r\n" +
    "Content-Length: 780\r\n" +
    header_line +
    "\r\n" +
    "--BUNGIEr0x0rz\r\n" +
    'Content-Disposition: form-data; name="upload"; filename="blob"\r\n' +
    "Content-Type: application/x-halo2pcr\r\n" +
    "\r\n" +
    `${k_unit_test_contents}\r\n` +
    "--BUNGIEr0x0rz--\r\n"
  );
}

describe("c_http_post_stream::unit_test", () => {
  it("reproduces the plain (PC) request", () => {
    const request = http_post_request_build(
      "/webstats/stats.ashx",
      "blob",
      "application/x-halo2pcr",
      Buffer.from(k_unit_test_contents),
      k_unit_test_headers,
      "plain"
    );
    expect(request.toString("utf8")).toBe(
      unit_test_expected("random-header: I'm a header!\r\n")
    );
  });

  it("reproduces the quoted (MATCHING / Xenon) request", () => {
    const request = http_post_request_build(
      "/webstats/stats.ashx",
      "blob",
      "application/x-halo2pcr",
      Buffer.from(k_unit_test_contents),
      k_unit_test_headers,
      "quoted"
    );
    expect(request.toString("utf8")).toBe(
      unit_test_expected('random-header: "I\'m a header!"\r\n')
    );
  });

  it("defaults to plain quoting", () => {
    const request = http_post_request_build(
      "/webstats/stats.ashx",
      "blob",
      "application/x-halo2pcr",
      Buffer.from(k_unit_test_contents),
      k_unit_test_headers
    );
    expect(request.toString("utf8")).toBe(
      unit_test_expected("random-header: I'm a header!\r\n")
    );
  });
});

describe("http_multipart_build", () => {
  it("wraps the body in the upload part", () => {
    const body = Buffer.from([0, 1, 2, 0xff]);
    const multipart = http_multipart_build(
      "compressed.zip",
      "application/zip",
      body
    );
    const header =
      '--BUNGIEr0x0rz\r\nContent-Disposition: form-data; name="upload"; filename="compressed.zip"\r\nContent-Type: application/zip\r\n\r\n';
    const footer = "\r\n--BUNGIEr0x0rz--\r\n";
    expect(multipart.subarray(0, header.length).toString()).toBe(header);
    expect(multipart.subarray(header.length, header.length + 4)).toEqual(body);
    expect(multipart.subarray(header.length + 4).toString()).toBe(footer);
  });
});

describe("http_post_header_build", () => {
  it("has no Host header and a lowercase Content-type", () => {
    const header = http_post_header_build("/p", 5).toString();
    expect(header).toBe(
      "POST /p HTTP/1.0\r\nContent-type: multipart/form-data; boundary=BUNGIEr0x0rz\r\nContent-Length: 5\r\n\r\n"
    );
    expect(header).not.toContain("Host");
  });

  it("appends every extra header in order", () => {
    const header = http_post_header_build("/p", 5, [
      { name: "a", value: "1" },
      { name: "b", value: "2" },
    ]).toString();
    expect(header).toContain("Content-Length: 5\r\na: 1\r\nb: 2\r\n\r\n");
  });
});
