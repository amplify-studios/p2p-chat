import { useEffect, useState } from "react";
import { getSignalingClient } from "@/lib/signalingClient";
import { useDB } from "@/hooks/useDB";
import { generateBase58Id } from "@chat/crypto";
import { InviteMessage } from "@chat/sockets";
import { InviteType } from "@chat/core";
import { refreshRooms } from "@/lib/utils";

export function useInvites() {
  const db = useDB();
  const [invites, setInvites] = useState<InviteType[]>([]);

  useEffect(() => {
    if (!db) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const client = await getSignalingClient();
      if (!client) return;

      const handleRoomInvite = async (msg: InviteMessage) => {
        const inviteId = generateBase58Id();

        const newInvite: InviteType = {
          inviteId,
          room: msg.room,
          from: msg.from,
        };

        if(msg.autoaccept){
          await db.put("rooms", {
            ...newInvite.room,
            roomId: generateBase58Id(),
          });
          return;
        }

        await db.put("invites", newInvite);
        setInvites((prev) => [...prev, newInvite]);

        console.log(`Received room invite from ${msg.from}: ${msg.room.name}`);
      };

      client.on("invite", handleRoomInvite);

      const storedInvites = await db.getAll("invites");
      if (storedInvites) {
        const normalized = storedInvites.map((i: InviteType) => ({
          inviteId: i.inviteId ?? generateBase58Id(),
          from: i.from ?? "",
          room: i.room ?? { roomId: "", name: "", type: "single", keys: [] },
        }));
        setInvites(normalized);
      }

      cleanup = () => {
        client.off("invite", handleRoomInvite);
      };
    };

    setup();

    return () => cleanup?.();
  }, [db]);

  const acceptInvite = async (invite: InviteType) => {
    if (!db) return;

    await db.put("rooms", {
      ...invite.room,
      roomId: generateBase58Id(),
    });

    for(const cred of invite.room.keys) {
      await db.put("credentials", cred);
    }

    await db.delete("invites", invite.inviteId);
    setInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
    refreshRooms();
  };

  const declineInvite = async (invite: InviteType) => {
    if (!db) return;

    await db.delete("invites", invite.inviteId);
    setInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
  };

  return { invites, acceptInvite, declineInvite };
}
