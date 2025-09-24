'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Home, MessageSquareDot, Plus, Settings, Users } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import Loading from './Loading';
import SidebarItem from './SidebarItem';
import useClient from '@/hooks/useClient';
import { useInvites } from '@/hooks/useInvites';
import { useAuth } from '@/hooks/useAuth';
import { useAcks } from '@/hooks/useAcks';

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const { client } = useClient(); // NOTE: used to set status to online immediately
  useAuth(); // NOTE: used to always check whether the user credentials are present
  useInvites(); // NOTE: used to always check for invites
  useAcks({client}); // NOTE: Always check for ACKs
  const { rooms, activeRoomId } = useRooms();

  if (!rooms) return <Loading />;

  return (
    <div className="flex flex-col md:flex-row md:h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 w-64 lg:w-1/5 border-r border-secondary flex-col h-screen">
        {/* Logo / App Title */}
        <div className="p-6 text-2xl font-bold border-b border-secondary">
          <Link className="text-primary" href="/">P2P Chat</Link>
        </div>

        {/* Rooms List (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {rooms.map((room) => (
              <li key={room.roomId}>
                <Link
                  href={`/chat?id=${room.roomId}`}
                  className={`flex items-center gap-2 p-2 rounded hover:bg-secondary ${
                    room.roomId === activeRoomId ? 'bg-secondary font-semibold' : ''
                  }`}
                >
                  {room.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Fixed bottom items */}
        <div className="p-4 flex flex-col gap-2 border-t border-secondary">
          <SidebarItem
            name='New Room'
            href='/new'
            icon={<Plus size={19} />}
            type='default'
          />

          <SidebarItem name='Invites' href='/invites' icon={<MessageSquareDot size={20} />} type='default' />
          <SidebarItem name='Peers' href='/peers' icon={<Users size={20} />} type='default' />
          <SidebarItem name='Settings' href='/settings' icon={<Settings size={20} />} type='default' />
        </div>
      </aside>

      {/* Main Content */}
    <main className="flex-1 flex flex-col bg-background">
      {/* Mobile Top Nav */}
      <nav className="md:hidden flex items-center border-b border-secondary sticky top-0 z-10 bg-background p-2">
        <div className="flex-1 overflow-x-auto flex gap-2">
          {rooms.map((room) => (
            <Link
              key={room.roomId}
              href={`/chat?id=${room.roomId}`}
              className={`flex-shrink-0 px-3 py-2 rounded whitespace-nowrap ${
                room.roomId === activeRoomId
                  ? 'bg-secondary font-semibold'
                  : 'hover:bg-secondary'
              }`}
            >
              {room.name}
            </Link>
          ))}
          <Link
            href="/new"
            className="flex-shrink-0 px-3 py-2 rounded hover:bg-secondary flex items-center gap-1"
          >
            <Plus size={16} />
          </Link>
        </div>

        {/* Fixed right icons */}
        <div className="flex gap-2 ml-2">
          <SidebarItem href='/' type='small' icon={<Home size={16} />} />
          <SidebarItem href='/invites' type='small' icon={<MessageSquareDot size={16} />} />
          <SidebarItem href='/peers' type='small' icon={<Users size={16} />} />
          <SidebarItem href='/settings' type='small' icon={<Settings size={16} />} />
        </div>
      </nav>

      {/* Main scrollable content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </main>
    </div>
  );
}
