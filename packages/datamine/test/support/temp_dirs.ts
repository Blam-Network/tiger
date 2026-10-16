import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Temp directories a test file makes, removed together from its afterEach.
export function temp_dirs(prefix: string): {
  make: () => string;
  remove_all: () => void;
} {
  const made: string[] = [];
  return {
    make: () => {
      const directory = mkdtempSync(join(tmpdir(), prefix));
      made.push(directory);
      return directory;
    },
    remove_all: () => {
      for (const directory of made.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}
