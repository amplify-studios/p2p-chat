import { InviteMessage, AckMessage } from './signaling';

export type SignalHandler = (msg: any) => void;

export class SignalingClient {
  public ws: WebSocket | null = null;
  private id: string;
  private username: string;
  private pubkey: string;
  private handlers: Record<string, SignalHandler[]> = {};
  private joined = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(id: string, username: string, pubkey: string) {
    this.id = id;
    this.username = username;
    this.pubkey = pubkey;
  }

  /** Connect to a signaling server */
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Already connected
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        if (!this.joined) {
          this.send({
            type: 'join',
            id: this.id,
            username: this.username,
            pubkey: this.pubkey,
          });
          this.joined = true;
        }
        resolve();
      };

      this.ws.onerror = (err) => reject(err);

      this.ws.onclose = () => {
        this.ws = null;
        this.joined = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log(msg);
          this.dispatch(msg.type, msg);
        } catch (e) {
          console.error('Invalid signaling message', event.data);
        }
      };
    });
  }

  /** Clean disconnect */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.handlers = {};

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.joined = false;
    console.log('SignalingClient disconnected manually');
  }

  /** Force reconnect */
  async reconnect(url: string) {
    this.disconnect();
    await new Promise((r) => setTimeout(r, 500));
    await this.connect(url);
  }

  /** Event handlers */
  on(type: string, handler: SignalHandler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
  }

  off(type: string, handler: SignalHandler) {
    if (!this.handlers[type]) return;
    this.handlers[type] = this.handlers[type].filter((h) => h !== handler);
  }

  private dispatch(type: string, msg: any) {
    const handlers = this.handlers[type] || [];
    for (const h of handlers) h(msg);
  }

  /** Signaling message helpers */
  sendSignal(target: string, signal: RTCSessionDescriptionInit | RTCIceCandidate) {
    this.send({ type: 'signal', target, payload: signal });
  }

  sendOffer(target: string, offer: RTCSessionDescriptionInit) {
    this.send({ type: 'offer', target, payload: offer });
  }

  sendAnswer(target: string, answer: RTCSessionDescriptionInit) {
    this.send({ type: 'answer', target, payload: answer });
  }

  sendCandidate(target: string, candidate: RTCIceCandidate) {
    this.send({ type: 'candidate', target, payload: candidate });
  }

  requestPeers() {
    this.send({ type: 'peers' });
  }

  sendRoomInvite(target: string, payload: InviteMessage) {
    this.send({ type: 'invite', target, payload });
  }

  sendAck(target: string, payload: AckMessage) {
    this.send({ type: 'ack', target, payload });
  }

  onRoomInvite(handler: (invite: InviteMessage) => void) {
    this.on('invite', (msg) => handler(msg.payload));
  }

  offRoomInvite(handler: (invite: InviteMessage) => void) {
    this.off('invite', handler as SignalHandler);
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn('WebSocket not connected, dropping message:', msg);
    }
  }
}
