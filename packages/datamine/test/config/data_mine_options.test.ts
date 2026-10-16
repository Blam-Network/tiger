import { describe, expect, it } from "vitest";
import {
  data_mine_config_resolve,
  data_mine_layout_behaviour,
  k_untracked_build_number,
  k_untracked_build_string,
} from "../../src/config/data_mine_options.ts";
import type { s_http_response } from "../../src/transport/http_transport.ts";

describe("data_mine_layout_behaviour", () => {
  const response = (body: string, status = 200): s_http_response => ({
    status,
    headers: {},
    body: Buffer.from(body),
  });

  it("gives 3.1 the Destiny behaviour", () => {
    const behaviour = data_mine_layout_behaviour("3.1");
    expect(behaviour.line_style).toBe("destiny");
    expect(behaviour.event_index_start).toBe(0);
    expect(behaviour.signature_strip_trailing_separator).toBe(false);
    expect(behaviour.first_definition_id).toBe(1);
    expect(behaviour.maximum_registered_events).toBe(0x20_00);
    expect(behaviour.bridge_root_category).toBeUndefined();
    expect(behaviour.bridge_session_parameters).toBe(false);
    expect(behaviour.session_id_sequence).toBe(true);
    expect(behaviour.upload_http_version).toBe("1.1");
    expect(behaviour.upload_success(response("{}"))).toBe(true);
    expect(behaviour.upload_success(response("", 404))).toBe(false);
  });

  it.each([
    "1.0",
    "1.1",
    "2.0",
    "2.1",
  ] as const)("gives %s the Halo behaviour", (layout) => {
    const behaviour = data_mine_layout_behaviour(layout);
    expect(behaviour.line_style).toBe("halo");
    expect(behaviour.event_index_start).toBe(1);
    expect(behaviour.signature_strip_trailing_separator).toBe(true);
    expect(behaviour.bridge_root_category).toBe("root");
    expect(behaviour.bridge_session_parameters).toBe(true);
    expect(behaviour.session_id_sequence).toBe(false);
    expect(behaviour.upload_http_version).toBe("1.0");
    expect(behaviour.upload_success(response("DONE"))).toBe(true);
    expect(behaviour.upload_success(response("{}"))).toBe(false);
    expect(behaviour.upload_success(response("DONE", 500))).toBe(false);
  });
});

describe("data_mine_config_resolve", () => {
  it("defaults to an untracked 3.1 file, big endian", () => {
    const config = data_mine_config_resolve({});
    expect(config.layout).toBe("3.1");
    expect(config.byte_order).toBe("big");
    expect(config.text_encoding).toBe("utf8");
    expect(config.directory).toBe("datamine");
    expect(config.title).toBe("datamine");
    expect(config.build_string).toBe(k_untracked_build_string);
    expect(config.build_number).toBe(k_untracked_build_number);
    expect(k_untracked_build_string).toBe("untracked version");
    expect(k_untracked_build_number).toBe(-1);
    expect(config.bridge).toEqual({
      root_category: undefined,
      session_parameters: false,
      maximum_categories: 16,
      category_name_size: 32,
    });
    expect(config.upload).toMatchObject({
      compression_level: 3,
      content_type: "application/x-bungie-datamine",
      entry_name: "compressed.dat",
      extra_headers: [],
      header_quoting: "plain",
      http_version: "1.1",
      multipart_filename: "upload_temp.zip",
      retry_count: 3,
      retry_delay_ms: 0,
      timeout_ms: 1_800_000,
    });
  });

  it("applies the upload settings over the defaults, whatever the layout", () => {
    const config = data_mine_config_resolve({
      layout: "2.1",
      upload: { retry_count: 7, content_type: "x/y" },
    });
    expect(config.upload.retry_count).toBe(7);
    expect(config.upload.content_type).toBe("x/y");
    expect(config.upload.timeout_ms).toBe(1_800_000);
    expect(config.upload.http_version).toBe("1.0");
    expect(config.bridge.root_category).toBe("root");
  });

  it("lets an http version override the layout's", () => {
    expect(data_mine_config_resolve({}, "1.0").upload.http_version).toBe("1.0");
    expect(
      data_mine_config_resolve({ layout: "1.1" }, "1.1").upload.http_version
    ).toBe("1.1");
  });
});
