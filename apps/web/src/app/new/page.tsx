'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDB } from '@/hooks/useDB';
import Loading from '@/components/local/Loading';
import { generateBase58Id } from '@chat/crypto';
import {
  CredentialsType,
  decodePayload,
  encodePayload,
  RoomType,
} from '@chat/core';
import { useAuth } from '@/hooks/useAuth';
import { getSignalingClient } from '@/lib/signalingClient';
import { InviteMessage, AckMessage } from '@chat/sockets';
import { refreshRooms } from '@/lib/utils';
import { usePeers } from '@/hooks/usePeers';
import useClient from '@/hooks/useClient';
import ResponsiveQr from '@/components/local/ResponsiveQr';

export default function NewRoom() {
  const { user, key } = useAuth();
  const { db, putEncr }  = useDB();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { peers, loading } = usePeers();
  const { client } = useClient();

  const [name, setName] = useState('');
  const [type, setType] = useState<'single' | 'group'>('single');
  const [otherUserId, setOtherUserId] = useState('');
  const [error, setError] = useState('');
  const [qrValue, setQrValue] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !db || !user || !key) return;

    const prefillId = searchParams.get("userId");
    if (prefillId) {
      setOtherUserId(prefillId);
    }

    const handleQrInvite = async () => {
      const qrParam = searchParams.get("qr");
      if (!qrParam) return;

      try {
        const decoded = decodePayload(qrParam);

        const creds: CredentialsType = {
          userId: decoded.userId,
          username: decoded.username,
          public: decoded.public,
        };

        const room: RoomType = {
          roomId: generateBase58Id(),
          name: decoded.roomName,
          type: decoded.type,
          keys: [creds],
        };

        await putEncr("rooms", room, key);
        await putEncr("credentials", creds, key);
        refreshRooms();

        // TODO: encrypt using the shared derived key @creatorkostas
        client.sendAck(creds.userId, {
          from: user.userId,
          room: {
            ...room,
            name: (room.type == "single") ? user.username : room.name
          } as RoomType,
        } as AckMessage);

        router.push(`/chat?id=${room.roomId}`);
      } catch (err) {
        console.error("Invalid QR invite:", err);
        alert(`Invalid QR invite: ${err}`);
      }
    };

    handleQrInvite();
  }, [searchParams, db, putEncr, key, user, router, client]);


  if (!client || !user || !db) return <Loading />;

  const validate = () => {
    if (type === 'group' && !name.trim()) return 'Room name is required';
    if (type === 'single' && !otherUserId.trim())
      return 'User ID is required for single chat';
    return '';
  };

  const handleCreateRoom = async () => {
    if (loading) return;
    if(!key) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');

    const roomId = generateBase58Id();
    const peer = peers.find((p) => p.id === otherUserId);
    if (!peer) {
      console.error(`Peer ${otherUserId} not found`)
      return;
    }

    const localRoomName = type === 'single' ? peer.username || otherUserId : name;
    const inviteRoomName = type === 'single' ? user.username || user.userId : name;

    const room: RoomType = {
      roomId,
      name: localRoomName,
      type,
      keys: [
        user, 
        {
          userId: peer.id,
          username: peer.username,
          public: peer.pubkey
        } as CredentialsType
      ],
    };

    const invite = {
      from: user.userId,
      room: { ...room, name: inviteRoomName },
      target: otherUserId,
    } as InviteMessage;

    const signalingClient = await getSignalingClient();
    signalingClient.sendRoomInvite(otherUserId, invite);

    await putEncr('rooms', room, key);
    await putEncr('credentials', {
      userId: peer.id,
      username: peer.username,
      public: peer.pubkey,
    } as CredentialsType, key);

    refreshRooms();
    router.push(`/chat?id=${roomId}`);
  };

  const handleGenerateQR = async () => {
    const roomId = generateBase58Id();
    const roomName = type === 'single' ? user.username || user.userId : name;

    const payload = {
      roomId,
      roomName,
      type,
      // TODO: send only userId and get other user info through the server
      userId: user.userId,
      username: user.username,
      public: user.public,
    };

    const encoded = encodePayload(payload);
    // const url = `${window.location.origin}/new?qr=${encoded}`;
    const url = `http://192.168.1.8:3000/new?qr=${encoded}`;
    setQrValue(url);
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

        <Button onClick={handleCreateRoom} className="w-full mb-2">
          Send Invite
        </Button>

        <Button onClick={handleGenerateQR} className="w-full mb-2">
          Generate QR Invite
        </Button>

        {qrValue && (
          <div className="flex flex-col items-center mt-4 gap-2">
            <p className="text-sm text-muted-foreground">Scan to join instantly:</p>
            <ResponsiveQr qrValue={qrValue} />
          </div>
        )}
      </div>
    </div>
  );
}
