'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useInvites } from '@/hooks/useInvites';
import { usePeers } from '@/hooks/usePeers';
import { useDB } from '@/hooks/useDB';
import { MessageType } from '@chat/core';
import StatusCard from '@/components/local/StatusCard';
import useClient from '@/hooks/useClient';
import EmptyState from '@/components/local/EmptyState';

export default function Home() {
  const { user, key } = useAuth();
  const { db, getAllDecr } = useDB();
  const { invites } = useInvites();
  const { peers, loading: peersLoading, friends } = usePeers();
  const { client, status } = useClient();

  const [newMessagesCount, setNewMessagesCount] = useState(0);

  useEffect(() => {
    if (!db || !key) return;
    const fetchMessages = async () => {
      const allMessages = (await getAllDecr('messages', key)) as MessageType[];
      const unread =
        allMessages?.filter((m: MessageType) => m.senderId != user?.userId && !m.read)?.length || 0;
      setNewMessagesCount(unread);
    };
    fetchMessages();
  }, [db, getAllDecr, key, user?.userId]);

  if (!user) return <Loading />;

  const info = [
    {
      value: newMessagesCount,
      description: 'New Messages',
    },
    {
      value: invites.length,
      description: 'Pending Invites',
    },
    {
      value: peersLoading ? 'Loading...' : peers.length,
      description: 'Peers Online',
    },
    {
      value: friends.filter((f) => peers.some((p) => p.id === f.id)).length,
      description: 'Friends Online',
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* App Name / Logo */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">P2P Chat</h1>
        <div className="text-right">
          <p className="font-medium">{user.username || 'Anonymous'}</p>
          <p className="text-sm text-gray-500">{user.userId}</p>
        </div>
      </header>

      {status !== "connected" && (
        <EmptyState msg='No connection to the signaling server' />
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {info.map((i, index) => (
          <StatusCard key={index} {...i} />
        ))}
      </div>
    </div>
  );
}
