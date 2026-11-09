// Text to bytes and back for the code that also runs in browsers, matching Node's Buffer
// byte for byte.
import type { t_text_encoding } from "../blam/cseries/cseries_strings.ts";

// String.fromCharCode takes its arguments on the stack, so latin1 decodes in slices.
const k_latin1_decode_chunk_size = 8192;

let g_utf8_encoder: InstanceType<typeof TextEncoder> | undefined;
let g_utf8_decoder: InstanceType<typeof TextDecoder> | undefined;

// Buffer.from(text, encoding): utf8 writes a lone surrogate as U+FFFD, latin1 keeps the low byte
// of each UTF-16 code unit.
export function text_encode(
  text: string,
  encoding: t_text_encoding
): Uint8Array {
  if (encoding === "utf8") {
    g_utf8_encoder ??= new TextEncoder();
    return g_utf8_encoder.encode(text);
  }
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index++) {
    bytes[index] = text.charCodeAt(index) & 0xff;
  }
  return bytes;
}

// buffer.toString(encoding): bad utf8 becomes U+FFFD and a leading byte order mark is kept.
export function text_decode(
  bytes: Uint8Array,
  encoding: t_text_encoding
): string {
  if (encoding === "utf8") {
    g_utf8_decoder ??= new TextDecoder("utf-8", { ignoreBOM: true });
    return g_utf8_decoder.decode(bytes);
  }
  let text = "";
  for (
    let start = 0;
    start < bytes.length;
    start += k_latin1_decode_chunk_size
  ) {
    text += String.fromCharCode(
      ...bytes.subarray(start, start + k_latin1_decode_chunk_size)
    );
  }
  return text;
}
