import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { s_data_mine_upload_config } from "../../../config/data_mine_options.ts";
import { DatamineError } from "../../../datamine_error.ts";
import type {
  s_http_endpoint,
  s_http_response,
  t_http_transport,
} from "../../../transport/http_transport.ts";
import { zip_create_single_entry } from "../../../transport/zip_writer.ts";
import { k_system_clock, type s_clock } from "../../cseries/cseries_time.ts";
import { e_event_level } from "../../cseries/event_levels.ts";

export const e_webstats_state = {
  none: 0,
  file_submitted: 1,
  file_compressing: 2,
  file_ready_for_upload: 3,
} as const;
export type e_webstats_state =
  (typeof e_webstats_state)[keyof typeof e_webstats_state];

export type t_webstats_on_event = (level: number, text: string) => void;

export interface s_webstats_submit_options {
  // Only the timeout bookkeeping reads this; wall time is never used.
  clock?: s_clock;
  endpoint: s_http_endpoint;
  on_event?: t_webstats_on_event;
  signal?: AbortSignal;
  transport: t_http_transport;
  upload: s_data_mine_upload_config;
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(done, milliseconds);
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });
}

// Compresses a file and posts it, retrying within an overall deadline. One file at a time.
export class c_network_webstats {
  private m_state: e_webstats_state = e_webstats_state.none;

  get state(): e_webstats_state {
    return this.m_state;
  }

  get busy(): boolean {
    return this.m_state !== e_webstats_state.none;
  }

  // True once the server accepted the file. The source file is never touched.
  async submit_file(
    path: string,
    options: s_webstats_submit_options
  ): Promise<boolean> {
    if (this.busy) {
      throw new DatamineError(
        `webstats: cannot submit '${path}', an upload is already in progress`
      );
    }
    const clock = options.clock ?? k_system_clock;
    const on_event = options.on_event ?? (() => undefined);
    const { upload } = options;

    this.m_state = e_webstats_state.file_submitted;
    try {
      let zip: Buffer;
      try {
        const data = await readFile(path);
        this.m_state = e_webstats_state.file_compressing;
        zip = await zip_create_single_entry(upload.entry_name, data, {
          level: upload.compression_level,
        });
      } catch {
        on_event(e_event_level.warning, "webstats: file compression failed.");
        return false;
      }

      this.m_state = e_webstats_state.file_ready_for_upload;
      return await this.upload(zip, path, options, clock, on_event);
    } finally {
      this.m_state = e_webstats_state.none;
    }
  }

  private async upload(
    zip: Buffer,
    path: string,
    options: s_webstats_submit_options,
    clock: s_clock,
    on_event: t_webstats_on_event
  ): Promise<boolean> {
    const { upload, endpoint } = options;
    const deadline = clock.milliseconds() + upload.timeout_ms;
    const server = `${endpoint.host}:${endpoint.port}`;

    for (let attempt = 1; attempt <= upload.retry_count; attempt++) {
      const remaining = deadline - clock.milliseconds();
      if (remaining <= 0 || options.signal?.aborted) {
        on_event(
          e_event_level.warning,
          "networking:webstats: upload step is taking too long, cancelling."
        );
        break;
      }

      const outcome = await this.attempt(zip, remaining, options);
      if (outcome.accepted) {
        on_event(
          e_event_level.message,
          "networking:webstats: upload successful."
        );
        return true;
      }
      on_event(
        e_event_level.message,
        `networking:webstats: upload ${attempt}/${upload.retry_count} failed to server ${server} (${outcome.reason}) for '${basename(path)}'.`
      );
      if (attempt < upload.retry_count && upload.retry_delay_ms > 0) {
        await delay(upload.retry_delay_ms, options.signal);
      }
    }

    on_event(
      e_event_level.message,
      `networking:webstats: upload failed to server ${server}.`
    );
    return false;
  }

  // One request. A transport that ignores its timeout is cut off here.
  private async attempt(
    zip: Buffer,
    timeout_ms: number,
    options: s_webstats_submit_options
  ): Promise<{ accepted: boolean; reason: string }> {
    const { upload, endpoint } = options;
    const controller = new AbortController();
    const signal = options.signal
      ? AbortSignal.any([controller.signal, options.signal])
      : controller.signal;
    let timer: NodeJS.Timeout | undefined;
    const expired = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new DatamineError("timed out"));
      }, timeout_ms);
    });

    try {
      const response: s_http_response = await Promise.race([
        options.transport({
          endpoint,
          filename: upload.multipart_filename,
          content_type: upload.content_type,
          body: zip,
          extra_headers: upload.extra_headers,
          header_quoting: upload.header_quoting,
          timeout_ms,
          signal,
        }),
        expired,
      ]);
      return upload.success(response)
        ? { accepted: true, reason: "" }
        : { accepted: false, reason: `http ${response.status}` };
    } catch (error) {
      return { accepted: false, reason: (error as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }
}
