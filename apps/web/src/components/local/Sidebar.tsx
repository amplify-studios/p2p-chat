'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import Loading from './Loading';

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const { rooms, activeRoomId } = useRooms();
  if (!rooms) return <Loading />;

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Sidebar */}
      <aside className="bg-background flex-shrink-0 w-full md:w-64 lg:w-1/5 flex flex-col md:flex-col border-b md:border-b-0 md:border-r border-secondary">
        {/* Mobile Horizontal Scroll */}
        <nav className="flex overflow-x-auto md:flex-col md:overflow-y-auto p-2 gap-2 items-center">
          {rooms.map((room) => (
            <Link
              key={room.roomId}
              href={`/chat?id=${room.roomId}`}
              className={`flex-shrink-0 px-3 py-2 rounded hover:bg-secondary whitespace-nowrap ${
                room.roomId === activeRoomId ? 'bg-secondary font-semibold' : ''
              }`}
            >
              {room.name}
            </Link>
          ))}

          {/* New Room */}
          <Link
            href="/new"
            className="flex-shrink-0 px-3 py-2 rounded hover:bg-secondary flex items-center gap-1"
          >
            <Plus size={16} />
            <span className="hidden md:inline">New</span>
          </Link>

          {/* Settings */}
          <Link
            href="/settings"
            className="flex-shrink-0 px-3 py-2 rounded hover:bg-secondary flex items-center gap-1"
          >
            <Settings size={16} />
            <span className="hidden md:inline">Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">{children}</main>
    </div>
  );
}
