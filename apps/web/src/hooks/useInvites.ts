import { useEffect, useState } from "react";
import { getSignalingClient } from "@/lib/signalingClient";
import { useDB } from "@/hooks/useDB";
import { generateBase58Id } from "@chat/crypto";
import { connectToPeer, InviteMessage, handleSignal } from "@chat/sockets";
import { InviteType } from "@chat/core";
import { refreshRooms } from "@/lib/utils";
import { useAuth } from "./useAuth";

export function useInvites() {
  const { db, putEncr, getAllDecr } = useDB();
  const [invites, setInvites] = useState<InviteType[]>([]);
  const { key } = useAuth();

  useEffect(() => {
    if (!db || !key) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      const client = await getSignalingClient();
      console.log("client is available");

      const handleRoomInvite = async (msg: InviteMessage) => {
        console.log(msg);
        const inviteId = generateBase58Id();

        const newInvite: InviteType = {
          inviteId,
          room: msg.room,
          from: msg.from,
        };

        const encr = await putEncr("invites", newInvite, key);
        console.log(encr);
        setInvites((prev) => [...prev, newInvite]);

        console.log(`Received room invite from ${msg.from}: ${msg.room.name}`);
      };

      client.on("invite", handleRoomInvite);

      const storedInvites = await getAllDecr("invites", key) as InviteType[];
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
  }, [db, key]);

  const acceptInvite = async (invite: InviteType) => {
    if (!db || !key) return;

    await putEncr("rooms", {
      ...invite.room,
      roomId: generateBase58Id(),
    }, key);

    for(const cred of invite.room.keys) {
      await putEncr("credentials", cred, key);
    }

    await db.delete("invites", invite.inviteId);
    setInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
    refreshRooms();

    // WebRTC flow
    const client = await getSignalingClient();

    await connectToPeer(
      client,
      invite.from, // inviter’s peer id
      (msg) => {
        console.log("Message from peer:", msg);
        // TODO: push into message store
      }
    );

    client.on("signal", (msg) => {
      const { from, payload } = msg;
      handleSignal(client, from, payload, (m) => {
        console.log("Message from", from, ":", m);
      });
    });
  };

  const declineInvite = async (invite: InviteType) => {
    if (!db) return;

    await db.delete("invites", invite.inviteId);
    setInvites((prev) => prev.filter((i) => i.inviteId !== invite.inviteId));
  };

  return { invites, acceptInvite, declineInvite };
}
