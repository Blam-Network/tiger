# Field types

Factories on `rsat`:

| Factory | Wire |
| --- | --- |
| `u8` / `u16` / `u32` / `u64` | Unsigned integers (`u64` → `bigint`) |
| `i8` / `i16` / `i32` / `i64` | Signed biased integers |
| `f32()` | IEEE-754 float bits (Destiny kind 11) |
| `bool()` | 1-bit bool (kind 2) |
| `optional(inner)` | Dirty bit + conditional body |
| `nested(schema)` | Always-emitted child schema |
| `array(elem, { lengthBits, max })` | Count-prefixed array |
| `repeat(elem, n)` | Fixed-count sequence |
| `optionsArray(elem, n)` | Fixed-count optional slots |
| `presentOptions(elem, n)` | Fixed-count slots that are always dirty |
| `bytes(n)` | Fixed-length byte run |
| `rawBytes()` | Encode-only blob (no length prefix) |

## Schema registration

`rsat.schema(hash, fields)` registers the schema by TypeDef hash. Look up later with `rsat.findByHash(hash)`.
