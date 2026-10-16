import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DatamineError } from "../../src/datamine_error.ts";
import {
  zip_create_single_entry,
  zip_read_single_entry,
} from "../../src/transport/zip_writer.ts";

describe("zip_create_single_entry", () => {
  const data = Buffer.from("datamine ".repeat(500));

  it("writes one deflated entry", async () => {
    const zip = await zip_create_single_entry("compressed.dat", data);
    expect(zip.readUInt32LE(0)).toBe(0x04_03_4b_50);
    expect(zip.readUInt16LE(8)).toBe(8);
    expect(zip.length).toBeLessThan(data.length);
  });

  it("round trips through zip_read_single_entry", async () => {
    const zip = await zip_create_single_entry("compressed.dat", data);
    const entry = zip_read_single_entry(zip);
    expect(entry.name).toBe("compressed.dat");
    expect(entry.data.equals(data)).toBe(true);
  });

  it("handles empty data", async () => {
    const zip = await zip_create_single_entry("empty", new Uint8Array(0));
    expect(zip_read_single_entry(zip).data).toHaveLength(0);
  });
});

describe("zip_read_single_entry", () => {
  it("rejects garbage", () => {
    expect(() => zip_read_single_entry(Buffer.alloc(64))).toThrow(
      DatamineError
    );
  });

  it("reads a view into a larger buffer", async () => {
    const payload = Buffer.from("view ".repeat(30));
    const zip = await zip_create_single_entry("v", payload);
    const padded = Buffer.concat([Buffer.from([1, 2, 3]), zip]);
    expect(zip_read_single_entry(padded.subarray(3)).data.equals(payload)).toBe(
      true
    );
  });
});

const halo_data_dir = process.env.TIGER_HALO_DATA_DIR;

describe.skipIf(!halo_data_dir)("upload_temp.zip golden", () => {
  it("reads a Bungie-written upload and round trips its entry", async () => {
    const golden = readFileSync(
      join(halo_data_dir as string, "upload_temp.zip")
    );
    const entry = zip_read_single_entry(golden);
    expect(entry.name).toBe("compressed.dat");
    expect(entry.data.length).toBeGreaterThan(0);

    const rebuilt = zip_read_single_entry(
      await zip_create_single_entry(entry.name, entry.data)
    );
    expect(rebuilt.data.equals(entry.data)).toBe(true);
  });
});
