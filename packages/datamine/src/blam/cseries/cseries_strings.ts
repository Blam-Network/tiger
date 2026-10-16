export type t_text_encoding = "utf8" | "latin1";

const k_ascii_upper_regex = /[A-Z]/g;
const k_ascii_case_offset = "a".charCodeAt(0) - "A".charCodeAt(0);

// A UTF-8 continuation byte is 10xxxxxx.
const k_utf8_continuation_mask = 0xc0;
const k_utf8_continuation_bits = 0x80;

// Bungie's fixed char[N] fields always keep a NUL terminator, so only N - 1 bytes of text fit.
// Returns exactly `size` bytes, NUL padded.
export function csstrnzcpy_bytes(
  value: string,
  size: number,
  encoding: t_text_encoding = "utf8"
): Buffer {
  const result = Buffer.alloc(Math.max(size, 0));
  if (size <= 0) {
    return result;
  }

  const encoded = Buffer.from(value, encoding);
  // strcpy semantics: an embedded NUL ends the string.
  const nul_index = encoded.indexOf(0);
  let length = nul_index < 0 ? encoded.length : nul_index;

  if (length > size - 1) {
    length = size - 1;
    if (encoding === "utf8") {
      // Back up to the lead byte so the cut never splits a multi-byte sequence.
      while (
        length > 0 &&
        (encoded[length] & k_utf8_continuation_mask) ===
          k_utf8_continuation_bits
      ) {
        length--;
      }
    }
  }

  encoded.copy(result, 0, 0, length);
  return result;
}

// Reads a fixed char[N] field back: everything up to the first NUL.
export function string_from_fixed_bytes(
  bytes: Uint8Array,
  encoding: t_text_encoding = "utf8"
): string {
  let length = bytes.indexOf(0);
  if (length < 0) {
    length = bytes.length;
  }
  return Buffer.from(bytes.buffer, bytes.byteOffset, length).toString(encoding);
}

// csstrnzcpy into a char[size] and straight back: the text that fits, as a string.
export function csstrnzcpy(value: string, size: number): string {
  return string_from_fixed_bytes(csstrnzcpy_bytes(value, size));
}

// Locale independent, unlike toLowerCase.
export function ascii_strnlwr(value: string): string {
  return value.replace(k_ascii_upper_regex, (letter) =>
    String.fromCharCode(letter.charCodeAt(0) + k_ascii_case_offset)
  );
}
