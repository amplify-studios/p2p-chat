'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Loading from '@/components/local/Loading';
import ResponsiveQr from '@/components/local/ResponsiveQr';
import { useDB } from '@/hooks/useDB';
import { useAuth } from '@/hooks/useAuth';
import { usePeers } from '@/hooks/usePeers';
import useClient from '@/hooks/useClient';
import { getSignalingClient } from '@/lib/signalingClient';
import { generateBase58Id } from '@chat/crypto';
import { CredentialsType, decodePayload, encodePayload, RoomType } from '@chat/core';
import { InviteMessage, AckMessage } from '@chat/sockets';
import { refreshRooms } from '@/lib/utils';
import { useToast } from '@/components/local/ToastContext';

export default function NewRoom() {
  const { user, key } = useAuth();
  const { db, putEncr } = useDB();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { peers, loading } = usePeers();
  const { client } = useClient();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<'single' | 'group'>('single');
  const [otherUserId, setOtherUserId] = useState('');
  const [error, setError] = useState('');
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [pendingInvite, setPendingInvite] = useState(false);

  const handledQr = useRef(false);

  useEffect(() => {
    const userIdParam = searchParams.get('userId');
    if (userIdParam) setOtherUserId(userIdParam);
  }, [searchParams]);

  useEffect(() => {
    if (!client || !db || !user || !key || handledQr.current) return;

    const qrParam = searchParams.get('invite');
    if (!qrParam) return;

    handledQr.current = true;

    const handleQrInvite = async () => {
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

        await putEncr('rooms', room, key);
        await putEncr('credentials', creds, key);
        refreshRooms();

        client.sendAck(creds.userId, {
          from: user.userId,
          to: creds.userId,
          room: {
            ...room,
            name: room.type === 'single' ? user.username : room.name,
          },
        } as AckMessage);

        router.push(`/chat?id=${room.roomId}`);
      } catch (err) {
        console.error('Invalid QR invite:', err);
        showToast(`Invalid QR invite`, 'error');
      }
    };

    handleQrInvite();
  }, [client, db, user, key, searchParams, router, putEncr]);

  if (!client || !user || !db) return <Loading />;

  const validate = () => {
    if (type === 'group' && !name.trim()) return 'Room name is required';
    if (type === 'single' && !otherUserId.trim()) return 'User ID is required for single chat';
    return '';
  };

  const handleShare = async () => {
    if (!qrValue) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my chat room',
          text: 'Here’s an invite to join my chat room:',
          url: qrValue,
        });
        showToast('Invite shared!', 'success');
      } catch (err) {
        console.error('Share failed:', err);
        showToast('Failed to share', 'error');
      }
    } else {
      try {
        await navigator.clipboard.writeText(qrValue);
        showToast('Link copied to clipboard', 'info');
      } catch (err) {
        console.error('Clipboard write failed:', err);
        showToast('Failed to copy link', 'error');
      }
    }
  };

  const handleCreateRoom = async () => {
    if (loading || pendingInvite) return;
    if (!key) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setPendingInvite(true);

    const peer = peers.find((p) => p.id === otherUserId);
    if (!peer) {
      console.error(`Peer ${otherUserId} not found`);
      setPendingInvite(false);
      return;
    }

    const invite = {
      from: user.userId,
      name: type === 'single' ? user.username || user.userId : name,
      target: otherUserId,
      pubkey: user.public,
      roomType: type,
    } as InviteMessage;

    try {
      const signalingClient = await getSignalingClient();
      signalingClient.sendRoomInvite(otherUserId, invite);
      console.log('Invite sent:', invite);
    } catch (err) {
      console.error('Failed to send invite:', err);
      setPendingInvite(false);
    }
  };

  const handleGenerateQR = async () => {
    const roomId = generateBase58Id();
    const roomName = type === 'single' ? user.username || user.userId : name;

    const payload = {
      roomId,
      roomName,
      type,
      userId: user.userId,
      username: user.username,
      public: user.public,
    };

    const encoded = encodePayload(payload);
    const url = `${window.location.origin}/new?invite=${encoded}`;
    // const url = `http://192.168.1.8:3000/new?invite=${encoded}`;
    setQrValue(url);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="bg-card p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-foreground">Create New Room</h1>

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

        <Button onClick={handleCreateRoom} className="w-full mb-2" disabled={pendingInvite}>
          {pendingInvite ? 'Invite Pending...' : 'Send Invite'}
        </Button>

        <Button onClick={handleGenerateQR} className="w-full mb-2">
          Generate QR Invite
        </Button>

        {qrValue && (
          <div className="flex flex-col items-center mt-4 gap-2">
            <p className="text-sm text-muted-foreground">Scan to join instantly:</p>
            <ResponsiveQr qrValue={qrValue} />

            <Button onClick={handleShare} className="mt-2">
              Share Invite
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
