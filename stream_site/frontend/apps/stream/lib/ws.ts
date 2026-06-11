type MessageHandler = (data: unknown) => void;

export class ReconnectingWS {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: MessageHandler;
  private reconnectDelay = 1000;
  private maxDelay = 30000;
  private closed = false;
  public status: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  private onStatusChange?: (s: typeof this.status) => void;

  constructor(url: string, onMessage: MessageHandler, onStatusChange?: (s: 'connecting' | 'connected' | 'disconnected') => void) {
    this.url = url;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.connect();
  }

  private connect() {
    if (this.closed) return;
    this.setStatus('connecting');

    // Convert http(s) to ws(s)
    const wsUrl = this.url.replace(/^http/, 'ws');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.setStatus('connected');
    };

    this.ws.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(e.data));
      } catch {
        this.onMessage(e.data);
      }
    };

    this.ws.onclose = () => {
      if (this.closed) return;
      this.setStatus('disconnected');
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private setStatus(s: typeof this.status) {
    this.status = s;
    this.onStatusChange?.(s);
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}
