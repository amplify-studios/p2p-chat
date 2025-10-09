import { WebRTCConnection } from '@chat/sockets/webrtc';
import { PeerInfo } from '@chat/sockets';

interface ConnectionsMap {
  [peerId: string]: WebRTCConnection;
}

const connectionsRef: ConnectionsMap = {};

export function getConnection(peerId: string) {
  return connectionsRef[peerId];
}

export function createConnection(
  peer: PeerInfo,
  ws: WebSocket,
  myId: string,
  onMessage?: (msg: string) => void,
  onLog?: (msg: string) => void
): WebRTCConnection {
  if (!connectionsRef[peer.id]) {
    connectionsRef[peer.id] = new WebRTCConnection({
      ws,
      myId,
      peerId: peer.id,
      onMessage,
      onLog,
    });
  } else if (onMessage) {
    connectionsRef[peer.id].setOnMessage(onMessage);
  }
  return connectionsRef[peer.id];
}

export function setOnMessage(peerId: string, callback: (msg: string) => void) {
  connectionsRef[peerId]?.setOnMessage(callback);
}

export function sendMessage(peerId: string, msg: string) {
  const conn = connectionsRef[peerId];
  if (conn) conn.send(msg);
  else console.warn(`[peerStore] Tried to send message but no connection for ${peerId}`);
}

export function getAllConnections() {
  return { ...connectionsRef };
}

export function closeConnection(peerId: string) {
  if (connectionsRef[peerId]) {
    connectionsRef[peerId].close();
    delete connectionsRef[peerId];
  }
}

export function closeAllConnections() {
  Object.values(connectionsRef).forEach((c) => c.close());
  for (const id in connectionsRef) delete connectionsRef[id];
}

