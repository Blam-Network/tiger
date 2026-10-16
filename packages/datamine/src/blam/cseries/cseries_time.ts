export interface s_clock {
  milliseconds(): number;
  now(): Date;
}

// milliseconds() is monotonic, for game-time style counters; now() is wall clock.
export const k_system_clock: s_clock = {
  now: () => new Date(),
  milliseconds: () => performance.now(),
};

// FILETIME counts 100 ns ticks since 1601-01-01 UTC.
const k_filetime_epoch_offset_milliseconds = 11_644_473_600_000n;
const k_filetime_ticks_per_millisecond = 10_000n;

export function filetime_from_date(date: Date): bigint {
  return (
    (BigInt(date.getTime()) + k_filetime_epoch_offset_milliseconds) *
    k_filetime_ticks_per_millisecond
  );
}

export function date_from_filetime(filetime: bigint): Date {
  return new Date(
    Number(
      filetime / k_filetime_ticks_per_millisecond -
        k_filetime_epoch_offset_milliseconds
    )
  );
}

// short: MM.DD.YY, long: MM/DD/YYYY.
export type t_date_style = "short" | "long";

export const k_weekday_abbreviations = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

interface s_date_fields {
  day: number;
  hour: number;
  millisecond: number;
  minute: number;
  month: number;
  second: number;
  year: number;
}

function date_fields(date: Date, utc: boolean): s_date_fields {
  if (utc) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds(),
      millisecond: date.getUTCMilliseconds(),
    };
  }
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
  };
}

export function two_digits(value: number): string {
  return String(value).padStart(2, "0");
}

// short: "%02d.%02d.%02d %02d:%02d:%02d.%03d" (MM.DD.YY), as system_get_date_and_time.
// long: "%02d/%02d/%04d %02d:%02d:%02d.%03d" (MM/DD/YYYY), as Destiny's report lines.
export function system_get_date_and_time(
  date: Date,
  style: t_date_style,
  utc = false
): string {
  const f = date_fields(date, utc);
  const time = `${two_digits(f.hour)}:${two_digits(f.minute)}:${two_digits(f.second)}.${String(f.millisecond).padStart(3, "0")}`;
  if (style === "short") {
    return `${two_digits(f.month)}.${two_digits(f.day)}.${two_digits(f.year % 100)} ${time}`;
  }
  return `${two_digits(f.month)}/${two_digits(f.day)}/${String(f.year).padStart(4, "0")} ${time}`;
}

// Report folder name: %04d%02d%02d_%02d%02d%02d.
export function report_timestamp_build(date: Date, utc = false): string {
  const f = date_fields(date, utc);
  return `${String(f.year).padStart(4, "0")}${two_digits(f.month)}${two_digits(f.day)}_${two_digits(f.hour)}${two_digits(f.minute)}${two_digits(f.second)}`;
}
