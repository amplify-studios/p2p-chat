import { useEffect } from "react";
import { usePeers } from "./usePeers";
import { useDB } from "./useDB";
import { useAuth } from "./useAuth";
import { MessageType } from "@chat/core";
import { useRooms } from "./useRooms";
import { prepareSendMessagePackage } from "@/lib/messaging";
import { usePeerConnections } from "@/contexts/PeerContext";

export function useResend() {
  const { user, key } = useAuth();
  const { friends } = usePeers();
  const { updateEncr, getAllDecr } = useDB();
  const { rooms } = useRooms();
  const { getConnection } = usePeerConnections();

  useEffect(() => {
    if (!key || !user) return;

    const resendPendingMessages = async () => {
      const allMessages = (await getAllDecr("messages", key)) as MessageType[];
      const pending = allMessages.filter((m) => !m.sent);
      if (pending.length === 0) return;

      // Group pending messages by roomId
      const grouped = new Map<string, MessageType[]>();
      for (const msg of pending) {
        if (!grouped.has(msg.roomId)) grouped.set(msg.roomId, []);
        grouped.get(msg.roomId)!.push(msg);
      }

      for (const [roomId, messages] of grouped.entries()) {
        const room = rooms.find((r) => r.roomId === roomId);
        if (!room) continue;

        // Assume 1-to-1 chat, find the other participant
        const recipient = room.keys.find((k) => k.userId !== user.userId);
        if (!recipient) continue;

        const conn = getConnection(recipient.userId);
        if (!conn || !conn.isConnected()) continue;

        for (const msg of messages) {
          try {
            const encrypted = prepareSendMessagePackage(
              recipient.public,
              msg.message
            );
            conn.send(JSON.stringify(encrypted));

            await updateEncr("messages", key, msg.id, (decr) => { return { ...decr, sent: true } });
          } catch (err) {
            console.error("Failed to resend message:", err);
          }
        }
      }
    };

    resendPendingMessages();
  }, [key, user, rooms, friends]);
}
