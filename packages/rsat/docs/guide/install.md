# Install

```bash
npm install @blamnetwork/rsat
```

Requires Node.js 18+ (`Buffer` I/O). Peer dependency [`@blamnetwork/blf`](https://www.npmjs.com/package/@blamnetwork/blf) is installed automatically.

## TypeScript

No special compiler flags are required. Import from the package root:

```ts
import { rsat, BitReader, BitWriter } from "@blamnetwork/rsat";
```

Derive decoded shapes with `rsat.Infer`:

```ts
type Header = rsat.Infer<typeof ResultHeader>;
```
