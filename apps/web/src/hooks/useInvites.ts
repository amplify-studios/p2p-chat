import { useEffect, useState } from "react";
import { getSignalingClient } from "@/lib/signalingClient";
import { useDB } from "@/hooks/useDB";
import { InviteType } from "@chat/core";
import { generateBase58Id } from "@chat/crypto";

export interface RoomInvite {
  from: string;
  room: InviteType;
}

export function useInvites() {
  const db = useDB();
  const [invites, setInvites] = useState<RoomInvite[]>([]);

  useEffect(() => {
    if (!db) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const client = await getSignalingClient();
      if (!client) return;

      const handleRoomInvite = async (msg: RoomInvite) => {
        await db.put("invites", {
          ...msg.room,
          inviteId: generateBase58Id()
        });
        setInvites((prev) => [...prev, msg]);
        console.log(`Received room invite from ${msg.from}: ${msg.room.name}`);
      };

      client.on("roomInvite", handleRoomInvite);

      // Fetch existing invites from DB on mount
      const storedInvites = await db.getAll("invites");
      if (storedInvites) {
        setInvites(storedInvites.map((i: any) => ({ from: i.from, room: i.room })));
      }

      cleanup = () => {
        client.off("roomInvite", handleRoomInvite);
      };
    };

    setup();

    return () => cleanup?.();
  }, [db]);

  const acceptInvite = async (invite: RoomInvite) => {
    if (!db) return;
    // Move invite to rooms table
    await db.put("rooms", {
      ...invite.room,
      roomId: generateBase58Id(),
    });
    // Remove invite from invites table
    await db.delete("invites", invite.room.name);
    setInvites((prev) => prev.filter((i) => i.room.name !== invite.room.name));
  };

  const declineInvite = async (invite: RoomInvite) => {
    if (!db) return;
    await db.delete("invites", invite.room.name);
    setInvites((prev) => prev.filter((i) => i.room.name !== invite.room.name));
  };

  return { invites, acceptInvite, declineInvite };
}
