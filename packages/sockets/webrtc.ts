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
  let makingOffer = false;
  let ignoreOffer = false;
  let isSettingRemote = false;

  const log = (msg: string) => { try { onLog?.(msg); } catch {} };

  const iceServers = [{ urls: STUN_SERVERS }, ...TURN_SERVERS];
  const pc = new RTCPeerConnection({ iceServers });

  const outgoingQueue: string[] = [];
  const flushOutgoing = () => {
    if (dataChannel && dataChannel.readyState === "open") {
      while (outgoingQueue.length) {
        const m = outgoingQueue.shift()!;
        try { dataChannel.send(m); } catch { outgoingQueue.push(m); }
      }
    }
  };

  const pendingCandidates: RTCIceCandidateInit[] = [];

  const setupDataChannel = (channel: RTCDataChannel, role: string) => {
    channel.onopen = () => { log(`Data channel open (${role})`); flushOutgoing(); };
    channel.onmessage = (e) => onMessage?.(e.data);
    channel.onclose = () => log(`Data channel closed (${role})`);
    channel.onerror = (e) => log(`DataChannel error (${role}): ${e}`);
  };

  // Always create a data channel; the remote peer will catch it on ondatachannel
  try {
    dataChannel = pc.createDataChannel("chat");
    setupDataChannel(dataChannel, "creator");
  } catch (e) {
    log("Failed to create data channel: " + e);
  }

  pc.ondatachannel = (e) => {
    dataChannel = e.channel;
    setupDataChannel(dataChannel, "receiver");
  };

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
    if (pc.iceConnectionState === "failed") {
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(() => initiateOffer(), 100 + Math.random() * 500);
      } else {
        log("Max retries reached, connection failed permanently.");
      }
    }
  };

  const initiateOffer = async () => {
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
      log("Sent offer to peer");
    } catch (err) {
      log("Offer failed: " + err);
    } finally {
      makingOffer = false;
    }
  };

  const handleSignal = async (msg: any) => {
    if (msg.type !== "signal" || msg.from !== peerId) return;
    const payload = msg.payload;
    if (!payload) return;

    // ICE candidate
    if (payload.candidate) {
      if (pc.remoteDescription) {
        try { await pc.addIceCandidate(payload.candidate); }
        catch (err) { log("Failed to add ICE candidate: " + err); }
      } else pendingCandidates.push(payload.candidate);
      return;
    }

    // Offer
    if (payload.type === "offer") {
      const offerCollision = makingOffer || pc.signalingState !== "stable";
      ignoreOffer = !offerCollision ? false : myId > peerId; // higher id yields
      if (ignoreOffer) return;

      try {
        isSettingRemote = true;
        if (pc.signalingState !== "stable") await pc.setLocalDescription({ type: "rollback" });
        await pc.setRemoteDescription(payload);
        isSettingRemote = false;

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({
          type: "signal",
          target: msg.from,
          from: myId,
          payload: answer,
        }));

        // flush pending candidates
        while (pendingCandidates.length) {
          const c = pendingCandidates.shift()!;
          await pc.addIceCandidate(c);
        }
        log("Sent answer to peer");
      } catch (err) { log("Error handling offer: " + err); }
      return;
    }

    // Answer
    if (payload.type === "answer") {
      try {
        await pc.setRemoteDescription(payload);
        while (pendingCandidates.length) {
          const c = pendingCandidates.shift()!;
          await pc.addIceCandidate(c);
        }
        log("Set remote description for answer");
      } catch (err) { log("Error handling answer: " + err); }
      return;
    }
  };

  const onWsMessage = (event: MessageEvent) => { try { handleSignal(JSON.parse(event.data)); } catch {} };
  ws.addEventListener("message", onWsMessage);

  // Start negotiation immediately
  initiateOffer();

  return {
    pc,
    dataChannel,
    send: (msg: string) => {
      if (!dataChannel || dataChannel.readyState !== "open") outgoingQueue.push(msg);
      else try { dataChannel.send(msg); } catch { outgoingQueue.push(msg); }
    },
    close: () => {
      try { ws.removeEventListener("message", onWsMessage); } catch {}
      try { pc.close(); } catch {}
      try { dataChannel?.close(); } catch {}
      log("Connection closed");
    },
  };
}
