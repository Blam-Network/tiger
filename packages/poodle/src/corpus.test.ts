import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import digests from "../test/corpus_digests.json" with { type: "json" };
import { decompress } from "./index.ts";

// The alpha's packages aren't redistributable, so this only runs locally.
// Each package's decoded blocks must hash to the digests recorded when every
// block was first checked byte for byte.
const packages_dir = process.env.TIGER_PACKAGES_DIR;

const k_block_size = 0x4_0000;
const k_block_flag_compressed = 1;

function* compressed_blocks(data: Buffer) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint32(0x11c);
  const table = view.getUint32(0x120);
  for (let i = 0; i < count; i++) {
    const entry = table + i * 32;
    if (view.getUint16(entry + 8) & k_block_flag_compressed) {
      const offset = view.getUint32(entry);
      yield data.subarray(offset, offset + view.getUint32(entry + 4));
    }
  }
}

describe.skipIf(!packages_dir)("the alpha's packages", () => {
  it("decode to the recorded output", () => {
    const expected: Record<string, string> = digests;
    const actual: Record<string, string> = {};
    let bytes = 0;
    let time = 0;
    for (const name of readdirSync(packages_dir as string)
      .filter((n) => n.endsWith(".pkg"))
      .sort()) {
      const hash = createHash("sha256");
      let blocks = 0;
      for (const block of compressed_blocks(
        readFileSync(join(packages_dir as string, name))
      )) {
        const start = performance.now();
        const raw = decompress(block, k_block_size);
        time += performance.now() - start;
        bytes += raw.length;
        hash.update(raw);
        blocks++;
      }
      if (blocks > 0) {
        actual[name] = hash.digest("hex");
      }
    }
    process.stdout.write(
      `poodle corpus: ${Object.keys(actual).length} packages, ${(bytes / 1e6 / (time / 1000)).toFixed(0)} MB/s\n`
    );
    expect(actual).toEqual(expected);
  }, 600_000);
});
