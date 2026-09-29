import { describe, expect, it } from "vitest";
import { read_block_header } from "./block_header.ts";
import { PoodleError } from "./poodle_error.ts";

const read = (...bytes: number[]) =>
  read_block_header(Uint8Array.from(bytes), 0);

describe("read_block_header", () => {
  it("reads the alpha's header", () => {
    expect(read(0x32)).toEqual({
      codec: 7,
      variant: 0,
      uncompressed: false,
      restart: false,
      checksums: false,
      size: 1,
    });
  });

  it("reads the flags of the one-byte layouts", () => {
    expect(read(0x3a)).toMatchObject({ codec: 7, checksums: true });
    expect(read(0x36)).toMatchObject({ codec: 7, restart: true });
    expect(read(0x02)).toMatchObject({ codec: 7, uncompressed: true });
    expect(read(0x42)).toMatchObject({ codec: 7, variant: 1 });
    expect(read(0x05)).toMatchObject({ codec: 7, variant: 1 });
    expect(read(0x11)).toMatchObject({ codec: 0 });
    expect(read(0x15)).toMatchObject({ codec: 1 });
  });

  it("reads the two-byte layout", () => {
    expect(read(0x8c, 0x07)).toMatchObject({
      codec: 7,
      restart: true,
      size: 2,
    });
    expect(read(0x4c, 0x88)).toMatchObject({
      codec: 7,
      variant: 1,
      uncompressed: true,
      checksums: true,
    });
    expect(read(0x0c, 0x06)).toMatchObject({ codec: 6 });
  });

  it("rejects headers no codec uses", () => {
    expect(() => read(0x22)).toThrow(PoodleError);
    expect(() => read(0x1c, 0x07)).toThrow(PoodleError);
    expect(() => read(0x0c, 0x0c)).toThrow(PoodleError);
    expect(() => read(0x0c)).toThrow(PoodleError);
  });
});
