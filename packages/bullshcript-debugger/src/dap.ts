// One WebSocket to a bullshcript debugger: one JSON DAP message per frame.
// Reconnects on its own until told to disconnect.

export type ConnectionState = "connected" | "connecting" | "disconnected";

interface Pending {
  reject: (error: Error) => void;
  resolve: (body: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

const REQUEST_TIMEOUT_MS = 10_000;
const RECONNECT_MS = 2000;

export class DapClient {
  private socket: WebSocket | undefined;
  private seq = 0;
  private readonly pending = new Map<number, Pending>();
  private wanted = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private address = "";

  onEvent: (event: string, body: unknown) => void = () => undefined;
  onState: (state: ConnectionState) => void = () => undefined;
  // After every successful (re)connect.
  onOpen: () => void = () => undefined;

  connect(address: string): void {
    this.address = address;
    this.wanted = true;
    this.open();
  }

  disconnect(): void {
    this.wanted = false;
    clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = undefined;
    this.onState("disconnected");
  }

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private open(): void {
    clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.onState("connecting");
    let socket: WebSocket;
    try {
      socket = new WebSocket(`ws://${this.address}/debug/dap`);
    } catch {
      this.retry();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.onState("connected");
      this.onOpen();
    };
    socket.onmessage = (message) => this.receive(String(message.data));
    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = undefined;
      this.failPending("disconnected");
      this.retry();
    };
  }

  private retry(): void {
    if (!this.wanted) {
      this.onState("disconnected");
      return;
    }
    this.onState("connecting");
    this.reconnectTimer = setTimeout(() => this.open(), RECONNECT_MS);
  }

  private failPending(reason: string): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
  }

  private receive(text: string): void {
    let message: {
      body?: unknown;
      event?: string;
      message?: string;
      request_seq?: number;
      success?: boolean;
      type?: string;
    };
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (message.type === "response" && message.request_seq !== undefined) {
      const pending = this.pending.get(message.request_seq);
      if (!pending) {
        return;
      }
      this.pending.delete(message.request_seq);
      clearTimeout(pending.timer);
      if (message.success) {
        pending.resolve(message.body);
      } else {
        pending.reject(new Error(message.message ?? "request failed"));
      }
      return;
    }
    if (message.type === "event" && message.event) {
      this.onEvent(message.event, message.body);
    }
  }

  request<T = Record<string, unknown>>(
    command: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("not connected"));
    }
    this.seq += 1;
    const seq = this.seq;
    socket.send(
      JSON.stringify({ seq, type: "request", command, arguments: args })
    );
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(seq);
        reject(new Error(`${command}: no answer`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(seq, {
        reject,
        resolve: (body) => resolve((body ?? {}) as T),
        timer,
      });
    });
  }
}
