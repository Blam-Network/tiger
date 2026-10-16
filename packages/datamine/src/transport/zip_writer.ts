import { unzipSync, zip } from "fflate";
import { DatamineError } from "../datamine_error.ts";

// Bungie compresses datamine uploads at k_zlib_compression_good.
const k_zip_default_level = 3;

// Bungie's writer leaves the timestamp zeroed; this is the earliest date a zip can hold.
const k_zip_entry_date = new Date(1980, 0, 1);

export function zip_create_single_entry(
  name: string,
  data: Uint8Array,
  options?: { level?: number }
): Promise<Buffer> {
  const level = (options?.level ?? k_zip_default_level) as
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9;
  return new Promise((resolve, reject) => {
    zip(
      { [name]: [data, { level, mtime: k_zip_entry_date }] },
      (error, result) => {
        if (error) {
          reject(new DatamineError(`zip failed: ${error.message}`));
          return;
        }
        resolve(Buffer.from(result.buffer, result.byteOffset, result.length));
      }
    );
  });
}

export function zip_read_single_entry(buffer: Uint8Array): {
  name: string;
  data: Buffer;
} {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(buffer);
  } catch (error) {
    throw new DatamineError(`zip is unreadable: ${(error as Error).message}`);
  }
  const names = Object.keys(entries);
  if (names.length !== 1) {
    throw new DatamineError(
      `zip holds ${names.length} entries, expected exactly one`
    );
  }
  const [name] = names as [string];
  const data = entries[name] as Uint8Array;
  return {
    name,
    data: Buffer.from(data.buffer, data.byteOffset, data.length),
  };
}
