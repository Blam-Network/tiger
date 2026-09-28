// npm run release -- <package dir>   e.g. npm run release -- tags
// Bumps one workspace package, commits, and tags it `<dir>-v<version>`; CI
// publishes from the tag.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

const SEMVER =
  /^\d+\.\d+\.\d+(?:-(?:[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*))?(?:\+[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?$/;

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function capture(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

const dir = process.argv[2];
const manifestPath = join("packages", dir ?? "", "package.json");
if (!(dir && existsSync(manifestPath))) {
  console.error("usage: npm run release -- <package dir>");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(manifestPath, "utf8"));
const rl = createInterface({ input, output });
const version = (
  await rl.question(`${pkg.name} is ${pkg.version}\nNew version: `)
).trim();
rl.close();

if (!SEMVER.test(version) || version === pkg.version) {
  console.error(`Invalid or unchanged version "${version}".`);
  process.exit(1);
}

const tag = `${dir}-v${version}`;
if (capture("git status --porcelain")) {
  console.error("Working tree must be clean.");
  process.exit(1);
}

run("npm run validate");
run(`npm version ${version} --no-git-tag-version -w packages/${dir}`);
run(`git add ${manifestPath} package-lock.json`);
run(`git commit -m "${dir}: v${version}"`);
run(`git tag ${tag}`);
run("git push origin HEAD");
run(`git push origin ${tag}`);
console.log(`\nTagged ${tag}; CI publishes ${pkg.name}@${version}.`);
