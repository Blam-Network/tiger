import { describe, expect, it } from "vitest";
import {
  cs_printf,
  csnzprintf,
  printf_parse_specifiers,
} from "../../../src/blam/cseries/cseries_printf.ts";

const f = (format: string, ...args: Parameters<typeof cs_printf>[1]) =>
  cs_printf(format, args);

describe("printf_parse_specifiers", () => {
  it("tokenizes flags, width, precision and length", () => {
    const [specifier] = printf_parse_specifiers("x %-08.3lld y");
    expect(specifier).toEqual({
      start: 2,
      end: 11,
      flags: "-0",
      width: 8,
      precision: 3,
      length: "ll",
      conversion: "d",
    });
  });

  it("reports star fields and a bare precision dot", () => {
    const specifiers = printf_parse_specifiers("%*.*s %.f %%");
    expect(specifiers.map((s) => [s.width, s.precision, s.conversion])).toEqual(
      [
        ["*", "*", "s"],
        [undefined, 0, "f"],
        [undefined, undefined, "%"],
      ]
    );
  });

  it("skips unknown conversions", () => {
    expect(printf_parse_specifiers("%y %k")).toEqual([]);
  });
});

describe("cs_printf integers", () => {
  it("wraps %d to 32 bits", () => {
    expect(f("%d", 2_147_483_648)).toBe("-2147483648");
    expect(f("%d", 0x1_00_00_00_05)).toBe("5");
    expect(f("%d", 2n ** 32n + 7n)).toBe("7");
  });

  it("wraps %u and %x to unsigned 32 bits", () => {
    expect(f("%u", -1)).toBe("4294967295");
    expect(f("%x", -1)).toBe("ffffffff");
    expect(f("%X", 0xde_ad_be_ef)).toBe("DEADBEEF");
    expect(f("%o", 8)).toBe("10");
  });

  it("narrows with h and hh", () => {
    expect(f("%hhd", 300)).toBe("44");
    expect(f("%hd", 70_000)).toBe("4464");
    expect(f("%hu", -1)).toBe("65535");
    expect(f("%hhu", -1)).toBe("255");
  });

  it("goes 64 bit through bigint", () => {
    expect(f("%I64d", 2n ** 63n)).toBe("-9223372036854775808");
    expect(f("%lld", 123_456_789_012n)).toBe("123456789012");
    expect(f("%llu", -1n)).toBe("18446744073709551615");
    expect(f("%llx", -1n)).toBe("ffffffffffffffff");
    expect(f("%I32d", 2n ** 32n + 1n)).toBe("1");
  });

  it("coerces booleans and strings", () => {
    expect(f("%d%d", true, false)).toBe("10");
    expect(f("%d", "12")).toBe("12");
    expect(f("%d", "abc")).toBe("0");
    expect(f("%d", null)).toBe("0");
  });

  it("applies width, precision and flags", () => {
    expect(f("%08X", 0xbe_ef)).toBe("0000BEEF");
    expect(f("%05d", -42)).toBe("-0042");
    expect(f("%-5d|", 42)).toBe("42   |");
    expect(f("%5d", 42)).toBe("   42");
    expect(f("%+d", 5)).toBe("+5");
    expect(f("% d", 5)).toBe(" 5");
    expect(f("%.3d", 5)).toBe("005");
    expect(f("%.0d", 0)).toBe("");
    expect(f("%08.3d", 5)).toBe("     005");
    expect(f("%-08d|", 5)).toBe("5       |");
    expect(f("%#x", 255)).toBe("0xff");
    expect(f("%#X", 255)).toBe("0XFF");
    expect(f("%#x", 0)).toBe("0");
    expect(f("%#o", 8)).toBe("010");
    expect(f("%#010x", 255)).toBe("0x000000ff");
  });

  it("takes width and precision from arguments", () => {
    expect(f("%*d", 5, 42)).toBe("   42");
    expect(f("%*d", -5, 42)).toBe("42   ");
    expect(f("%.*d", 4, 7)).toBe("0007");
    expect(f("%.*s", 3, "abcdef")).toBe("abc");
    expect(f("%.*s", -1, "abcdef")).toBe("abcdef");
  });
});

describe("cs_printf floats", () => {
  it("prints %f with default precision 6", () => {
    expect(f("%f", 7.123_45)).toBe("7.123450");
    expect(f("%.2f", 2.675)).toBe("2.67");
    expect(f("%.0f", 2.5)).toBe("3");
    expect(f("%5.1f", 7.123_45)).toBe("  7.1");
    expect(f("%010.3f", -7.123_45)).toBe("-00007.123");
    expect(f("%+.1f", 1)).toBe("+1.0");
    expect(f("%f", -0)).toBe("-0.000000");
    expect(f("%#.0f", 3)).toBe("3.");
  });

  it("builds huge values through BigInt", () => {
    expect(f("%f", 1e21)).toBe("1000000000000000000000.000000");
    expect(f("%.1f", 1e30)).toBe("1000000000000000019884624838656.0");
    expect(f("%.0f", 1e22)).toBe("10000000000000000000000");
  });

  it("pads precision past toFixed's limit", () => {
    expect(f("%.102f", 1)).toBe(`1.${"0".repeat(102)}`);
  });

  it("uses three exponent digits by default", () => {
    expect(f("%e", 12_345.678)).toBe("1.234568e+004");
    expect(f("%E", 0.000_123)).toBe("1.230000E-004");
    expect(f("%e", 0)).toBe("0.000000e+000");
    expect(f("%.0e", 5)).toBe("5e+000");
    expect(f("%#.0e", 5)).toBe("5.e+000");
  });

  it("supports two exponent digits", () => {
    expect(cs_printf("%e", [12_345.678], { exponent_digits: 2 })).toBe(
      "1.234568e+04"
    );
    expect(cs_printf("%g", [1e-5], { exponent_digits: 2 })).toBe("1e-05");
    expect(cs_printf("%e", [1e100], { exponent_digits: 2 })).toBe(
      "1.000000e+100"
    );
  });

  it("follows the %g rule", () => {
    expect(f("%g", 100_000)).toBe("100000");
    expect(f("%g", 1_000_000)).toBe("1e+006");
    expect(f("%g", 0.0001)).toBe("0.0001");
    expect(f("%g", 0.000_01)).toBe("1e-005");
    expect(f("%g", 123_456_789)).toBe("1.23457e+008");
    expect(f("%g", 0.5)).toBe("0.5");
    expect(f("%g", 0)).toBe("0");
    expect(f("%g", 1.5e10)).toBe("1.5e+010");
    expect(f("%.3g", 1234.5678)).toBe("1.23e+003");
    expect(f("%.10g", 1234.5678)).toBe("1234.5678");
    expect(f("%G", 1e-10)).toBe("1E-010");
    expect(f("%#g", 1.5)).toBe("1.50000");
    expect(f("%#g", 100)).toBe("100.000");
  });

  it("prints infinity and nan in lowercase C99 form", () => {
    expect(f("%f", Number.POSITIVE_INFINITY)).toBe("inf");
    expect(f("%f", Number.NEGATIVE_INFINITY)).toBe("-inf");
    expect(f("%f", Number.NaN)).toBe("nan");
    expect(f("%E", Number.POSITIVE_INFINITY)).toBe("INF");
    expect(f("%06f", Number.POSITIVE_INFINITY)).toBe("   inf");
  });
});

describe("cs_printf text and pointers", () => {
  it("formats strings", () => {
    expect(f("%s", "abc")).toBe("abc");
    expect(f("%-8s|", "ab")).toBe("ab      |");
    expect(f("%8s|", "ab")).toBe("      ab|");
    expect(f("%.3s", "abcdef")).toBe("abc");
    expect(f("%s", null)).toBe("(null)");
    expect(f("%s", undefined)).toBe("(null)");
    expect(f("%s", 12)).toBe("12");
  });

  it("formats characters", () => {
    expect(f("%c", 65)).toBe("A");
    expect(f("%c", "xyz")).toBe("x");
    expect(f("%3c|", "x")).toBe("  x|");
    expect(f("%C", 66)).toBe("B");
  });

  it("formats pointers", () => {
    expect(f("%p", 0x12_34)).toBe("00001234");
    expect(cs_printf("%p", [0x12_34], { pointer_digits: 16 })).toBe(
      "0000000000001234"
    );
    expect(f("%p", 0xab_cd_ef)).toBe("00ABCDEF");
  });

  it("consumes %n without printing", () => {
    expect(f("a%nb%d", 0, 7)).toBe("ab7");
  });

  it("prints %% and leaves unknown text alone", () => {
    expect(f("100%%")).toBe("100%");
    expect(f("%y %d", 3)).toBe("%y 3");
  });

  it("leaves a specifier unchanged when arguments run out", () => {
    expect(f("%d %d", 1)).toBe("1 %d");
    expect(f("%*d", 5)).toBe("%*d");
  });
});

describe("csnzprintf", () => {
  it("keeps room for the terminating NUL", () => {
    expect(csnzprintf(5, "abcdefgh", [])).toBe("abcd");
    expect(csnzprintf(9, "abcdefgh", [])).toBe("abcdefgh");
    expect(csnzprintf(8, "abcdefgh", [])).toBe("abcdefg");
    expect(csnzprintf(1, "abc", [])).toBe("");
    expect(csnzprintf(0, "abc", [])).toBe("");
  });

  it("truncates after formatting", () => {
    expect(csnzprintf(6, "%d-%s", [12_345, "xyz"])).toBe("12345");
  });

  it("allows an infinite size", () => {
    expect(
      csnzprintf(Number.POSITIVE_INFINITY, "%s", ["x".repeat(5000)])
    ).toHaveLength(5000);
  });

  it("formats a Destiny log line", () => {
    expect(
      csnzprintf(2048, "%s g%08d %08X %-8s %s", [
        "09/29/2026 16:37:50.317",
        42,
        0x1a_2b,
        "warning",
        "text",
      ])
    ).toBe("09/29/2026 16:37:50.317 g00000042 00001A2B warning  text");
  });
});
