import { closeSync, fstatSync, openSync, readSync } from "node:fs";

export interface byte_source {
  close(): void;
  read(offset: number, length: number): Buffer;
  readonly size: number;
}

export function file_source(path: string): byte_source {
  const fd = openSync(path, "r");
  const size = fstatSync(fd).size;
  return {
    size,
    read(offset, length) {
      const out = Buffer.alloc(length);
      let done = 0;
      while (done < length) {
        const n = readSync(fd, out, done, length - done, offset + done);
        if (n === 0) {
          throw new Error(`${path}: read past end at ${offset + done}`);
        }
        done += n;
      }
      return out;
    },
    close() {
      closeSync(fd);
    },
  };
}

export function memory_source(bytes: Buffer): byte_source {
  return {
    size: bytes.byteLength,
    read(offset, length) {
      if (offset + length > bytes.byteLength) {
        throw new Error(`read past end at ${offset + length}`);
      }
      return bytes.subarray(offset, offset + length);
    },
    close() {
      // nothing to release
    },
  };
}
