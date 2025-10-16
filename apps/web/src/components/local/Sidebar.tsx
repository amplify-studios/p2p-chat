'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Home, MessageSquareDot, Plus, Settings, Users } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import Loading from './Loading';
import SidebarItem from './SidebarItem';
import { useClient } from '@/contexts/ClientContext';
import { useInvites } from '@/hooks/useInvites';
import { useAcks } from '@/hooks/useAcks';
import { CLIENT_CONFIG } from '@chat/core';
import { usePeers } from '@/hooks/usePeers';
import { PeerInfo } from '@chat/sockets';
import { registerServiceWorker, requestNotificationPermission } from '@chat/notifications';
import { useResend } from '@/hooks/useResend';
import { useP2P } from '@/contexts/P2PContext';

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const { client, status } = useClient();
  const { rooms, activeRoomId } = useRooms();
  const { friends } = usePeers();
  useInvites();
  useResend();
  useAcks({ client });

  const [connected, setConnected] = useState(false);
  const onlineFriends = useMemo(
    () => friends.filter(f => f.online).map(f => ({ id: f.id, username: f.username, pubkey: "" } as PeerInfo)),
    [friends]
  );

  useEffect(() => {
    registerServiceWorker();
    (async () => {
      await requestNotificationPermission();
    })();
  }, []);

  const { connectToPeer } = useP2P();
  useEffect(() => {
    onlineFriends.forEach(connectToPeer);
  }, [onlineFriends]);

  // Track overall connection status
  useEffect(() => {
    setConnected(status === 'connected');
  }, [status]);

  if (!rooms) return <Loading />;

  return (
    <div className="flex flex-col md:flex-row md:h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 w-64 lg:w-1/5 border-r border-secondary flex-col h-screen">
        <div className="p-6 text-2xl font-bold border-b border-secondary">
          <Link className="text-primary" href="/">
            {CLIENT_CONFIG.appName}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {rooms.map((room) => (
              <li key={room.roomId}>
                <Link
                  href={`/chat?id=${room.roomId}`}
                  className={`flex items-center gap-2 p-2 rounded hover:bg-secondary ${room.roomId === activeRoomId ? 'bg-secondary font-semibold' : ''
                    }`}
                >
                  {room.type === 'group' ? <Users size={20} /> : null} {room.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 flex flex-col gap-2 border-t border-secondary">
          <SidebarItem
            name="New Room"
            href="/new"
            icon={<Plus size={19} />}
            type="default"
            disabled={!connected}
          />
          <SidebarItem
            name="Invites"
            href="/invites"
            icon={<MessageSquareDot size={20} />}
            type="default"
            disabled={!connected}
          />
          <SidebarItem
            name="Peers"
            href="/peers"
            icon={<Users size={20} />}
            type="default"
            disabled={!connected}
          />
          <SidebarItem
            name="Settings"
            href="/settings"
            icon={<Settings size={20} />}
            type="default"
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background">
        <nav className="md:hidden flex items-center border-b border-secondary sticky top-0 z-10 bg-background p-2">
          <div className="flex-1 overflow-x-auto flex gap-2">
            {rooms.map((room) => (
              <Link
                key={room.roomId}
                href={`/chat?id=${room.roomId}`}
                className={`flex-shrink-0 px-3 py-2 rounded whitespace-nowrap ${room.roomId === activeRoomId ? 'bg-secondary font-semibold' : 'hover:bg-secondary'
                  }`}
              >
                {room.name}
              </Link>
            ))}
            <SidebarItem href="/new" type="small" icon={<Plus size={16} />} disabled={!connected} />
          </div>

          <div className="flex gap-2 ml-2">
            <SidebarItem href="/" type="small" icon={<Home size={16} />} />
            <SidebarItem href="/invites" type="small" icon={<MessageSquareDot size={16} />} disabled={!connected} />
            <SidebarItem href="/peers" type="small" icon={<Users size={16} />} disabled={!connected} />
            <SidebarItem href="/settings" type="small" icon={<Settings size={16} />} />
          </div>
        </nav>

        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
