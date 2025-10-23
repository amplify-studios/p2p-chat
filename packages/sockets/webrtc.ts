/**
 * # WebRTCConnection
 *
 * The `WebRTCConnection` class manages a **peer-to-peer data channel** between two clients
 * using WebRTC and a **signaling server** (via WebSocket). It encapsulates the logic
 * for establishing, maintaining, and retrying a direct connection between peers.
 *
 * ---
 *
 * ## High-Level Overview
 *
 * WebRTC allows two peers (A and B) to communicate directly, but they first need to:
 * 1. Exchange connection metadata (SDP offers/answers)
 * 2. Exchange ICE candidates (network discovery info)
 * 3. Agree on who initiates the connection and handle collisions
 *
 * Since WebRTC itself doesn’t provide signaling, this class uses a `WebSocket` connection
 * to exchange signaling messages through a server (usually the same signaling server
 * used by `SignalingClient`).
 *
 * ---
 *
 * ## Connection Lifecycle
 *
 * 1. **Initialization**
 *    - A new instance of `WebRTCConnection` is created with:
 *      - The signaling `WebSocket`
 *      - `myId` and `peerId` (used to identify messages)
 *      - Optional callbacks: `onMessage`, `onLog`
 *    - The class automatically:
 *      - Creates a new `RTCPeerConnection` with STUN/TURN servers.
 *      - Sets up ICE handling, data channels, and retry logic.
 *      - Starts an offer negotiation immediately (`initiateOffer()`).
 *
 * 2. **Negotiation Flow**
 *    - Each peer attempts to initiate an offer (`createOffer()`).
 *    - If both peers start at once, a *collision* may occur.
 *      - The peer with the **lexicographically higher ID** cancels its offer (`ignoreOffer`).
 *    - Once one offer is accepted:
 *      1. The offerer sends its SDP (Session Description Protocol).
 *      2. The answerer receives it, sets it as remote, creates an answer, and sends it back.
 *      3. Both peers set their remote descriptions, completing negotiation.
 *
 * 3. **ICE Candidate Exchange**
 *    - As WebRTC gathers ICE candidates (network addresses), they are sent through the signaling channel.
 *    - The remote peer adds these candidates to its RTCPeerConnection once it has a remote description.
 *    - Pending candidates are stored in `pendingCandidates[]` until the description is ready.
 *
 * 4. **Data Channel Handling**
 *    - One peer creates a `RTCDataChannel` (the “creator”), the other receives it (the “receiver”).
 *    - When opened, messages can be sent with `send(msg: string)`.
 *    - If the channel isn’t ready, messages are queued (`outgoingQueue[]`) and flushed once open.
 *
 * 5. **Failure & Retry**
 *    - If the ICE connection state becomes `"failed"`, `handleRetry()` runs.
 *    - The connection will reinitiate up to `maxRetries` times (default 5), each with a random delay.
 *    - If all retries fail, the connection is closed permanently.
 *
 * 6. **Reset Mechanism**
 *    - Either peer may send an explicit `{ type: "reset" }` signal to force a full renegotiation.
 *    - This is useful when state corruption or desync occurs.
 *    - The peer receiving `"reset"` triggers `resetConnection()` to recreate the `RTCPeerConnection`.
 *
 * 7. **Cleanup**
 *    - `close()` removes listeners, closes the peer connection and data channel, and releases resources.
 *
 * ---
 *
 * ## Typical Signaling Flow
 *
 * **Peer A → Peer B via Signaling Server**
 *
 * ```
 * A: createOffer()
 * A → B: { type: "signal", payload: { type: "offer", sdp: ... } }
 *
 * B: setRemoteDescription(offer)
 * B: createAnswer()
 * B → A: { type: "signal", payload: { type: "answer", sdp: ... } }
 *
 * Both peers exchange ICE candidates:
 * A ↔ B: { type: "signal", payload: { candidate: ... } }
 *
 * Data channel established:
 * A ⇄ B (P2P)
 * ```
 *
 * ---
 *
 * ## Reliability & Safety
 * - Detects and ignores simultaneous offer collisions.
 * - Queues outgoing messages until the channel is open.
 * - Recovers gracefully on connection failures.
 * - Cleans up all resources on closure or reset.
 */

import { STUN_SERVERS, TURN_SERVERS } from './stun';

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
    this.ws.addEventListener('message', this.onWsMessage);
    this.initiateOffer(); // Every peer tries to initiate, but only one wins
  }

  /** ---------------- Getters / Setters ---------------- */

  public getDataChannel = () => {
    return this.dataChannel;
  };

  public isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  public setOnMessage(handler?: (msg: string) => void) {
    this.onMessage = handler;
  }
  public setOnLog(handler?: (msg: string) => void) {
    this.onLog = handler;
  }

  /** ---------------- Core setup ---------------- */

  private log = (msg: string) => {
    try {
      this.onLog?.(msg);
    } catch {}
  };

  private setupPeerConnection() {
    this.pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      this.sendSignal({ candidate: e.candidate });
    };

    this.pc.ondatachannel = (e) => {
      this.dataChannel = e.channel;
      this.setupDataChannel(this.dataChannel, 'receiver');
    };

    this.pc.oniceconnectionstatechange = () => {
      this.log(`ICE connection state: ${this.pc.iceConnectionState}`);
      if (this.pc.iceConnectionState === 'failed') this.handleRetry();
    };
  }

  private setupDataChannel(channel: RTCDataChannel, role: string) {
    channel.onopen = () => {
      this.log(`Data channel open (${role})`);
      this.flushOutgoing();
    };
    channel.onmessage = (e) => this.onMessage?.(e.data);
    channel.onclose = () => this.log(`Data channel closed (${role})`);
    channel.onerror = (e) => this.log(`DataChannel error (${role}): ${e}`);
  }

  private createDataChannel() {
    if (this.dataChannel) return;
    try {
      this.dataChannel = this.pc.createDataChannel('chat');
      this.setupDataChannel(this.dataChannel, 'creator');
    } catch (e) {
      this.log('Failed to create data channel: ' + e);
    }
  }

  /** ---------------- Reset/Re-initialization ---------------- */

  private async resetConnection() {
    this.log('Resetting RTCPeerConnection for a new negotiation...');
    try {
      this.pc.close();
    } catch {}
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
    try {
      this.handleSignal(JSON.parse(event.data));
    } catch {}
  };

  private sendSignal(payload: any) {
    try {
      this.ws.send(
        JSON.stringify({
          type: 'signal',
          target: this.peerId,
          from: this.myId,
          payload,
        }),
      );
    } catch (err) {
      this.log('Failed to send signal: ' + err);
    }
  }

  /** ---------------- Offer / Answer negotiation ---------------- */

  private async initiateOffer() {
    try {
      this.sendSignal({ type: 'reset' });
      this.log('Sent explicit reset signal to peer.');

      this.createDataChannel();

      this.makingOffer = true;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.sendSignal(offer);
      this.log('Sent offer to peer');
    } catch (err) {
      this.log('Offer failed: ' + err);
    } finally {
      this.makingOffer = false;
    }
  }

  private async handleSignal(msg: any) {
    if (msg.type !== 'signal' || msg.from !== this.peerId) return;
    const payload = msg.payload;
    if (!payload) return;

    if (payload.type === 'reset') {
      this.log('Received explicit reset signal from peer. Forcing local connection reset.');
      await this.resetConnection();
    }

    // ICE candidate
    if (payload.candidate) {
      if (this.pc.remoteDescription) {
        try {
          await this.pc.addIceCandidate(payload.candidate);
        } catch (err) {
          this.log('Failed to add ICE candidate: ' + err);
        }
      } else this.pendingCandidates.push(payload.candidate);
      return;
    }

    // Offer
    if (payload.type === 'offer') {
      if (
        this.pc.signalingState === 'closed' ||
        this.pc.iceConnectionState === 'failed' ||
        this.pc.iceConnectionState === 'disconnected'
      ) {
        this.log(
          `Connection state is ${this.pc.signalingState}/${this.pc.iceConnectionState}. Resetting for new offer.`,
        );
        await this.resetConnection();
      }

      const offerCollision = this.makingOffer || this.pc.signalingState !== 'stable';
      this.ignoreOffer = offerCollision && this.myId > this.peerId;
      if (this.ignoreOffer) return;

      try {
        this.isSettingRemote = true;
        if (this.pc.signalingState !== 'stable')
          await this.pc.setLocalDescription({ type: 'rollback' });
        await this.pc.setRemoteDescription(payload);
        this.isSettingRemote = false;

        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignal(answer);

        while (this.pendingCandidates.length)
          await this.pc.addIceCandidate(this.pendingCandidates.shift()!);

        this.log('Sent answer to peer');
      } catch (err) {
        this.log('Error handling offer: ' + err);
      }
      return;
    }

    // Answer
    if (payload.type === 'answer') {
      try {
        await this.pc.setRemoteDescription(payload);
        while (this.pendingCandidates.length)
          await this.pc.addIceCandidate(this.pendingCandidates.shift()!);
        this.log('Set remote description for answer');
      } catch (err) {
        this.log('Error handling answer: ' + err);
      }
      return;
    }
  }

  /** ---------------- Data sending ---------------- */

  private flushOutgoing() {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      while (this.outgoingQueue.length) {
        const m = this.outgoingQueue.shift()!;
        try {
          this.dataChannel.send(m);
        } catch {
          this.outgoingQueue.push(m);
        }
      }
    }
  }

  public send(msg: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') this.outgoingQueue.push(msg);
    else {
      try {
        this.dataChannel.send(msg);
      } catch {
        this.outgoingQueue.push(msg);
      }
    }
  }

  public onDataChannelOpen(handler: () => void) {
    if (this.dataChannel) {
      this.dataChannel.addEventListener('open', handler);
    }
  }

  /** ---------------- Retry & Lifecycle ---------------- */

  private handleRetry() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(() => this.initiateOffer(), 100 + Math.random() * 500);
    } else {
      this.log('Max retries reached, connection failed permanently.');
      try {
        this.pc.close();
      } catch {}
    }
  }

  public close() {
    try {
      this.ws.removeEventListener('message', this.onWsMessage);
    } catch {}
    try {
      this.pc.close();
    } catch {}
    try {
      this.dataChannel?.close();
    } catch {}
    this.log('Connection closed');
  }
}
