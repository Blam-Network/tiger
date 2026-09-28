# Bitstream

`BitWriter` / `BitReader` wrap [`@blamnetwork/blf` bitstream](https://blam-network.github.io/blf/guide/bitstream) with Destiny RSAT conventions (big-endian, MSB→LSB).

```ts
import { BitReader, BitWriter } from "@blamnetwork/rsat";

const bw = new BitWriter();
bw.writeBit(1);
bw.write(0x15, 5);
bw.write(0x100000001n, 64);
const bytes = bw.finish();

const br = new BitReader(bytes);
br.readBit(); // 1
br.readNumber(5); // 0x15
br.read(64); // 0x100000001n
```

Prefer `rsat.encode` / `rsat.decode` for schema work; use the bit classes for custom framing or tests.
