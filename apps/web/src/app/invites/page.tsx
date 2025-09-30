'use client';

import { useInvites } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/local/EmptyState';
import { useAuth } from '@/hooks/useAuth';

export default function Invites() {
  useAuth();
  const { invites: currentInvites, acceptInvite, declineInvite } = useInvites();


  if (!currentInvites.length) {
    return <EmptyState msg="No pending invites" />;
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-2xl font-bold mb-4">Room Invites</h1>
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
            <Button size="sm" onClick={() => acceptInvite(invite)}>
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

