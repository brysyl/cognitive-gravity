export type SocketEvent = 'open' | 'close' | 'error' | 'message';
export type MessageHandler = (message: unknown) => void;

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectDelayMs = 1000;
  private maxReconnectDelayMs = 15000;
  private retryCount = 0;
  private connected = false;
  private handlers = new Map<SocketEvent, Set<MessageHandler>>();

  constructor(url: string) {
    this.url = url;
  }

  public connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.socket = new WebSocket(this.url);
      this.socket.onopen = () => {
        this.connected = true;
        this.retryCount = 0;
        this.reconnectDelayMs = 1000;
        this.emit('open', { readyState: this.socket?.readyState });
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data as string);
          this.emit('message', payload);
        } catch {
          this.emit('message', event.data);
        }
      };

      this.socket.onerror = () => {
        this.connected = false;
        this.emit('error', { message: 'WebSocket connection error' });
      };

      this.socket.onclose = () => {
        this.connected = false;
        this.emit('close', { reason: 'closed' });
        this.scheduleReconnect();
      };
    } catch (error) {
      this.emit('error', { message: error instanceof Error ? error.message : 'Unknown socket error' });
      this.scheduleReconnect();
    }
  }

  public send(payload: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, dropping payload:', payload);
      return;
    }

    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.socket.send(serialized);
  }

  public on(event: SocketEvent, handler: MessageHandler): void {
    const entry = this.handlers.get(event) ?? new Set<MessageHandler>();
    entry.add(handler);
    this.handlers.set(event, entry);
  }

  public off(event: SocketEvent, handler: MessageHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.connected = false;
  }

  private emit(event: SocketEvent, payload: unknown): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(this.reconnectDelayMs * 2, this.maxReconnectDelayMs);
    this.reconnectDelayMs = delay;
    this.retryCount += 1;

    setTimeout(() => {
      if (!this.connected) {
        this.connect();
      }
    }, this.reconnectDelayMs);
  }
}
