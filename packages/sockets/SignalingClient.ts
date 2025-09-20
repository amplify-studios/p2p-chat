import { InviteMessage } from "./signaling";

export type SignalHandler = (msg: any) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private id: string;
  private nickname: string;
  private pubkey: string;
  private handlers: Record<string, SignalHandler[]> = {};

  constructor(id: string, nickname: string, pubkey: string) {
    this.id = id;
    this.nickname = nickname;
    this.pubkey = pubkey;
  }

  connect(url: string) {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.send({
          type: "join",
          id: this.id,
          nickname: this.nickname,
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
          console.error("Invalid signaling message", event.data);
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

  sendOffer(target: string, offer: RTCSessionDescriptionInit) {
    this.send({ type: "offer", target, payload: offer });
  }

  sendAnswer(target: string, answer: RTCSessionDescriptionInit) {
    this.send({ type: "answer", target, payload: answer });
  }

  sendCandidate(target: string, candidate: RTCIceCandidate) {
    this.send({ type: "candidate", target, payload: candidate });
  }

  requestPeers() {
    this.send({ type: "peers" });
  }

  sendRoomInvite(target: string, payload: InviteMessage) {
    this.send({ type: "invite", target, payload });
  }

  onRoomInvite(handler: (invite: InviteMessage) => void) {
    this.on("invite", (msg) => handler(msg.payload));
  }

  offRoomInvite(handler: (invite: InviteMessage) => void) {
    this.off("invite", handler as SignalHandler);
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("WebSocket not connected, dropping message:", msg);
    }
  }
}
