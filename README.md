# tiger

TypeScript libraries for Destiny's Tiger engine.

![](docs/tigerman.png)

| Package | What it does |
|---|---|
| [`@blamnetwork/gibbon`](packages/gibbon) | Reads `.pkg` packages and decodes tags with per-build definitions |
| [`@blamnetwork/bullshcript`](packages/bullshcript) | Runs the compiled Lua(ish) activity scripts: VM, host runtime, decompiler |
| [`@blamnetwork/fukugen-daihon`](packages/fukugen-daihon) | Activity and sandbox script sources per build, at Bungie's paths: the alpha's decompiled, day0's authored |
| [`@blamnetwork/dictionary`](packages/dictionary) | Cracked name hashes, activity bundles and network ids per build, as CSV with a typed lookup API |
| [`@blamnetwork/poodle`](packages/poodle) | Decompresses the blocks packages are stored in |
| [`@blamnetwork/rsat`](packages/rsat) | Encodes and decodes the RSAT bitstreams Destiny's services speak |

