import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const k_dist = resolve(import.meta.dirname, "../dist");
const k_import_regex = /(?:from|import)\s*["']([^"']+)["']/g;
const k_node_global_regex = /\b(?:Buffer|process)\b/;

// Follows the relative imports of a built entry: the modules it loads and every other module it
// names.
function dist_closure(entry: string): { externals: string[]; files: string[] } {
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

// Comments name Buffer and process freely; only code counts.
function code_of(file: string): string {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

// Needs `npm run build -w packages/datamine` first.
describe.skipIf(!existsSync(resolve(k_dist, "events.js")))(
  "built browser entries",
  () => {
    for (const entry of ["events.js", "reading/index.js"]) {
      it(`${entry} imports no node modules and reads neither Buffer nor process`, () => {
        const { files, externals } = dist_closure(resolve(k_dist, entry));
        expect(externals).toEqual(["@craftycodie/cstruct", "fflate"]);
        // node_builtins is where globalThis.process is looked up, on purpose.
        const offenders = files.filter(
          (file) =>
            !file.endsWith("node_builtins.js") &&
            k_node_global_regex.test(code_of(file))
        );
        expect(offenders).toEqual([]);
      });
    }
  }
);
