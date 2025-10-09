/**
 * # SignalingClient
 *
 * The `SignalingClient` manages all communication between peers through a signaling server,
 * which is essential for setting up WebRTC connections. It provides a clean interface to
 * connect, disconnect, send messages, and handle events between peers.
 *
 * ## Overview
 *
 * WebRTC cannot establish peer-to-peer connections directly — it first needs an intermediary
 * signaling server to exchange:
 * - Session descriptions (SDP offers/answers)
 * - ICE candidates
 * - Custom messages (e.g., invites, acknowledgments)
 *
 * The `SignalingClient` handles this signaling layer using a WebSocket connection.
 *
 * ---
 *
 * ## Connection Lifecycle
 *
 * 1. **Construction**
 *    - The class is initialized with an `id`, `username`, and `pubkey`.
 *    - These identify the client and authenticate it on the signaling server.
 *
 * 2. **Connect**
 *    - `connect(url)` opens a WebSocket connection to the signaling server.
 *    - On connection open:
 *      - Sends a `"join"` message with `{ id, username, pubkey }`.
 *      - Marks the client as `joined`.
 *    - Any incoming messages from the server are JSON-decoded and dispatched to registered handlers.
 *    - Errors or closure events trigger cleanup and state resets.
 *
 * 3. **Message Handling**
 *    - Incoming messages are routed by their `"type"` field.
 *    - Example types:
 *      - `"offer"`, `"answer"`, `"candidate"` → WebRTC negotiation.
 *      - `"invite"` → room or connection invitation.
 *      - `"ack"` → acknowledgment of invites or other actions.
 *      - `"signal"` → general-purpose payloads.
 *    - Handlers can be registered using `on(type, handler)` and removed with `off(type, handler)`.
 *
 * 4. **Sending Messages**
 *    - Outgoing messages are serialized as JSON and sent through the active WebSocket.
 *    - If the WebSocket is not open, messages are dropped with a warning.
 *    - Helper methods:
 *      - `sendSignal(target, signal)`
 *      - `sendOffer(target, offer)`
 *      - `sendAnswer(target, answer)`
 *      - `sendCandidate(target, candidate)`
 *      - `sendRoomInvite(target, payload)`
 *      - `sendAck(target, payload)`
 *      - `requestPeers()`
 *
 * 5. **Disconnect & Reconnect**
 *    - `disconnect()` gracefully closes the WebSocket, clears event handlers, and resets state.
 *    - `reconnect(url)` forcibly disconnects, waits briefly, and re-establishes a connection.
 *
 * ---
 *
 * ## Event Flow Example
 *
 * 1. Peer A connects:
 *    ```ts
 *    await clientA.connect('wss://signaling.example.com');
 *    ```
 *    → Server assigns A’s connection and broadcasts to others that A joined.
 *
 * 2. Peer B connects similarly.
 *
 * 3. A sends an offer to B:
 *    ```ts
 *    clientA.sendOffer('peerB', offer);
 *    ```
 *
 * 4. Server forwards this offer to B as a message:
 *    ```json
 *    { "type": "offer", "target": "peerB", "payload": { ...SDP... } }
 *    ```
 *
 * 5. B receives it and triggers the `"offer"` handler registered via `clientB.on('offer', handler)`.
 *
 * 6. B sends back an `"answer"`, and ICE candidates follow using `"candidate"` messages.
 *
 * ---
 *
 * ## Reliability Features
 *
 * - Prevents double `join` messages via the `joined` flag.
 * - Automatically cleans up handlers and reconnect timeouts on `disconnect()`.
 * - Provides a `reconnect()` utility for transient connection drops.
 * - Drops unsent messages gracefully when disconnected (with warnings).
 *
 */

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
          // console.log(msg);
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
