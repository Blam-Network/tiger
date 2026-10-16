// The options data_mine_initialize takes, with their defaults, and what the header layout
// decides for the rest.
import type { t_text_encoding } from "../blam/cseries/cseries_strings.ts";
import type { t_data_mine_header_layout } from "../blam/data_mining/data_mine_formats.ts";
import type { t_datamine_args_mode } from "../blam/data_mining/data_mining.ts";
import type {
  s_http_header,
  t_http_header_quoting,
} from "../blam/networking/tools/http_stream.ts";
import type { t_byte_order } from "../byte_writer.ts";
import type {
  s_http_response,
  t_http_version,
} from "../transport/http_transport.ts";

export const k_data_mine_file_extension = ".datamine";
export const k_data_mine_directory_default = "datamine";

// Bungie's loop can reach 17 with a root category; the table holds 16.
export const k_data_mine_bridge_maximum_categories = 16;
export const k_data_mine_bridge_category_name_size = 32;

// Header fields that only some layouts carry.
export interface s_data_mine_header_extra {
  source_flag?: number;
  version_minor?: number;
}

// How a finished file is sent. The same defaults for every layout.
export interface s_data_mine_upload_settings {
  // Level 0 to 9 of the zip. Default 3.
  compression_level?: number;
  // Default "application/x-bungie-datamine".
  content_type?: string;
  // Name of the one file inside the zip. Default "compressed.dat".
  entry_name?: string;
  // Default none.
  extra_headers?: readonly s_http_header[];
  // Whether extra header values are written in quotes. Default "plain".
  header_quoting?: t_http_header_quoting;
  // Filename in the multipart part. Default "upload_temp.zip".
  multipart_filename?: string;
  // Tries per file. Default 3.
  retry_count?: number;
  // Default 0, no pause between tries.
  retry_delay_ms?: number;
  // How long the whole upload, all retries included, may take. Default 30 minutes.
  timeout_ms?: number;
}

// What a build without a build number reports. Its files are written, but never uploaded.
export const k_untracked_build_string = "untracked version";
export const k_untracked_build_number = -1;

export interface s_data_mine_config_options {
  // Lenient also accepts printf flags and 64 bit specifiers the original skips. Default
  // "lenient".
  args_mode?: t_datamine_args_mode;
  // Default k_untracked_build_number. Only tracked builds may upload.
  build_number?: number;
  // Default k_untracked_build_string.
  build_string?: string;
  // Default "big".
  byte_order?: t_byte_order;
  // Relative to the root. Default "datamine".
  directory?: string;
  // %04x%04x%04x%04x.datamine, with rand() handing out 15 bit values like the C runtime.
  file_name?: (rand: () => number) => string;
  header_extra?: s_data_mine_header_extra;
  // "1.0" and "1.1" are Halo 3's, "2.0" and "2.1" Reach's, "3.1" Destiny's. It also decides
  // how events and uploads are written, see data_mine_layout_behaviour. Default "3.1".
  layout?: t_data_mine_header_layout;
  // Default "utf8".
  text_encoding?: t_text_encoding;
  // The title in 1.x and 2.x headers, the application name in 3.1. Default "datamine".
  title?: string;
  upload?: s_data_mine_upload_settings;
}

// How the text logs and the console write a line, see format_event_for_log.
export type t_event_line_style = "destiny" | "halo";

// What the layout decides, so none of it is an option of its own. Destiny behaviour goes with
// 3.1 and Halo behaviour with every other layout:
//
//                               3.1                    other layouts
//   log line style              Destiny: date, game     Halo: date, index, game
//                               time, thread, level     time and frame, netbuf,
//                               padded to 8, text       severity, text, context
//   console level text          lower case              upper case severities
//   first event index           0                      1
//   event signature             keeps the trailing     drops the trailing ", "
//                               ", "
//   registered events           ids from 1, at most    none, every record stands alone
//                               0x2000
//   event bridge root category  none                   "root"
//   event bridge parameters     the printf arguments   session ids and timestamps, the
//                               only                   context, then the arguments
//   session id                  ends with _000001      no sequence
//   upload accepted             status 200             status 200 and the body DONE
//   upload HTTP version         1.1                    1.0
export interface s_data_mine_layout_behaviour {
  bridge_root_category: string | undefined;
  bridge_session_parameters: boolean;
  event_index_start: number;
  first_definition_id: number;
  line_style: t_event_line_style;
  maximum_registered_events: number;
  session_id_sequence: boolean;
  signature_strip_trailing_separator: boolean;
  upload_http_version: t_http_version;
  upload_success: (response: s_http_response) => boolean;
}

function http_status_ok(response: s_http_response): boolean {
  return response.status === 200;
}

function http_status_ok_done(response: s_http_response): boolean {
  return response.status === 200 && response.body.toString("latin1") === "DONE";
}

export function data_mine_layout_behaviour(
  layout: t_data_mine_header_layout
): s_data_mine_layout_behaviour {
  const destiny = layout === "3.1";
  return {
    line_style: destiny ? "destiny" : "halo",
    event_index_start: destiny ? 0 : 1,
    signature_strip_trailing_separator: !destiny,
    // One counter shared by every event site in the game, starting at 1.
    first_definition_id: 1,
    maximum_registered_events: 0x20_00,
    bridge_root_category: destiny ? undefined : "root",
    bridge_session_parameters: !destiny,
    session_id_sequence: destiny,
    upload_success: destiny ? http_status_ok : http_status_ok_done,
    upload_http_version: destiny ? "1.1" : "1.0",
  };
}

// How an event becomes a datamine record.
export interface s_data_mine_bridge_config {
  category_name_size: number;
  maximum_categories: number;
  root_category: string | undefined;
  session_parameters: boolean;
}

export interface s_data_mine_upload_config {
  compression_level: number;
  content_type: string;
  entry_name: string;
  extra_headers: readonly s_http_header[];
  header_quoting: t_http_header_quoting;
  http_version: t_http_version;
  multipart_filename: string;
  retry_count: number;
  retry_delay_ms: number;
  success: (response: s_http_response) => boolean;
  timeout_ms: number;
}

// The options with every default filled in and the layout's behaviour applied.
export interface s_data_mine_config {
  behaviour: s_data_mine_layout_behaviour;
  bridge: s_data_mine_bridge_config;
  build_number: number;
  build_string: string;
  byte_order: t_byte_order;
  directory: string;
  file_name: (rand: () => number) => string;
  header_extra: s_data_mine_header_extra | undefined;
  layout: t_data_mine_header_layout;
  text_encoding: t_text_encoding;
  title: string;
  upload: s_data_mine_upload_config;
}

function file_name_from_rand(rand: () => number): string {
  const group = () => (rand() & 0x7f_ff).toString(16).padStart(4, "0");
  return `${group()}${group()}${group()}${group()}${k_data_mine_file_extension}`;
}

// http_version overrides the request writer the layout would pick.
export function data_mine_config_resolve(
  options: s_data_mine_config_options,
  http_version?: t_http_version
): s_data_mine_config {
  const { upload } = options;
  const layout = options.layout ?? "3.1";
  const behaviour = data_mine_layout_behaviour(layout);
  return {
    layout,
    behaviour,
    byte_order: options.byte_order ?? "big",
    text_encoding: options.text_encoding ?? "utf8",
    directory: options.directory ?? k_data_mine_directory_default,
    file_name: options.file_name ?? file_name_from_rand,
    title: options.title ?? "datamine",
    build_string: options.build_string ?? k_untracked_build_string,
    build_number: options.build_number ?? k_untracked_build_number,
    header_extra: options.header_extra,
    bridge: {
      root_category: behaviour.bridge_root_category,
      session_parameters: behaviour.bridge_session_parameters,
      maximum_categories: k_data_mine_bridge_maximum_categories,
      category_name_size: k_data_mine_bridge_category_name_size,
    },
    upload: {
      content_type: upload?.content_type ?? "application/x-bungie-datamine",
      multipart_filename: upload?.multipart_filename ?? "upload_temp.zip",
      entry_name: upload?.entry_name ?? "compressed.dat",
      compression_level: upload?.compression_level ?? 3,
      header_quoting: upload?.header_quoting ?? "plain",
      extra_headers: upload?.extra_headers ?? [],
      http_version: http_version ?? behaviour.upload_http_version,
      success: behaviour.upload_success,
      retry_count: upload?.retry_count ?? 3,
      timeout_ms: upload?.timeout_ms ?? 1_800_000,
      retry_delay_ms: upload?.retry_delay_ms ?? 0,
    },
  };
}
