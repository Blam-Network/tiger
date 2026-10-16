// MSVC-style vsnprintf. csnzprintf is Bungie's bounded printf: it always NUL-terminates,
// so a buffer of `size` holds at most size - 1 characters of text.
export type t_printf_argument =
  | number
  | bigint
  | string
  | boolean
  | null
  | undefined;

// Defaults match the Xbox 360 / VS2010 CRT. A PC x64 build would use 2 and 16.
export interface s_printf_options {
  exponent_digits?: 2 | 3;
  pointer_digits?: 8 | 16;
}

export interface s_printf_specifier {
  conversion: string;
  end: number;
  flags: string;
  length: string;
  precision: number | "*" | undefined;
  start: number;
  width: number | "*" | undefined;
}

// Widths and precisions past this are clamped so a hostile format can't allocate gigabytes.
const k_printf_field_limit = 1 << 20;
// toFixed and toExponential reject more than 100 fraction digits; the rest is zero padded.
const k_printf_max_fraction_digits = 100;

const k_printf_specifier_regex =
  /%([-+ #0]*)(\*|\d+)?(\.(?:\*|\d+)?)?(hh|h|ll|l|I64|I32|L|z|w)?([diouxXeEfgGcCsSpn%])/g;
const k_printf_exponent_regex = /e([+-])(\d+)$/;
const k_printf_exponent_letter_regex = /[eE]/;
const k_printf_trailing_fraction_zeros_regex = /\.?0+$/;

export function printf_parse_specifiers(format: string): s_printf_specifier[] {
  const specifiers: s_printf_specifier[] = [];
  for (const match of format.matchAll(k_printf_specifier_regex)) {
    const [text, flags, width, precision, length, conversion] = match;
    let parsed_precision: number | "*" | undefined;
    if (precision !== undefined) {
      const digits = precision.slice(1);
      if (digits === "*") {
        parsed_precision = "*";
      } else {
        parsed_precision = digits === "" ? 0 : Number.parseInt(digits, 10);
      }
    }
    specifiers.push({
      start: match.index,
      end: match.index + text.length,
      flags,
      width:
        width === undefined || width === "*"
          ? (width as "*" | undefined)
          : Number.parseInt(width, 10),
      precision: parsed_precision,
      length: length ?? "",
      conversion,
    });
  }
  return specifiers;
}

function printf_to_number(argument: t_printf_argument): number {
  switch (typeof argument) {
    case "number":
      return argument;
    case "bigint":
      return Number(argument);
    case "boolean":
      return argument ? 1 : 0;
    case "string": {
      const value = Number(argument);
      return Number.isNaN(value) ? 0 : value;
    }
    default:
      return 0;
  }
}

function printf_to_bigint(argument: t_printf_argument): bigint {
  if (typeof argument === "bigint") {
    return argument;
  }
  const value = printf_to_number(argument);
  return Number.isFinite(value) ? BigInt(Math.trunc(value)) : 0n;
}

function printf_to_int32(argument: t_printf_argument): number {
  if (typeof argument === "bigint") {
    return Number(BigInt.asIntN(32, argument));
  }
  return printf_to_number(argument) | 0;
}

function printf_to_uint32(argument: t_printf_argument): number {
  if (typeof argument === "bigint") {
    return Number(BigInt.asUintN(32, argument));
  }
  return printf_to_number(argument) >>> 0;
}

function printf_clamp_field(value: number): number {
  return Math.min(value, k_printf_field_limit);
}

function printf_pad_field(
  prefix: string,
  body: string,
  width: number,
  left_justify: boolean,
  zero_pad: boolean
): string {
  const missing = width - prefix.length - body.length;
  if (missing <= 0) {
    return prefix + body;
  }
  if (left_justify) {
    return prefix + body + " ".repeat(missing);
  }
  if (zero_pad) {
    return prefix + "0".repeat(missing) + body;
  }
  return " ".repeat(missing) + prefix + body;
}

interface s_printf_field {
  flags: string;
  left_justify: boolean;
  precision: number | undefined;
  width: number;
}

function printf_sign_prefix(negative: boolean, flags: string): string {
  if (negative) {
    return "-";
  }
  if (flags.includes("+")) {
    return "+";
  }
  return flags.includes(" ") ? " " : "";
}

function printf_format_integer(
  conversion: string,
  length: string,
  argument: t_printf_argument,
  field: s_printf_field,
  options: Required<s_printf_options>
): string {
  const { flags, width, precision, left_justify } = field;
  // z is size_t: 64-bit on x64, 32-bit otherwise.
  const is_64 =
    length === "ll" ||
    length === "I64" ||
    (length === "z" && options.pointer_digits === 16);
  const is_signed = conversion === "d" || conversion === "i";
  let negative = false;
  let digits: string;
  if (is_signed) {
    if (is_64) {
      const value = BigInt.asIntN(64, printf_to_bigint(argument));
      negative = value < 0n;
      digits = (negative ? -value : value).toString();
    } else {
      let value = printf_to_int32(argument);
      if (length === "h") {
        value = (value << 16) >> 16;
      } else if (length === "hh") {
        value = (value << 24) >> 24;
      }
      negative = value < 0;
      digits = String(Math.abs(value));
    }
  } else {
    let base = 16;
    if (conversion === "u") {
      base = 10;
    } else if (conversion === "o") {
      base = 8;
    }
    if (is_64) {
      digits = BigInt.asUintN(64, printf_to_bigint(argument)).toString(base);
    } else {
      let value = printf_to_uint32(argument);
      if (length === "h") {
        value &= 0xffff;
      } else if (length === "hh") {
        value &= 0xff;
      }
      digits = value.toString(base);
    }
    if (conversion === "X") {
      digits = digits.toUpperCase();
    }
  }

  const is_zero = digits === "0";
  if (precision !== undefined) {
    // An explicit zero precision prints nothing for a zero value.
    digits = precision === 0 && is_zero ? "" : digits.padStart(precision, "0");
  }

  let prefix = is_signed ? printf_sign_prefix(negative, flags) : "";
  if (flags.includes("#")) {
    if ((conversion === "x" || conversion === "X") && !is_zero) {
      prefix = conversion === "x" ? "0x" : "0X";
    } else if (conversion === "o" && !digits.startsWith("0")) {
      digits = `0${digits}`;
    }
  }
  const zero_pad = flags.includes("0") && precision === undefined;
  return printf_pad_field(prefix, digits, width, left_justify, zero_pad);
}

function printf_fixed(value: number, precision: number): string {
  if (value >= 1e21) {
    // toFixed switches to exponent notation here; the double is an exact integer, so BigInt is exact.
    const integer = BigInt(value).toString();
    return precision > 0 ? `${integer}.${"0".repeat(precision)}` : integer;
  }
  const digits = Math.min(precision, k_printf_max_fraction_digits);
  const text = value.toFixed(digits);
  return precision > digits ? text + "0".repeat(precision - digits) : text;
}

function printf_exponent(
  value: number,
  precision: number,
  exponent_digits: number,
  upper: boolean
): string {
  const digits = Math.min(precision, k_printf_max_fraction_digits);
  const text = value.toExponential(digits);
  const match = k_printf_exponent_regex.exec(text);
  if (!match) {
    return text;
  }
  let mantissa = text.slice(0, match.index);
  if (precision > digits) {
    mantissa += "0".repeat(precision - digits);
  }
  const exponent = match[2].padStart(exponent_digits, "0");
  return `${mantissa}${upper ? "E" : "e"}${match[1]}${exponent}`;
}

function printf_exponent_of(value: number, precision: number): number {
  const text = value.toExponential(
    Math.min(precision, k_printf_max_fraction_digits)
  );
  const match = k_printf_exponent_regex.exec(text);
  return match ? Number.parseInt(`${match[1]}${match[2]}`, 10) : 0;
}

function printf_strip_mantissa_zeros(text: string): string {
  const letter_index = text.search(k_printf_exponent_letter_regex);
  const mantissa = text.slice(0, letter_index);
  if (!mantissa.includes(".")) {
    return text;
  }
  return (
    mantissa.replace(k_printf_trailing_fraction_zeros_regex, "") +
    text.slice(letter_index)
  );
}

function printf_format_float(
  conversion: string,
  argument: t_printf_argument,
  field: s_printf_field,
  options: Required<s_printf_options>
): string {
  const { flags, width, precision, left_justify } = field;
  const value = printf_to_number(argument);
  const upper = conversion === "E" || conversion === "G" || conversion === "F";
  const alternate = flags.includes("#");
  const negative = value < 0 || Object.is(value, -0);

  if (!Number.isFinite(value)) {
    // Old MSVC CRTs print 1.#INF00 / 1.#IND00 here; we print the C99 spelling.
    let text = Number.isNaN(value) ? "nan" : "inf";
    if (upper) {
      text = text.toUpperCase();
    }
    const prefix = Number.isNaN(value)
      ? ""
      : printf_sign_prefix(negative, flags);
    return printf_pad_field(prefix, text, width, left_justify, false);
  }

  const magnitude = Math.abs(value);
  let body: string;
  switch (conversion) {
    case "f":
    case "F": {
      body = printf_fixed(magnitude, precision ?? 6);
      if (alternate && precision === 0) {
        body += ".";
      }
      break;
    }
    case "e":
    case "E": {
      body = printf_exponent(
        magnitude,
        precision ?? 6,
        options.exponent_digits,
        upper
      );
      if (alternate && precision === 0) {
        body = body.replace(
          k_printf_exponent_letter_regex,
          (letter) => `.${letter}`
        );
      }
      break;
    }
    default: {
      let significant = precision ?? 6;
      if (significant === 0) {
        significant = 1;
      }
      // The exponent has to come from the rounded value, so 9.9999995 at P=6 becomes 1e+001.
      const exponent = printf_exponent_of(magnitude, significant - 1);
      if (exponent < -4 || exponent >= significant) {
        body = printf_exponent(
          magnitude,
          significant - 1,
          options.exponent_digits,
          upper
        );
        if (!alternate) {
          body = printf_strip_mantissa_zeros(body);
        } else if (significant === 1) {
          body = body.replace(
            k_printf_exponent_letter_regex,
            (letter) => `.${letter}`
          );
        }
      } else {
        body = printf_fixed(magnitude, significant - 1 - exponent);
        if (!alternate) {
          if (body.includes(".")) {
            body = body.replace(k_printf_trailing_fraction_zeros_regex, "");
          }
        } else if (!body.includes(".")) {
          body += ".";
        }
      }
      break;
    }
  }

  const zero_pad = flags.includes("0");
  return printf_pad_field(
    printf_sign_prefix(negative, flags),
    body,
    width,
    left_justify,
    zero_pad
  );
}

function printf_format_character(argument: t_printf_argument): string {
  if (typeof argument === "string") {
    return argument.slice(0, 1);
  }
  if (argument === null || argument === undefined) {
    return "";
  }
  return String.fromCharCode(printf_to_number(argument));
}

function printf_format_pointer(
  argument: t_printf_argument,
  options: Required<s_printf_options>
): string {
  const bits = options.pointer_digits * 4;
  return BigInt.asUintN(bits, printf_to_bigint(argument))
    .toString(16)
    .toUpperCase()
    .padStart(options.pointer_digits, "0");
}

function printf_format_one(
  specifier: s_printf_specifier,
  field: s_printf_field,
  argument: t_printf_argument,
  options: Required<s_printf_options>
): string {
  const { conversion, length } = specifier;
  switch (conversion) {
    case "d":
    case "i":
    case "u":
    case "o":
    case "x":
    case "X":
      return printf_format_integer(
        conversion,
        length,
        argument,
        field,
        options
      );
    case "e":
    case "E":
    case "f":
    case "F":
    case "g":
    case "G":
      return printf_format_float(conversion, argument, field, options);
    case "c":
    case "C":
      return printf_pad_field(
        "",
        printf_format_character(argument),
        field.width,
        field.left_justify,
        false
      );
    case "s":
    case "S": {
      let text =
        argument === null || argument === undefined
          ? "(null)"
          : String(argument);
      if (field.precision !== undefined) {
        text = text.slice(0, field.precision);
      }
      return printf_pad_field("", text, field.width, field.left_justify, false);
    }
    case "p":
      return printf_pad_field(
        "",
        printf_format_pointer(argument, options),
        field.width,
        field.left_justify,
        false
      );
    default:
      // %n consumes its argument and prints nothing.
      return "";
  }
}

// Unbounded printf.
export function cs_printf(
  format: string,
  args: readonly t_printf_argument[],
  options?: s_printf_options
): string {
  const resolved: Required<s_printf_options> = {
    exponent_digits: options?.exponent_digits ?? 3,
    pointer_digits: options?.pointer_digits ?? 8,
  };
  let result = "";
  let cursor = 0;
  let argument_index = 0;

  for (const specifier of printf_parse_specifiers(format)) {
    result += format.slice(cursor, specifier.start);
    cursor = specifier.end;

    if (specifier.conversion === "%") {
      result += "%";
      continue;
    }

    const required =
      1 +
      (specifier.width === "*" ? 1 : 0) +
      (specifier.precision === "*" ? 1 : 0);
    if (argument_index + required > args.length) {
      // Out of arguments: leave the specifier as written.
      result += format.slice(specifier.start, specifier.end);
      continue;
    }

    let left_justify = specifier.flags.includes("-");
    let width = 0;
    if (specifier.width === "*") {
      const star = printf_to_int32(args[argument_index++]);
      if (star < 0) {
        left_justify = true;
      }
      width = Math.abs(star);
    } else if (specifier.width !== undefined) {
      width = specifier.width;
    }

    let precision: number | undefined;
    if (specifier.precision === "*") {
      const star = printf_to_int32(args[argument_index++]);
      precision = star < 0 ? undefined : star;
    } else {
      precision = specifier.precision;
    }

    const field: s_printf_field = {
      flags: specifier.flags,
      width: printf_clamp_field(width),
      precision:
        precision === undefined ? undefined : printf_clamp_field(precision),
      left_justify,
    };
    result += printf_format_one(
      specifier,
      field,
      args[argument_index++],
      resolved
    );
  }

  return result + format.slice(cursor);
}

// Result is cut to size - 1 UTF-16 units, the room a NUL-terminated buffer of `size` leaves for text.
export function csnzprintf(
  size: number,
  format: string,
  args: readonly t_printf_argument[],
  options?: s_printf_options
): string {
  if (size <= 1) {
    return "";
  }
  const text = cs_printf(format, args, options);
  return text.length < size ? text : text.slice(0, size - 1);
}
