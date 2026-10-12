# tiger

TypeScript libraries for Destiny's Tiger engine.

![](docs/tigerman.png)

| Package | What it does |
|---|---|
| [`@blamnetwork/gibbon`](packages/gibbon) | Reads `.pkg` packages and decodes tags with per-build definitions |
| [`@blamnetwork/bullshcript`](packages/bullshcript) | Runs the compiled Lua(ish) activity scripts: VM, host runtime, decompiler |
| [Fukugen Daihon](packages/fukugen-daihon) | A best-effort reconstruction BungieScript mission script source files using the BullShcript syntax. |
| [`@blamnetwork/dictionary`](packages/dictionary) | Cracked name hashes, activity bundles and network ids per build, as CSV with a typed lookup API |
| [`@blamnetwork/poodle`](packages/poodle) | Decompresses the blocks packages are stored in |
| [`@blamnetwork/rsat`](packages/rsat) | Encodes and decodes the RSAT bitstreams Destiny's services speak |

