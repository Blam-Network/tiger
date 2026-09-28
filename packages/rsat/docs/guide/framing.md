# Framing helpers

Destiny BAP framing helpers sit beside the core DSL.

## Server messages

```ts
import { rsat } from "@blamnetwork/rsat";

const Args = rsat.schema(0xdeadbeef, {
  code: rsat.u32({ size: 8 }),
});

const body = rsat.encodeServerMessage(0x1234, Args, { code: 1 }, null);
const parsed = rsat.decodeServerMessage(body, Args);
// { networkId, value, optional }
```

Body layout: `u16` network-id | RSAT(args) | optional payload bit (+ length + bytes).

## Queuez family updates

```ts
const payload = rsat.encodeQueuezFamily({
  familyType: 1,
  rootSoid: 0n,
  objects: [
    {
      headerChecksum: 0xabcdef01,
      soid: 1n,
      payload: rsat.encode(SomeObject, { /* … */ }),
    },
  ],
});
```
