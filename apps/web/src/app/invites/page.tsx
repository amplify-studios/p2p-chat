'use client';

import { useInvites } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/local/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { InviteType } from '@chat/core';
import { usePeers } from '@/hooks/usePeers';
import { useToast } from '@/contexts/ToastContext';

export default function Invites() {
  useAuth();
  const { invites: currentInvites, acceptInvite, declineInvite } = useInvites();
  const { peers } = usePeers();
  const { showToast } = useToast();

  if (!currentInvites.length) {
    return <EmptyState msg="No pending invites" />;
  }

  const handleAcceptInvite = (invite: InviteType) => {
    if(!peers.some((p) => p.id == invite.from)) {
      showToast(`Peer ${invite.from} is not connected to the server`, "warning");
      return;
    }
  
    acceptInvite(invite);
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-8">Room Invites</h1>
      {currentInvites.map((invite) => (
        <div
          key={invite.inviteId}
          className="p-4 bg-card rounded shadow flex justify-between items-center"
        >
          <div>
            <p className="font-medium">{invite.name}</p>
            <p className="text-sm text-gray-500">From: {invite.from}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => declineInvite(invite)}>
              Decline
            </Button>
            <Button size="sm" onClick={() => handleAcceptInvite(invite)}>
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
