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

  const initiateIceRestart = () => {
      if (retryCount >= maxRetries) {
          log("Max retry attempts reached. Connection failed permanently.");
          return;
      }

      log("ICE connection failed. Initiating reconnection sequence.");
      retryCount = 0;

      if (amOfferer) {
          log("Offerer: Creating new offer with ICE restart.");
          setTimeout(() => establishConnection(true), 100); 
      } else {
          log("Answerer: Requesting offerer to perform ICE restart.");
          ws.send(JSON.stringify({
              type: "signal",
              target: peerId,
              from: myId,
              payload: { type: "reconnect" },
          }));
      }
  }

  pc.oniceconnectionstatechange = () => {
      log(`ICE connection state: ${pc.iceConnectionState}`);

      if (pc.iceConnectionState === 'failed') {
          setTimeout(() => {
              if (pc.iceConnectionState === 'failed') {
                  initiateIceRestart();
              }
          }, 3000);
      }
      
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          log("ICE connection successfully established/completed.");
          retryCount = 0;
      }
  };

  const setupDataChannelEvents = (channel: RTCDataChannel, role: string) => {
      channel.onopen = () => { 
          log(`Data channel open (${role}). State: ${channel.readyState}`); 
          flushOutgoing(); 
      };
      channel.onmessage = (e) => onMessage?.(e.data);
      channel.onclose = () => log(`Data channel closed (${role})`);
      channel.onerror = (e) => log(`DataChannel error (${role}): ${e}`);
  };

  const setupDataChannelHandlers = () => {
      if (amOfferer) {
          dataChannel = pc.createDataChannel("chat");
          log(`Offerer created data channel. Initial state: ${dataChannel.readyState}`); 
          setupDataChannelEvents(dataChannel, "offerer");
      }

      pc.ondatachannel = (e) => {
          dataChannel = e.channel;
          log(`Answerer received data channel. Initial state: ${dataChannel.readyState}`); 
          setupDataChannelEvents(dataChannel, "answerer");
      };
  };

  setupDataChannelHandlers();

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


    // Handle request for initial offer from answerer
    if (payload.type === "reconnect" && amOfferer) {
      log("Answerer requested reconnect");
      initiateIceRestart(); 
      
      // Clear pending candidates as we're starting fresh
      pendingCandidates.length = 0;
      
      // Rollback if not in stable state
      if (pc.signalingState !== "stable") {
        log(`Signaling state is ${pc.signalingState}, rolling back before creating new offer`);
        try {
          await pc.setLocalDescription({ type: "rollback" });
        } catch (err) {
          log(`Rollback error: ${err}`);
        }
      }
      
      log("Creating new offer for answerer");
      await establishConnection(false);
      return;
    }

    if (payload.type === "offer") {
      try {
        log("Received offer - processing");
        
        // Clear pending candidates as we're starting fresh with a new offer
        pendingCandidates.length = 0;
        
        // If we already have a remote description, this is a renegotiation
        // We need to handle it using the "rollback" technique to avoid state conflicts
        if (pc.signalingState !== "stable") {
          log(`Signaling state is ${pc.signalingState}, rolling back before applying new offer`);
          await pc.setLocalDescription({ type: "rollback" });
        }
        
        // Set the remote description (the offer)
        await pc.setRemoteDescription(payload);
        log("setRemoteDescription done for offer");

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({
          type: "signal",
          target: msg.from,
          from: myId,
          payload: answer,
        }));
        log("Sent answer in response to offer");
      } catch (err) {
        log("Error handling offer: " + err);
      }
      return;
    }

    // Handle answer
    if (payload.type === "answer" || payload.sdp) {
      try {
        await pc.setRemoteDescription(payload);
        log("setRemoteDescription done for answer");

        // Drain pending candidates after remote description is set
        while (pendingCandidates.length) {
          const c = pendingCandidates.shift()!;
          try { await pc.addIceCandidate(c); } catch (err) { log("addIceCandidate error: " + err); }
        }
      } catch (err) {
        log("Error handling answer: " + err);
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
  if (amOfferer) {
    await establishConnection();
  } else {
    // Answerer: Signal to offerer that we're ready for a new offer
    log("Answerer ready - requesting offer from offerer");
    ws.send(JSON.stringify({
      type: "signal",
      target: peerId,
      from: myId,
      payload: { type: "reconnect" },
    }));
  }

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
