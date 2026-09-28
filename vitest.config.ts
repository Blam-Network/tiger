import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

// Public import paths resolve to sources, derived from the same builds.json
// files the exports maps are generated from.
const alias: { find: RegExp; replacement: string }[] = [];
for (const dir of readdirSync(join(root, "packages"))) {
  const path = join(root, "packages", dir);
  if (!existsSync(join(path, "package.json"))) {
    continue;
  }
  const name: string = JSON.parse(
    readFileSync(join(path, "package.json"), "utf8")
  ).name;
  const escaped = name.replace("/", "\\/");
  if (!existsSync(join(path, "builds.json"))) {
    const src = join(path, "src").replace(/\\/g, "/");
    alias.push(
      { find: new RegExp(`^${escaped}$`), replacement: `${src}/index.ts` },
      { find: new RegExp(`^${escaped}/(.+)$`), replacement: `${src}/$1.ts` }
    );
    continue;
  }
  const versions = join(path, "src/versions").replace(/\\/g, "/");
  alias.push({
    find: new RegExp(`^${escaped}/([^/]+)/(.+)$`),
    replacement: `${versions}/$1/$2.ts`,
  });
}

export default defineConfig({
  resolve: { alias },
  test: {
    include: ["packages/*/src/**/*.test.ts", "packages/*/test/**/*.test.ts"],
    // cstruct's ESM build uses extensionless imports and blf's uses
    // directory imports, neither of which Node's ESM loader accepts.
    server: { deps: { inline: ["@craftycodie/cstruct", "@blamnetwork/blf"] } },
  },
});
