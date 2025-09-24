import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AckMessage, SignalingClient } from "@chat/sockets";
import { CredentialsType, RoomType } from "@chat/core";
import { useDB } from "./useDB";
import { useAuth } from "./useAuth";
import { refreshRooms } from "@/lib/utils";

interface Props {
  client: SignalingClient | null;
}

export function useAcks({ client }: Props) {
  const { db, putEncr, getAllDecr } = useDB();
  const { user, key } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!client || !db || !user || !key) return;

    const handleAck = async (msg: AckMessage) => {
      const roomFromAck = msg.room;

      const storedCreds = (await getAllDecr("credentials", key)) as CredentialsType[];

      const filledKeys = roomFromAck.keys.map((k) => {
        if (k.public) return k;

        const stored = storedCreds.find((c) => c.userId === k.userId);
        return stored || k;
      });

      const room: RoomType = { ...roomFromAck, keys: filledKeys };
      console.log("Received Invite ACK from room: ", room);

      await putEncr("rooms", room, key);

      for (const cred of filledKeys) {
        await putEncr("credentials", cred, key);
      }

      refreshRooms();
      router.push(`/chat?id=${room.roomId}`);
    };

    client.on("ack", handleAck);
    return () => client.off("ack", handleAck);
  }, [client, db, putEncr, getAllDecr, user, key, router]);
}
