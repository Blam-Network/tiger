# What is @blamnetwork/rsat?

**@blamnetwork/rsat** is a schema-first TypeScript library for encoding and decoding Destiny **RSAT** bitstreams — the packed TypeDef layouts used by BAP / queuez replication.

Define schemas with `rsat.schema`, then `rsat.encode` / `rsat.decode` over Halo/Blam big-endian bit packing from [`@blamnetwork/blf`](https://www.npmjs.com/package/@blamnetwork/blf).

Game-specific TypeDef schemas belong in the consuming app (e.g. web-tiger), not this package.

## At a glance

| Step | Description |
| --- | --- |
| **Define** | `rsat.schema(hash, { field: rsat.u32({ size, bias }) })` |
| **Serialize** | `rsat.encode(schema, value)` → `Buffer` |
| **Parse** | `rsat.decode(schema, buffer)` |
| **Frame** | `rsat.encodeServerMessage` / `rsat.encodeQueuezFamily` |

## Example

```ts
import { rsat } from "@blamnetwork/rsat";

const ResultHeader = rsat.schema(0x80801a2b, {
  status: rsat.i32({ size: 3, bias: 1 }),
  value: rsat.i32({ size: 32, bias: 0x80000000 }),
});

const bytes = rsat.encode(ResultHeader, { status: 0, value: 0 });
const parsed = rsat.decode(ResultHeader, bytes);
```

## Get started

See [Install](/guide/install) and [Quick start](/guide/quick-start).

Release history: [Changelog](/changelog).
