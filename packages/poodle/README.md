# @blamnetwork/poodle

![](hero.png)

Decompresses the blocks early Destiny packages are stored in. The December 2013 alpha's packages all use LZH codec, which the open-source decoders don't cover. Pure TypeScript, no dependencies.

```ts
import { decompress } from "@blamnetwork/poodle";

const raw = decompress(compressed, 0x40000);
```

A package's last block is usually short, and its size isn't recorded anywhere: ask for 0x40000 and the result is cut to what the stream holds. Malformed or unsupported input throws `PoodleError`. Only LZH (variant 0) is implemented.

It decodes every compressed block of the alpha's packages byte for byte, at around 150 MB/s on Node 24.
