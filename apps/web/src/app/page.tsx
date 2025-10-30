'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { usePeers } from '@/hooks/usePeers';
import { useDB } from '@/contexts/DBContext';
import { CLIENT_CONFIG, MessageType } from '@chat/core';
import StatusCard from '@/components/local/StatusCard';
import { useClient } from '@/contexts/ClientContext';
import EmptyState from '@/components/local/EmptyState';
import { useInvites } from '@/hooks/useInvites';
import { Fira_Code } from 'next/font/google';

export default function Home() {
  const { user, key } = useAuth();
  const { db, getAllDecr } = useDB();
  const { peers, loading: peersLoading, friends } = usePeers();
  const { invites } = useInvites();
  const { client, status } = useClient();

  const [firstNewMessage, setFirstNewMessage] = useState<MessageType | null>(null);
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  useEffect(() => {
    if (!db || !key) return;
    const fetchMessages = async () => {
      const allMessages = (await getAllDecr('messages', key)) as MessageType[];
      const unread = allMessages?.filter((m: MessageType) => m.senderId != user?.userId && !m.read);
      const unreadCount = unread?.length || 0;
      setNewMessagesCount(unreadCount);

      setFirstNewMessage(unread.at(0) ?? null);
    };
    fetchMessages();
  }, [db, getAllDecr, key, user?.userId]);

  if (!user) return <Loading />;

  const info = [
    {
      value: newMessagesCount,
      description: 'New Messages',
      href: firstNewMessage ? `/chat?id=${firstNewMessage?.roomId}` : "#"
    },
    {
      value: invites.length,
      description: 'Pending Invites',
      href: '/invites',
    },
    {
      value: peersLoading ? 'Loading...' : peers.length,
      description: 'Peers Online',
      href: '/peers',
    },
    {
      value: friends.filter((f) => peers.some((p) => p.id === f.id)).length,
      description: 'Friends Online',
      href: '/peers',
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* App Name / Logo */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">{CLIENT_CONFIG.appName}</h1>
        <div className="text-right">
          <p className="font-medium">{user.username || 'Anonymous'}</p>
          <p className="text-sm text-gray-500">{user.userId}</p>
        </div>
      </header>

      {status !== 'connected' && <EmptyState msg="No connection to the signaling server" />}

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {info.map((i, index) => (
          <StatusCard key={index} {...i} />
        ))}
      </div>
    </div>
  );
}
