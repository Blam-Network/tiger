// For vite.config.ts, which mounts the handler in the dev server, and the
// tests, which read slices directly.
import type { IncomingMessage, ServerResponse } from "node:http";
import type { TigerSlice } from "../src/protocol";

export function handleData(req: IncomingMessage, res: ServerResponse): void;

export function readSlices(query: {
  build: string;
  dictionary: string | undefined;
  packages: string;
  scenario: string;
}): TigerSlice[];
