// The pre-2015 MSVC CRT's %g, as hks's hkss_stringPrint uses it: half-up
// rounding on the exact decimal, three-digit exponents, 1.#INF/1.#QNAN/-1.#IND.

const DOUBLE_VIEW = new DataView(new ArrayBuffer(8));
const MANTISSA_BITS = 52n;
const MANTISSA_MASK = (1n << MANTISSA_BITS) - 1n;
const IMPLICIT_BIT = 1n << MANTISSA_BITS;
const EXPONENT_BIAS = 1075;
const SUBNORMAL_EXPONENT = -1074;
const DIGIT_FIVE = 53;
const MSVC_EXPONENT_DIGITS = 3;
const TRAILING_ZEROS = /0+$/;

interface ExactDecimal {
  // significant digits, no leading zeros
  digits: string;
  // decimal exponent of the first digit (1234.5 -> 3, 0.05 -> -2)
  exponent: number;
}

function signBit(value: number): boolean {
  DOUBLE_VIEW.setFloat64(0, value);
  return (DOUBLE_VIEW.getUint8(0) & 0x80) !== 0;
}

// |value| as an exact decimal digit string, for a finite, non-zero value.
function exactDecimal(value: number): ExactDecimal {
  DOUBLE_VIEW.setFloat64(0, Math.abs(value));
  const bits = DOUBLE_VIEW.getBigUint64(0);
  const biased = Number((bits >> MANTISSA_BITS) & 0x7ffn);
  let mantissa = bits & MANTISSA_MASK;
  let exponent = SUBNORMAL_EXPONENT;
  if (biased !== 0) {
    mantissa |= IMPLICIT_BIT;
    exponent = biased - EXPONENT_BIAS;
  }
  while ((mantissa & 1n) === 0n) {
    mantissa >>= 1n;
    exponent += 1;
  }
  // mantissa * 2^exponent; for a negative exponent, scale by 5^-e so the
  // integer digits are the value shifted -e decimal places
  if (exponent >= 0) {
    const digits = (mantissa << BigInt(exponent)).toString();
    return { digits, exponent: digits.length - 1 };
  }
  const digits = (mantissa * 5n ** BigInt(-exponent)).toString();
  return { digits, exponent: digits.length + exponent - 1 };
}

// Rounds the digit string to `precision` significant digits, half-up on the
// digit string (what the CRT's _fptostr does), carrying into the exponent.
function roundDigits(decimal: ExactDecimal, precision: number): ExactDecimal {
  let { digits, exponent } = decimal;
  if (digits.length <= precision) {
    return { digits: digits.padEnd(precision, "0"), exponent };
  }
  const roundUp = digits.charCodeAt(precision) >= DIGIT_FIVE;
  digits = digits.slice(0, precision);
  if (roundUp) {
    digits = (BigInt(digits) + 1n).toString();
    if (digits.length > precision) {
      digits = digits.slice(0, precision);
      exponent += 1;
    }
  }
  return { digits, exponent };
}

function stripFraction(integer: string, fraction: string): string {
  const trimmed = fraction.replace(TRAILING_ZEROS, "");
  return trimmed === "" ? integer : `${integer}.${trimmed}`;
}

function nonFinite(value: number): string {
  if (Number.isNaN(value)) {
    return signBit(value) ? "-1.#IND" : "1.#QNAN";
  }
  return value > 0 ? "1.#INF" : "-1.#INF";
}

export function formatG(value: number, precision: number): string {
  if (!Number.isFinite(value)) {
    return nonFinite(value);
  }
  const p = Math.max(precision, 1);
  const sign = signBit(value) ? "-" : "";
  if (value === 0) {
    return `${sign}0`;
  }
  const { digits, exponent } = roundDigits(exactDecimal(value), p);
  if (exponent < -4 || exponent >= p) {
    const mantissa = stripFraction(digits[0], digits.slice(1));
    const magnitude = Math.abs(exponent)
      .toString()
      .padStart(MSVC_EXPONENT_DIGITS, "0");
    return `${sign}${mantissa}e${exponent < 0 ? "-" : "+"}${magnitude}`;
  }
  if (exponent < 0) {
    return `${sign}${stripFraction("0", "0".repeat(-exponent - 1) + digits)}`;
  }
  return `${sign}${stripFraction(digits.slice(0, exponent + 1), digits.slice(exponent + 1))}`;
}

// hks's number-to-string conversion (hks_obj_tolstring, hksL_tostring,
// concatenateStrings): "%0.8g" of the float32 widened to double.
export function formatLuaNumber(value: number): string {
  return formatG(value, 8);
}
