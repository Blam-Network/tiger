# API

## `rsat`

| Member | Description |
| --- | --- |
| `schema(hash, fields)` | Build and register a schema |
| `encode(schema, value)` | Encode to `Buffer` |
| `decode(schema, buffer)` | Decode from `Buffer` |
| `encodeServerMessage(id, args, value, optional?)` | BAP server_message body |
| `decodeServerMessage(buffer, args)` | Inverse of encodeServerMessage |
| `encodeQueuezFamily(opts)` | type-123 family-update body |
| `findByHash(hash)` | Lookup registered schema |
| `Infer<typeof Schema>` | TypeScript inferred value type |
| Field factories | See [Field types](/guide/fields) |
| `BitWriter` / `BitReader` | Low-level bit I/O |

Named exports mirror the same symbols (`encode`, `decode`, `BitReader`, …).
