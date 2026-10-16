import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dist_entry = resolve(import.meta.dirname, "../../dist/reading/index.js");
const k_import_regex = /(?:from|import)\s*["']([^"']+)["']/g;

// Follows the relative imports of the built entry and collects every other module it names.
function dist_externals(entry: string): {
  files: string[];
  externals: string[];
} {
  const files = new Set<string>();
  const externals = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop() as string;
    if (files.has(file)) {
      continue;
    }
    files.add(file);
    for (const match of readFileSync(file, "utf8").matchAll(k_import_regex)) {
      const specifier = match[1];
      if (specifier.startsWith(".")) {
        pending.push(resolve(dirname(file), specifier));
      } else {
        externals.add(specifier);
      }
    }
  }
  return { files: [...files], externals: [...externals].sort() };
}

// Needs `npm run build -w packages/datamine` first.
describe.skipIf(!existsSync(dist_entry))("built reading entry", () => {
  it("imports no node modules, only fflate", () => {
    const { files, externals } = dist_externals(dist_entry);
    expect(files.length).toBeGreaterThan(5);
    expect(externals.filter((name) => name.startsWith("node:"))).toEqual([]);
    expect(externals).toEqual(["fflate"]);
  });
});
