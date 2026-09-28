# @blamnetwork/rsat

Schema-first Destiny **RSAT** bitstream encode/decode for TypeScript.

Game-specific TypeDef schemas belong in the consuming app (e.g. web-tiger), not this package.

```ts
import { rsat } from "@blamnetwork/rsat";

const ResultHeader = rsat.schema(0x80801a2b, {
  status: rsat.i32({ size: 3, bias: 1 }),
  value: rsat.i32({ size: 32, bias: 0x80000000 }),
});

const bytes = rsat.encode(ResultHeader, { status: 0, value: 0 });
```

## Docs

- Site: https://blam-network.github.io/rsat/
- Local: `npm run docs -w packages/rsat`

Built, tested and released with the rest of the [tiger](../../README.md) monorepo.
