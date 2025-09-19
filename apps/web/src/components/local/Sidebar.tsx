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
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 w-64 lg:w-1/5 border-r border-secondary flex-col">
        <div className="p-6 text-2xl font-bold border-b border-secondary">
          <Link href="/">P2P Chat</Link>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto flex flex-col">
          <ul className="flex-1 space-y-2">
            {rooms.map(room => (
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
              <Link
                href="/new"
                className="flex items-center gap-2 p-2 rounded hover:bg-secondary mt-2"
              >
                <Plus size={20} />
                <span>New Room</span>
              </Link>
            </li>
          </ul>

          <div className="mt-auto">
            <Link
              href="/settings"
              className="flex items-center gap-2 p-2 rounded hover:bg-secondary"
            >
              <Settings size={20} />
              <span>Settings</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col bg-background overflow-auto">
        {/* Mobile Top Scroll Nav */}
        <nav className="md:hidden flex overflow-x-auto p-2 gap-2 border-b border-secondary">
          {rooms.map(room => (
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

          <Link
            href="/new"
            className="flex-shrink-0 px-3 py-2 rounded hover:bg-secondary flex items-center gap-1"
          >
            <Plus size={16} />
          </Link>

          <Link
            href="/settings"
            className="flex-shrink-0 px-3 py-2 rounded hover:bg-secondary flex items-center gap-1"
          >
            <Settings size={16} />
          </Link>
        </nav>

        {/* Actual content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
