// The encoders hand out plain Uint8Arrays; tests read them back with Buffer's helpers.
export function buffer_of(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length);
}
