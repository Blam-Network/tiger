# python packages/datamine/publish.py
# Validates @blamnetwork/datamine, bumps its version, commits, and pushes the
# `datamine-v<version>` tag; datamine-publish.yml publishes from the tag.
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = "packages/datamine"
MANIFEST = ROOT / PACKAGE / "package.json"
LOCKFILE = "package-lock.json"
SEMVER = re.compile(
    r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)
NPM = shutil.which("npm") or "npm"
NPX = shutil.which("npx") or "npx"


def run(*command):
    print(f"> {' '.join(command)}", flush=True)
    if subprocess.run(command, cwd=ROOT).returncode != 0:
        fail(f"{command[0]} failed")


def capture(*command):
    return subprocess.run(
        command, cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.strip()


def fail(message):
    print(f"\n{message}", file=sys.stderr)
    sys.exit(1)


def check_clean():
    dirty = capture("git", "status", "--porcelain", "--", PACKAGE, LOCKFILE)
    if dirty:
        fail(f"Uncommitted changes:\n{dirty}")

    branch = capture("git", "rev-parse", "--abbrev-ref", "HEAD")
    try:
        upstream = capture("git", "rev-parse", "--abbrev-ref", "@{u}")
    except subprocess.CalledProcessError:
        fail(f"{branch} has no upstream; push it first.")
    run("git", "fetch", "--quiet", "origin")
    unpushed = capture("git", "log", "--oneline", f"{upstream}..HEAD", "--", PACKAGE)
    if unpushed:
        fail(f"Commits not pushed to {upstream}:\n{unpushed}")
    if capture("git", "rev-list", "--count", f"HEAD..{upstream}") != "0":
        fail(f"{branch} is behind {upstream}; pull first.")


# The checks datamine-publish.yml runs before it publishes.
def validate():
    run(NPX, "ultracite", "check", PACKAGE)
    run(NPM, "run", "typecheck", "-w", PACKAGE)
    run(NPX, "vitest", "run", PACKAGE)
    run(NPM, "run", "build", "-w", PACKAGE)


def ask_version(current):
    version = input("New version: ").strip()
    if not SEMVER.match(version) or version == current:
        fail(f'Invalid or unchanged version "{version}".')
    tag = f"datamine-v{version}"
    if capture("git", "tag", "--list", tag) or capture(
        "git", "ls-remote", "--tags", "origin", tag
    ):
        fail(f"Tag {tag} already exists.")
    return version, tag


def main():
    check_clean()
    validate()

    pkg = json.loads(MANIFEST.read_text(encoding="utf-8"))
    print(f"\n{pkg['name']} is {pkg['version']}")
    version, tag = ask_version(pkg["version"])
    channel = "next" if "-" in version else "latest"
    if input(f"Publish {pkg['name']}@{version} to {channel}? [y/N] ").strip().lower() != "y":
        fail("Cancelled.")

    run(NPM, "version", version, "--no-git-tag-version", "-w", PACKAGE)
    run("git", "add", f"{PACKAGE}/package.json", LOCKFILE)
    run("git", "commit", "-m", f"datamine: v{version}")
    run("git", "tag", tag)
    run("git", "push", "origin", "HEAD")
    run("git", "push", "origin", tag)
    print(f"\nPushed {tag}; CI publishes {pkg['name']}@{version} to {channel}.")


if __name__ == "__main__":
    main()
