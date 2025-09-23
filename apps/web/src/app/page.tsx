'use client';

import { useEffect, useState } from 'react';
import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';
import { useInvites } from '@/hooks/useInvites';
import { usePeers } from '@/hooks/usePeers';
import { useDB } from '@/hooks/useDB';
import { MessageType } from '@chat/core';

export default function Home() {
  const user = useAuth(true);
  const db = useDB();
  const { invites } = useInvites();
  const { peers, loading: peersLoading } = usePeers();

  const [newMessagesCount, setNewMessagesCount] = useState(0);

  useEffect(() => {
    if (!db) return;
    const fetchMessages = async () => {
      const allMessages = await db.getAll('messages');
      const unread = allMessages?.filter((m: MessageType) => m.senderId != user?.userId && !m.read)?.length || 0;
      setNewMessagesCount(unread);
    };
    fetchMessages();
  }, [db]);

  if (!user) return <Loading />;

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

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-card rounded shadow flex flex-col items-center">
          <p className="text-xl font-bold">{newMessagesCount}</p>
          <p className="text-gray-500 text-sm">New Messages</p>
        </div>
        <div className="p-4 bg-card rounded shadow flex flex-col items-center">
          <p className="text-xl font-bold">{invites.length}</p>
          <p className="text-gray-500 text-sm">Pending Invites</p>
        </div>
          <div className="p-4 bg-card rounded shadow flex flex-col items-center">
          <p className="text-xl font-bold">{(peersLoading) ? "Loading..." : peers.length}</p>
          <p className="text-gray-500 text-sm">Online Peers</p>
        </div>
      </div>
    </div>
  );
}
