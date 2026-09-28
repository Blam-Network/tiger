// dist-cjs needs its own package.json so Node treats it as CommonJS inside a
// "type": "module" package. Runs from the package directory.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

writeFileSync(
  join(process.cwd(), "dist-cjs", "package.json"),
  JSON.stringify({ type: "commonjs" })
);
