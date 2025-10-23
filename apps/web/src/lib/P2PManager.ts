import { WebRTCConnection } from '@chat/sockets/webrtc';
import { PeerInfo } from '@chat/sockets';
import { createECDHkey, EncryptedStorageType } from '@chat/crypto';
import { returnDecryptedMessage } from '@/lib/messaging';
import { findRoomIdByPeer } from '@/lib/utils';
import { MessageType, Type } from '@chat/core';
import { Collection } from './storage';

type MessageCallback = (msg: string) => void;
type LogCallback = (msg: string) => void;

interface ConnectionEntry {
  conn: WebRTCConnection;
  isReady: boolean;
}

export class P2PManager {
  private static instance: P2PManager;
  private connections: Record<string, ConnectionEntry> = {};

  private constructor() {}

  static getInstance() {
    if (!P2PManager.instance) {
      P2PManager.instance = new P2PManager();
    }
    return P2PManager.instance;
  }

  createConnection(
    peer: PeerInfo,
    ws: WebSocket,
    myId: string,
    onMessage?: MessageCallback,
    onLog?: LogCallback
  ): WebRTCConnection {
    let entry = this.connections[peer.id];
    if (entry) {
      if (onMessage) entry.conn.setOnMessage(onMessage);
      if (onLog) entry.conn.setOnLog(onLog);
      return entry.conn;
    }

    const conn = new WebRTCConnection({ ws, myId, peerId: peer.id, onMessage, onLog });
    this.connections[peer.id] = { conn, isReady: false };

    conn.onDataChannelOpen(() => {
      this.connections[peer.id].isReady = true;
      console.log(`[P2PManager] Data channel ready for ${peer.id}`);
    });

    return conn;
  }

  setOnMessage(id: string, onMessage: MessageCallback) {
    if(!this.connections[id]) return;
    this.connections[id].conn.setOnMessage(onMessage);
  }

  async connectToPeer(
    peer: PeerInfo,
    ws: WebSocket,
    myId: string,
    key: Uint8Array,
    getAllDecr: (collection: Collection, key: Uint8Array) => Promise<any[]>,
    putEncr: (collection: Collection, obj: Type, key: Uint8Array, collectionKey?: string | number) => Promise<EncryptedStorageType | null>,
    blocks: { userId: string }[],
    onDataChannelOpen?: () => void
  ): Promise<WebRTCConnection | undefined> {
    if (blocks.find(b => b.userId === peer.id)) return;

    let entry = this.connections[peer.id];
    if (entry) {
      if (onDataChannelOpen && entry.isReady) onDataChannelOpen();
      return entry.conn;
    }

    const conn = this.createConnection(
      peer,
      ws,
      myId,
      async (encrMsg) => {
        try {
          const parsed = JSON.parse(encrMsg);
          const ecdh = createECDHkey();
          const msg = returnDecryptedMessage(ecdh, parsed);
          const rooms = (await getAllDecr('rooms', key)) ?? [];
          const roomId = findRoomIdByPeer(rooms, peer.id);

          await putEncr(
            'messages',
            { roomId, senderId: peer.id, message: msg, timestamp: Date.now(), sent: true, read: false } as MessageType,
            key
          );
        } catch (err) {
          console.error('[P2PManager] Failed to handle incoming message', err);
        }
      },
      (log) => console.log(`[WebRTC] ${log}`)
    );

    if (onDataChannelOpen) {
      conn.onDataChannelOpen(onDataChannelOpen);
    }

    return conn;
  }

  getConnection(peerId: string): WebRTCConnection | undefined {
    return this.connections[peerId]?.conn;
  }

  isReady(peerId: string): boolean {
    return this.connections[peerId]?.isReady ?? false;
  }

  sendMessage(peerId: string, msg: string) {
    const entry = this.connections[peerId];
    if (entry && entry.isReady) {
      entry.conn.send(msg);
    } else {
      console.warn(`[P2PManager] Connection not ready for ${peerId}`);
    }
  }

  closeConnection(peerId: string) {
    const entry = this.connections[peerId];
    if (entry) {
      entry.conn.close();
      delete this.connections[peerId];
    }
  }

  closeAll() {
    Object.values(this.connections).forEach(e => e.conn.close());
    this.connections = {};
  }
}

export const p2pManager = P2PManager.getInstance();
