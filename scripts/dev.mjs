// Watch-builds every package into dist and dist-cjs without cleaning first,
// so a consumer running against these builds never sees them disappear.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Dependencies first: gibbon reads poodle's build.
const packages = ["poodle", "rsat", "gibbon", "bullshcript"];

const projects = [];
for (const name of packages) {
  const dir = join("packages", name);
  mkdirSync(join(dir, "dist-cjs"), { recursive: true });
  writeFileSync(
    join(dir, "dist-cjs", "package.json"),
    JSON.stringify({ type: "commonjs" })
  );
  projects.push(
    join(dir, "tsconfig.build.json"),
    join(dir, "tsconfig.build.cjs.json")
  );
}

const tsc = spawn(
  "npx",
  ["tsc", "-b", "-w", "--preserveWatchOutput", ...projects],
  {
    shell: true,
    stdio: "inherit",
  }
);
tsc.on("exit", (code) => process.exit(code ?? 0));
