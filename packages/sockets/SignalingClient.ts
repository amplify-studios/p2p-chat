import { InviteMessage, AckMessage } from './signaling';

export type SignalHandler = (msg: any) => void;

export class SignalingClient {
  public ws: WebSocket | null = null;
  private id: string;
  private username: string;
  private pubkey: string;
  private handlers: Record<string, SignalHandler[]> = {};

  constructor(id: string, username: string, pubkey: string) {
    this.id = id;
    this.username = username;
    this.pubkey = pubkey;
  }

  connect(url: string) {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.send({
          type: 'join',
          id: this.id,
          username: this.username,
          pubkey: this.pubkey,
        });
        resolve();
      };

      this.ws.onerror = (err) => reject(err);

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
    // this.send({ type: 'candidate', target, payload: candidate });
    this.send(JSON.stringify({ candidate: candidate }));
  }

  sendSDP(target: string, sessionDescription: RTCSessionDescription) {
    // this.send({ type: 'candidate', target, payload: candidate });
    this.send(JSON.stringify({ sdp: sessionDescription }));
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

  disconnect() {
    this.handlers = {};

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    console.log('SignalingClient disconnected');
  }
}
