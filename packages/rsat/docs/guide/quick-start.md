# Quick start

Everything public lives on the `rsat` object: field factories, schema registration, and encode/decode helpers.

```ts
import { rsat } from "@blamnetwork/rsat";

const Msg = rsat.schema(0x11111111, {
  flag: rsat.optional(rsat.u32({ size: 8, bias: 0 })),
  always: rsat.i32({ size: 3, bias: 1 }),
});

const bytes = rsat.encode(Msg, { flag: undefined, always: 0 });
const data = rsat.decode(Msg, bytes);

console.log(data.always); // 0
```

## Biased integers

Destiny RSAT integers are often stored with a **bias** (ryods `delta`): added on encode, subtracted on decode. Signed types default to a mid-range bias; unsigned defaults to `0`. Override with `{ size, bias }`.

## Options

`rsat.optional(inner)` writes a 1-bit dirty/presence flag, then the body only when present. Pass `undefined` (or `null`) for a clean slot.

## Nested schemas

`rsat.nested(childSchema)` embeds another schema without a dirty bit. Combine with `optional(nested(...))` when the nest is gated.

Next: [Field types](/guide/fields).
