import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { QrAckMessage, SignalingClient } from "@chat/sockets";
import { RoomType } from "@chat/core";
import { useDB } from "./useDB";
import { useAuth } from "./useAuth";
import { generateBase58Id } from "@chat/crypto";
import { refreshRooms } from "@/lib/utils";

interface props {
  client: SignalingClient | null
};

export function useQrAcks({client}: props) {
  const {db, putEncr } = useDB();
  const { user, key } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!client || !db || !user) return;

    const handleQrAck = async (msg: QrAckMessage) => {
      if (!key) return;

      const room = {
        ...msg.room,
        roomId: generateBase58Id(),
      } as RoomType;

      await putEncr("rooms", room, key);

      for (const k of room.keys) {
        await putEncr("credentials", k, key);
      }

      refreshRooms();
      router.push(`/chat?id=${room.roomId}`);
    };

    client.on("qrack", handleQrAck);
    return () => {
      client.off("qrack", handleQrAck);
    };
  }, [client, db, user, key, router]);
}

