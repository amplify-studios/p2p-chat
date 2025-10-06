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

  const log = (msg: string) => {
    try { onLog?.(msg); } catch {}
  };

  const iceServers = [{ urls: STUN_SERVERS }, ...TURN_SERVERS];
  const pc = new RTCPeerConnection({ iceServers });

  const outgoingQueue: string[] = [];
  const flushOutgoing = () => {
    if (dataChannel && dataChannel.readyState === "open") {
      while (outgoingQueue.length) {
        const m = outgoingQueue.shift()!;
        try { dataChannel.send(m); } catch (e) { log(`send error: ${e}`); }
      }
    }
  };

  const pendingCandidates: RTCIceCandidateInit[] = [];
  const amOfferer = myId < peerId;

  // Setup data channel
  const setupDataChannelHandlers = () => {
    if (amOfferer) {
      dataChannel = pc.createDataChannel("chat");
      dataChannel.onopen = () => { log("Data channel open (offerer)"); flushOutgoing(); };
      dataChannel.onmessage = (e) => onMessage?.(e.data);
      dataChannel.onclose = () => log("Data channel closed");
      dataChannel.onerror = (e) => log("DataChannel error: " + e);
    }

    pc.ondatachannel = (e) => {
      dataChannel = e.channel;
      dataChannel.onopen = () => { log("Data channel open (answerer)"); flushOutgoing(); };
      dataChannel.onmessage = (ev) => onMessage?.(ev.data);
      dataChannel.onclose = () => log("Data channel closed");
      dataChannel.onerror = (e) => log("DataChannel error: " + e);
    };
  };

  setupDataChannelHandlers();

  // Send ICE candidates
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

  const establishConnection = async (iceRestart = false) => {
    try {
      if (amOfferer) {
        const offer = await pc.createOffer({ iceRestart });
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
        setTimeout(() => establishConnection(iceRestart), 2000 * retryCount);
      } else {
        throw err;
      }
    }
  };

  const handleSignal = async (msg: any) => {
    if (msg.type !== "signal" || msg.from !== peerId) return;
    const payload = msg.payload;
    if (!payload) return;

    // Reconnect request
    if (payload.type === "reconnect" && amOfferer) {
      log("Answerer requested reconnect, creating new offer with ICE restart");
      retryCount = 0;
      await establishConnection(true); // iceRestart: true
      return;
    }

    // SDP handling
    if (payload.type === "offer" || payload.type === "answer" || payload.sdp) {
      try {
        await pc.setRemoteDescription(payload);
        log("setRemoteDescription done");

        while (pendingCandidates.length) {
          const c = pendingCandidates.shift()!;
          try { await pc.addIceCandidate(c); } catch (err) { log("addIceCandidate error: " + err); }
        }

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

    // ICE candidate
    if (payload.candidate) {
      if (!pc.remoteDescription) {
        pendingCandidates.push(payload.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch (err) { log("Failed to add ICE candidate: " + err); }
    }
  };

  const onWsMessage = (event: MessageEvent) => {
    try { handleSignal(JSON.parse(event.data)); } catch {}
  };

  ws.addEventListener("message", onWsMessage);

  // Establish initial connection
  await establishConnection();

  return {
    pc,
    dataChannel,
    send: (message: string) => {
      if (!dataChannel || dataChannel.readyState !== "open") {
        outgoingQueue.push(message);
      } else {
        try { dataChannel.send(message); } catch { outgoingQueue.push(message); }
      }
    },
    close: () => {
      try { ws.removeEventListener("message", onWsMessage); } catch {}
      try { pc.close(); } catch {}
      try { dataChannel?.close(); } catch {}
      log("Connection closed");
    },
  };
}
