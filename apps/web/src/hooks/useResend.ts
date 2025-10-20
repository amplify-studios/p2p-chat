import { useEffect } from "react";
import { usePeers } from "./usePeers";
import { useDB } from "./useDB";
import { useAuth } from "./useAuth";
import { MessageType } from "@chat/core";
import { useRooms } from "./useRooms";
import { usePeerStore } from "@/lib/peerStore";
import { prepareSendMessagePackage } from "@/lib/messaging";

export function useResend() {
  const { user, key } = useAuth();
  const { friends } = usePeers(); 
  const { putEncr, getAllDecr } = useDB();
  const { rooms } = useRooms();
  const { getConnection } = usePeerStore();

  useEffect(() => {
    if(!key) return;

    (async () => {
      const allMessages = (await getAllDecr("messages", key)) as MessageType[];
      const pendingMessages = allMessages.filter((m) => !m.sent);
      const roomsWithPendingMessages = rooms.filter((r) => pendingMessages.some((m) => m.roomId == r.roomId));
      const userIds = roomsWithPendingMessages.map((r) => r.keys);

      userIds.forEach((credentials) => {
        const cred = credentials.filter((c) => c.userId != user?.userId)[0]; // assuming only single rooms exist

        const room = roomsWithPendingMessages.filter((r) => r.keys.some((k) => k.userId == cred.userId))[0]; // assuming only one room for each user
        const messages = pendingMessages.filter((m) => m.roomId == room.roomId);

        messages.forEach((message) => {
          const encrText = prepareSendMessagePackage(cred.public, message.message);
          const text = JSON.stringify(encrText);

          const conn = getConnection(cred.userId);
          if (conn) {
            conn.send(text);
          }

          // TODO: update sent to false
        });
      });

    })()
  }, [friends.map((f) => f.online)]);
}
