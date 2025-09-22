'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { MessageSquareDot, Plus, Settings, Users } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import Loading from './Loading';
import SidebarItem from './SidebarItem';
import useClient from '@/hooks/useClient';
import { useInvites } from '@/hooks/useInvites';

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const { rooms, activeRoomId } = useRooms();
  if (!rooms) return <Loading />;
  const { client } = useClient(); // NOTE: used to set status to online immediately
  const { invites: currentInvites, acceptInvite, declineInvite } = useInvites();

  return (
    <div className="flex flex-col md:flex-row md:h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 w-64 lg:w-1/5 border-r border-secondary flex-col">
        {/* Logo / App Title */}
        <div className="p-6 text-2xl font-bold border-b border-secondary">
          <Link className="text-primary" href="/">P2P Chat</Link>
        </div>

        {/* Rooms List */}
        <nav className="p-4 overflow-y-auto flex-1 flex flex-col">
          <ul className="space-y-2 flex-1">
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

            <li>
              <SidebarItem 
                name='New Room'
                href='/new'
                icon={<Plus size={20} />}
                type='default'
              />
            </li>
          </ul>

          <div className="mt-auto">
            <SidebarItem 
              name='Invites'
              href='/invites'
              icon={<MessageSquareDot size={20} />}
              type='default'
            />

            <SidebarItem 
              name='Peers'
              href='/peers'
              icon={<Users size={20} />}
              type='default'
            />

            <SidebarItem 
              name='Settings'
              href='/settings'
              icon={<Settings size={20} />}
              type='default'
            />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-background overflow-auto">
        {/* Mobile Top Scroll Nav */}
        <nav className="md:hidden flex overflow-x-auto gap-2 p-2 border-b border-secondary sticky top-0 z-10">
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

          <div className='flex row ml-auto'>
            <SidebarItem
              href='/invites'
              type='small'
              icon={<MessageSquareDot size={16} />}
            />
            <SidebarItem
              href='/peers'
              type='small'
              icon={<Users size={16} />}
            />
            <SidebarItem
              href='/settings'
              type='small'
              icon={<Settings size={16} />}
            />
          </div>
        </nav>

        <div className="flex-1 overflow-auto">
          {children}
          </div>
      </main>
    </div>
  );
}
