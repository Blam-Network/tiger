# @blamnetwork/gibbon

![](hero.jpg)

Gibbon is a very minimal tag reader for Destiny.

Reads Destiny `.pkg` packages and decodes the tags in them. The package knows the container and what each tag class looks like; which tags to read and how to walk between them is up to you.

My experience with Blam is almost entirely with Halo so I don't know much about Destiny's tags. This package was built to facilitate reimplementing Destiny server code, so definitions are quite thin and field names are guesses wherever the real ones are unknown (they say so). Please feel free to contribute more.

No game data ships with this package. You need your own copy of a supported build's `packages` directory.

```ts
import {
  c_package_set,
  k_activity_bundle_class,
  read_definition,
  s_activity_bundle,
} from "@blamnetwork/gibbon/destiny1/v36735_13_12_02_1953_alpha";

const set = c_package_set.open_directory("path/to/packages");

for (const { hash } of set.entries_of_class(k_activity_bundle_class)) {
  const bundle = read_definition(set.read_tag(hash), s_activity_bundle);
  console.log(hash.toString(16), bundle.bundle.toString(16), bundle.rows.length);
}
```

## Destiny tags vs Halo tags

If you know Halo's tags, Destiny's (the Tiger engine) will look familiar in shape but not in how you find things.

- **No paths.** A Halo tag is a file with a path and a four-letter group (`objects\characters\masterchief\masterchief.biped`). A Destiny tag is a 32-bit id, `0x80800000 + (pkg_id << 13) + entry`, inside a `.pkg` package. A few have names in a package's named-tag table; most don't.
- **Classes, not groups.** Instead of a group like `bipd`, each tag has a class hash that indexes the build's type table. The same class has a different hash in each build.
- **Packages, not maps.** Packages hold compressed blocks (Oodle LZH, see poodle), and patches add newer copies of a package that win over older ones. There's no per-level cache file.
- **Self-relative blocks.** A tag block is a count plus an offset from the block field itself, landing on a small header with a marker. In Halo a block is a count plus an address.
- **Names are hashes.** Strings are mostly stored as FNV-1 hashes (`string_hash`), so field values and row names have to be cracked (see `@blamnetwork/dictionary`).

## Builds

| Import | Build |
|---|---|
| `@blamnetwork/gibbon/destiny1/v36735_13_12_02_1953_alpha` | 36735.13.12.02.1953.alpha, 2013-12-02 (Xbox 360) |
| `@blamnetwork/gibbon/destiny1/v41375_14_07_03_1501_live` | 41375.14.07.03.1501.live, 2014-07-03 (Xbox 360) |

Each build is its own folder with the same layout. Tag class hashes are indices into the build's type table, so they differ between builds even where the layout doesn't; the structs carry the hashes they were read with.

## What's in a build

- `pkg/`: reading packages. Opens a `.pkg`, decompresses its blocks and looks tags up by hash. `c_package_set` opens a whole `packages` directory and uses the newest patch of each package; in the live build it also picks a language (English by default) and follows blocks a patch left in older patches.
- `tag/`: the building blocks every tag uses. `tag_block()` reads a list (count plus self-relative offset), `tag_struct()` a single struct, `tag_bytes()` raw data, and `find_tag_blocks()` finds lists by their marker when nothing points at them. Also helpers for tag strings and row references.
- `definitions/`: one struct per tag class. Activity bundles and their rows, sensor hosts, scenarios, slice descriptors, squads, scripts (alpha), type schemas, scoreboards, object blueprints, manifests and investment data (items, vendors, progressions, talent grids, rewards). The live build adds unlock flags, characters and directors.

Blocks are decompressed with `@blamnetwork/poodle` unless you pass your own `decompress`.
Tag definitions are written using `@craftycodie/cstruct`.

## ESM and CommonJS

The package ships both builds (`dist/` and `dist-cjs/`). `@craftycodie/cstruct` is a prerelease whose ESM build uses extensionless imports, which Node's ESM loader rejects, so Node consumers should `require` the CommonJS build and vitest consumers should inline cstruct:

```ts
// vitest.config.ts
export default defineConfig({
  test: { server: { deps: { inline: ["@craftycodie/cstruct"] } } },
});
```

## Tests

`npx vitest run packages/gibbon` from the tiger root runs the tests.
