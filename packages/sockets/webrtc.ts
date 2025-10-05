import { STUN_SERVERS, TURN_SERVERS } from "./stun";

export interface WebRTCOptions {
  ws: WebSocket;
  myId: string;
  peerId: string;
  onMessage?: (msg: string) => void;
  onLog?: (msg: string) => void;
  maxRetries?: number;
}

export interface WebRTCConnection {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  send: (message: string) => void;
  close: () => void;
}

/**
 * createPeerConnection
 * - Deterministic offerer (myId < peerId offers)
 * - Data channel created only by offerer
 * - Queues outgoing messages until data channel open
 * - Queues incoming ICE candidates until remoteDescription is set
 * - Adds a single ws message listener and removes it on close
 */
export async function createPeerConnection({
  ws,
  myId,
  peerId,
  onMessage,
  onLog,
  maxRetries = 5,
}: WebRTCOptions): Promise<WebRTCConnection> {
  let retryCount = 0;
  let dataChannel: RTCDataChannel | null = null;

  const log = (msg: string) => {
    try { onLog?.(msg); } catch {}
  };

  // Ensure STUN_SERVERS is an array of RTCIceServer or string items converted properly.
  const iceServers = [{ urls: STUN_SERVERS }, ...TURN_SERVERS];

  const pc = new RTCPeerConnection({ iceServers });

  // outgoing message queue (used by returned send())
  const outgoingQueue: string[] = [];
  const flushOutgoing = () => {
    if (dataChannel && dataChannel.readyState === "open") {
      while (outgoingQueue.length) {
        const m = outgoingQueue.shift()!;
        try { dataChannel.send(m); } catch (e) { log(`send error: ${e}`); }
      }
    }
  };

  // incoming ICE candidate queue until remoteDescription is set
  const pendingCandidates: RTCIceCandidateInit[] = [];

  // Deterministic offerer: lower ID offers
  const amOfferer = myId < peerId;

  // Setup data channel only for offerer, and ondatachannel for answerer
  const setupDataChannelHandlers = () => {
    if (amOfferer) {
      // create local data channel
      dataChannel = pc.createDataChannel("chat");
      dataChannel.onopen = () => {
        log("Data channel open (offerer)");
        flushOutgoing();
      };
      dataChannel.onmessage = (e) => onMessage?.(e.data);
      dataChannel.onclose = () => log("Data channel closed");
      dataChannel.onerror = (e) => log("DataChannel error: " + e);
    }

    // answerer will receive the remote channel here
    pc.ondatachannel = (e) => {
      dataChannel = e.channel;
      dataChannel.onmessage = (ev) => onMessage?.(ev.data);
      dataChannel.onopen = () => {
        log("Data channel open (answerer)");
        flushOutgoing();
      };
      dataChannel.onclose = () => log("Data channel closed");
      dataChannel.onerror = (e) => log("DataChannel error: " + e);
    };
  };

  setupDataChannelHandlers();

  // Send ICE candidates via signaling
  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    try {
      ws.send(JSON.stringify({
        type: "signal",
        target: peerId,
        from: myId,
        payload: { candidate: e.candidate },
      }));
    } catch (err) {
      log("Failed to send ICE candidate: " + err);
    }
  };
  
  // Establish connection (offer if offerer). Retries on failure.
  const establishConnection = async () => {
    try {
      if (amOfferer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({
          type: "signal",
          target: peerId,
          from: myId,
          payload: offer,
        }));
      }
    } catch (err) {
      log(`Connection attempt failed: ${err}`);
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(establishConnection, 2000 * retryCount);
      } else {
        throw err;
      }
    }
  };

  // Handle remote signals: use a single handler we can remove on close
  const handleSignal = async (msg: any) => {
    if (msg.type !== "signal" || msg.from !== peerId) return;

    const payload = msg.payload;

    if (payload && payload.type === "hello" && amOfferer) {
        log("Received HELLO signal, re-initiating offer.");
        
        // This is necessary to clear old state if a half-connection was present
        // Rollback is a standard way to reset negotiation state without closing the PC
        try { await pc.setLocalDescription({ type: "rollback" } as any); } catch {}
        try { await pc.setRemoteDescription({ type: "rollback" } as any); } catch {}
        
        // Reset retry count to allow a full set of attempts for the new connection
        retryCount = 0; 
        await establishConnection();
        return;
    }

    // SDP handling
    if (payload && (payload.type === "offer" || payload.type === "answer" || payload.sdp)) {
      // setRemoteDescription expects a RTCSessionDescriptionInit-like object
      try {
        await pc.setRemoteDescription(payload);
        log("setRemoteDescription done");

        // after setting remote description, add any pending ICE candidates
        while (pendingCandidates.length) {
          const c = pendingCandidates.shift()!;
          try { await pc.addIceCandidate(c); } catch (err) { log("addIceCandidate error: " + err); }
        }

        // if we got an offer (and we are answerer), create an answer
        if (payload.type === "offer" && !amOfferer) {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({
            type: "signal",
            target: msg.from,
            from: myId,
            payload: answer,
          }));
        }
      } catch (err) {
        log("Error handling SDP: " + err);
      }
      return;
    }

    // Candidate handling
    if (payload && payload.candidate) {
      // If remoteDescription not set yet, queue candidate
      if (!pc.remoteDescription) {
        pendingCandidates.push(payload.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch (err) {
        log("Failed to add ICE candidate: " + err);
      }
    }
  };

  const onWsMessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      handleSignal(msg);
    } catch (e) {
      // ignore malformed
    }
  };

  ws.addEventListener("message", onWsMessage);

  await establishConnection();

  return {
    pc,
    dataChannel,
    send: (message: string) => {
      // queue if not open
      if (!dataChannel || dataChannel.readyState !== "open") {
        outgoingQueue.push(message);
      } else {
        try { dataChannel.send(message); } catch (e) { outgoingQueue.push(message); }
      }
    },
    close: () => {
      try {
        ws.removeEventListener("message", onWsMessage);
      } catch {}
      try { pc.close(); } catch {}
      try { dataChannel?.close(); } catch {}
      log("Connection closed");
    },
  };
}
