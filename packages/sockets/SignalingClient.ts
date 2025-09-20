import { InviteType, RoomType } from "@chat/core";

export type PeerInfo = {
  id: string;
  nickname: string;
  pubkey: string | null;
};

export type InvitePayload = {
  room: RoomType | InviteType;
  from: string;
  nickname: string;
};

type SignalHandler = (msg: any) => void;

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
    this.send({ type: "getPeers" });
  }

  sendRoomInvite(target: string, payload: InvitePayload) {
    this.send({ type: "roomInvite", target, payload });
  }

  onRoomInvite(handler: (invite: InvitePayload) => void) {
    this.on("roomInvite", (msg) => handler(msg.payload));
  }

  offRoomInvite(handler: (invite: InvitePayload) => void) {
    this.off("roomInvite", handler as SignalHandler);
  }

  private send(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.warn("WebSocket not connected, dropping message:", msg);
    }
  }
}
