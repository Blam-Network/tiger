import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { c } from "@craftycodie/cstruct";
import { afterAll, describe, expect, it } from "vitest";
import {
  e_package_language,
  k_package_header_size,
  k_package_version,
  s_package_header,
} from "./package_header.ts";
import { c_package_set } from "./package_set.ts";

const k_empty_hash = Array.from({ length: 20 }, () => 0);

// A header and nothing else: no entries, blocks or named tags.
function empty_package(pkg_id: number, patch: number, language: number) {
  return c.write(
    s_package_header,
    {
      version: k_package_version,
      platform: 3,
      pkg_id,
      unknown06: 1,
      unknown08: 0n,
      build_time: 0n,
      unknown18: 0,
      unknown1c: 0,
      patch,
      language,
      tool_string: "",
      unknowna4: 0,
      unknowna8: 0,
      unknownac: 0,
      header_signature_offset: 0,
      entry_table_size: 0,
      entry_table_offset: k_package_header_size,
      entry_table_hash: k_empty_hash,
      block_table_size: 0,
      block_table_offset: k_package_header_size,
      block_table_hash: k_empty_hash,
      named_tag_table_size: 0,
      named_tag_table_offset: k_package_header_size,
      named_tag_table_hash: k_empty_hash,
      file_size: k_package_header_size,
    } as s_package_header,
    "big"
  );
}

describe("c_package_set", () => {
  const dir = mkdtempSync(join(tmpdir(), "gibbon-day0-"));
  const files: [string, number, number, number][] = [
    ["360_globals_0151_0.pkg", 0x151, 0, e_package_language.none],
    ["360_globals_0151_1.pkg", 0x151, 1, e_package_language.none],
    ["360_cinematic_0204_en_0.pkg", 0x204, 0, e_package_language.english],
    ["360_cinematic_0204_fr_0.pkg", 0x204, 0, e_package_language.french],
    ["360_cinematic_0204_fr_1.pkg", 0x204, 1, e_package_language.french],
    ["360_cinematic_0205_jpn_0.pkg", 0x205, 0, e_package_language.japanese],
  ];
  for (const [name, pkg_id, patch, language] of files) {
    writeFileSync(join(dir, name), empty_package(pkg_id, patch, language));
  }
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("keeps each id's highest patch", () => {
    const set = c_package_set.open_directory(dir);
    expect(set.package_info(0x151)?.patch).toBe(1);
    expect(set.package(0x151)?.patch).toBe(1);
  });

  it("picks the wanted language, falling back to English", () => {
    const english = c_package_set.open_directory(dir);
    expect(english.package_ids).toEqual([0x151, 0x204]);
    expect(english.package_info(0x204)?.language).toBe(
      e_package_language.english
    );
    const french = c_package_set.open_directory(dir, {
      language: e_package_language.french,
    });
    expect(french.package_info(0x204)).toMatchObject({
      language: e_package_language.french,
      patch: 1,
    });
    const japanese = c_package_set.open_directory(dir, {
      language: e_package_language.japanese,
    });
    expect(japanese.package_ids).toEqual([0x151, 0x204, 0x205]);
    expect(japanese.package_info(0x204)?.language).toBe(
      e_package_language.english
    );
  });
});
