import { datamine_globals_get } from "../../datamine_globals.ts";
import type { t_printf_argument } from "../cseries/cseries_printf.ts";
import { csstrnzcpy } from "../cseries/cseries_strings.ts";
import {
  filetime_from_date,
  k_system_clock,
  type s_clock,
} from "../cseries/cseries_time.ts";

export const k_datamine_event_name_length = 512;
export const k_datamine_parameter_signature_length = 512;
export const k_datamine_category_name_length = 32;
export const k_datamine_categories_maximum_count = 16;
export const k_datamine_parameter_name_length = 32;
// Strings go through a 512 byte static string, so 511 bytes of text at most.
export const k_datamine_parameter_string_maximum_length = 512;
export const k_datamine_map_name_length = 260;
export const k_datamine_event_buffer_length = 16_384;

// Value sizes in the v1 record: long and float are 4 bytes, int64 is 8, and a string is its
// length prefix plus its bytes.
const k_datamine_long_size = 4;
const k_datamine_int64_size = 8;
const k_datamine_float_size = 4;
const k_datamine_string_length_size = 4;

const k_non_ascii_regex = /[\u{80}-\u{10FFFF}]/gu;

// Sizes of the v1 record pieces, used for the buffer budget.
export const k_datamine_event_header_size = 1312;
export const k_datamine_parameter_header_size = 36;
// The category count and the parameter count, one long each.
const k_datamine_record_counts_size = 8;

export const e_datamine_parameter_type = {
  long: 0,
  int64: 1,
  float: 2,
  string: 3,
} as const;
export type e_datamine_parameter_type =
  (typeof e_datamine_parameter_type)[keyof typeof e_datamine_parameter_type];

// Parameter type names, indexed by type.
export const k_datamine_parameter_type_names: Record<
  e_datamine_parameter_type,
  string
> = ["long", "int64", "float", "string"];

// "lenient" also accepts flags, `*`, h/z and maps %ll* to int64 instead of cancelling the
// record. "faithful" takes only what the original specifier walker understood.
export type t_datamine_args_mode = "lenient" | "faithful";

export interface s_datamine_format_options {
  args_mode: t_datamine_args_mode;
  // Signatures of the layouts other than 3.1 lose the trailing ", "; 3.1 keeps it.
  signature_strip_trailing_separator: boolean;
}

export interface s_datamine_parameter {
  name: string;
  type: e_datamine_parameter_type;
  value: number | bigint | string;
}

export interface s_datamine_game_info {
  game_instance: bigint;
  map: string;
}

export interface s_datamine_record {
  categories: string[];
  // FILETIME
  event_date: bigint;
  event_index: number;
  event_name: string;
  game_info: s_datamine_game_info;
  parameter_signature: string;
  parameters: s_datamine_parameter[];
  priority: number;
}

export interface s_datamine_point3d {
  x: number;
  y: number;
  z: number;
}

export interface s_data_mining_options {
  clock?: s_clock;
  commit?: (record: s_datamine_record) => void;
  // The first event_index handed out: 1 for the layouts other than 3.1, 0 for 3.1.
  event_index_start?: number;
  format?: Partial<s_datamine_format_options>;
  game_info?: () => s_datamine_game_info;
  on_error?: (message: string) => void;
}

interface s_data_mining_globals {
  clock: s_clock;
  commit: ((record: s_datamine_record) => void) | undefined;
  data_mine_event_index: number;
  format: s_datamine_format_options;
  game_info: () => s_datamine_game_info;
  on_error: ((message: string) => void) | undefined;
}

const k_default_event_index_start = 1;

function data_mining_globals_create(): s_data_mining_globals {
  return {
    commit: undefined,
    on_error: undefined,
    clock: k_system_clock,
    game_info: () => ({ game_instance: 0n, map: "" }),
    data_mine_event_index: k_default_event_index_start,
    format: {
      signature_strip_trailing_separator: true,
      args_mode: "lenient",
    },
  };
}

function data_mining_globals(): s_data_mining_globals {
  return datamine_globals_get("data_mining", data_mining_globals_create);
}

// Hooks for the management layer.
export function data_mining_configure(options: s_data_mining_options): void {
  const globals = data_mining_globals();
  if ("commit" in options) {
    globals.commit = options.commit;
  }
  if ("on_error" in options) {
    globals.on_error = options.on_error;
  }
  if (options.clock) {
    globals.clock = options.clock;
  }
  if (options.game_info) {
    globals.game_info = options.game_info;
  }
  if (options.event_index_start !== undefined) {
    globals.data_mine_event_index = options.event_index_start;
  }
  if (options.format) {
    globals.format = { ...globals.format, ...options.format };
  }
}

export function data_mining_reset(): void {
  Object.assign(data_mining_globals(), data_mining_globals_create());
}

// The index the next committed record receives.
export function data_mining_event_index_peek(): number {
  return data_mining_globals().data_mine_event_index;
}

export function data_mining_format_options(): s_datamine_format_options {
  return { ...data_mining_globals().format };
}

// Every non-ASCII code point becomes one "?".
function ascii_from_wide(value: string): string {
  return value.replace(k_non_ascii_regex, "?");
}

function argument_to_long(argument: t_printf_argument): number {
  if (typeof argument === "bigint") {
    return Number(BigInt.asIntN(32, argument));
  }
  if (typeof argument === "boolean") {
    return argument ? 1 : 0;
  }
  if (argument === null || argument === undefined) {
    return 0;
  }
  // The bitwise or wraps to 32 bits like the C cast, and turns NaN into 0.
  return Number(argument) | 0;
}

function argument_to_int64(argument: t_printf_argument): bigint {
  if (typeof argument === "bigint") {
    return BigInt.asIntN(64, argument);
  }
  if (typeof argument === "boolean") {
    return argument ? 1n : 0n;
  }
  const value = Number(argument ?? 0);
  return Number.isFinite(value)
    ? BigInt.asIntN(64, BigInt(Math.trunc(value)))
    : 0n;
}

function argument_to_double(argument: t_printf_argument): number {
  if (argument === null || argument === undefined) {
    return 0;
  }
  return Number(argument);
}

function argument_to_text(argument: t_printf_argument): string {
  if (argument === null || argument === undefined) {
    return "";
  }
  return String(argument);
}

// A char argument is a code; a one character string is accepted for convenience.
function argument_to_character(argument: t_printf_argument): string {
  if (typeof argument === "string") {
    return argument.slice(0, 1);
  }
  const code =
    typeof argument === "bigint" ? Number(argument) : Number(argument ?? 0);
  return code ? String.fromCharCode(code & 0xff_ff) : "";
}

const k_args_long_specifiers = "Xdinopux";
const k_args_double_specifiers = "EGeg";
const k_args_int64_suffixes = ["I64d", "I64i", "I64o", "I64x", "I64X"];
const k_args_int64_suffixes_lenient = [...k_args_int64_suffixes, "I64u"];
const k_args_lenient_flags = "-+ #";
const k_args_digits = "0123456789";
const k_args_ll_conversions = "dioxXu";

// What each parameter type adds to the signature.
const k_parameter_signature_tokens: Record<e_datamine_parameter_type, string> =
  {
    [e_datamine_parameter_type.long]: "%d, ",
    [e_datamine_parameter_type.int64]: "%I64d, ",
    [e_datamine_parameter_type.float]: "%f, ",
    [e_datamine_parameter_type.string]: "%s, ",
  };

type t_datamine_state = "open" | "cancelled" | "committed";

export class c_datamine {
  private readonly m_priority: number;
  private readonly m_event_name: string;
  private m_parameter_signature = "";
  private readonly m_categories: string[] = [];
  private readonly m_parameters: s_datamine_parameter[] = [];
  private m_parameter_bytes = 0;
  private m_external_game_info: s_datamine_game_info | undefined;
  private m_state: t_datamine_state = "open";
  // A scratch record reports nothing to the datamine's error hook.
  private readonly m_quiet: boolean;

  constructor(
    priority: number,
    event_name: string,
    categories: readonly string[] = [],
    quiet = false
  ) {
    this.m_quiet = quiet;
    this.m_priority = priority;
    this.m_event_name = csstrnzcpy(event_name, k_datamine_event_name_length);
    for (const category of categories) {
      this.additional_category(category);
    }
  }

  // What add_args makes of these arguments, without committing anything. Empty when the
  // format can't be parsed.
  static parameters_from_args(
    format: string,
    args: readonly t_printf_argument[]
  ): s_datamine_parameter[] {
    const scratch = new c_datamine(0, format, [], true);
    scratch.add_args(format, args);
    return scratch.cancelled ? [] : scratch.m_parameters;
  }

  get cancelled(): boolean {
    return this.m_state === "cancelled";
  }

  get committed(): boolean {
    return this.m_state === "committed";
  }

  // Header, both counts, categories and parameters as the v1 layout encodes them.
  get encoded_size(): number {
    return (
      k_datamine_event_header_size +
      k_datamine_record_counts_size +
      k_datamine_category_name_length * this.m_categories.length +
      this.m_parameter_bytes
    );
  }

  additional_category(category_name: string): void {
    if (this.m_categories.length >= k_datamine_categories_maximum_count) {
      this.report_error(
        `datamine: too many categories, dropping '${category_name}'`
      );
      return;
    }
    this.m_categories.push(
      csstrnzcpy(category_name, k_datamine_category_name_length)
    );
  }

  add_long(name: string, value: number): void {
    this.add_parameter(
      name,
      e_datamine_parameter_type.long,
      k_datamine_long_size,
      value | 0
    );
  }

  add_int64(name: string, value: bigint | number): void {
    this.add_parameter(
      name,
      e_datamine_parameter_type.int64,
      k_datamine_int64_size,
      argument_to_int64(value)
    );
  }

  add_float(name: string, value: number): void {
    this.add_parameter(
      name,
      e_datamine_parameter_type.float,
      k_datamine_float_size,
      Math.fround(value)
    );
  }

  // Stored as a float, like the original.
  add_double(name: string, value: number): void {
    this.add_float(name, value);
  }

  add_string(name: string, value: string | null | undefined): void {
    const text = csstrnzcpy(
      value ?? "",
      k_datamine_parameter_string_maximum_length
    );
    // Length prefix plus the bytes, no terminator.
    this.add_parameter(
      name,
      e_datamine_parameter_type.string,
      k_datamine_string_length_size + Buffer.byteLength(text),
      text
    );
  }

  add_wchar_string(name: string, value: string | null | undefined): void {
    this.add_string(name, ascii_from_wide(value ?? ""));
  }

  add_point(name: string, value: s_datamine_point3d): void {
    this.add_float(`${name}.x`, value.x);
    this.add_float(`${name}.y`, value.y);
    this.add_float(`${name}.z`, value.z);
  }

  add_vector(name: string, value: s_datamine_point3d): void {
    this.add_point(name, value);
  }

  add_external_game_info(info: s_datamine_game_info): void {
    this.m_external_game_info = info;
  }

  // Walks the printf format like the original and records one unnamed parameter per specifier.
  // Anything it can't place cancels the whole record.
  add_args(format: string, args: readonly t_printf_argument[]): void {
    const lenient = data_mining_globals().format.args_mode === "lenient";
    const int64_suffixes = lenient
      ? k_args_int64_suffixes_lenient
      : k_args_int64_suffixes;
    const text = csstrnzcpy(format, k_datamine_event_name_length);
    let argument_index = 0;
    const next_argument = (): t_printf_argument => args[argument_index++];

    let format_position = 0;
    while (format_position < text.length - 1) {
      const percent_index = text.indexOf("%", format_position);
      if (percent_index < 0 || percent_index >= text.length - 1) {
        break;
      }
      if (text[percent_index + 1] === "%") {
        format_position = percent_index + 2;
        continue;
      }

      let format_characters_processed = 1;
      let local_position = percent_index;
      let format_value_found = false;
      while (!format_value_found) {
        local_position++;
        // Running off the end reads the terminator, which lands in the unparsable case.
        const specifier = text[local_position] ?? "\0";
        if (k_args_digits.includes(specifier) || specifier === "l") {
          if (
            lenient &&
            specifier === "l" &&
            text[local_position + 1] === "l" &&
            k_args_ll_conversions.includes(text[local_position + 2] ?? "\0")
          ) {
            this.add_int64("", argument_to_int64(next_argument()));
            local_position += 2;
            format_value_found = true;
          }
        } else if (specifier === "s") {
          this.add_string("", argument_to_text(next_argument()));
          format_value_found = true;
        } else if (specifier === "S") {
          this.add_wchar_string("", argument_to_text(next_argument()));
          format_value_found = true;
        } else if (k_args_long_specifiers.includes(specifier)) {
          this.add_long("", argument_to_long(next_argument()));
          format_value_found = true;
        } else if (specifier === "f") {
          this.add_float("", argument_to_double(next_argument()));
          format_value_found = true;
        } else if (k_args_double_specifiers.includes(specifier)) {
          this.add_double("", argument_to_double(next_argument()));
          format_value_found = true;
        } else if (specifier === "c") {
          this.add_string("", argument_to_character(next_argument()));
          format_value_found = true;
        } else if (specifier === "C") {
          this.add_wchar_string("", argument_to_character(next_argument()));
          format_value_found = true;
        } else if (specifier === "I") {
          // Only the I64 forms mean something; other I's fall through to the digits after them.
          const tail = text.slice(local_position);
          if (int64_suffixes.some((suffix) => tail.startsWith(suffix))) {
            this.add_int64("", argument_to_int64(next_argument()));
            format_value_found = true;
          }
        } else if (specifier === ".") {
          // Only ".*s" (and the odd ". s") is understood. The precision argument is consumed and ignored.
          const after = text[local_position + 1];
          if (
            (after === "*" || after === " ") &&
            text[local_position + 2] === "s"
          ) {
            next_argument();
            this.add_string("", argument_to_text(next_argument()));
            format_characters_processed = 3;
            format_value_found = true;
          }
        } else if (lenient && k_args_lenient_flags.includes(specifier)) {
          // flags carry no argument
        } else if (lenient && specifier === "*") {
          // width from the argument list
          next_argument();
        } else if (lenient && (specifier === "h" || specifier === "z")) {
          // length modifiers don't change the stored type
        } else {
          this.cancel_insert();
          this.report_error(`datamine: unparsable format string: '${format}'`);
          // The original keeps walking and repeats the error per specifier; one report is enough.
          return;
        }
      }

      format_position = percent_index + format_characters_processed;
    }
  }

  cancel_insert(): void {
    if (this.m_state === "open") {
      this.m_state = "cancelled";
    }
  }

  commit(): void {
    if (this.m_state !== "open") {
      return;
    }

    // Categories can arrive after the parameters, so the budget is checked again here.
    if (this.encoded_size > k_datamine_event_buffer_length) {
      this.cancel_insert();
      this.report_error(
        `datamine: event '${this.m_event_name}' exceeds the ${k_datamine_event_buffer_length} byte record buffer`
      );
      return;
    }

    const globals = data_mining_globals();
    let parameter_signature = this.m_parameter_signature;
    if (
      globals.format.signature_strip_trailing_separator &&
      parameter_signature.endsWith(", ")
    ) {
      parameter_signature = parameter_signature.slice(0, -2);
    }

    this.m_state = "committed";
    // The index advances on every commit, whether or not anything is listening.
    const event_index = globals.data_mine_event_index++;
    const game_info = this.m_external_game_info ?? globals.game_info();
    const record: s_datamine_record = {
      priority: this.m_priority,
      event_name: this.m_event_name,
      parameter_signature,
      event_index,
      game_info: {
        game_instance: BigInt.asUintN(64, game_info.game_instance),
        map: csstrnzcpy(game_info.map, k_datamine_map_name_length),
      },
      event_date: filetime_from_date(globals.clock.now()),
      categories: [...this.m_categories],
      parameters: this.m_parameters.map((parameter) => ({ ...parameter })),
    };
    globals.commit?.(record);
  }

  [Symbol.dispose](): void {
    this.commit();
  }

  private report_error(message: string): void {
    if (this.m_quiet) {
      return;
    }
    data_mining_globals().on_error?.(message);
  }

  private add_parameter(
    name: string,
    type: e_datamine_parameter_type,
    value_bytes: number,
    value: number | bigint | string
  ): void {
    if (this.m_state !== "open") {
      return;
    }

    const parameter_bytes = k_datamine_parameter_header_size + value_bytes;
    // The original measured only the parameters against the buffer; this counts the header too.
    if (this.encoded_size + parameter_bytes > k_datamine_event_buffer_length) {
      this.cancel_insert();
      this.report_error(
        `datamine: event '${this.m_event_name}' exceeds the ${k_datamine_event_buffer_length} byte record buffer`
      );
      return;
    }

    this.m_parameters.push({
      name: csstrnzcpy(name, k_datamine_parameter_name_length),
      type,
      value,
    });
    this.m_parameter_bytes += parameter_bytes;

    // Appending to the fixed signature truncates at its size.
    this.m_parameter_signature = csstrnzcpy(
      this.m_parameter_signature + k_parameter_signature_tokens[type],
      k_datamine_parameter_signature_length
    );
  }
}
