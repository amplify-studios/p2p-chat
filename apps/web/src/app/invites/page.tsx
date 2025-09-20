'use client';

import { useState, useEffect } from "react";
import { useInvites } from "@/hooks/useInvites";
import { useDB } from "@/hooks/useDB";
import { Button } from "@/components/ui/button";

export default function Invites() {
  const db = useDB();
  const invites = useInvites();

  const [currentInvites, setCurrentInvites] = useState(invites || []);

  // Keep state in sync with hook
  useEffect(() => {
    setCurrentInvites(invites || []);
  }, [invites]);

  const acceptInvite = async (invite: { from: string; room: any }) => {
    if (!db) return;

    // Add room to rooms store
    await db.put("rooms", invite.room);

    // Remove from invites store
    await db.delete("invites", invite.room.roomId);

    // Update local state
    setCurrentInvites((prev) => prev.filter((i) => i.room.roomId !== invite.room.roomId));

    console.log(`Accepted invite from ${invite.from}: ${invite.room.name}`);
  };

  const declineInvite = async (invite: { from: string; room: any }) => {
    if (!db) return;

    // Simply remove from invites store
    await db.delete("invites", invite.room.roomId);

    // Update local state
    setCurrentInvites((prev) => prev.filter((i) => i.room.roomId !== invite.room.roomId));

    console.log(`Declined invite from ${invite.from}: ${invite.room.name}`);
  };

  if (!currentInvites.length) {
    return (
      <div className="p-6 text-center text-gray-500">
        No pending invites
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold mb-4">Room Invites</h1>
      {currentInvites.map((invite) => (
        <div key={invite.room.roomId} className="p-4 bg-card rounded shadow flex justify-between items-center">
          <div>
            <p className="font-medium">{invite.room.name}</p>
            <p className="text-sm text-gray-500">From: {invite.from}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => declineInvite(invite)}>Decline</Button>
            <Button size="sm" onClick={() => acceptInvite(invite)}>Accept</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
