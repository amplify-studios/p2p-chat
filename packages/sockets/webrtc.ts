import { STUN_SERVERS } from "./stun";

export interface WebRTCOptions {
  ws: WebSocket;
  myId: string;
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
export function createPeerConnection({
  ws,
  myId,
  peerId,
  onMessage,
  onLog,
}: WebRTCOptions): Promise<WebRTCConnection> {
  return new Promise(async (resolve) => {
    const log = (msg: string) => onLog?.(msg);
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: STUN_SERVERS }],
    });

    let dataChannel: RTCDataChannel | null = null;

    // Data channel (local)
    dataChannel = pc.createDataChannel("chat");
    dataChannel.onmessage = (e) => onMessage?.(e.data);

    // ICE candidate handling
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        ws.send(
          JSON.stringify({
            type: "signal",
            target: peerId,
            payload: e.candidate,
          })
        );
      }
    };

    // Remote data channel
    pc.ondatachannel = (e) => {
      const remoteChannel = e.channel;
      remoteChannel.onmessage = (ev) => onMessage?.("Peer: " + ev.data);
      dataChannel = remoteChannel;
    };

    // Handle incoming signaling
    ws.addEventListener("message", async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "signal") return;
      if (msg.from !== peerId) return;

      if (msg.payload.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        if (msg.payload.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(
            JSON.stringify({
              type: "signal",
              target: msg.from,
              payload: answer,
            })
          );
        }
      } else if (msg.payload.candidate) {
        try {
          await pc.addIceCandidate(msg.payload);
        } catch (err) {
          console.error("Error adding candidate", err);
        }
      }
    });

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(
      JSON.stringify({
        type: "signal",
        target: peerId,
        payload: offer,
      })
    );

    log?.(`Connecting to ${peerId}...`);

    resolve({
      pc,
      dataChannel,
      send: (message: string) => {
        if (dataChannel && dataChannel.readyState === "open") {
          dataChannel.send(message);
        } else {
          log?.("Channel not ready");
        }
      },
      close: () => {
        pc.close();
        dataChannel?.close();
        log?.("Connection closed");
      },
    });
  });
}
