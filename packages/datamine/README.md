# @blamnetwork/datamine

This package is a reimplementation of Bungie's event and datamine systems, as used in Halo and Destiny.

An **event** is a single log line with a level (`verbose`, `status`, `message`, `warning`, `error` or `critical`), categories (such as `networking`, `audio` or `ui`) and a message. Most Halo modders will recognise events as the text files that appear in the `reports/` folder when running the Halo Editing Kits.

**Datamine** is what happens to those events next: a collection of them is packed into a binary file and uploaded to a datamine server.

This package is for projects that want event logs and datamine of their own. To view logs or datamine files, see [Datamine Explorer](https://github.com/craftycodie/Datamine-Explorer).

## Using Datamine

The package does four things:

- [Writing event reports](#writing-event-reports) to disk.
- [Uploading datamine](#uploading-datamine) to a datamine server.
- [Streaming events live](#streaming-events-live) to Datamine Explorer.
- [Reading reports and datamine files](#reading-reports-and-datamine-files), in Node or a browser.

There is one event system and one datamine system per process. Both live on `globalThis`, so the ESM and CJS builds, and duplicate installs, share them. Calling `event()` before `events_initialize` does nothing. Initializing twice throws `DatamineError`. Each system flushes and closes in its `*_dispose`, and flushes on process exit unless `install_exit_flush: false` is passed.

Everything is a plain option with a default. There are no presets: each option below can be set on its own, and the [defaults tables](#defaults) list what you get when you leave it out.

### Writing event reports

```ts
import {
  event_error,
  event_message,
  event_warning,
  events_dispose,
  events_initialize,
} from "@blamnetwork/datamine";

events_initialize({
  root: "./logs",
  categories: category_defaults,   // your categories, see below
});

event_message("networking:session: %s joined", "someone");
event_warning("networking:session: join %s failed %d", "someone", 5);
event_error("ui:menu: missing screen %s", "settings");

events_dispose();
```

The category comes from the start of the format string: `[A-Za-z0-9_-]` segments, each followed by a colon, up to eight deep. `event(level, format, ...args)` takes the level as an argument, and `event_verbose` through `event_critical` are shorthands. Arguments are printf-style: `%s`, `%d` (32 bit), `%I64d` (64 bit), `%f` and so on.

Each category has its own display, log, datamine, debugger break and halt levels. A category nobody configured uses the global levels, which all start at `error` (`initial_levels` changes that). No categories ship with the package, so you provide the table:

```ts
import {
  e_event_level,
  k_event_level_none,
  type s_event_category_default_configuration,
} from "@blamnetwork/datamine";

const category_defaults: s_event_category_default_configuration[] = [
  {
    name: "networking:",
    display_level: k_event_level_none,
    display_color: { red: 1, green: 0.4, blue: 0.7 },
    log_level: e_event_level.message,
    log_name: "networking_debug.txt",
    log_format: "netbuf",
    remote_log_level: e_event_level.message,
  },
  // No log_name: lines go to networking_debug.txt, inherited from networking:.
  {
    name: "networking:spawning:",
    display_level: k_event_level_none,
    display_color: { red: 1, green: 0.4, blue: 0.7 },
    log_level: e_event_level.message,
    remote_log_level: k_event_level_none,
  },
];
```

How the table applies:
- Entries apply in order, each to its own category only.
- A category created later, either by a later entry or at runtime, starts as a copy of its parent at that moment.
- An entry without `log_name` keeps the file its parent handed down.
- `log_format: "netbuf"` adds the per-session timestamp columns to that category's own file.

More options:
- `event_context_run(type, description, fn)` tags every event raised inside `fn`. It uses `AsyncLocalStorage`, so concurrent requests keep their own context.
- `events_register_listener(categories, fn)` hands events to your own code.
- Sinks (`display`, `debug_output`, `debugger_break`, `halt`) and providers (`clock`, `game_time`, `frame_index`, `thread_id`, `network_session_clocks`) are callbacks passed to `events_initialize`. A halt never exits the process, your sink decides what happens.
- Spam suppression only affects the console by default (`spam_mode: "console_only"`): a category that repeats the same text stops printing but is still logged. `"faithful"` drops those events from every output, `"disabled"` suppresses nothing.
- `write_mode: "cached"` buffers lines and writes them in batches; the default `"immediate"` writes each line as it arrives.

#### Report files

The files go in `<root>/reports/`, plus any `log_name` your categories give. Each is opened on first use and starts with the banner, so a file that is appended to holds one banner per run. Lines end in CRLF.

| Option | File | Takes | Default |
| --- | --- | --- | --- |
| (always) | `debug.txt` | events at or above the global log level | |
| `debug_log_includes_unfiled` | `debug.txt` | also the events of categories that have no file of their own | `false` |
| `full_log` | `debug_full.txt` | every event that is logged | `true` |
| `datamine_log` | `debug_datamine.txt` | events sent to the datamine | `false` |
| `uncategorized_log` | `debug_spam.txt` | events without a category prefix | `false` |
| `root_debug_log` | `<root>/debug.txt` | the same as `debug.txt`, in the root, recreated on every start | `false` |

More about the files:
- `separate_session_reports: true` puts a run in its own folder, `<root>/reports/<YYYYMMDD_HHMMSS>[_<session_suffix>]/`, such as `20261016_120005_pc_web-tiger`. The suffix is the `session_suffix` option and is left off when there is none.
- `append` (default `true`) keeps adding to the files of earlier runs. With `false`, each file is recreated the first time the process writes to it.
- `trim_bytes` cuts an appended file to its last `trim_bytes` bytes when it is first opened. Zero, the default, never trims.
- `write_files: false` writes none of them, leaving the console, listeners and the live server.
- `event_logs_snapshot()` copies every file into `<root>/error_snapshot/`.

#### Line format

The line style comes from the datamine header layout, like the other layout-derived behaviour (see `data_mine_layout_behaviour`). `events_initialize` takes `layout`, default `"3.1"`:

```ts
events_initialize({ root: "./logs", layout: "1.1" });
```

Layout `"3.1"` writes Destiny's lines, every other layout (`"1.0"`, `"1.1"`, `"2.0"`, `"2.1"`) Halo's:

```
10/16/2026 00:53:27.067 g00025637 0000ABCD message  networking: request started
date                    game time thread   level    text

10.16.26 00:53:27.067 0000061 g025637 f0092363 <38 netbuf characters> message networking: request started [(job)A]
date                  index   game time and frame                     severity text                            context
```

- Destiny: `MM/DD/YYYY HH:MM:SS.mmm g%08d %08X <level name padded to 8> <text>`. There is no index, frame, netbuf or context column, so those are dropped. Without a `game_time` provider the game time reads zero.
- Halo: `MM.DD.YY HH:MM:SS.mmm %07d <g%06d f%07d | 8 spaces f%07d> <netbuf> <severity> <text> <context>`. The severity is `verbose`, `status `, `message`, `WARNING`, `-ERROR-` or `-FATAL-`. The game time column is eight spaces plus the frame when no `game_time` provider is set, and the frame is zero when no `frame_index` provider is set. Like the game, an empty netbuf leaves a double space and an empty context a trailing space.
- A category with `log_format: "netbuf"` puts three `hh:mm:ss.mmm` session clocks (or twelve spaces each) before the severity in its own file, in Halo lines only.
- The console line is the level, the text, and ` (<context>)` when there is one. Halo layouts show the upper case severity, Destiny's the lower case name. Forced display shows as critical.
- `date_utc: true` writes UTC instead of local time.
- Events and the datamine each take the layout as their own option and are not tied together, so pass the same layout to both.
- The banner is an 80 column rule, the `version_string`, a rule again and a blank line. It carries no column list; the reader works out the style from the lines:

```
================================================================================
web-tiger 1.0
================================================================================
```

### Uploading datamine

```ts
import {
  c_datamine,
  data_mine_dispose,
  data_mine_initialize,
  data_mine_upload,
  e_event_level,
} from "@blamnetwork/datamine";

data_mine_initialize({
  root: "./logs",
  layout: "3.1",
  title: "my_app",
  enabled: true,
  endpoint: { host: "example.com", port: 32556, path: "/ticket_drop", ssl: true },
});

// A record of your own.
const record = new c_datamine(e_event_level.message, "players:joined", ["players"]);
record.add_long("count", 4);
record.add_string("name", "someone");
record.commit();

const { uploaded, failed } = await data_mine_upload();

data_mine_dispose();
```

You don't have to build records yourself. Once both systems are initialized, any event at or above its category's datamine (remote) level becomes a record:
- the raw format string is its name;
- its level is its priority;
- its categories are its categories;
- its printf arguments are its parameters.

`using record = new c_datamine(...)` commits when the scope ends.

The record details follow the chosen `layout`; see [Datamine file layouts](#datamine-file-layouts).

Files:
- Records are written to `<root>/<directory>/<16 hex digits>.datamine`, with `directory` defaulting to `datamine`.
- A file is closed and a new one started by `data_mine_flush()`, by `rotate_bytes` or `rotate_interval_ms`, and before each upload.
- Datamine is off until `enabled: true` or `data_mine_enable(true)`.

Uploading:
- `data_mine_upload()` zips each finished file into a single `compressed.dat` entry, POSTs it as `multipart/form-data` with the boundary `BUNGIEr0x0rz`, and deletes it once the server accepts it.
- Only tracked builds can upload: with the default `build_number` of -1, `data_mine_upload()` rejects and `upload_interval_ms` starts no timer. Files are still written.
- A file that fails stays on disk for the next upload.
- Calls made during an upload share it.
- `upload` changes the content type, filename, entry name, compression level, extra headers, retries and timeout. They have the same defaults for every layout.

Ways to send the request:
- **`http_version: "1.1"`** goes through fetch, with https verified.
- **`http_version: "1.0"`** writes the exact request bytes the games send, over `net` or `tls`. That is `POST <path> HTTP/1.0`, no Host header and a lowercase `Content-type`.
- Left out, the layout picks one.
- **`transport`**: any `(request) => Promise<{ status, headers, body }>`. It overrides both of the above, and is handy for tests.

`data_mine_set_endpoint(endpoint)` changes the endpoint later, and `undefined` turns uploading off.

### Streaming events live

The live server sends every event that produced output to connected Datamine Explorers as it happens. It uses Server-Sent Events over plain `node:http`. A viewer that connects late gets the recent past first.

```ts
import { events_server_start, events_server_stop } from "@blamnetwork/datamine";

const { url } = await events_server_start({ port: 32557 });   // port 0 picks a free one
// In Datamine Explorer: File > Connect, then the url.

await events_server_stop();
```

To serve it from an existing node http or express server instead, mount `events_server_handler(options)` there. It answers only its own routes under `/datamine`.

Options:
- `host` (default `127.0.0.1`)
- `path_prefix` (default `/datamine`)
- `backlog`: entries kept for late viewers, default 10000
- `minimum_level`
- `client_buffer_limit`: a viewer that falls this far behind is dropped rather than slowing the server
- `heartbeat_ms`

### Reading reports and datamine files

`@blamnetwork/datamine/reading` parses what the other three features write. It has no node imports, so it runs in a browser; Datamine Explorer uses it. Datamine files are read with `Buffer`, which a browser build has to provide.

```ts
import {
  c_log_text_parser,
  log_detect_format,
  log_entries_from_datamine,
  read_datamine_file,
  read_datamine_upload,
} from "@blamnetwork/datamine/reading";

const format = log_detect_format("debug.txt", head_bytes);

// Text reports, in chunks of any size.
const parser = new c_log_text_parser(format);
const entries = [...parser.push(text), ...parser.finish()];

// Binary datamine, or an upload's zip.
const file = read_datamine_file(bytes);
const rows = log_entries_from_datamine(read_datamine_upload(zip_bytes));
```

Formats:

| Id | Name | What it is |
| --- | --- | --- |
| `halo_style_log` | Halo style event log | the report files of Halo's tools, and what this package writes for every layout but `"3.1"` |
| `destiny_style_log` | Destiny style event log | the report files of Destiny, and what this package writes for layout `"3.1"` |
| `datamine_text` | Datamine text export | text exports of datamine files |
| `datamine_binary` | Datamine file | binary `.datamine` files in every layout |
| `datamine_upload` | Datamine upload (zip) | an upload's zip |

- Each banner in a text report becomes a session row, so a report appended to by several runs shows each run. The banner is everything between its two rules, so an older `columns:` banner line is just part of it.
- `encode_datamine_file` writes a datamine file back byte for byte.
- The browser entry also exports the line and banner writers (`format_event_for_log`, `format_console_line`, `build_banner`), so a tool can write files the reader takes. They take the datamine layout, `"3.1"` by default.

## HaloScript commands

This implementation doesn't use HaloScript. The script commands the games use to drive events and datamine are plain functions you call.

| Function | What it does |
| --- | --- |
| `events_enabled(enable)` | Turns all events on or off. |
| `events_disable_suppression(enable)` | Ignores per-event console suppression. |
| `events_spam_suppression_enable(enable)` | Turns spam suppression on or off. |
| `event_set_display_level_global(level)` | Lowest level shown on the console for categories without their own. |
| `event_set_log_level_global(level)` | Lowest level written to the log files for categories without their own. |
| `event_set_remote_log_level_global(level)` | Lowest level sent to the datamine for categories without their own. |
| `event_set_debugger_break_level_global(level)` | Lowest level that calls the debugger break sink. |
| `event_set_display_level_by_name(name, level)` | Console level for a category and its children. |
| `event_set_force_display_level_by_name(name, level)` | Level from which a category always shows on the console, even when suppressed. |
| `event_set_log_level_by_name(name, level)` | Log level for a category and its children. |
| `event_set_remote_log_level_by_name(name, level)` | Datamine level for a category and its children. |
| `event_set_debugger_break_level_by_name(name, level)` | Debugger break level for a category and its children. |
| `event_set_halt_level_by_name(name, level)` | Halt level for a category and its children. |
| `event_dump_categories(name)` | Lists a category and its children with their levels. |
| `event_logs_snapshot()` | Copies the current log files into the error snapshot folder. |
| `event_logs_flush()` | Writes out any buffered log lines. |
| `data_mine_enable(enable)` | Turns datamine recording on or off. |
| `data_mine_flush()` | Closes the current datamine file and starts a new one. |
| `data_mine_upload()` | Uploads every finished datamine file. |
| `data_mine_insert(text)` | Records a plain text datamine entry. |
| `data_mine_set_endpoint(endpoint)` | Sets the datamine server, or turns uploading off. |

Levels:
- Levels are `e_event_level` (0 to 5), and `k_event_level_none` turns a level off.
- `event_level_from_name("warning" | "none" | "disable" | "3")` turns a script's level name into one.

Categories:
- Category names need their trailing colon, as in `"networking:"`.
- The empty name is the root, which applies to every category.

## Reference

### Defaults

`events_initialize` takes `root` and these options. Leave one out and you get its default.

| Option | Default | |
| --- | --- | --- |
| `name` | none | shown in the live server's hello |
| `version_string` | `"blamnet events"` | the banner's version line |
| `categories` | `[]` | the category table |
| `initial_levels` | `{ display: error, log: error, remote_log: error }` | global levels at start |
| `spam_mode` | `"console_only"` | `"console_only"`, `"faithful"` or `"disabled"` |
| `text_encoding` | `"utf8"` | `"utf8"` or `"latin1"` |
| `write_mode` | `"immediate"` | `"immediate"` or `"cached"` |
| `layout` | `"3.1"` | Destiny's lines for `"3.1"`, Halo's for the others, see [Line format](#line-format) |
| `date_utc` | `false` | local time |
| `write_files` | `true` | |
| `separate_session_reports` | `false` | everything in `<root>/reports/` |
| `session_suffix` | none | |
| `debug_log_includes_unfiled` | `false` | level alone decides `debug.txt` |
| `full_log` | `true` | `debug_full.txt` |
| `datamine_log` | `false` | `debug_datamine.txt` |
| `uncategorized_log` | `false` | `debug_spam.txt` |
| `root_debug_log` | `false` | an extra `debug.txt` in the root |
| `append` | `true` | |
| `trim_bytes` | `0` | never trim |
| `install_exit_flush` | `true` | |
| `sinks`, `providers`, `remote_log` | none | callbacks |

`data_mine_initialize` takes `root` and these options.

| Option | Default | |
| --- | --- | --- |
| `layout` | `"3.1"` | `"1.0"`, `"1.1"`, `"2.0"`, `"2.1"` or `"3.1"`; see [Datamine file layouts](#datamine-file-layouts) |
| `byte_order` | `"big"` | `"big"` or `"little"` |
| `title` | `"datamine"` | the title in 1.x and 2.x headers, the application name in 3.1 |
| `build_string` | `"untracked version"` | |
| `build_number` | `-1` | an untracked build: it writes files but never uploads |
| `header_extra` | none | `source_flag` and `version_minor`, where the layout has them |
| `directory` | `"datamine"` | under the root |
| `file_name` | four 15 bit hex groups | `(rand) => string` |
| `text_encoding` | `"utf8"` | |
| `args_mode` | `"lenient"` | `"lenient"` or `"faithful"` printf argument parsing |
| `enabled` | `false` | |
| `endpoint` | none | uploads are off without one |
| `http_version` | the layout's | `"1.0"` or `"1.1"` |
| `transport` | none | replaces the HTTP client |
| `upload` | see below | |
| `rotate_bytes`, `rotate_interval_ms`, `upload_interval_ms` | none | |
| `session_id`, `system_id` | built from the start time and machine | |
| `clock`, `rand`, `game_info`, `network_session_ids` | | providers |
| `install_exit_flush` | `true` | |

`upload` defaults, the same for every layout: `content_type` `"application/x-bungie-datamine"`, `multipart_filename` `"upload_temp.zip"`, `entry_name` `"compressed.dat"`, `compression_level` 3, `header_quoting` `"plain"`, `extra_headers` none, `retry_count` 3, `retry_delay_ms` 0, `timeout_ms` 30 minutes.

### Datamine file layouts

Every header starts with the 16 bit marker `0xFFFE`. The first two bytes give the byte order: `FE FF` is little endian, `FF FE` big endian. Any layout can be written either way; `byte_order` picks.

| Layout | Size | Used by | Notes |
| --- | --- | --- | --- |
| `1.0` | 368 B | Halo 3 | no minor version word |
| `1.1` | 370 B | Halo 3 | `1.0` with a minor version word |
| `2.0` | 369 B | Halo: Reach | adds a `source_flag` byte, no minor version word |
| `2.1` | 371 B | Halo: Reach | `2.0` with a minor version word |
| `3.1` | 472 B | Destiny | definition and occurrence records |

The layout also decides how the text logs write a line, see [Line format](#line-format).

Records in `1.0` to `2.1`:
- Every record stands alone: a fixed header, the category names, then the parameters.
- Names are `char[512]`, categories `char[32]` (at most 16) and strings at most 511 bytes.
- A record fits in 16 KiB.

`3.1`, Destiny's registered events:
- Each event's definition (name, signature, categories, parameter names and types) is written once per file. Each occurrence refers to it by id and carries only the values.
- Every file stands alone, so definitions are written again after a rotation.
- Definition ids come from one registry of at most 0x2000 entries, starting at 1 as Destiny's do.
- The header's build string is 128 bytes, and the rest of the header is zero padding.

`@blamnetwork/blf`'s `read_datamine_file` can also read `1.0`, `2.0` and `3.1` files.

### Live server protocol

Version 1. Every response carries `Access-Control-Allow-Origin: *`, and `OPTIONS` answers 204.

- `GET <prefix>/info` returns the hello as JSON:
  - `{ protocol, run_id, name?, version_string, session_id?, system_id?, build_string?, started_ms, session_number, backlog_count, entry_count }`.
  - `name` is the events `name` option, and is left out when there is none.
  - The session, system and build ids come from the datamine when it is initialized.
  - `run_id` is new each time the server starts capturing. Entry indices only continue under the same run id.
- `GET <prefix>/events?backlog=<n>` is a `text/event-stream`:
  - It sends `event: hello` first, then up to `n` buffered entries as `event: entry` (all of them by default, none for `backlog=0`), then live entries.
  - `event: session` (`{ number, version, session_id?, started_ms }`) arrives whenever `events_initialize` runs.
  - `: ping` comments keep idle connections open.
- An entry is `{ index, time_ms, level, category_path, text, context?, thread_id?, game_time?, frame_index?, session, parameters? }`.
  - `index` is also the SSE `id`, so a reconnect with `Last-Event-ID` resumes from the buffer.
  - `parameters` are the printf arguments as datamine parameters, `{ name: "", type, value }`, with bigints as strings.

The JSON types (`s_events_server_hello`, `s_events_server_entry`, `s_events_server_session`, `s_events_server_parameter`) are exported from `@blamnetwork/datamine/reading`.

### Unknowns

- The category dump's rows have six level columns, but the header names only five, so which is which is partly guessed.
- Destiny's collection server may expect different parameters, content type, filename or success body. The upload defaults match Halo's, with a plain status 200 check for `3.1`.
- What `g%08d` counts in Destiny log lines is not known. It is written as the game time when a provider supplies one, and zero otherwise.

Built, tested and released with the rest of the [tiger](../../README.md) monorepo.
