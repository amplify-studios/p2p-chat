'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { generateBase58Id } from '@chat/crypto';
import { CredentialsType, RoomType } from '@chat/core';
import { useAuth } from '@/hooks/useAuth';
import { getSignalingClient } from '@/lib/signalingClient';
import { InviteMessage } from '@chat/sockets';
import { parseBytes, refreshRooms } from '@/lib/utils';
import { usePeers } from '@/hooks/usePeers';

export default function NewRoom() {
  const user = useAuth(true);
  const db = useDB();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {peers, loading} = usePeers();

  const [name, setName] = useState('');
  const [type, setType] = useState<'single' | 'group'>('single');
  // const [keys, setKeys] = useState<CredentialsType[]>([]);
  const [otherUserId, setOtherUserId] = useState('');
  const [error, setError] = useState('');

  // Pre-fill otherUserId if query param is present
  useEffect(() => {
    const prefillId = searchParams.get('userId');
    if (prefillId) {
      setOtherUserId(prefillId);
    }
  }, [searchParams]);

  const autoaccept = searchParams.get("autoaccept") === "true";

  if (!user || !db) return <Loading />;

  const validate = () => {
    if (type === 'group' && !name.trim()) return 'Room name is required';
    if (type === 'single' && !otherUserId.trim()) return 'User ID is required for single chat';
    return '';
  };

  const handleCreateRoom = async () => {
    if(loading) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    const roomId = generateBase58Id();
    const peer = peers.find((p) => p.id == otherUserId);
    if(!peer) return;

    const localRoomName = type === 'single' ? peer.username || otherUserId : name;
    const inviteRoomName = type === 'single' ? user.username || user.userId : name;

    const room: RoomType = {
      roomId,
      name: localRoomName,
      type,
      keys: [user],
    };

    const signalingClient = await getSignalingClient();

    if (type === 'single') {
      const myId = user.userId;
      const myPubkey = user.public;
      if (!myPubkey) {
        setError('Your public key is missing, cannot create room');
        return;
      }

      const invite = {
        from: myId,
        room: { ...room, name: inviteRoomName },
        target: otherUserId,
        autoaccept,
      } as InviteMessage;

      signalingClient.sendRoomInvite(otherUserId, invite);
    }

    await db.put('rooms', room);
    await db.put('credentials', {
      userId: peer.id,
      username: peer.username,
      public: parseBytes(peer.pubkey)
    } as CredentialsType);

    refreshRooms();

    setName('');
    setOtherUserId('');
    setType('single');

    router.push(`/chat?id=${roomId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">
          Create New Room
        </h1>

        {error && <p className="text-destructive mb-4">{error}</p>}

        {type === 'group' && (
          <Input
            type="text"
            placeholder="Room Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-4"
          />
        )}

        <div className="mb-4 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="type"
              value="single"
              checked={type === 'single'}
              onChange={() => setType('single')}
            />
            Single
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="type"
              value="group"
              checked={type === 'group'}
              onChange={() => setType('group')}
            />
            Group
          </label>
        </div>

        {type === 'single' && (
          <Input
            type="text"
            placeholder="Other User ID"
            value={otherUserId}
            onChange={(e) => setOtherUserId(e.target.value)}
            className="mb-4"
          />
        )}

        <Button onClick={handleCreateRoom} className="w-full">
          Send Invite
        </Button>
      </div>
    </div>
  );
}
