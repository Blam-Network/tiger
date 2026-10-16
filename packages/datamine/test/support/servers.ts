import { Server as HttpServer } from "node:http";
import type { AddressInfo, Server } from "node:net";

// Local servers a test file starts, closed together from its afterEach.
export function tracked_servers(): {
  close_all: () => Promise<void>;
  listen: (server: Server) => Promise<number>;
} {
  const servers: Server[] = [];
  return {
    listen: async (server) => {
      servers.push(server);
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve)
      );
      return (server.address() as AddressInfo).port;
    },
    close_all: async () => {
      for (const server of servers.splice(0)) {
        if (server instanceof HttpServer) {
          server.closeAllConnections();
        }
        await new Promise((resolve) => server.close(resolve));
      }
    },
  };
}
