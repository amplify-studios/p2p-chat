import { SignalingClient } from "./SignalingClient";

const peers: Record<string, RTCPeerConnection> = {};
const dataChannels: Record<string, RTCDataChannel> = {};

// NOTE: Basic STUN config (should be expanded)
const rtcConfig: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

// Utility for creating/returning a peer connection
function getPeerConnection(client: SignalingClient, peerId: string, onMessage: (msg: string) => void): RTCPeerConnection {
  if (peers[peerId]) return peers[peerId];

  const pc = new RTCPeerConnection(rtcConfig);

  // Remote creates data channel
  pc.ondatachannel = (e) => {
    const channel = e.channel;
    dataChannels[peerId] = channel;
    channel.onmessage = (ev) => onMessage(ev.data);
  };

  // ICE candidates
  pc.onicecandidate = async (e) => {
    if (e.candidate) {
      client.sendSignal(peerId, e.candidate);
    }
  };

  peers[peerId] = pc;
  return pc;
}

/**
 * Start a connection to a peer after invite is accepted.
 */
export async function connectToPeer(
  client: SignalingClient,
  peerId: string,
  onMessage: (msg: string) => void
) {
  const pc = getPeerConnection(client, peerId, onMessage);

  // Create data channel for chat
  const channel = pc.createDataChannel("chat");
  dataChannels[peerId] = channel;
  channel.onmessage = (ev) => onMessage(ev.data);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  client.sendSignal(peerId, offer);
}

/**
 * Handle incoming signaling messages (SDP or ICE)
 */
export async function handleSignal(
  client: SignalingClient,
  from: string,
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  onMessage: (msg: string) => void
) {
  const pc = getPeerConnection(client, from, onMessage);

  if ("sdp" in payload) {
    // Received an SDP
    await pc.setRemoteDescription(new RTCSessionDescription(payload));
    if (payload.type === "offer") {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      client.sendSignal(from, answer);
    }
  } else if ("candidate" in payload) {
    // Received ICE candidate
    try {
      await pc.addIceCandidate(new RTCIceCandidate(payload));
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  }
}

/**
 * Send a chat message over the data channel
 */
export function sendMessage(peerId: string, msg: string) {
  const channel = dataChannels[peerId];
  if (channel && channel.readyState === "open") {
    channel.send(msg);
  } else {
    console.warn("Data channel not ready");
  }
}

