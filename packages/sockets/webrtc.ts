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

  const log = (msg: string) => onLog?.(msg);

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: STUN_SERVERS }, ...TURN_SERVERS]
  });

  const queuedMessages: string[] = [];

  const sendQueued = () => {
    if (dataChannel?.readyState === "open") {
      queuedMessages.forEach((msg) => dataChannel!.send(msg));
      queuedMessages.length = 0;
    }
  };

  // Deterministic offerer: lower ID always offers
  const amOfferer = myId < peerId;

  const setupDataChannel = () => {
    dataChannel = pc.createDataChannel("chat");
    dataChannel.onopen = () => {
      log("Data channel open (offerer)");
      sendQueued();
    };
    dataChannel.onmessage = (e) => onMessage?.(e.data);
    dataChannel.onclose = () => log("Data channel closed");

    pc.ondatachannel = (e) => {
      dataChannel = e.channel;
      dataChannel.onmessage = (ev) => onMessage?.(ev.data);
      dataChannel.onopen = () => {
        log("Data channel open (answerer)");
        sendQueued();
      };
      dataChannel.onclose = () => log("Data channel closed");
    };
  };

  setupDataChannel();

  pc.onicecandidate = (e) => {
    if (!e.candidate) return;
    ws.send(
      JSON.stringify({
        type: "signal",
        target: peerId,
        from: myId,
        payload: e.candidate,
      })
    );
  };

  const handleSignal = async (msg: any) => {
    if (msg.type !== "signal" || msg.from !== peerId) return;

    if (msg.payload.sdp) {
      await pc.setRemoteDescription(msg.payload);

      if (msg.payload.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(
          JSON.stringify({
            type: "signal",
            target: peerId,
            from: myId,
            payload: answer,
          })
        );
      }
    } else if (msg.payload.candidate) {
      try {
        await pc.addIceCandidate(msg.payload);
      } catch (err) {
        log("Failed to add ICE candidate: " + err);
      }
    }
  };

  ws.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleSignal(msg);
    } catch {}
  });

  const establishConnection = async () => {
    try {
      if (amOfferer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(
          JSON.stringify({
            type: "signal",
            target: peerId,
            from: myId,
            payload: offer,
          })
        );
      }
    } catch (err) {
      log(`Connection attempt failed: ${err}`);
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(establishConnection, 2000 * retryCount);
      }
    }
  };

  await establishConnection();

  return {
    pc,
    dataChannel,
    send: (message: string) => {
      if (!dataChannel || dataChannel.readyState !== "open") {
        queuedMessages.push(message);
      } else {
        dataChannel.send(message);
      }
    },
    close: () => {
      pc.close();
      dataChannel?.close();
      log("Connection closed");
    },
  };
}
