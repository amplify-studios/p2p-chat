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

  const log = (msg: string) => { try { onLog?.(msg); } catch {} };

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: STUN_SERVERS }, ...TURN_SERVERS],
  });

  const outgoingQueue: string[] = [];
  const pendingCandidates: RTCIceCandidateInit[] = [];

  const flushOutgoing = () => {
    if (dataChannel && dataChannel.readyState === "open") {
      while (outgoingQueue.length) {
        const msg = outgoingQueue.shift()!;
        try { dataChannel.send(msg); } catch { outgoingQueue.unshift(msg); break; }
      }
    }
  };

  // --- Data Channel Setup ---
  const setupDataChannel = (channel: RTCDataChannel, role: string) => {
    channel.onopen = () => { log(`Data channel open (${role})`); flushOutgoing(); };
    channel.onmessage = (e) => onMessage?.(e.data);
    channel.onclose = () => log(`Data channel closed (${role})`);
    channel.onerror = (e) => log(`DataChannel error (${role}): ${e}`);
  };

  // Only one peer will create the data channel based on IDs
  const isInitiator = myId < peerId;
  if (isInitiator) {
    dataChannel = pc.createDataChannel("chat");
    log(`Created data channel (creator)`);
    setupDataChannel(dataChannel, "creator");
  }

  pc.ondatachannel = (e) => {
    if (!dataChannel) {
      dataChannel = e.channel;
      log(`Received remote data channel`);
      setupDataChannel(dataChannel, "receiver");
    }
  };

  // --- ICE ---
  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    try {
      ws.send(JSON.stringify({
        type: "signal",
        target: peerId,
        from: myId,
        payload: { candidate: e.candidate },
      }));
    } catch (err) { log("Failed to send ICE candidate: " + err); }
  };

  pc.oniceconnectionstatechange = () => {
    log(`ICE connection state: ${pc.iceConnectionState}`);
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") retryCount = 0;
  };

  // --- Connection Handling with Collision Resolution ---
  let makingOffer = false;

  const establishConnection = async () => {
    try {
      makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({
        type: "signal",
        target: peerId,
        from: myId,
        payload: offer,
      }));
      log("Sent offer");
    } catch (err) {
      log(`Offer failed: ${err}`);
    } finally {
      makingOffer = false;
    }
  };

  const handleSignal = async (msg: any) => {
    if (msg.type !== "signal" || msg.from !== peerId) return;
    const payload = msg.payload;
    if (!payload) return;

    // --- ICE candidate ---
    if (payload.candidate) {
      if (!pc.remoteDescription) { pendingCandidates.push(payload.candidate); return; }
      try { await pc.addIceCandidate(payload.candidate); } catch (err) { log("Failed to add ICE candidate: " + err); }
      return;
    }

    // --- Offer ---
    if (payload.type === "offer") {
      const offerCollision = makingOffer || pc.signalingState !== "stable";
      if (offerCollision) {
        // tie-breaker: lower ID wins
        if (myId < peerId) {
          log("Offer collision detected, ignoring remote offer (we are initiator)");
          return;
        } else {
          log("Offer collision detected, rolling back and accepting remote offer");
          await pc.setLocalDescription({ type: "rollback" });
        }
      }
      await pc.setRemoteDescription(payload);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({
        type: "signal",
        target: peerId,
        from: myId,
        payload: answer,
      }));
      log("Sent answer in response to offer");
      return;
    }

    // --- Answer ---
    if (payload.type === "answer" || payload.sdp) {
      if (pc.signalingState !== "have-local-offer") {
        log("Answer received but signalingState not 'have-local-offer', ignoring");
        return;
      }
      await pc.setRemoteDescription(payload);
      while (pendingCandidates.length) {
        const c = pendingCandidates.shift()!;
        try { await pc.addIceCandidate(c); } catch (err) { log("addIceCandidate error: " + err); }
      }
      log("Answer applied successfully");
      return;
    }
  };

  ws.addEventListener("message", (event) => {
    try { handleSignal(JSON.parse(event.data)); } catch {}
  });

  // --- Initial Connection ---
  if (isInitiator) await establishConnection();

  return {
    pc,
    dataChannel,
    send: (message: string) => {
      if (!dataChannel || dataChannel.readyState !== "open") outgoingQueue.push(message);
      else try { dataChannel.send(message); } catch { outgoingQueue.push(message); }
    },
    close: () => {
      try { pc.close(); } catch {}
      try { dataChannel?.close(); } catch {}
      log("Connection closed");
    },
  };
}
