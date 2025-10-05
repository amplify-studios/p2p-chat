import { STUN_SERVERS } from "./stun";

export interface WebRTCOptions {
  ws: WebSocket;
  peerId: string;
  onMessage?: (msg: string) => void;
  onLog?: (msg: string) => void;
}

export interface WebRTCConnection {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
  send: (message: string) => void;
  close: () => void;
}

/**
 * Create a WebRTC peer connection and handle offer/answer exchange via WebSocket signaling.
 */
export function createPeerConnection({ ws, peerId, myId, onMessage, onLog }: WebRTCOptions & { myId: string }): Promise<WebRTCConnection> {
  return new Promise(async (resolve) => {
    const pc = new RTCPeerConnection({ iceServers: [
      { urls: STUN_SERVERS },
      // TODO: use our own self-hosted TURN Server. See https://github.com/coturn/coturn
      // {
      //   urls: 'turn:YOUR_TURN_SERVER:3478',
      //   username: 'TURN_USERNAME',
      //   credential: 'TURN_PASSWORD',
      // },
    ] });
    let dataChannel: RTCDataChannel | null = null;

    const log = (msg: string) => onLog?.(msg);

    const handleDataChannel = (channel: RTCDataChannel) => {
      dataChannel = channel;
      dataChannel.onmessage = (e) => onMessage?.(e.data);
      dataChannel.onopen = () => log("Data channel open");
      dataChannel.onclose = () => log("Data channel closed");
    };

    // Only create a data channel if myId > peerId (deterministic role)
    if (myId > peerId) {
      dataChannel = pc.createDataChannel("chat");
      handleDataChannel(dataChannel);
    } else {
      pc.ondatachannel = (e) => handleDataChannel(e.channel);
    }

    // ICE candidate handling
    pc.onicecandidate = (e) => {
      if (e.candidate) ws.send(JSON.stringify({ type: "signal", target: peerId, payload: e.candidate }));
    };

    // Signaling messages
    ws.addEventListener("message", async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "signal" || msg.from !== peerId) return;

      if (msg.payload.sdp) {
        await pc.setRemoteDescription(msg.payload);
        if (msg.payload.type === "offer" && myId < peerId) {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: "signal", target: peerId, payload: answer }));
        }
      } else if (msg.payload.candidate) {
        try { await pc.addIceCandidate(msg.payload); } catch {}
      }
    });

    if (myId > peerId) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "signal", target: peerId, payload: offer }));
    }

    resolve({
      pc,
      dataChannel,
      send: (msg) => dataChannel?.readyState === "open" && dataChannel.send(msg),
      close: () => { pc.close(); dataChannel?.close(); },
    });
  });
}
