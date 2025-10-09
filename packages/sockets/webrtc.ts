import { STUN_SERVERS, TURN_SERVERS } from "./stun";

export interface WebRTCOptions {
  ws: WebSocket;
  myId: string;
  peerId: string;
  onMessage?: (msg: string) => void;
  onLog?: (msg: string) => void;
  maxRetries?: number;
}

export class WebRTCConnection {
  private ws: WebSocket;
  private myId: string;
  private peerId: string;
  private onMessage?: (msg: string) => void;
  private onLog?: (msg: string) => void;
  private maxRetries: number;

  private pc: RTCPeerConnection;
  private dataChannel: RTCDataChannel | null = null;

  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemote = false;
  private retryCount = 0;

  private outgoingQueue: string[] = [];
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor({ ws, myId, peerId, onMessage, onLog, maxRetries = 5 }: WebRTCOptions) {
    this.ws = ws;
    this.myId = myId;
    this.peerId = peerId;
    this.onMessage = onMessage;
    this.onLog = onLog;
    this.maxRetries = maxRetries;

    const iceServers = [{ urls: STUN_SERVERS }, ...TURN_SERVERS];
    this.pc = new RTCPeerConnection({ iceServers });

    this.setupPeerConnection();
    this.ws.addEventListener("message", this.onWsMessage);
    this.initiateOffer(); // Every peer tries to initiate, but only one wins
  }

  /** ---------------- Core setup ---------------- */

  private log = (msg: string) => { try { this.onLog?.(msg); } catch { } };

  private setupPeerConnection() {
    this.pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      this.sendSignal({ candidate: e.candidate });
    };

    this.pc.ondatachannel = (e) => {
      this.dataChannel = e.channel;
      this.setupDataChannel(this.dataChannel, "receiver");
    };

    this.pc.oniceconnectionstatechange = () => {
      this.log(`ICE connection state: ${this.pc.iceConnectionState}`);
      if (this.pc.iceConnectionState === "failed") this.handleRetry();
    };
  }

  private setupDataChannel(channel: RTCDataChannel, role: string) {
    channel.onopen = () => { this.log(`Data channel open (${role})`); this.flushOutgoing(); };
    channel.onmessage = (e) => this.onMessage?.(e.data);
    channel.onclose = () => this.log(`Data channel closed (${role})`);
    channel.onerror = (e) => this.log(`DataChannel error (${role}): ${e}`);
  }

  private createDataChannel() {
    if (this.dataChannel) return; 
    try {
      this.dataChannel = this.pc.createDataChannel("chat");
      this.setupDataChannel(this.dataChannel, "creator");
    } catch (e) {
      this.log("Failed to create data channel: " + e);
    }
  }

  /** ---------------- Reset/Re-initialization ---------------- */

  private async resetConnection() {
    this.log("Resetting RTCPeerConnection for a new negotiation...");
    try { this.pc.close(); } catch {}
    this.dataChannel = null; 
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemote = false;
    this.retryCount = 0;
    this.outgoingQueue = [];
    this.pendingCandidates = [];

    const iceServers = [{ urls: STUN_SERVERS }, ...TURN_SERVERS];
    this.pc = new RTCPeerConnection({ iceServers });

    this.setupPeerConnection();
  }

  /** ---------------- WebSocket handling ---------------- */

  private onWsMessage = (event: MessageEvent) => {
    try { this.handleSignal(JSON.parse(event.data)); } catch { }
  };

  private sendSignal(payload: any) {
    try {
      this.ws.send(JSON.stringify({
        type: "signal",
        target: this.peerId,
        from: this.myId,
        payload,
      }));
    } catch (err) {
      this.log("Failed to send signal: " + err);
    }
  }

  /** ---------------- Offer / Answer negotiation ---------------- */

  private async initiateOffer() {
    try {
      this.sendSignal({ type: "reset" });
      this.log("Sent explicit reset signal to peer.");
      
      this.createDataChannel(); 
      
      this.makingOffer = true;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.sendSignal(offer);
      this.log("Sent offer to peer");
    } catch (err) {
      this.log("Offer failed: " + err);
    } finally {
      this.makingOffer = false;
    }
  }

  private async handleSignal(msg: any) {
    if (msg.type !== "signal" || msg.from !== this.peerId) return;
    const payload = msg.payload;
    if (!payload) return;

    if (payload.type === "reset") {
        this.log("Received explicit reset signal from peer. Forcing local connection reset.");
        await this.resetConnection();
    }

    // ICE candidate
    if (payload.candidate) {
      if (this.pc.remoteDescription) {
        try { await this.pc.addIceCandidate(payload.candidate); }
        catch (err) { this.log("Failed to add ICE candidate: " + err); }
      } else this.pendingCandidates.push(payload.candidate);
      return;
    }

    // Offer
    if (payload.type === "offer") {
      if (this.pc.signalingState === "closed" || this.pc.iceConnectionState === "failed" || this.pc.iceConnectionState === "disconnected") {
          this.log(`Connection state is ${this.pc.signalingState}/${this.pc.iceConnectionState}. Resetting for new offer.`);
          await this.resetConnection();
      }

      const offerCollision = this.makingOffer || this.pc.signalingState !== "stable";
      this.ignoreOffer = offerCollision && this.myId > this.peerId;
      if (this.ignoreOffer) return;

      try {
        this.isSettingRemote = true;
        if (this.pc.signalingState !== "stable") await this.pc.setLocalDescription({ type: "rollback" });
        await this.pc.setRemoteDescription(payload);
        this.isSettingRemote = false;

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignal(answer);

        while (this.pendingCandidates.length)
          await this.pc.addIceCandidate(this.pendingCandidates.shift()!);

        this.log("Sent answer to peer");
      } catch (err) { this.log("Error handling offer: " + err); }
      return;
    }

    // Answer
    if (payload.type === "answer") {
      try {
        await this.pc.setRemoteDescription(payload);
        while (this.pendingCandidates.length)
          await this.pc.addIceCandidate(this.pendingCandidates.shift()!);
        this.log("Set remote description for answer");
      } catch (err) { this.log("Error handling answer: " + err); }
      return;
    }
  }

  /** ---------------- Data sending ---------------- */

  private flushOutgoing() {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      while (this.outgoingQueue.length) {
        const m = this.outgoingQueue.shift()!;
        try { this.dataChannel.send(m); }
        catch { this.outgoingQueue.push(m); }
      }
    }
  }

  public send(msg: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open")
      this.outgoingQueue.push(msg);
    else {
      try { this.dataChannel.send(msg); }
      catch { this.outgoingQueue.push(msg); }
    }
  }

  /** ---------------- Retry & Lifecycle ---------------- */

  private handleRetry() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(() => this.initiateOffer(), 100 + Math.random() * 500);
    } else {
      this.log("Max retries reached, connection failed permanently.");
      try { this.pc.close(); } catch {}
    }
  }

  public close() {
    try { this.ws.removeEventListener("message", this.onWsMessage); } catch { }
    try { this.pc.close(); } catch { }
    try { this.dataChannel?.close(); } catch { }
    this.log("Connection closed");
  }
}
